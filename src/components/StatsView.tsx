"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "./DataProvider";
import { Heart, NewBadge, ScoreBadge } from "./ui";
import { ago, fmtAvg, priceLabel } from "@/lib/format";
import type { Listing } from "@/lib/types";

function Tile({ label, value, sub, href, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; href?: string; accent?: string }) {
  const body = (
    <>
      <div className="text-sm text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums sm:text-3xl ${accent ?? "text-slate-50"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </>
  );
  const cls = "block rounded-2xl border border-slate-800 bg-slate-900 p-4";
  return href ? (
    <Link href={href} className={`${cls} transition-shadow hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function MiniRow({ l, right }: { l: Listing; right: React.ReactNode }) {
  return (
    <li>
      <Link href={`/offre/${l.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-800">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {priceLabel(l.price, l.transaction)} · {l.city}
          </div>
          <div className="truncate text-xs text-slate-400">
            {l.type === "Appart" ? "Appart." : "Maison"} {l.surface} m² · {l.department}
          </div>
        </div>
        {right}
      </Link>
    </li>
  );
}

export function StatsView() {
  const { listings, reviews, aggs, me, byId, authors, loading } = useData();
  const [tr, setTr] = useState("");
  const [hoverBin, setHoverBin] = useState<number | null>(null);

  const s = useMemo(() => {
    const ls = tr ? listings.filter((l) => l.transaction === tr) : listings;
    const ids = new Set(ls.map((l) => l.id));
    const rs = reviews.filter((r) => ids.has(r.listingId));
    const scored = rs.filter((r) => r.score != null);
    const seenIds = new Set(scored.map((r) => r.listingId));
    const mineSeen = new Set(scored.filter((r) => r.author === me).map((r) => r.listingId));
    const favIds = new Set(rs.filter((r) => r.favorite).map((r) => r.listingId));

    const bins = Array.from({ length: 10 }, (_, i) => scored.filter((r) => r.score === i + 1).length);

    const deps = new Map<string, { total: number; seen: number; sum: number; n: number }>();
    for (const l of ls) {
      const d = deps.get(l.department) ?? { total: 0, seen: 0, sum: 0, n: 0 };
      d.total++;
      const a = aggs.get(l.id);
      if (a?.avg != null) {
        d.seen++;
        d.sum += a.avg;
        d.n++;
      }
      deps.set(l.department, d);
    }

    const people = authors
      .map((name) => {
        const mine = rs.filter((r) => r.author === name);
        const sc = mine.filter((r) => r.score != null);
        return {
          name,
          count: sc.length,
          avg: sc.length ? sc.reduce((x, r) => x + r.score!, 0) / sc.length : null,
          favs: mine.filter((r) => r.favorite).length,
          last: mine.reduce<string | null>((m, r) => (!m || r.updatedAt > m ? r.updatedAt : m), null),
        };
      })
      .filter((p) => p.count || p.favs)
      .sort((a, b) => b.count - a.count);

    const withAgg = ls.map((l) => ({ l, a: aggs.get(l.id) })).filter((x) => x.a?.avg != null);
    const top = [...withAgg].sort((x, y) => y.a!.avg! - x.a!.avg! || y.a!.scored.length - x.a!.scored.length).slice(0, 8);
    const debate = withAgg.filter((x) => x.a!.scored.length >= 2 && x.a!.spread >= 4).sort((x, y) => y.a!.spread - x.a!.spread);
    const favs = ls.filter((l) => favIds.has(l.id)).map((l) => ({ l, a: aggs.get(l.id)! })).sort((x, y) => y.a.favCount - x.a.favCount);
    const recent = [...rs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 12);

    return {
      total: ls.length,
      seen: seenIds.size,
      mineSeen: mineSeen.size,
      favCount: favIds.size,
      avg: scored.length ? scored.reduce((x, r) => x + r.score!, 0) / scored.length : null,
      reviewCount: scored.length,
      good: withAgg.filter((x) => x.a!.avg! >= 7).length,
      bins,
      deps: [...deps.entries()].sort((a, b) => b[1].total - a[1].total),
      people,
      top,
      debate,
      favs,
      recent,
      newTotal: ls.filter((l) => l.isNew).length,
      newSeen: ls.filter((l) => l.isNew && seenIds.has(l.id)).length,
    };
  }, [listings, reviews, aggs, me, authors, tr]);

  if (loading) return <div className="m-auto p-10 text-slate-500">Chargement…</div>;

  const pct = (n: number, d: number) => (!d ? 0 : n && n / d < 0.01 ? Math.round((n / d) * 1000) / 10 : Math.round((n / d) * 100));
  const q = (extra: string) => {
    const p = new URLSearchParams(extra);
    if (tr) p.set("tr", tr);
    const str = p.toString();
    return `/${str ? `?${str}` : ""}`;
  };
  const maxBin = Math.max(1, ...s.bins);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Tableau de bord</h1>
        <div className="flex rounded-xl bg-slate-800/70 p-1">
          {[
            ["", "Tout"],
            ["Achat", "Achat"],
            ["Location", "Location"],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTr(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tr === v ? "bg-slate-900 text-indigo-300 shadow-sm" : "text-slate-300"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {s.newTotal > 0 && (
        <Link
          href={q("new=1")}
          className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 transition-shadow hover:shadow-md"
        >
          <NewBadge />
          <span className="min-w-0 flex-1 text-sm text-amber-100">
            <b>{s.newTotal.toLocaleString("fr-FR")}</b> nouvelle{s.newTotal > 1 ? "s" : ""} annonce{s.newTotal > 1 ? "s" : ""} au dernier import
            <span className="text-amber-200/60"> · {s.newSeen.toLocaleString("fr-FR")} déjà notée{s.newSeen > 1 ? "s" : ""}</span>
          </span>
          <span className="shrink-0 text-sm font-medium text-amber-200">Voir →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Offres" value={s.total.toLocaleString("fr-FR")} href={q("")} />
        <Tile label="Vues (au moins 1 note)" value={s.seen.toLocaleString("fr-FR")} sub={`${pct(s.seen, s.total)} % du total`} href={q("seen=seen")} accent="text-indigo-300" />
        <Tile label="Restantes" value={(s.total - s.seen).toLocaleString("fr-FR")} sub="jamais notées" href={q("seen=unseen")} />
        <Tile
          label={me ? `Vues par ${me}` : "Vues par moi"}
          value={s.mineSeen.toLocaleString("fr-FR")}
          sub={`reste ${(s.total - s.mineSeen).toLocaleString("fr-FR")} pour toi`}
          href={q("seen=unseenme")}
        />
        <Tile
          label="Coups de cœur"
          value={
            <span className="flex items-center gap-2">
              <Heart on className="h-6 w-6 text-rose-500" />
              {s.favCount}
            </span>
          }
          href={q("fav=any")}
        />
        <Tile label="Note moyenne" value={s.avg !== null ? fmtAvg(s.avg) : "–"} sub={`${s.reviewCount} note${s.reviewCount > 1 ? "s" : ""} au total`} />
        <Tile label="Avis partagés" value={s.debate.length} sub="écart ≥ 4 points" href={q("seen=debate")} />
        <Tile label="Bien notées (≥ 7)" value={s.good} href={q("nmin=7&sort=-score")} accent="text-emerald-400" />
      </div>

      <Card title="Avancement">
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-800" title={`${s.seen} vues sur ${s.total}`}>
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${pct(s.seen, s.total)}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm text-slate-300">
          <span>
            <b className="text-slate-50">{pct(s.seen, s.total)} %</b> des offres ont été vues
          </span>
          <span>{(s.total - s.seen).toLocaleString("fr-FR")} restantes</span>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Répartition des notes" right={hoverBin !== null && <span className="text-sm text-slate-300">Note {hoverBin + 1} : <b>{s.bins[hoverBin]}</b></span>}>
          {s.reviewCount === 0 ? (
            <p className="text-sm text-slate-500">Pas encore de note.</p>
          ) : (
            <div>
              <div className="flex h-40 items-end gap-[2px]" onMouseLeave={() => setHoverBin(null)}>
                {s.bins.map((n, i) => (
                  <Link
                    key={i}
                    href={q(`nmin=${i + 1}&nmax=${i + 1}`)}
                    onMouseEnter={() => setHoverBin(i)}
                    className="group flex h-full flex-1 flex-col items-center justify-end"
                    title={`Note ${i + 1} : ${n}`}
                  >
                    <span className={`mb-1 text-xs tabular-nums text-slate-400 ${hoverBin === i || n === Math.max(...s.bins) ? "" : "invisible"}`}>{n}</span>
                    <div
                      className={`w-full max-w-10 rounded-t ${hoverBin === i ? "bg-indigo-400" : "bg-indigo-500"}`}
                      style={{ height: `${(n / maxBin) * 100}%`, minHeight: n ? 2 : 0 }}
                    />
                  </Link>
                ))}
              </div>
              <div className="mt-1 flex gap-[2px] border-t border-slate-800 pt-1">
                {s.bins.map((_, i) => (
                  <span key={i} className="flex-1 text-center text-xs text-slate-400">
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Par personne">
          {s.people.length === 0 ? (
            <p className="text-sm text-slate-500">Personne n&apos;a encore noté.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="pb-2 font-medium">Prénom</th>
                  <th className="pb-2 text-right font-medium">Notées</th>
                  <th className="pb-2 text-right font-medium">Moyenne</th>
                  <th className="pb-2 text-right font-medium">♥</th>
                  <th className="hidden pb-2 text-right font-medium sm:table-cell">Dernier avis</th>
                </tr>
              </thead>
              <tbody>
                {s.people.map((p) => (
                  <tr key={p.name} className="border-t border-slate-800/70">
                    <td className="py-2">
                      <Link href={q(`by=${encodeURIComponent(p.name)}`)} className="font-medium text-indigo-300 hover:underline">
                        {p.name}
                      </Link>
                      {p.name === me && <span className="ml-1 text-xs text-slate-500">(toi)</span>}
                    </td>
                    <td className="py-2 text-right tabular-nums">{p.count}</td>
                    <td className="py-2 text-right tabular-nums">{p.avg !== null ? fmtAvg(p.avg) : "–"}</td>
                    <td className="py-2 text-right tabular-nums">{p.favs}</td>
                    <td className="hidden py-2 text-right text-slate-400 sm:table-cell">{p.last ? ago(p.last) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card title="Par département">
        <div className="space-y-1">
          {s.deps.map(([d, v]) => (
            <Link key={d} href={q(`dep=${encodeURIComponent(d)}`)} className="-mx-2 grid grid-cols-[1fr_auto] items-center gap-x-3 rounded-lg px-2 py-1.5 hover:bg-slate-800 sm:grid-cols-[180px_1fr_110px_60px]">
              <span className="truncate text-sm font-medium">{d}</span>
              <span className="text-right text-xs tabular-nums text-slate-400 sm:order-3">
                {v.seen} / {v.total} vues
              </span>
              <div className="col-span-2 mt-1 flex h-2 overflow-hidden rounded-full bg-slate-800 sm:order-2 sm:col-span-1 sm:mt-0" title={`${pct(v.seen, v.total)} % vues`}>
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct(v.seen, v.total)}%`, minWidth: v.seen ? 4 : 0 }} />
              </div>
              <span className="hidden text-right sm:order-4 sm:block">{v.n ? <ScoreBadge score={v.sum / v.n} size="sm" title="Note moyenne" /> : <span className="text-xs text-slate-600">–</span>}</span>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Mieux notées" right={<Link href={q("sort=-score&seen=seen")} className="text-sm text-indigo-400 hover:underline">Tout voir</Link>}>
          {s.top.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune note pour l&apos;instant.</p>
          ) : (
            <ul>
              {s.top.map(({ l, a }) => (
                <MiniRow key={l.id} l={l} right={<ScoreBadge score={a!.avg!} size="sm" title={`${a!.scored.length} avis`} />} />
              ))}
            </ul>
          )}
        </Card>

        <Card title="Coups de cœur" right={<Link href={q("fav=any")} className="text-sm text-indigo-400 hover:underline">Tout voir</Link>}>
          {s.favs.length === 0 ? (
            <p className="text-sm text-slate-500">Pas encore de coup de cœur.</p>
          ) : (
            <ul>
              {s.favs.slice(0, 8).map(({ l, a }) => (
                <MiniRow
                  key={l.id}
                  l={l}
                  right={
                    <span className="flex items-center gap-1 text-sm text-rose-500">
                      <Heart on className="h-4 w-4" />
                      {a.favCount}
                    </span>
                  }
                />
              ))}
            </ul>
          )}
        </Card>

        <Card title="À rediscuter" right={<Link href={q("seen=debate")} className="text-sm text-indigo-400 hover:underline">Tout voir</Link>}>
          {s.debate.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun désaccord fort (écart ≥ 4).</p>
          ) : (
            <ul>
              {s.debate.slice(0, 8).map(({ l, a }) => (
                <MiniRow
                  key={l.id}
                  l={l}
                  right={
                    <span className="flex gap-1">
                      {a!.scored.map((r) => (
                        <ScoreBadge key={r.id} score={r.score!} size="sm" title={r.author} />
                      ))}
                    </span>
                  }
                />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Derniers avis">
        {s.recent.length === 0 ? (
          <p className="text-sm text-slate-500">Rien pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {s.recent.map((r) => {
              const l = byId.get(r.listingId);
              if (!l) return null;
              return (
                <li key={r.id}>
                  <Link href={`/offre/${l.id}`} className="-mx-2 flex gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-800">
                    {r.score != null ? <ScoreBadge score={r.score} /> : <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-500">–</span>}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
                        <b>{r.author}</b>
                        {r.favorite && <Heart on className="h-4 w-4 text-rose-500" />}
                        <span className="text-slate-400">
                          sur {priceLabel(l.price, l.transaction)} · {l.city}
                        </span>
                        <span className="text-xs text-slate-500">{ago(r.updatedAt)}</span>
                      </div>
                      {r.comment && <p className="mt-0.5 line-clamp-2 text-sm text-slate-300">{r.comment}</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
