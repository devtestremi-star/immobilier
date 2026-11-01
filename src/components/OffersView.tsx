"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { activeChips, SORTS } from "@/lib/filters";
import { useData } from "./DataProvider";
import { FilterPanel, SearchBox } from "./FilterPanel";
import { ListingCard } from "./ListingCard";
import { Sheet } from "./ui";
import { useFiltered, useFilters } from "./useFilters";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-slate-400">Chargement de la carte…</div>,
});

const PAGE = 40;
// mémorise combien de cartes étaient affichées, pour retrouver sa place au retour d'une fiche
const shownMemory = new Map<string, number>();

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export function OffersView({ mode }: { mode: "list" | "map" }) {
  const { loading, error, listings, reload } = useData();
  const { f, update, reset, search } = useFilters();
  const results = useFiltered(f);
  const chips = activeChips(f);
  const [sheet, setSheet] = useState(false);
  const [shown, setShown] = useState(() => shownMemory.get(search) ?? PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  const [prevSearch, setPrevSearch] = useState(search);
  if (prevSearch !== search) {
    setPrevSearch(search);
    setShown(shownMemory.get(search) ?? PAGE);
  }

  useEffect(() => {
    shownMemory.set(search, shown);
  }, [search, shown]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setShown((s) => s + PAGE), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [mode, results.length]);

  const fitKey = search.replace(/[?&]sort=[^&]*/, "");

  const chipsRow = chips.length > 0 && (
    <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
      {chips.map((c) => (
        <button
          key={c.label}
          onClick={() => update(c.clear)}
          className="flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-2 text-sm text-indigo-700 hover:bg-indigo-100"
        >
          {c.label}
          <span className="text-indigo-400">✕</span>
        </button>
      ))}
      <button onClick={reset} className="shrink-0 px-2 text-sm text-slate-500 underline-offset-2 hover:underline">
        Tout effacer
      </button>
    </div>
  );

  const sidebar = (
    <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="sticky top-14 h-[calc(100dvh-3.5rem)] overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="font-semibold">Filtres</h2>
          {chips.length > 0 && (
            <button onClick={reset} className="text-sm text-indigo-600 hover:underline">
              Réinitialiser
            </button>
          )}
        </div>
        <FilterPanel f={f} update={update} />
      </div>
    </aside>
  );

  const toolbar = (
    <div className="flex items-center gap-2">
      <SearchBox value={f.q} onChange={(q) => update({ q })} />
      <button
        onClick={() => setSheet(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium lg:hidden"
      >
        <FilterIcon />
        Filtres
        {chips.length > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-xs text-white">{chips.length}</span>}
      </button>
    </div>
  );

  const count = (
    <span className="text-sm text-slate-600">
      <span className="font-semibold text-slate-900">{results.length.toLocaleString("fr-FR")}</span> offre{results.length > 1 ? "s" : ""}
      {results.length !== listings.length && <span className="text-slate-400"> sur {listings.length.toLocaleString("fr-FR")}</span>}
    </span>
  );

  const mobileSheet = (
    <Sheet
      open={sheet}
      onClose={() => setSheet(false)}
      full
      title={
        <div className="flex items-center justify-between pr-2">
          <span>Filtres</span>
          {chips.length > 0 && (
            <button onClick={reset} className="text-sm font-normal text-indigo-600">
              Réinitialiser
            </button>
          )}
        </div>
      }
      footer={
        <button onClick={() => setSheet(false)} className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white">
          Voir {results.length.toLocaleString("fr-FR")} offre{results.length > 1 ? "s" : ""}
        </button>
      }
    >
      <FilterPanel f={f} update={update} />
    </Sheet>
  );

  if (error && !listings.length)
    return (
      <div className="m-auto p-8 text-center">
        <p className="mb-3 text-slate-600">Impossible de charger les offres ({error}).</p>
        <button onClick={reload} className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white">
          Réessayer
        </button>
      </div>
    );

  if (mode === "map")
    return (
      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        {sidebar}
        <div className="relative flex h-[calc(100dvh-3.5rem-4rem-env(safe-area-inset-bottom))] flex-1 flex-col sm:h-[calc(100dvh-3.5rem)]">
          <div className="absolute inset-x-2 top-2 z-10 space-y-2 sm:inset-x-3 sm:top-3 sm:max-w-xl lg:max-w-md">
            <div className="rounded-2xl bg-white/95 p-2 shadow-lg">
              {toolbar}
              <div className="px-1 pt-1.5">{loading ? <span className="text-sm text-slate-400">Chargement…</span> : count}</div>
            </div>
            {chips.length > 0 && <div className="rounded-2xl bg-white/95 p-2 shadow-lg">{chipsRow}</div>}
          </div>
          <MapView listings={results} search={search} fitKey={fitKey} />
        </div>
        {mobileSheet}
      </div>
    );

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1">
      {sidebar}
      <main className="min-w-0 flex-1 px-3 py-3 sm:px-6 sm:py-5">
        <div className="sticky top-14 z-20 -mx-3 space-y-2 bg-slate-50/95 px-3 pb-2 pt-1 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
          {toolbar}
          {chipsRow}
        </div>
        <div className="mb-3 mt-1 flex items-center justify-between gap-2">
          {loading ? <span className="text-sm text-slate-400">Chargement des offres…</span> : count}
          <select
            value={f.sort}
            onChange={(e) => update({ sort: e.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200/60" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <p className="text-slate-600">Aucune offre ne correspond à ces filtres.</p>
            <button onClick={reset} className="mt-3 text-sm font-medium text-indigo-600 hover:underline">
              Effacer les filtres
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
              {results.slice(0, shown).map((l) => (
                <ListingCard key={l.id} l={l} search={search} />
              ))}
            </div>
            {shown < results.length && (
              <div ref={sentinel} className="py-6 text-center">
                <button onClick={() => setShown((s) => s + PAGE)} className="text-sm text-slate-500">
                  Afficher plus…
                </button>
              </div>
            )}
          </>
        )}
      </main>
      {mobileSheet}
    </div>
  );
}
