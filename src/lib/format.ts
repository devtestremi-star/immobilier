export const euro = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";

export const priceLabel = (price: number, transaction: string) =>
  euro(price) + (transaction === "Location" ? "/mois" : "");

export const perM2 = (price: number, surface: number) =>
  surface ? Math.round(price / surface).toLocaleString("fr-FR") + " €/m²" : "";

export const floorLabel = (floor: number | null, total: number | null, raw: string | null) => {
  if (floor === null) return raw || "Étage ?";
  const f = floor === 0 ? "RDC" : `${floor}e étage`;
  return total ? `${f} / ${total}` : f;
};

// rouge (1) → vert (10)
export const scoreHue = (s: number) => Math.round(((Math.min(10, Math.max(1, s)) - 1) / 9) * 125);
export const scoreBg = (s: number) => `hsl(${scoreHue(s)} 70% 42%)`;
export const scoreSoft = (s: number) => `hsl(${scoreHue(s)} 75% 94%)`;

export const fmtAvg = (n: number) => (Math.round(n * 10) / 10).toLocaleString("fr-FR");

export const ago = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "à l'instant";
  if (d < 3600) return `il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`;
  if (d < 86400 * 30) return `il y a ${Math.floor(d / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
};

export const DPE_COLORS: Record<string, string> = {
  A: "#00a06d",
  B: "#52b153",
  C: "#a5cc74",
  D: "#f4e70f",
  E: "#f0b50f",
  F: "#eb8235",
  G: "#d7221f",
};
