"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "./actions";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <input
        type="password"
        name="password"
        autoFocus
        autoComplete="current-password"
        placeholder="Mot de passe"
        className="w-full rounded-xl border border-slate-700 px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50">
        {pending ? "Vérification…" : "Entrer"}
      </button>
    </form>
  );
}
