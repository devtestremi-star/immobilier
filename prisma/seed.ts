// Import des CSV (dossier CSV/) + géocodage par code postal / ville via geo.api.gouv.fr
// Usage : pnpm db:seed   (n'ajoute que les annonces absentes, ne touche pas aux notes)
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

async function main() {
  const files = fs.readdirSync(CSV_DIR).filter((f) => f.toLowerCase().endsWith(".csv")).sort();
  const byUrl = new Map<string, Row>();
  for (const f of files) {
    const rows: Row[] = parse(fs.readFileSync(path.join(CSV_DIR, f)), {
      bom: true,
      columns: true,
      delimiter: ";",
      skip_empty_lines: true,
      trim: true,
    });
    for (const r of rows) if (r["Lien"]) byUrl.set(r["Lien"], r);
    console.log(`${f} : ${rows.length} lignes`);
  }
  const rows = [...byUrl.values()];
  console.log(`${rows.length} annonces uniques`);

  const locate = await geocode(rows);
  let exact = 0;

  const data = rows.map((r) => {
    const { floor, total } = parseFloor(r["Étage"]);
    const access = r["Statut accès"];
    const pos = locate(r["Code postal"], r["Ville"]);
    if (pos) exact++;
    const [dx, dy] = jitter(r["Lien"]);
    return {
      url: r["Lien"],
      transaction: r["Transaction"],
      access,
      type: r["Type"],
      price: Number(r["Prix (€)"]) || 0,
      city: r["Ville"],
      postalCode: r["Code postal"],
      department: r["Département"],
      surface: Number(r["Surface (m²)"].replace(",", ".")) || 0,
      floorRaw: r["Étage"] || null,
      // plain-pied / RDC confirmés sans étage renseigné = 0
      floor: floor ?? (/Plain-pied|RDC/.test(access) ? 0 : null),
      floorsTotal: total,
      elevator: r["Ascenseur"] === "Oui" ? true : r["Ascenseur"] === "Non" ? false : null,
      dpe: r["DPE"] || null,
      seller: r["Vendeur"],
      publishedAt: new Date(r["Publiée le"]),
      title: r["Titre"],
      lng: pos ? pos[0] + dx : null,
      lat: pos ? pos[1] + dy : null,
    };
  });
  console.log(`Positionnées : ${exact}/${rows.length}`);

  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL }) });
  let created = 0;
  for (let i = 0; i < data.length; i += 1000) {
    const res = await prisma.listing.createMany({ data: data.slice(i, i + 1000), skipDuplicates: true });
    created += res.count;
  }
  console.log(`Ajoutées : ${created} (déjà présentes : ${data.length - created})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
