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
  publishedAt: string; // YYYY-MM-DD
  title: string;
  lat: number | null;
  lng: number | null;
};

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
