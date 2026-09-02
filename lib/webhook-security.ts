import { createHmac, timingSafeEqual } from "crypto";

function unsignedWebhooksAllowed(): boolean {
  return process.env.ALLOW_UNSIGNED_ELEVENLABS_WEBHOOK === "true";
}

/**
 * Verifica la firma HMAC-SHA256 del webhook de ElevenLabs.
 * En producción rechaza peticiones si falta el secreto, salvo override explícito.
 */
export function verifyElevenLabsWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET?.trim();

  if (!secret) {
    if (unsignedWebhooksAllowed()) {
      console.warn("[webhook] ELEVENLABS_WEBHOOK_SECRET ausente; se acepta por ALLOW_UNSIGNED_ELEVENLABS_WEBHOOK=true");
      return true;
    }
    console.error("[webhook] ELEVENLABS_WEBHOOK_SECRET ausente; firma rechazada");
    return false;
  }

  if (!signatureHeader) return false;

  const mac = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(mac, "utf8");
    const b = Buffer.from(signatureHeader.replace(/^sha256=/, ""), "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
