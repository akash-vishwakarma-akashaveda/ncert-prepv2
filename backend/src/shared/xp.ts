import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

export async function awardXp(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  await tx.xpTransaction.create({ data: { userId, amount, reason } });
  await tx.user.update({ where: { id: userId }, data: { xp: { increment: amount } } });
}
