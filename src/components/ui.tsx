"use client";

import { useEffect } from "react";
import { fmtAvg, scoreBg, DPE_COLORS } from "@/lib/format";

export function ScoreBadge({ score, size = "md", title }: { score: number; size?: "sm" | "md" | "lg"; title?: string }) {
  const cls = size === "sm" ? "h-6 min-w-6 text-xs px-1" : size === "lg" ? "h-12 min-w-12 text-xl px-2" : "h-8 min-w-8 text-sm px-1.5";
  return (
    <span
      title={title}
      className={`inline-flex items-center justify-center rounded-lg font-bold text-white tabular-nums ${cls}`}
      style={{ background: scoreBg(score) }}
    >
      {fmtAvg(score)}
    </span>
  );
}

export function DpeBadge({ dpe }: { dpe: string | null }) {
  if (!dpe) return null;
  const c = DPE_COLORS[dpe];
  return (
    <span
      title={c ? `DPE ${dpe}` : dpe === "N" ? "DPE non soumis" : dpe === "V" ? "DPE vierge" : `DPE ${dpe}`}
      className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[11px] font-bold"
      style={c ? { background: c, color: ["C", "D", "E"].includes(dpe) ? "#1f2937" : "#fff" } : { background: "#e5e7eb", color: "#4b5563" }}
    >
      {dpe}
    </span>
  );
}

// annonce ajoutée lors du dernier import
export function NewBadge() {
  return <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-950">New</span>;
}

export function Heart({ on, className = "h-5 w-5" }: { on: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
      <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z" strokeLinejoin="round" />
    </svg>
  );
}

// escalier : étage
export function StairsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 20h5v-4h4v-4h4V8h5" />
      <path d="M3 20V4" opacity={0.35} />
    </svg>
  );
}

// cabine d'ascenseur (barrée = sans ascenseur)
export function ElevatorIcon({ off, className = "h-4 w-4" }: { off?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9.5 10l2.5-3 2.5 3M9.5 14l2.5 3 2.5-3" />
      {off && <path d="M3 21L21 3" strokeWidth={2.2} />}
    </svg>
  );
}

export function ExternalIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

// panneau modal : feuille du bas sur mobile, boîte centrée sur desktop
export function Sheet({
  open,
  onClose,
  children,
  title,
  footer,
  full,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  full?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className={`relative flex w-full flex-col bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl ${
          full ? "h-[100dvh] sm:h-auto sm:max-h-[90dvh]" : "max-h-[92dvh] rounded-t-2xl"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0 flex-1 font-semibold">{title}</div>
          <button onClick={onClose} className="-mr-2 rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-slate-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
