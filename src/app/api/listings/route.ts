import { cacheLife } from "next/cache";
import { prisma } from "@/lib/prisma";

const r5 = (n: number | null) => (n === null ? null : Math.round(n * 1e5) / 1e5);

// les annonces ne changent qu'à l'import : cache serveur + CDN de Vercel
async function getListings() {
  "use cache";
  cacheLife("hours");
  // les doublons (même logement publié ailleurs) sont masqués : leur lien figure dans `others` de l'annonce principale
  const listings = await prisma.listing.findMany({ where: { duplicateOf: null }, omit: { duplicateOf: true }, orderBy: { id: "asc" } });
  return listings.map(({ createdAt, ...l }) => ({
    ...l,
    publishedAt: l.publishedAt?.toISOString().slice(0, 10) ?? null,
    addedAt: createdAt.toISOString().slice(0, 10),
    lat: r5(l.lat),
    lng: r5(l.lng),
  }));
}

export async function GET() {
  return Response.json(await getListings(), {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
