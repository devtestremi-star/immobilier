"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { EMPTY, matches, parseFilters, sortListings, toSearch, type Filters } from "@/lib/filters";
import { aggOf, useData } from "./DataProvider";

export function useFilters() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const search = sp.toString();
  const f = useMemo(() => parseFilters(new URLSearchParams(search)), [search]);

  const update = useCallback(
    (patch: Partial<Filters>) => {
      // on repart de l'URL courante pour ne pas écraser un filtre modifié entre-temps
      const next = { ...parseFilters(new URLSearchParams(window.location.search)), ...patch };
      router.replace(`${pathname}${toSearch(next)}`, { scroll: false });
    },
    [pathname, router],
  );

  const reset = useCallback(() => router.replace(`${pathname}${toSearch({ ...EMPTY, sort: f.sort })}`, { scroll: false }), [f.sort, pathname, router]);

  return { f, update, reset, search: search ? `?${search}` : "" };
}

export function useFiltered(f: Filters) {
  const { listings, aggs, me } = useData();
  return useMemo(() => {
    const list = listings.filter((l) => matches(l, aggOf(aggs, l.id), f, me));
    return sortListings(list, aggs, f.sort);
  }, [listings, aggs, me, f]);
}
