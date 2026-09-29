/** One-off: assigns a referral code to any existing user created before the referral system shipped. */
import 'dotenv/config';
import { prisma } from '../src/db.js';
import { generateReferralCode } from '../src/shared/referral.js';

async function main() {
  const users = await prisma.user.findMany({ where: { referralCode: null }, select: { id: true, email: true } });
  for (const u of users) {
    const code = await generateReferralCode();
    await prisma.user.update({ where: { id: u.id }, data: { referralCode: code } });
    console.log(`${u.email} -> ${code}`);
  }
  console.log(`Backfilled ${users.length} user(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
