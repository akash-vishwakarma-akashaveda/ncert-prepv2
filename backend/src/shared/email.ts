import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from './logger.js';

const sesClient = new SESClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const from = process.env.SES_FROM_EMAIL;
  if (!from) {
    // ponytail: no SES_FROM_EMAIL configured (e.g. local dev, SES domain not verified yet) — log instead of failing.
    logger.info({ to, subject, body }, '[email] not sent (SES_FROM_EMAIL unset) — logging instead');
    return;
  }

  await sesClient.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } },
      },
    }),
  );
}
