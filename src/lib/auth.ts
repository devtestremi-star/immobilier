export const AUTH_COOKIE = "maison_auth";

// valeur du cookie = empreinte du mot de passe : changer ENV_PW déconnecte tout le monde
export async function authToken(): Promise<string | null> {
  const pw = process.env.ENV_PW;
  if (!pw) return null;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`maison:${pw}`));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
