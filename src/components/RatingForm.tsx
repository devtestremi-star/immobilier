"use client";

import { useState } from "react";
import { aggOf, useData } from "./DataProvider";
import { NameForm } from "./NamePrompt";
import { Heart, ScoreBadge } from "./ui";
import { ago, scoreBg, scoreSoft } from "@/lib/format";

const LABELS: Record<number, string> = {
  1: "À fuir",
  2: "Non",
  3: "Bof",
  4: "Peu convaincu",
  5: "Mitigé",
  6: "Pas mal",
  7: "Bien",
  8: "Très bien",
  9: "Excellent",
  10: "Coup de foudre",
};

export function RatingForm({ listingId, onSaved }: { listingId: number; onSaved?: () => void }) {
  const { me, aggs, save } = useData();
  const mine = aggOf(aggs, listingId).reviews.find((r) => r.author === me);
  const [score, setScore] = useState<number | null>(mine?.score ?? null);
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [favorite, setFavorite] = useState(mine?.favorite ?? false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  if (!me) return <NameForm />;

  const dirty = score !== (mine?.score ?? null) || comment !== (mine?.comment ?? "") || favorite !== (mine?.favorite ?? false);

  const submit = async (v = { score, comment, favorite }) => {
    setBusy(true);
    setErr(null);
    try {
      await save(listingId, v);
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
      onSaved?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-700">Ta note</span>
          <span className="text-sm font-semibold" style={score ? { color: scoreBg(score) } : undefined}>
            {score ? `${score}/10 · ${LABELS[score]}` : "Touche une note"}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 sm:gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const active = score === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setScore(active ? null : n)}
                className="h-12 rounded-xl border-2 text-lg font-bold tabular-nums transition-transform active:scale-95 sm:h-11"
                style={
                  active
                    ? { background: scoreBg(n), borderColor: scoreBg(n), color: "#fff" }
                    : { background: scoreSoft(n), borderColor: "transparent", color: scoreBg(n) }
                }
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFavorite(!favorite)}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 py-2.5 font-medium transition-colors ${
          favorite ? "border-rose-500 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-500"
        }`}
      >
        <Heart on={favorite} />
        {favorite ? "Coup de cœur !" : "Coup de cœur"}
      </button>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Ton commentaire (points forts, défauts, quartier…)"
        className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || (!dirty && !flash)}
          onClick={() => submit()}
          className={`flex-1 rounded-xl py-3 font-semibold text-white transition-colors disabled:opacity-40 ${flash ? "bg-emerald-600" : "bg-indigo-600"}`}
        >
          {busy ? "Enregistrement…" : flash ? "✓ Enregistré" : mine ? "Mettre à jour" : "Enregistrer"}
        </button>
        {mine && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!confirm("Supprimer ton avis ?")) return;
              setScore(null);
              setComment("");
              setFavorite(false);
              submit({ score: null, comment: "", favorite: false });
            }}
            className="rounded-xl border border-slate-200 px-4 text-sm text-slate-500 hover:bg-slate-50"
          >
            Supprimer
          </button>
        )}
      </div>
      <p className="text-center text-xs text-slate-400">Notée par {me}</p>
    </div>
  );
}

export function OthersReviews({ listingId }: { listingId: number }) {
  const { me, aggs } = useData();
  const others = aggOf(aggs, listingId).reviews.filter((r) => r.author !== me);
  if (!others.length) return <p className="text-sm text-slate-400">Personne d&apos;autre n&apos;a encore donné son avis.</p>;
  return (
    <ul className="space-y-3">
      {others.map((r) => (
        <li key={r.id} className="flex gap-3">
          {r.score != null ? <ScoreBadge score={r.score} /> : <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400">–</span>}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold">{r.author}</span>
              {r.favorite && <Heart on className="h-4 w-4 text-rose-500" />}
              <span className="text-xs text-slate-400">{ago(r.updatedAt)}</span>
            </div>
            {r.comment && <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">{r.comment}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
