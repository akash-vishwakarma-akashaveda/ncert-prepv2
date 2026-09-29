import { prisma } from '../db.js';
import { logger } from '../shared/logger.js';
import { sendEmail, type EmailContent } from '../shared/email.js';

const TICK_MS = 5 * 60 * 1000;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // India has no DST, so a fixed offset is exact.

// Must match the frontend defaults in ReminderSettingsCard (reminderHour): unset hour = 7 PM daily / 6 PM weekly.
export const DEFAULT_HOUR = { daily: 19, weekly: 18 } as const;

/** The IST hour/weekday for `now`, and when that IST day started (as a real UTC instant). */
export function istSlot(now: Date) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const dayStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS);
  return { hour: ist.getUTCHours(), isSunday: ist.getUTCDay() === 0, dayStart };
}

/** Is a reminder due for this user in this IST slot? Weekly reminders go out on Sundays. */
export function isDue(u: { reminderFrequency: string; reminderHour: number | null }, slot: { hour: number; isSunday: boolean }) {
  const freq = u.reminderFrequency === 'weekly' ? 'weekly' : 'daily';
  if (freq === 'weekly' && !slot.isSunday) return false;
  return (u.reminderHour ?? DEFAULT_HOUR[freq]) === slot.hour;
}

async function reminderContent(u: { lastWatchedVideo: string | null; streak: number; reminderFrequency: string }): Promise<[string, EmailContent]> {
  const app = process.env.FRONTEND_ORIGIN;
  const video = u.lastWatchedVideo ? await prisma.video.findUnique({ where: { youtubeId: u.lastWatchedVideo } }) : null;
  const streakLine = u.streak > 1 ? [`You are on a ${u.streak}-day study streak. Keep it going!`] : [];
  const secondary = { label: 'Change or turn off reminders', url: `${app}/app/reminders` };
  const footnote = `You asked for ${u.reminderFrequency === 'weekly' ? 'a weekly' : 'a daily'} revision reminder.`;

  if (video && video.isActive) {
    const heading = `Time for revision: next up is ${video.chapterName}`;
    return [heading, {
      heading,
      lines: [`${video.classDisplay} · ${video.subject}`, video.videoTitle, ...streakLine],
      action: { label: 'Continue lesson', url: `${app}/app/lesson/${encodeURIComponent(video.youtubeId)}` },
      footnote,
      secondary,
    }];
  }
  const heading = 'Start your first lesson!';
  return [heading, {
    heading,
    lines: ['Your NCERT video lessons are ready. Pick a subject and start with chapter 1.', ...streakLine],
    action: { label: 'Open NCERT Prep', url: `${app}/app` },
    footnote,
    secondary,
  }];
}

export async function sendDueReminders(now = new Date()) {
  const slot = istSlot(now);
  const candidates = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      remindersEnabled: true,
      // Only mail addresses we know are real, and minors only after a parent approved the account.
      emailVerified: true,
      consentStatus: 'GRANTED',
      OR: [{ reminderHour: slot.hour }, { reminderHour: null }],
      AND: [{ OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: slot.dayStart } }] }],
    },
    select: { id: true, email: true, reminderFrequency: true, reminderHour: true, lastWatchedVideo: true, streak: true },
  });

  let sent = 0;
  // ponytail: sequential sends in one process; batch + respect the SES rate limit if this grows past a few thousand/hour.
  for (const u of candidates.filter((c) => isDue(c, slot))) {
    // Claim the slot first so an overlapping tick (or a second instance) can't send it twice.
    const claimed = await prisma.user.updateMany({
      where: { id: u.id, OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: slot.dayStart } }] },
      data: { lastReminderAt: now },
    });
    if (claimed.count !== 1) continue;
    const [subject, content] = await reminderContent(u);
    if (await sendEmail(u.email, subject, content)) sent++;
    else await prisma.user.update({ where: { id: u.id }, data: { lastReminderAt: null } }); // let the next tick retry
  }
  if (sent) logger.info({ sent, hour: slot.hour }, 'Reminder emails sent');
  return sent;
}

export function startReminderScheduler() {
  const run = () => sendDueReminders().catch((err) => logger.warn({ err }, 'Reminder run failed'));
  run();
  setInterval(run, TICK_MS).unref();
}
