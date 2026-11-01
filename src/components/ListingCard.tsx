"use client";

import Link from "next/link";
import { aggOf, useData } from "./DataProvider";
import { DpeBadge, ExternalIcon, Heart, ScoreBadge } from "./ui";
import { floorLabel, perM2, priceLabel } from "@/lib/format";
import type { Listing } from "@/lib/types";

export function ListingFacts({ l }: { l: Listing }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
      <span>{l.type === "Appart" ? "Appartement" : "Maison"}</span>
      <span className="text-slate-300">·</span>
      <span className="font-medium text-slate-800">{l.surface.toLocaleString("fr-FR")} m²</span>
      {l.type === "Appart" || l.floor !== null ? (
        <>
          <span className="text-slate-300">·</span>
          <span className={l.floor === null ? "text-slate-400" : ""}>{floorLabel(l.floor, l.floorsTotal, l.floorRaw)}</span>
        </>
      ) : null}
      {l.elevator !== null && (
        <>
          <span className="text-slate-300">·</span>
          <span>{l.elevator ? "Ascenseur" : "Sans asc."}</span>
        </>
      )}
      <DpeBadge dpe={l.dpe} />
    </div>
  );
}

export function ListingCard({ l, search = "" }: { l: Listing; search?: string }) {
  const { aggs, me, openListing } = useData();
  const a = aggOf(aggs, l.id);
  const mine = a.reviews.find((r) => r.author === me);
  const seen = a.scored.length > 0;

  return (
    <article className={`group relative flex gap-3 rounded-2xl border bg-white p-3 transition-shadow hover:shadow-md sm:p-4 ${seen ? "border-slate-200" : "border-indigo-100 ring-1 ring-indigo-50"}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tabular-nums text-slate-900">{priceLabel(l.price, l.transaction)}</span>
              {l.transaction === "Achat" && <span className="text-xs text-slate-400">{perM2(l.price, l.surface)}</span>}
            </div>
            <Link href={`/offre/${l.id}${search}`} className="block truncate font-medium text-slate-800 after:absolute after:inset-0 hover:text-indigo-700">
              {l.city} <span className="font-normal text-slate-400">({l.postalCode})</span>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {a.favCount > 0 && (
              <span className={`flex items-center gap-0.5 text-sm ${mine?.favorite ? "text-rose-500" : "text-rose-300"}`} title={`${a.favCount} coup(s) de cœur`}>
                <Heart on className="h-4 w-4" />
                {a.favCount > 1 && <span className="text-xs font-semibold">{a.favCount}</span>}
              </span>
            )}
            {a.avg !== null ? (
              <ScoreBadge score={a.avg} title={`${a.scored.length} note(s)`} />
            ) : (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">Nouveau</span>
            )}
          </div>
        </div>

        <div className="mt-1.5">
          <ListingFacts l={l} />
        </div>
        <p className="mt-1 truncate text-sm text-slate-500">{l.title}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${l.transaction === "Achat" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>
            {l.transaction}
          </span>
          <span className="text-xs text-slate-400">{l.department} · {new Date(l.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
          {a.scored.length > 0 && (
            <span className="text-xs text-slate-500">
              {a.scored.length} avis{mine?.score != null ? ` · toi : ${mine.score}` : ""}
            </span>
          )}
          <button
            onClick={() => openListing(l)}
            className="relative z-10 ml-auto inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Annonce <ExternalIcon />
          </button>
        </div>
      </div>
    </article>
  );
}
