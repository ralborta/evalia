import { createHmac, timingSafeEqual } from "crypto";

export function verifyElevenLabsWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) return true;
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
