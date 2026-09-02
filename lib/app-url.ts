/**
 * URL base pública de la app (links de entrevista, redirects).
 * En contenedor, preferir AUTH_URL / NEXTAUTH_URL de runtime si NEXT_PUBLIC
 * quedó inlined como localhost durante el build.
 */
function normalize(url: string): string {
  return url.replace(/\/+$/, "");
}

function isUsablePublicUrl(url: string | undefined): url is string {
  const v = url?.trim();
  if (!v) return false;
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(v)) {
    return false;
  }
  return true;
}

export function getAppBaseUrl(): string {
  const candidates = [
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];
  for (const raw of candidates) {
    if (isUsablePublicUrl(raw)) return normalize(raw.trim());
  }

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
