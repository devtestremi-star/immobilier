"use client";

import { useState } from "react";
import { useData } from "./DataProvider";
import { Sheet } from "./ui";

export function NameForm({ onDone }: { onDone?: () => void }) {
  const { me, setMe, authors } = useData();
  const [name, setName] = useState(me);
  const submit = (n: string) => {
    if (!n.trim()) return;
    setMe(n);
    onDone?.();
  };
  return (
    <form
      className="space-y-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(name);
      }}
    >
      <p className="text-sm text-slate-300">Ton prénom sert à signer tes notes et commentaires. Il est gardé sur cet appareil.</p>
      {authors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {authors.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => submit(a)}
              className={`rounded-full border px-3 py-1.5 text-sm ${a === me ? "border-indigo-600 bg-indigo-500/15 text-indigo-300" : "border-slate-800 hover:bg-slate-800"}`}
            >
              {a}
            </button>
          ))}
        </div>
      )}
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ton prénom"
        maxLength={40}
        className="w-full rounded-xl border border-slate-700 px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
      />
      <button disabled={!name.trim()} className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white disabled:opacity-40">
        C&apos;est moi
      </button>
    </form>
  );
}

// bloque l'app tant qu'aucun prénom n'est choisi
export function NamePrompt() {
  const { me, loading } = useData();
  const [dismissed, setDismissed] = useState(false);
  if (me || loading || dismissed) return null;
  return (
    <Sheet open onClose={() => setDismissed(true)} title="Qui es-tu ?">
      <NameForm />
    </Sheet>
  );
}
