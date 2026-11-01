// Import des CSV (dossier CSV/) + géocodage par code postal / ville via geo.api.gouv.fr
// Usage :
//   pnpm db:check [fichier.csv…]  → vérifie sans rien écrire : nouvelles annonces, déjà présentes, prix modifiés
//   pnpm db:seed  [fichier.csv…]  → ajoute les annonces absentes et les marque « new » (flag retiré du précédent import)
//                                   CSV fusion : renseigne source / zone, masque les doublons et y rattache leurs avis
// Sans fichier : tous les CSV du dossier CSV/. Le lien de l'annonce sert d'identifiant.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const CSV_DIR = path.join(__dirname, "..", "CSV");
const CACHE_FILE = path.join(__dirname, "geocode-cache.json");

type Row = Record<string, string>;
type Commune = { nom: string; centre?: { coordinates: [number, number] } };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\bst\b/g, "saint")
    .replace(/\bste\b/g, "sainte")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function parseFloor(raw: string): { floor: number | null; total: number | null } {
  const m = raw.match(/^(RDC|Étage (\d+))(?:\/(\d+))?$/);
  if (!m) return { floor: null, total: null };
  return { floor: m[1] === "RDC" ? 0 : Number(m[2]), total: m[3] ? Number(m[3]) : null };
}

// petit décalage déterministe (~±400 m) pour que les logements d'une même commune ne se superposent pas
function jitter(key: string): [number, number] {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const a = ((h >>> 0) % 10000) / 10000;
  const b = (((h >>> 0) / 10000) % 10000) / 10000;
  return [(a - 0.5) * 0.008, (b - 0.5) * 0.008];
}

async function geocode(rows: Row[]) {
  const cache: Record<string, [number, number] | null> = fs.existsSync(CACHE_FILE)
    ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"))
    : {};
  const cps = [...new Set(rows.map((r) => r["Code postal"]))].filter((cp) => !(`cp:${cp}` in cache));
  console.log(`Géocodage : ${cps.length} codes postaux à interroger`);
  let i = 0;
  for (const cp of cps) {
    const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${cp}&fields=nom,centre&format=json`);
    const list: Commune[] = res.ok ? await res.json() : [];
    const pts = list.filter((c) => c.centre);
    for (const c of pts) cache[`${cp}|${norm(c.nom)}`] = c.centre!.coordinates;
    cache[`cp:${cp}`] = pts.length
      ? [
          pts.reduce((s, c) => s + c.centre!.coordinates[0], 0) / pts.length,
          pts.reduce((s, c) => s + c.centre!.coordinates[1], 0) / pts.length,
        ]
      : null;
    if (++i % 50 === 0) console.log(`  ${i}/${cps.length}`);
    await new Promise((r) => setTimeout(r, 40)); // reste poli avec l'API (50 req/s max)
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  return (cp: string, city: string) => cache[`${cp}|${norm(city)}`] ?? cache[`cp:${cp}`] ?? null;
}

// formats : CSV leboncoin d'origine (avec Titre) ou CSV « fusion » (Sources, Zone, doublons, sans Titre)
const TYPES: Record<string, string> = { Appartement: "Appart" };
const OTHERS = "Autres annonces identiques ou quasi identiques";
const othersOf = (r: Row) => (r[OTHERS] ?? "").split(/\s+/).filter((u) => u && u !== r["Lien"]);

function toListing(r: Row, locate: (cp: string, city: string) => [number, number] | null, isNew: boolean) {
  const { floor, total } = parseFloor(r["Étage"] ?? "");
  const access = r["Statut accès"];
  const pos = locate(r["Code postal"], r["Ville"]);
  const [dx, dy] = jitter(r["Lien"]);
  return {
    url: r["Lien"],
    transaction: r["Transaction"],
    access,
    type: TYPES[r["Type"]] ?? r["Type"],
    price: Number(r["Prix (€)"]) || 0,
    city: r["Ville"],
    postalCode: r["Code postal"],
    department: r["Département"].replace(/\s*\(\w+\)$/, ""), // « Ain (01) » → « Ain »
    surface: Number((r["Surface (m²)"] ?? "").replace(",", ".")) || 0,
    floorRaw: r["Étage"] || null,
    // plain-pied / RDC confirmés sans étage renseigné = 0
    floor: floor ?? (/Plain-pied|RDC/.test(access) ? 0 : null),
    floorsTotal: total,
    elevator: r["Ascenseur"] === "Oui" ? true : r["Ascenseur"] === "Non" ? false : null,
    dpe: r["DPE"] || null,
    seller: r["Vendeur"],
    publishedAt: r["Publiée le"] ? new Date(r["Publiée le"]) : null,
    title: r["Titre"] ?? "",
    lng: pos ? pos[0] + dx : null,
    lat: pos ? pos[1] + dy : null,
    isNew,
    source: r["Sources"] || null,
    zone: r["Zone"] || null,
    zoneDist: Number(r["Dist. zone (km)"]) || null,
    others: othersOf(r),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--check");
  const given = args.filter((a) => !a.startsWith("--"));
  const files = given.length
    ? given.map((f) => (fs.existsSync(f) ? f : path.join(CSV_DIR, f)))
    : fs.readdirSync(CSV_DIR).filter((f) => f.toLowerCase().endsWith(".csv")).sort().map((f) => path.join(CSV_DIR, f));
  const byUrl = new Map<string, Row>();
  for (const f of files) {
    const rows: Row[] = parse(fs.readFileSync(f), {
      bom: true,
      columns: true,
      delimiter: ";",
      skip_empty_lines: true,
      trim: true,
    });
    for (const r of rows) if (r["Lien"]) byUrl.set(r["Lien"], r);
    console.log(`${path.basename(f)} : ${rows.length} lignes`);
  }
  const all = [...byUrl.values()];
  console.log(`${all.length} annonces uniques`);

  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL }) });
  const existing = new Map(
    (await prisma.listing.findMany({ select: { id: true, url: true, price: true, duplicateOf: true } })).map((l) => [l.url, l]),
  );

  // doublon (lien listé dans « Autres annonces… ») → annonce principale
  const dupOf = new Map<string, string>();
  for (const r of all) for (const u of othersOf(r)) if (!byUrl.has(u)) dupOf.set(u, r["Lien"]);

  const rows = all.filter((r) => !existing.has(r["Lien"]));
  // nouveau lien mais même logement qu'une annonce déjà en base : pas « new »
  const known = new Set(rows.filter((r) => othersOf(r).some((u) => existing.has(u))).map((r) => r["Lien"]));
  const fresh = rows.length - known.size;
  const newDups = [...dupOf.keys()].filter((u) => existing.has(u) && existing.get(u)!.duplicateOf === null);
  const dupReviews = newDups.length
    ? await prisma.review.findMany({ where: { listing: { url: { in: newDups } } }, include: { listing: { select: { url: true } } } })
    : [];
  const repriced = all.filter((r) => existing.has(r["Lien"]) && existing.get(r["Lien"])!.price !== (Number(r["Prix (€)"]) || 0));

  console.log(`\nBase : ${existing.size} annonces`);
  console.log(`Déjà présentes : ${all.length - rows.length}`);
  console.log(`Nouveaux liens : ${rows.length}  → vraiment nouvelles (« new ») : ${fresh}, doublons d'une annonce déjà en base : ${known.size}`);
  if (newDups.length)
    console.log(`Annonces en base désormais marquées doublons (masquées) : ${newDups.length} — avis à rattacher à l'annonce principale : ${dupReviews.length}`);
  if (repriced.length) {
    console.log(`Prix différent de la base : ${repriced.length} (non modifiés)`);
    for (const r of repriced.slice(0, 10))
      console.log(`  ${existing.get(r["Lien"])!.price} → ${r["Prix (€)"]} €  ${r["Ville"]}  ${r["Lien"]}`);
  }
  if (dry) {
    for (const r of rows.filter((r) => !known.has(r["Lien"])).slice(0, 20))
      console.log(`  + ${r["Transaction"]} ${r["Type"]} ${r["Prix (€)"]} €  ${r["Ville"]} (${r["Code postal"]})  ${r["Lien"]}`);
    if (fresh > 20) console.log(`  … et ${fresh - 20} autres`);
    console.log("\nRien n'a été écrit. Pour importer : pnpm db:seed" + (given.length ? " " + given.join(" ") : ""));
    return prisma.$disconnect();
  }

  if (rows.length) {
    const locate = await geocode(rows);
    const data = rows.map((r) => toListing(r, locate, !known.has(r["Lien"])));
    console.log(`Positionnées : ${data.filter((d) => d.lat !== null).length}/${data.length}`);
    // le flag « new » ne désigne que le dernier import
    if (fresh) {
      const unflagged = await prisma.listing.updateMany({ where: { isNew: true }, data: { isNew: false } });
      if (unflagged.count) console.log(`Flag « new » retiré de ${unflagged.count} annonces du précédent import`);
    }
    let created = 0;
    for (let i = 0; i < data.length; i += 1000) {
      const res = await prisma.listing.createMany({ data: data.slice(i, i + 1000), skipDuplicates: true });
      created += res.count;
    }
    console.log(`Ajoutées : ${created} (dont « new » : ${fresh})`);
  }

  // infos du format fusion sur les annonces déjà présentes (source, zone, doublons) ; le reste n'est pas touché
  const meta = all.filter((r) => "Sources" in r && existing.has(r["Lien"]));
  if (meta.length) {
    const n = await prisma.$executeRaw`
      UPDATE "Listing" l SET source = v.source, zone = v.zone, "zoneDist" = v.dist,
        others = CASE WHEN v.others = '' THEN ARRAY[]::text[] ELSE string_to_array(v.others, ' ') END, "duplicateOf" = NULL
      FROM unnest(${meta.map((r) => r["Lien"])}::text[], ${meta.map((r) => r["Sources"] || null)}::text[],
                  ${meta.map((r) => r["Zone"] || null)}::text[], ${meta.map((r) => Number(r["Dist. zone (km)"]) || null)}::int[],
                  ${meta.map((r) => othersOf(r).join(" "))}::text[]) AS v(url, source, zone, dist, others)
      WHERE l.url = v.url`;
    console.log(`Infos source / zone / doublons mises à jour : ${n}`);
  }

  if (dupOf.size) {
    const n = await prisma.$executeRaw`
      UPDATE "Listing" d SET "duplicateOf" = p.id, "isNew" = false
      FROM unnest(${[...dupOf.keys()]}::text[], ${[...dupOf.values()]}::text[]) AS v(dup, main)
      JOIN "Listing" p ON p.url = v.main
      WHERE d.url = v.dup AND d.id <> p.id`;
    console.log(`Doublons masqués : ${n}`);

    // les avis posés sur un doublon passent sur l'annonce principale (sauf si la personne l'a déjà notée)
    const reviews = await prisma.review.findMany({
      where: { listing: { duplicateOf: { not: null } } },
      include: { listing: { select: { duplicateOf: true } } },
    });
    let moved = 0;
    const kept: string[] = [];
    for (const r of reviews) {
      const target = r.listing.duplicateOf!;
      const clash = await prisma.review.findUnique({ where: { listingId_author: { listingId: target, author: r.author } } });
      if (clash) kept.push(`${r.author} (annonce ${r.listingId} → ${target})`);
      else {
        await prisma.review.update({ where: { id: r.id }, data: { listingId: target } });
        moved++;
      }
    }
    if (moved) console.log(`Avis rattachés à l'annonce principale : ${moved}`);
    if (kept.length) console.log(`Avis laissés sur le doublon (déjà noté sur la principale) : ${kept.join(", ")}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
