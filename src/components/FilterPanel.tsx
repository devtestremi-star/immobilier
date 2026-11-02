"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { matches, type Filters } from "@/lib/filters";
import { aggOf, useData } from "./DataProvider";
import { Chip, DpeBadge, Heart } from "./ui";

type Props = { f: Filters; update: (p: Partial<Filters>) => void };

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="border-b border-slate-800/70 px-4 py-4 last:border-0">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-slate-800 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
            value === o.value ? "bg-slate-900 text-indigo-300 shadow-sm" : "text-slate-300"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// champ numérique formaté (120 000), appliqué après une courte pause
function NumInput({ value, onChange, placeholder, suffix }: { value: number | null; onChange: (v: number | null) => void; placeholder: string; suffix?: string }) {
  const fmt = (n: number | null) => (n === null ? "" : n.toLocaleString("fr-FR"));
  const [text, setText] = useState(fmt(value));
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resynchronise quand le filtre change ailleurs
    setText(fmt(value));
  }, [value]);
  useEffect(() => {
    const t = setTimeout(() => {
      const digits = text.replace(/[^\d]/g, "");
      const n = digits ? Number(digits) : null;
      if (n !== value) cb.current(n);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <label className="relative flex-1">
      <input
        inputMode="numeric"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value.replace(/[^\d\s ]/g, ""))}
        onBlur={() => {
          const digits = text.replace(/[^\d]/g, "");
          setText(digits ? Number(digits).toLocaleString("fr-FR") : "");
        }}
        className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 pl-3 pr-9 text-base tabular-nums outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 sm:text-sm"
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">{suffix}</span>}
    </label>
  );
}

function Range({ min, max, onChange, suffix, placeholders = ["Min", "Max"] }: { min: number | null; max: number | null; onChange: (min: number | null, max: number | null) => void; suffix?: string; placeholders?: [string, string] }) {
  return (
    <div className="flex items-center gap-2">
      <NumInput value={min} onChange={(v) => onChange(v, max)} placeholder={placeholders[0]} suffix={suffix} />
      <span className="text-slate-600">–</span>
      <NumInput value={max} onChange={(v) => onChange(min, v)} placeholder={placeholders[1]} suffix={suffix} />
    </div>
  );
}

const FLOORS = Array.from({ length: 11 }, (_, i) => i);
const floorOpt = (n: number) => (n === 0 ? "RDC" : `${n}e`);

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-base outline-none focus:border-indigo-500 sm:text-sm"
    >
      {children}
    </select>
  );
}

export function FilterPanel({ f, update }: Props) {
  const { listings, aggs, me, authors } = useData();

  // compteurs par département (avec tous les autres filtres appliqués)
  const depCounts = useMemo(() => {
    const ff = { ...f, dep: [] };
    const m = new Map<string, number>();
    for (const l of listings) m.set(l.department, 0);
    for (const l of listings) if (matches(l, aggOf(aggs, l.id), ff, me)) m.set(l.department, (m.get(l.department) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [listings, aggs, me, f]);

  const accesses = useMemo(() => [...new Set(listings.map((l) => l.access))].sort(), [listings]);
  const loc = f.tr.length === 1 && f.tr[0] === "Location";
  const newCount = useMemo(() => listings.filter((l) => l.isNew).length, [listings]);

  return (
    <div>
      <Section title="Transaction">
        <Segmented
          value={f.tr.length === 1 ? f.tr[0] : ""}
          options={[
            { value: "", label: "Tout" },
            { value: "Achat", label: "Achat" },
            { value: "Location", label: "Location" },
          ]}
          onChange={(v) => update({ tr: v ? [v] : [] })}
        />
        <div className="mt-2 flex gap-2">
          {[
            ["Appart", "Appartement"],
            ["Maison", "Maison"],
          ].map(([v, label]) => (
            <Chip key={v} active={f.type.includes(v)} onClick={() => update({ type: toggle(f.type, v) })}>
              {label}
            </Chip>
          ))}
          {newCount > 0 && (
            <Chip active={f.nw} onClick={() => update({ nw: !f.nw })}>
              Nouvelles <span className="opacity-60">{newCount}</span>
            </Chip>
          )}
        </div>
      </Section>

      {listings.some((l) => l.zone || l.source) && (
        <Section title="Zone & source">
          <Segmented
            value={f.zn}
            options={[
              { value: "", label: "Toutes zones" },
              { value: "main", label: "Principale" },
              { value: "band", label: "+100 km" },
            ]}
            onChange={(zn) => update({ zn })}
          />
          <div className="mt-2">
            <Segmented
              value={f.src}
              options={[
                { value: "", label: "Tous sites" },
                { value: "lbc", label: "leboncoin" },
                { value: "bienici", label: "Bien'ici" },
              ]}
              onChange={(src) => update({ src })}
            />
          </div>
        </Section>
      )}

      <Section title={loc ? "Loyer mensuel" : "Prix"}>
        <Range min={f.pmin} max={f.pmax} suffix="€" onChange={(pmin, pmax) => update({ pmin, pmax })} />
        {!loc && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[100000, 120000, 150000, 180000, 200000].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => update({ pmax: f.pmax === p ? null : p })}
                className={`rounded-lg px-2 py-1 text-xs ${f.pmax === p ? "bg-indigo-500/25 text-indigo-300" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
              >
                ≤ {p / 1000}k
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Surface">
        <Range min={f.smin} max={f.smax} suffix="m²" onChange={(smin, smax) => update({ smin, smax })} />
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
          <span className="shrink-0">Prix au m² max</span>
          <NumInput value={f.m2max} onChange={(m2max) => update({ m2max })} placeholder="—" suffix="€" />
        </div>
      </Section>

      <Section
        title="Département"
        right={
          f.dep.length > 0 && (
            <button className="text-xs text-indigo-400" onClick={() => update({ dep: [] })}>
              Tous
            </button>
          )
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {depCounts.map(([d, n]) => (
            <Chip key={d} active={f.dep.includes(d)} onClick={() => update({ dep: toggle(f.dep, d) })}>
              {d} <span className={f.dep.includes(d) ? "text-indigo-200" : "text-slate-500"}>{n}</span>
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Étage">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {[0, 1, 2, 3].map((n) => (
            <Chip key={n} active={f.fmin === null && f.fmax === n} onClick={() => update(f.fmin === null && f.fmax === n ? { fmax: null } : { fmin: null, fmax: n })}>
              {n === 0 ? "RDC" : `≤ ${n}e`}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select value={f.fmin?.toString() ?? ""} onChange={(v) => update({ fmin: v === "" ? null : Number(v) })}>
            <option value="">Min</option>
            {FLOORS.map((n) => (
              <option key={n} value={n}>
                {floorOpt(n)}
              </option>
            ))}
          </Select>
          <span className="text-slate-600">–</span>
          <Select value={f.fmax?.toString() ?? ""} onChange={(v) => update({ fmax: v === "" ? null : Number(v) })}>
            <option value="">Max</option>
            {FLOORS.map((n) => (
              <option key={n} value={n}>
                {floorOpt(n)}
              </option>
            ))}
          </Select>
        </div>
        <label className="mt-2.5 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={f.funk} onChange={(e) => update({ funk: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
          Inclure les étages non renseignés
        </label>
        <div className="mt-3">
          <Segmented
            value={f.elev}
            options={[
              { value: "", label: "Ascenseur ?" },
              { value: "oui", label: "Avec" },
              { value: "non", label: "Sans" },
            ]}
            onChange={(elev) => update({ elev })}
          />
        </div>
      </Section>

      <Section title="Mes avis & ceux des autres">
        <div className="flex flex-wrap gap-1.5">
          {[
            ["", "Toutes"],
            ["unseenme", "Pas notées par moi"],
            ["unseen", "Jamais notées"],
            ["seen", "Déjà notées"],
            ["seenme", "Notées par moi"],
            ["debate", "Avis partagés"],
          ].map(([v, label]) => (
            <Chip key={v} active={f.seen === v} onClick={() => update({ seen: v })}>
              {label}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
          <span className="w-24 shrink-0">Note moyenne</span>
          <Select value={f.nmin?.toString() ?? ""} onChange={(v) => update({ nmin: v ? Number(v) : null })}>
            <option value="">Min</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <span className="text-slate-600">–</span>
          <Select value={f.nmax?.toString() ?? ""} onChange={(v) => update({ nmax: v ? Number(v) : null })}>
            <option value="">Max</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3">
          <Segmented
            value={f.fav}
            options={[
              { value: "", label: "Tous" },
              { value: "any", label: <><Heart on className="h-4 w-4 text-rose-500" /> Quelqu&apos;un</> },
              { value: "me", label: <><Heart on className="h-4 w-4 text-rose-500" /> Moi</> },
            ]}
            onChange={(fav) => update({ fav })}
          />
        </div>
        {authors.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-sm text-slate-300">Notées par</div>
            <div className="flex flex-wrap gap-1.5">
              {authors.map((a) => (
                <Chip key={a} active={f.by === a} onClick={() => update({ by: f.by === a ? "" : a })}>
                  {a}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Accès">
        <div className="flex flex-wrap gap-1.5">
          {accesses.map((a) => (
            <Chip key={a} active={f.acc.includes(a)} onClick={() => update({ acc: toggle(f.acc, a) })}>
              {a}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="DPE">
        <div className="flex flex-wrap gap-1.5">
          {["A", "B", "C", "D", "E", "F", "G", "N", "V", "?"].map((d) => (
            <button
              key={d}
              type="button"
              title={d === "N" ? "Non soumis" : d === "V" ? "Vierge" : d === "?" ? "Non renseigné" : undefined}
              onClick={() => update({ dpe: toggle(f.dpe, d) })}
              className={`rounded-lg border-2 p-1 ${f.dpe.includes(d) ? "border-indigo-600" : "border-transparent"}`}
            >
              {d === "?" ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-slate-800 px-1 text-[11px] font-bold text-slate-400">?</span> : <DpeBadge dpe={d} />}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Annonce">
        <div className="flex flex-wrap gap-1.5">
          {["Particulier", "Pro"].map((s) => (
            <Chip key={s} active={f.sel.includes(s)} onClick={() => update({ sel: toggle(f.sel, s) })}>
              {s}
            </Chip>
          ))}
        </div>
        <div className="mt-3">
          <Segmented
            value={f.days?.toString() ?? ""}
            options={[
              { value: "", label: "Toutes" },
              { value: "7", label: "< 7 j" },
              { value: "14", label: "< 14 j" },
              { value: "30", label: "< 30 j" },
            ]}
            onChange={(v) => update({ days: v ? Number(v) : null })}
          />
        </div>
      </Section>
    </div>
  );
}

export function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resynchronise quand le filtre change ailleurs
    setText(value);
  }, [value]);
  useEffect(() => {
    const t = setTimeout(() => text !== value && onChange(text), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <label className="relative flex-1">
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ville, CP, mot-clé…"
        className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 sm:text-sm"
      />
    </label>
  );
}
