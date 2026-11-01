export type Listing = {
  id: number;
  url: string;
  transaction: string;
  access: string;
  type: string;
  price: number;
  city: string;
  postalCode: string;
  department: string;
  surface: number;
  floorRaw: string | null;
  floor: number | null;
  floorsTotal: number | null;
  elevator: boolean | null;
  dpe: string | null;
  seller: string;
  publishedAt: string | null; // YYYY-MM-DD, absente chez Bien'ici
  addedAt: string; // date d'import
  title: string;
  lat: number | null;
  lng: number | null;
  isNew: boolean; // ajoutée lors du dernier import
  source: string | null; // leboncoin | Bien'ici | Bien'ici + leboncoin
  zone: string | null; // Zone principale | Bande +100 km
  zoneDist: number | null;
  others: string[]; // autres annonces du même logement
};

// date de publication, à défaut date d'import
export const dateOf = (l: Listing) => l.publishedAt ?? l.addedAt;

export type Review = {
  id: number;
  listingId: number;
  author: string;
  score: number | null;
  comment: string | null;
  favorite: boolean;
  updatedAt: string;
};

export type Agg = {
  reviews: Review[];
  scored: Review[];
  avg: number | null;
  favCount: number;
  spread: number; // écart max - min des notes
  lastAt: string | null;
};
