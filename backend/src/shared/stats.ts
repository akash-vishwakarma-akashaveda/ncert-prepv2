import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

type Tx = Prisma.TransactionClient | typeof prisma;

const DAILY_FIELDS = ['visitors', 'newVisitors', 'activeStudents', 'registrations', 'lessonsStarted', 'lessonsCompleted', 'doubtsAsked'] as const;
type DailyField = (typeof DAILY_FIELDS)[number];
type TotalField = Exclude<DailyField, 'newVisitors' | 'activeStudents'>;

/** IST calendar day, e.g. "2026-09-23". */
function istDay(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Bumps today's counter and (for fields the totals row tracks) the all-time total. Never throws
 * on its own — analytics must not break the action it's attached to. */
export async function bumpStat(field: DailyField, by = 1, tx: Tx = prisma): Promise<void> {
  try {
    const day = istDay();
    await tx.statsDaily.upsert({
      where: { day },
      create: { day, [field]: by } as Prisma.StatsDailyUncheckedCreateInput,
      update: { [field]: { increment: by } } as Prisma.StatsDailyUncheckedUpdateInput,
    });
    if (field !== 'newVisitors' && field !== 'activeStudents') {
      const totalField = field as TotalField;
      await tx.statsTotal.upsert({
        where: { id: 'totals' },
        create: { id: 'totals', [totalField]: by } as Prisma.StatsTotalUncheckedCreateInput,
        update: { [totalField]: { increment: by } } as Prisma.StatsTotalUncheckedUpdateInput,
      });
    }
  } catch (err) {
    console.error('bumpStat failed', field, err);
  }
}
