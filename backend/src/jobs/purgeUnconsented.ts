import { prisma } from '../db.js';
import { logger } from '../shared/logger.js';
import { eraseUser } from '../shared/erase-user.js';

const TICK_MS = 6 * 60 * 60 * 1000;
// The privacy notice promises data is kept only with consent: an account that never got consent
// (no self-consent, no parent's details) is erased after this long.
const GRACE_DAYS = 30;

export async function purgeUnconsentedAccounts(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - GRACE_DAYS * 24 * 60 * 60 * 1000);
  const stale = await prisma.user.findMany({
    where: { role: 'STUDENT', consentStatus: { not: 'GRANTED' }, createdAt: { lt: cutoff } },
    select: { id: true },
    take: 500,
  });
  for (const { id } of stale) await eraseUser(id);
  if (stale.length) logger.info({ erased: stale.length }, 'Erased accounts that never gave consent');
  return stale.length;
}

export function startUnconsentedPurge() {
  const run = () => purgeUnconsentedAccounts().catch((err) => logger.warn({ err }, 'Unconsented purge failed'));
  run();
  setInterval(run, TICK_MS).unref();
}
