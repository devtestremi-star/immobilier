"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { aggOf, useData } from "./DataProvider";
import { OthersReviews, RatingForm } from "./RatingForm";
import { DpeBadge, ElevatorIcon, ExternalIcon, Heart, NewBadge, ScoreBadge, StairsIcon } from "./ui";
import { useFiltered, useFilters } from "./useFilters";
import { floorLabel, perM2, priceLabel } from "@/lib/format";

const MiniMap = dynamic(() => import("./MiniMap"), { ssr: false, loading: () => <div className="h-full bg-slate-800" /> });

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-800/60 px-3 py-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-medium text-slate-100">{children}</div>
    </div>
  );
}

const siteName = (url: string) => (url.includes("bienici") ? "Bien'ici" : url.includes("leboncoin") ? "leboncoin" : new URL(url).hostname);

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { byId, aggs, me, loading, openListing } = useData();
  const { f, search } = useFilters();
  const results = useFiltered(f);
  const l = byId.get(Number(id));

  if (loading) return <div className="m-auto p-10 text-slate-500">Chargement…</div>;
  if (!l)
    return (
      <div className="m-auto p-10 text-center">
        <p className="text-slate-300">Offre introuvable.</p>
        <Link href="/" className="mt-2 inline-block text-indigo-400">
          ← Retour aux offres
        </Link>
      </div>
    );

  const a = aggOf(aggs, l.id);
  const idx = results.findIndex((x) => x.id === l.id);
  const prev = idx > 0 ? results[idx - 1] : null;
  const next = idx >= 0 && idx < results.length - 1 ? results[idx + 1] : null;
  const navBtn = "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium";

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-6 sm:py-5">
      <div className="mb-3 flex items-center gap-2">
        <Link href={`/${search}`} className={`${navBtn} -ml-2 text-slate-300 hover:bg-slate-800`}>
          ← Offres
        </Link>
        {idx >= 0 && (
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 text-xs text-slate-500 tabular-nums">
              {idx + 1} / {results.length}
            </span>
            {prev ? (
              <Link href={`/offre/${prev.id}${search}`} className={`${navBtn} border border-slate-800 bg-slate-900 hover:bg-slate-800`}>
                ‹ <span className="hidden sm:inline">Précédente</span>
              </Link>
            ) : null}
            {next ? (
              <Link href={`/offre/${next.id}${search}`} className={`${navBtn} border border-slate-800 bg-slate-900 hover:bg-slate-800`}>
                <span className="hidden sm:inline">Suivante</span> ›
              </Link>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px] lg:items-start">
        <div className="space-y-4 lg:col-start-1">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  {l.isNew && <NewBadge />}
                  <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${l.transaction === "Achat" ? "bg-emerald-500/15 text-emerald-400" : "bg-sky-500/15 text-sky-300"}`}>
                    {l.transaction}
                  </span>
                  <span className="text-xs text-slate-500">
                    {l.publishedAt ? `Publiée le ${new Date(l.publishedAt).toLocaleDateString("fr-FR")}` : `Ajoutée le ${new Date(l.addedAt).toLocaleDateString("fr-FR")}`}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tabular-nums sm:text-3xl">{priceLabel(l.price, l.transaction)}</h1>
                <p className="mt-0.5 text-lg font-medium text-slate-200">
                  {l.city} <span className="font-normal text-slate-500">· {l.postalCode} · {l.department}{l.zone === "Bande +100 km" ? " (+100 km)" : ""}</span>
                </p>
                {l.title && <p className="mt-1 text-slate-400">{l.title}</p>}
              </div>
              {a.avg !== null && (
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <ScoreBadge score={a.avg} size="lg" />
                  <span className="text-xs text-slate-400">{a.scored.length} avis</span>
                </div>
              )}
            </div>

            <button
              onClick={() => openListing(l)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3.5 font-semibold text-slate-900 hover:bg-white"
            >
              Voir l&apos;annonce sur {siteName(l.url)} <ExternalIcon />
            </button>
            {l.others.length > 0 && (
              <div className="mt-2 text-sm text-slate-400">
                Même logement publié ailleurs :{" "}
                {l.others.map((u, i) => (
                  <span key={u}>
                    {i > 0 && ", "}
                    <a href={u} target="_blank" rel="noopener" className="text-indigo-400 hover:underline">
                      {siteName(u)}
                      {l.others.length > 1 && ` ${i + 1}`}
                    </a>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Fact label="Type">{l.type === "Appart" ? "Appartement" : "Maison"}</Fact>
              <Fact label="Surface">{l.surface.toLocaleString("fr-FR")} m²</Fact>
              {l.transaction === "Achat" && <Fact label="Prix au m²">{perM2(l.price, l.surface)}</Fact>}
              <Fact label="Étage">
                <span className="inline-flex items-center gap-1.5">
                  <StairsIcon className="h-4 w-4 text-slate-500" />
                  {floorLabel(l.floor, l.floorsTotal, l.floorRaw)}
                </span>
              </Fact>
              <Fact label="Ascenseur">
                <span className={`inline-flex items-center gap-1.5 ${l.elevator ? "text-emerald-400" : l.elevator === false ? "text-slate-400" : ""}`}>
                  <ElevatorIcon off={l.elevator === false} className={`h-4 w-4 ${l.elevator === null ? "text-slate-600" : ""}`} />
                  {l.elevator === null ? "?" : l.elevator ? "Oui" : "Non"}
                </span>
              </Fact>
              <Fact label="Accès">{l.access}</Fact>
              <Fact label="DPE">{l.dpe ? <DpeBadge dpe={l.dpe} /> : "?"}</Fact>
              <Fact label="Vendeur">{l.seller}</Fact>
              {a.favCount > 0 && (
                <Fact label="Coups de cœur">
                  <span className="flex items-center gap-1 text-rose-500">
                    <Heart on className="h-4 w-4" /> {a.favCount}
                  </span>
                </Fact>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
            <h2 className="mb-3 font-semibold">Mon avis</h2>
            <RatingForm key={`${l.id}:${me}`} listingId={l.id} />
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
            <h2 className="mb-3 font-semibold">Avis des autres</h2>
            <OthersReviews listingId={l.id} />
          </section>
          {next && (
            <Link
              href={`/offre/${next.id}${search}`}
              className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800"
            >
              <span className="text-sm text-slate-400">Offre suivante</span>
              <span className="font-medium">
                {priceLabel(next.price, next.transaction)} · {next.city} ›
              </span>
            </Link>
          )}
        </div>

        {l.lat !== null && l.lng !== null && (
          <section className="overflow-hidden rounded-2xl lg:col-start-1 border border-slate-800 bg-slate-900">
            <div className="h-56 sm:h-64">
              <MiniMap lat={l.lat} lng={l.lng} />
            </div>
            <p className="px-4 py-2 text-xs text-slate-400">Position approximative (centre de la commune).</p>
          </section>
        )}
      </div>
    </div>
  );
}
