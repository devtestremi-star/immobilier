"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { saveReview } from "@/app/actions";
import type { Agg, Listing, Review } from "@/lib/types";

type Ctx = {
  loading: boolean;
  error: string | null;
  listings: Listing[];
  byId: Map<number, Listing>;
  aggs: Map<number, Agg>;
  reviews: Review[];
  authors: string[];
  me: string;
  setMe: (name: string) => void;
  save: (listingId: number, v: { score: number | null; comment: string; favorite: boolean }) => Promise<void>;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
  // annonce ouverte dans un autre onglet → on propose de la noter au retour
  pending: number | null;
  openListing: (l: Listing) => void;
  clearPending: () => void;
};

const DataContext = createContext<Ctx | null>(null);
export const useData = () => {
  const c = useContext(DataContext);
  if (!c) throw new Error("DataProvider manquant");
  return c;
};

const EMPTY_AGG: Agg = { reviews: [], scored: [], avg: null, favCount: 0, spread: 0, lastAt: null };
export const aggOf = (aggs: Map<number, Agg>, id: number) => aggs.get(id) ?? EMPTY_AGG;

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMeState] = useState("");
  const [pending, setPending] = useState<number | null>(null);

  const loadReviews = useCallback(async () => {
    const res = await fetch("/api/reviews", { cache: "no-store" });
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    setReviews(await res.json());
  }, []);

  const refresh = useCallback(async () => {
    try {
      await loadReviews();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    }
  }, [loadReviews]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [res] = await Promise.all([fetch("/api/listings"), loadReviews()]);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setListings(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [loadReviews]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture du localStorage au montage
    setMeState(localStorage.getItem("maison:me") ?? "");
    setPending(Number(sessionStorage.getItem("maison:pending")) || null);
    loadAll();
    // au retour sur l'onglet : on recharge les avis des autres
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > 15000) {
        last = Date.now();
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadAll, refresh]);

  const setMe = useCallback((name: string) => {
    const n = name.trim();
    localStorage.setItem("maison:me", n);
    setMeState(n);
  }, []);

  const openListing = useCallback((l: Listing) => {
    sessionStorage.setItem("maison:pending", String(l.id));
    setPending(l.id);
    window.open(l.url, "_blank", "noopener");
  }, []);

  const clearPending = useCallback(() => {
    sessionStorage.removeItem("maison:pending");
    setPending(null);
  }, []);

  const save = useCallback<Ctx["save"]>(
    async (listingId, v) => {
      if (!me) throw new Error("Prénom manquant");
      const saved = await saveReview({ listingId, author: me, ...v });
      setReviews((rs) => {
        const rest = rs.filter((r) => !(r.listingId === listingId && r.author === me));
        return saved ? [...rest, saved] : rest;
      });
    },
    [me],
  );

  const byId = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);

  const aggs = useMemo(() => {
    const m = new Map<number, Agg>();
    for (const r of reviews) {
      let a = m.get(r.listingId);
      if (!a) m.set(r.listingId, (a = { reviews: [], scored: [], avg: null, favCount: 0, spread: 0, lastAt: null }));
      a.reviews.push(r);
      if (r.score != null) a.scored.push(r);
      if (r.favorite) a.favCount++;
      if (!a.lastAt || r.updatedAt > a.lastAt) a.lastAt = r.updatedAt;
    }
    for (const a of m.values()) {
      a.reviews.sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
      if (a.scored.length) {
        const s = a.scored.map((r) => r.score!);
        a.avg = s.reduce((x, y) => x + y, 0) / s.length;
        a.spread = Math.max(...s) - Math.min(...s);
      }
    }
    return m;
  }, [reviews]);

  const authors = useMemo(
    () => [...new Set(reviews.map((r) => r.author))].sort((a, b) => a.localeCompare(b, "fr")),
    [reviews],
  );

  const value = useMemo<Ctx>(
    () => ({ loading, error, listings, byId, aggs, reviews, authors, me, setMe, save, refresh, reload: loadAll, pending, openListing, clearPending }),
    [loading, error, listings, byId, aggs, reviews, authors, me, setMe, save, refresh, loadAll, pending, openListing, clearPending],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
