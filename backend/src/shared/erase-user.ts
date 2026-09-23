import { prisma } from '../db.js';

/** Deletes every row that references a user. One place, so delete-account, consent decline and the unconsented-purge job all erase the same set of tables. */
export async function eraseUser(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.lessonProgress.deleteMany({ where: { userId } }),
    prisma.xpTransaction.deleteMany({ where: { userId } }),
    prisma.doubt.deleteMany({ where: { userId } }),
    prisma.feedback.deleteMany({ where: { userId } }),
    prisma.consentRequest.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}
