/**
 * One-off admin bootstrap. Creates a new admin account, or promotes an existing one.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts <email> <password> ["Display Name"]
 *
 * If the email already has an account, it's just promoted to ADMIN (password left alone unless
 * you pass one and the account has none yet). Otherwise a new verified admin account is created.
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../src/db.js';
import { generateReferralCode } from '../src/shared/referral.js';

async function main() {
  const [email, password, displayName] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npx tsx scripts/seed-admin.ts <email> <password> ["Display Name"]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const user = await prisma.user.update({
      where: { email },
      data: {
        role: 'ADMIN',
        passwordHash: existing.passwordHash ?? (await bcrypt.hash(password, 12)),
      },
    });
    console.log(`Promoted existing account to admin: ${user.email}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName, role: 'ADMIN', emailVerified: true, referralCode: await generateReferralCode() },
    });
    console.log(`Created admin account: ${user.email}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
