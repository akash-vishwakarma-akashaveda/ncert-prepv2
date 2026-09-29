import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from './logger.js';

const sesClient = new SESClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });

export interface EmailContent {
  heading: string;
  /** Paragraphs shown above the button. */
  lines: string[];
  action?: { label: string; url: string };
  /** Small print under the button, e.g. "This link expires in 1 hour." */
  footnote?: string;
  /** Small link under the footnote, e.g. "Turn off reminders". */
  secondary?: { label: string; url: string };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Table layout + inline styles: the only thing Gmail/Outlook render reliably. */
export function renderEmailHtml({ heading, lines, action, footnote, secondary }: EmailContent): string {
  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#4B5168">${esc(t)}</p>`;
  const button = action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td style="border-radius:12px;background:#12A594">
<a href="${esc(action.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px">${esc(action.label)}</a></td></tr></table>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F4F6FB">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;padding:30px;font-family:Arial,Helvetica,sans-serif">
<tr><td>
<p style="margin:0 0 18px;font-size:14px;font-weight:700;color:#12A594">NCERT Prep</p>
<h1 style="margin:0 0 16px;font-size:21px;line-height:1.35;color:#1E2233">${esc(heading)}</h1>
${lines.map(p).join('')}${button}
${footnote ? `<p style="margin:0;font-size:12px;line-height:1.5;color:#9AA1B4">${esc(footnote)}</p>` : ''}
${secondary ? `<p style="margin:8px 0 0;font-size:12px"><a href="${esc(secondary.url)}" style="color:#6B7280">${esc(secondary.label)}</a></p>` : ''}
</td></tr></table>
<p style="margin:16px 0 0;font-size:11px;color:#9AA1B4;font-family:Arial,Helvetica,sans-serif">You received this email because of your NCERT Prep account.</p>
</td></tr></table></body></html>`;
}

/** Plain-text part for clients that block HTML; the URL has to appear in full here. */
export function renderEmailText({ heading, lines, action, footnote, secondary }: EmailContent): string {
  return [
    heading,
    '',
    ...lines,
    ...(action ? ['', `${action.label}: ${action.url}`] : []),
    ...(footnote ? ['', footnote] : []),
    ...(secondary ? [`${secondary.label}: ${secondary.url}`] : []),
  ].join('\n');
}

/** Never throws: a mail failure (SES sandbox, unverified sender, bad credentials) must not fail the
 * request that triggered it — e.g. a sign-up that already created the account. Returns whether it sent. */
export async function sendEmail(to: string, subject: string, content: EmailContent): Promise<boolean> {
  const from = process.env.SES_FROM_EMAIL;
  const text = renderEmailText(content);
  if (!from) {
    // Local dev has no SES: the link is logged so flows can be tested, and counts as sent. In
    // production an unset sender is a real misconfiguration, so it reports failure to the user.
    logger.warn({ to, subject, body: text }, '[email] not sent (SES_FROM_EMAIL unset) — logging instead');
    return process.env.NODE_ENV !== 'production';
  }

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: renderEmailHtml(content), Charset: 'UTF-8' },
            Text: { Data: text, Charset: 'UTF-8' },
          },
        },
      }),
    );
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, '[email] SES send failed');
    return false;
  }
}
