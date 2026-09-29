import type { Prisma, XpSourceType } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * Records one XP transaction, scoped to a class, and keeps User.xp (the global, cross-class
 * total shown on the profile) in sync. Never lets a class balance or the global total go
 * negative — a reversal just can't take a student below 0 for that class.
 */
export async function recordXp(
  tx: Tx,
  params: {
    userId: string;
    classSort: string;
    amount: number;
    type: XpSourceType;
    description: string;
    sourceId?: string;
  },
): Promise<{ id: string; amount: number; balanceAfter: number } | null> {
  const { userId, classSort, amount, type, description, sourceId } = params;

  const priorSum = await tx.xpTransaction.aggregate({
    where: { userId, classSort },
    _sum: { amount: true },
  });
  const priorBalance = Math.max(0, priorSum._sum.amount ?? 0);
  const balanceAfter = Math.max(0, priorBalance + amount);

  const created = await tx.xpTransaction.create({
    data: { userId, classSort, amount, type, description, sourceId, balanceAfter },
  });

  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true } });
  await tx.user.update({ where: { id: userId }, data: { xp: Math.max(0, user.xp + amount) } });

  return { id: created.id, amount: created.amount, balanceAfter: created.balanceAfter };
}

/** True if a transaction with this exact sourceId/type/class already exists (idempotency check). */
export async function xpAlreadyRecorded(
  tx: Tx,
  params: { userId: string; classSort: string; sourceId: string; type: XpSourceType },
): Promise<boolean> {
  const existing = await tx.xpTransaction.findFirst({
    where: { userId: params.userId, classSort: params.classSort, sourceId: params.sourceId, type: params.type },
    select: { id: true },
  });
  return existing !== null;
}
