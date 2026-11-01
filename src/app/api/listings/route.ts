import { cacheLife } from "next/cache";
import { prisma } from "@/lib/prisma";

const r5 = (n: number | null) => (n === null ? null : Math.round(n * 1e5) / 1e5);

// les annonces ne changent qu'à l'import : cache serveur + CDN de Vercel
async function getListings() {
  "use cache";
  cacheLife("hours");
  const listings = await prisma.listing.findMany({ omit: { createdAt: true }, orderBy: { id: "asc" } });
  return listings.map((l) => ({ ...l, publishedAt: l.publishedAt.toISOString().slice(0, 10), lat: r5(l.lat), lng: r5(l.lng) }));
}

export async function GET() {
  return Response.json(await getListings(), {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
