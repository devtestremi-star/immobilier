"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const token = await authToken();
  if (!token) return "Mot de passe non configuré sur le serveur (ENV_PW).";
  const pw = String(form.get("password") ?? "");
  const expected = process.env.ENV_PW;
  if (pw !== expected) return "Mot de passe incorrect.";

  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  const next = String(form.get("next") ?? "/");
  // uniquement des chemins internes
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
