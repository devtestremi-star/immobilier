import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await connection();
  const reviews = await prisma.review.findMany({ omit: { createdAt: true } });
  return Response.json(reviews, { headers: { "Cache-Control": "no-store" } });
}
