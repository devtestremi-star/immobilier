"use server";

import { prisma } from "@/lib/prisma";

export async function saveReview(input: {
  listingId: number;
  author: string;
  score: number | null;
  comment: string;
  favorite: boolean;
}) {
  const author = input.author.trim();
  if (!author) throw new Error("Prénom manquant");
  const score = input.score && input.score >= 1 && input.score <= 10 ? Math.round(input.score) : null;
  const comment = input.comment.trim() || null;

  // rien à garder : on supprime l'avis
  if (score === null && !comment && !input.favorite) {
    await prisma.review.deleteMany({ where: { listingId: input.listingId, author } });
    return null;
  }
  const data = { score, comment, favorite: input.favorite };
  const r = await prisma.review.upsert({
    where: { listingId_author: { listingId: input.listingId, author } },
    create: { listingId: input.listingId, author, ...data },
    update: data,
    omit: { createdAt: true },
  });
  return { ...r, updatedAt: r.updatedAt.toISOString() };
}
