/**
 * URL base pública de la app (links de entrevista, redirects).
 * Producción: define NEXT_PUBLIC_APP_URL en Vercel/Railway (https://… sin / final).
 * Si falta, se infiere de VERCEL_URL (Vercel) o RAILWAY_PUBLIC_DOMAIN (Railway).
 */
export function getAppBaseUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  }

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railway) {
    const host = railway.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}
