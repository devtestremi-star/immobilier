"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useData } from "./DataProvider";
import { NameForm } from "./NamePrompt";
import { Sheet } from "./ui";

const icons = {
  list: "M4 6h16M4 12h16M4 18h10",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14",
  stats: "M4 20V10m6 10V4m6 16v-7m4 7H2",
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const { me } = useData();
  const [nameOpen, setNameOpen] = useState(false);
  // on garde les filtres en passant de la liste à la carte
  const q = pathname === "/" || pathname === "/carte" ? (sp.toString() ? `?${sp}` : "") : "";

  const nav = [
    { href: `/${q}`, label: "Offres", icon: icons.list, active: pathname === "/" || pathname.startsWith("/offre") },
    { href: `/carte${q}`, label: "Carte", icon: icons.map, active: pathname === "/carte" },
    { href: "/stats", label: "Stats", icon: icons.stats, active: pathname === "/stats" },
  ];

  const userBtn = (
    <button
      onClick={() => setNameOpen(true)}
      className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-sm hover:bg-slate-50"
      title="Changer de prénom"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold uppercase text-white">
        {me ? me[0] : "?"}
      </span>
      <span className="max-w-24 truncate font-medium">{me || "Prénom"}</span>
    </button>
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4">
          <Link href={`/${q}`} className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
                <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            Maison
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {nav.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${n.active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <Icon d={n.icon} />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto">{userBtn}</div>
        </div>
      </header>

      <div className="flex flex-1 flex-col pb-16 sm:pb-0">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        {nav.map((n) => (
          <Link
            key={n.label}
            href={n.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${n.active ? "text-indigo-600" : "text-slate-500"}`}
          >
            <Icon d={n.icon} />
            {n.label}
          </Link>
        ))}
      </nav>

      <Sheet open={nameOpen} onClose={() => setNameOpen(false)} title="Changer de prénom">
        <NameForm onDone={() => setNameOpen(false)} />
      </Sheet>
    </>
  );
}
