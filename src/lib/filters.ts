import { dateOf, type Agg, type Listing } from "./types";

export type Filters = {
  q: string;
  nw: boolean; // seulement le dernier import
  zn: string; // "" | main | band
  src: string; // "" | lbc | bienici
  tr: string[];
  type: string[];
  pmin: number | null;
  pmax: number | null;
  smin: number | null;
  smax: number | null;
  m2max: number | null;
  dep: string[];
  fmin: number | null;
  fmax: number | null;
  funk: boolean; // inclure étage inconnu
  elev: string; // "" | "oui" | "non"
  acc: string[];
  dpe: string[];
  sel: string[];
  days: number | null;
  seen: string; // "" | unseen | seen | unseenme | seenme
  nmin: number | null;
  nmax: number | null;
  fav: string; // "" | any | me
  by: string;
  sort: string;
};

export const EMPTY: Filters = {
  q: "",
  nw: false,
  zn: "",
  src: "",
  tr: [],
  type: [],
  pmin: null,
  pmax: null,
  smin: null,
  smax: null,
  m2max: null,
  dep: [],
  fmin: null,
  fmax: null,
  funk: false,
  elev: "",
  acc: [],
  dpe: [],
  sel: [],
  days: null,
  seen: "",
  nmin: null,
  nmax: null,
  fav: "",
  by: "",
  sort: "recent",
};

const ARR = ["tr", "type", "dep", "acc", "dpe", "sel"] as const;
const NUM = ["pmin", "pmax", "smin", "smax", "m2max", "fmin", "fmax", "days", "nmin", "nmax"] as const;
const STR = ["q", "zn", "src", "elev", "seen", "fav", "by", "sort"] as const;

export function parseFilters(sp: URLSearchParams): Filters {
  const f: Filters = { ...EMPTY };
  for (const k of ARR) f[k] = sp.get(k)?.split(",").filter(Boolean) ?? [];
  for (const k of NUM) {
    const v = sp.get(k);
    f[k] = v !== null && v !== "" && !isNaN(Number(v)) ? Number(v) : null;
  }
  for (const k of STR) f[k] = sp.get(k) ?? EMPTY[k];
  f.funk = sp.get("funk") === "1";
  f.nw = sp.get("new") === "1";
  return f;
}

export function toSearch(f: Filters): string {
  const sp = new URLSearchParams();
  for (const k of ARR) if (f[k].length) sp.set(k, f[k].join(","));
  for (const k of NUM) if (f[k] !== null) sp.set(k, String(f[k]));
  for (const k of STR) if (f[k] && f[k] !== EMPTY[k]) sp.set(k, f[k]);
  if (f.funk) sp.set("funk", "1");
  if (f.nw) sp.set("new", "1");
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function matches(l: Listing, a: Agg, f: Filters, me: string): boolean {
  if (f.nw && !l.isNew) return false;
  if (f.zn === "main" && l.zone === "Bande +100 km") return false;
  if (f.zn === "band" && l.zone !== "Bande +100 km") return false;
  if (f.src === "lbc" && l.source !== null && !l.source.includes("leboncoin")) return false;
  if (f.src === "bienici" && !l.source?.includes("Bien'ici")) return false;
  if (f.tr.length && !f.tr.includes(l.transaction)) return false;
  if (f.type.length && !f.type.includes(l.type)) return false;
  if (f.pmin !== null && l.price < f.pmin) return false;
  if (f.pmax !== null && l.price > f.pmax) return false;
  if (f.smin !== null && l.surface < f.smin) return false;
  if (f.smax !== null && l.surface > f.smax) return false;
  if (f.m2max !== null && (!l.surface || l.price / l.surface > f.m2max)) return false;
  if (f.dep.length && !f.dep.includes(l.department)) return false;
  if (f.fmin !== null || f.fmax !== null) {
    if (l.floor === null) {
      if (!f.funk) return false;
    } else {
      if (f.fmin !== null && l.floor < f.fmin) return false;
      if (f.fmax !== null && l.floor > f.fmax) return false;
    }
  }
  if (f.elev === "oui" && l.elevator !== true) return false;
  if (f.elev === "non" && l.elevator !== false) return false;
  if (f.acc.length && !f.acc.includes(l.access)) return false;
  if (f.dpe.length && !f.dpe.includes(l.dpe ?? "?")) return false;
  if (f.sel.length && !f.sel.includes(l.seller)) return false;
  if (f.days !== null) {
    const limit = Date.now() - f.days * 86400000;
    if (new Date(dateOf(l)).getTime() < limit) return false;
  }
  const mine = a.reviews.find((r) => r.author === me);
  const seenByMe = mine?.score != null;
  if (f.seen === "unseen" && a.scored.length) return false;
  if (f.seen === "seen" && !a.scored.length) return false;
  if (f.seen === "unseenme" && seenByMe) return false;
  if (f.seen === "seenme" && !seenByMe) return false;
  if (f.seen === "debate" && (a.scored.length < 2 || a.spread < 4)) return false;
  if (f.nmin !== null && (a.avg === null || a.avg < f.nmin)) return false;
  if (f.nmax !== null && (a.avg === null || a.avg > f.nmax)) return false;
  if (f.fav === "any" && !a.favCount) return false;
  if (f.fav === "me" && !mine?.favorite) return false;
  if (f.by && !a.reviews.some((r) => r.author === f.by && r.score != null)) return false;
  if (f.q) {
    const terms = norm(f.q).split(/\s+/).filter(Boolean);
    const hay = norm(`${l.city} ${l.postalCode} ${l.department} ${l.title}`);
    if (!terms.every((t) => hay.includes(t))) return false;
  }
  return true;
}

export const SORTS: { value: string; label: string }[] = [
  { value: "recent", label: "Plus récentes" },
  { value: "price", label: "Prix croissant" },
  { value: "-price", label: "Prix décroissant" },
  { value: "m2", label: "€/m² croissant" },
  { value: "-surface", label: "Surface décroissante" },
  { value: "-score", label: "Mieux notées" },
  { value: "score", label: "Moins bien notées" },
  { value: "reviewed", label: "Notées récemment" },
];

export function sortListings(list: Listing[], aggs: Map<number, Agg>, sort: string) {
  const s = [...list];
  const avg = (l: Listing) => aggs.get(l.id)?.avg ?? null;
  switch (sort) {
    case "price":
      return s.sort((a, b) => a.price - b.price);
    case "-price":
      return s.sort((a, b) => b.price - a.price);
    case "m2":
      return s.sort((a, b) => a.price / (a.surface || 1) - b.price / (b.surface || 1));
    case "-surface":
      return s.sort((a, b) => b.surface - a.surface);
    case "-score":
      return s.sort((a, b) => (avg(b) ?? -1) - (avg(a) ?? -1));
    case "score":
      return s.sort((a, b) => (avg(a) ?? 99) - (avg(b) ?? 99));
    case "reviewed":
      return s.sort((a, b) => (aggs.get(b.id)?.lastAt ?? "").localeCompare(aggs.get(a.id)?.lastAt ?? ""));
    default:
      return s.sort((a, b) => dateOf(b).localeCompare(dateOf(a)) || b.id - a.id);
  }
}

export const SEEN_LABELS: Record<string, string> = {
  unseen: "Jamais notées",
  seen: "Déjà notées",
  unseenme: "Pas notées par moi",
  seenme: "Notées par moi",
  debate: "Avis partagés",
};

const k = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));
const floorName = (n: number) => (n === 0 ? "RDC" : `${n}e`);

// pastilles des filtres actifs, avec la façon de les retirer
export function activeChips(f: Filters): { label: string; clear: Partial<Filters> }[] {
  const c: { label: string; clear: Partial<Filters> }[] = [];
  if (f.nw) c.push({ label: "Nouvelles", clear: { nw: false } });
  if (f.zn) c.push({ label: f.zn === "main" ? "Zone principale" : "Bande +100 km", clear: { zn: "" } });
  if (f.src) c.push({ label: f.src === "lbc" ? "leboncoin" : "Bien'ici", clear: { src: "" } });
  if (f.q) c.push({ label: `« ${f.q} »`, clear: { q: "" } });
  if (f.tr.length) c.push({ label: f.tr.join(" / "), clear: { tr: [] } });
  if (f.type.length) c.push({ label: f.type.join(" / "), clear: { type: [] } });
  if (f.pmin !== null || f.pmax !== null)
    c.push({
      label: f.pmin !== null && f.pmax !== null ? `${k(f.pmin)}–${k(f.pmax)} €` : f.pmin !== null ? `≥ ${k(f.pmin)} €` : `≤ ${k(f.pmax!)} €`,
      clear: { pmin: null, pmax: null },
    });
  if (f.smin !== null || f.smax !== null)
    c.push({
      label: f.smin !== null && f.smax !== null ? `${f.smin}–${f.smax} m²` : f.smin !== null ? `≥ ${f.smin} m²` : `≤ ${f.smax} m²`,
      clear: { smin: null, smax: null },
    });
  if (f.m2max !== null) c.push({ label: `≤ ${k(f.m2max)} €/m²`, clear: { m2max: null } });
  for (const d of f.dep) c.push({ label: d, clear: { dep: f.dep.filter((x) => x !== d) } });
  if (f.fmin !== null || f.fmax !== null) {
    const lbl =
      f.fmin !== null && f.fmax !== null
        ? f.fmin === f.fmax
          ? `Étage ${floorName(f.fmin)}`
          : `Étage ${floorName(f.fmin)}–${floorName(f.fmax)}`
        : f.fmax !== null
          ? `Étage ≤ ${floorName(f.fmax)}`
          : `Étage ≥ ${floorName(f.fmin!)}`;
    c.push({ label: lbl + (f.funk ? " (+ inconnus)" : ""), clear: { fmin: null, fmax: null, funk: false } });
  }
  if (f.elev) c.push({ label: f.elev === "oui" ? "Avec ascenseur" : "Sans ascenseur", clear: { elev: "" } });
  if (f.acc.length) c.push({ label: f.acc.join(" / "), clear: { acc: [] } });
  if (f.dpe.length) c.push({ label: `DPE ${f.dpe.join(", ")}`, clear: { dpe: [] } });
  if (f.sel.length) c.push({ label: f.sel.join(" / "), clear: { sel: [] } });
  if (f.days !== null) c.push({ label: `< ${f.days} j`, clear: { days: null } });
  if (f.seen) c.push({ label: SEEN_LABELS[f.seen] ?? f.seen, clear: { seen: "" } });
  if (f.nmin !== null || f.nmax !== null)
    c.push({
      label: f.nmin !== null && f.nmax !== null ? `Note ${f.nmin}–${f.nmax}` : f.nmin !== null ? `Note ≥ ${f.nmin}` : `Note ≤ ${f.nmax}`,
      clear: { nmin: null, nmax: null },
    });
  if (f.fav) c.push({ label: f.fav === "me" ? "Mes coups de cœur" : "Coups de cœur", clear: { fav: "" } });
  if (f.by) c.push({ label: `Noté par ${f.by}`, clear: { by: "" } });
  return c;
}
