import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const token = await authToken();
  if (token && req.cookies.get(AUTH_COOKIE)?.value === token) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const next = req.nextUrl.pathname + req.nextUrl.search;
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  // tout sauf la page de connexion et les fichiers statiques
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|maplibre-gl-worker.mjs).*)"],
};
