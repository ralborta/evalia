/**
 * Redacción de PII antes de enviar texto a OpenAI.
 * Nunca envía foto/base64, ni atributos protegidos (edad, género, nacionalidad, etc.).
 */

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(?:\+|00)?[\d\s().-]{8,}\d/g;
// DNI/NIE/CIF/pasaporte genéricos (ES + patrones numéricos largos)
const NATIONAL_ID_RE =
  /\b(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|\d{9,12}[A-Z]?)\b/gi;
const BASE64_IMAGE_RE = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]{40,}/gi;
const PROTECTED_LABEL_RE =
  /\b(?:edad|age|g[eé]nero|gender|sexo|sex|nacionalidad|nationality|estado\s+civil|marital\s+status|direcci[oó]n|address|fecha\s+de\s+nacimiento|date\s+of\s+birth|d\.?n\.?i\.?|pasaporte|passport|c[eé]dula)\b\s*[:\-]\s*[^\n]{0,80}/gi;

export type RedactResult = {
  text: string;
  redactedCount: number;
};

export function redactForOpenAI(input: string): RedactResult {
  let count = 0;
  const bump = () => {
    count += 1;
    return "[REDACTED]";
  };

  let text = input.replace(BASE64_IMAGE_RE, () => bump());
  text = text.replace(EMAIL_RE, () => bump());
  text = text.replace(NATIONAL_ID_RE, () => bump());
  text = text.replace(PHONE_RE, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return m;
    count += 1;
    return "[REDACTED]";
  });
  text = text.replace(PROTECTED_LABEL_RE, () => bump());

  // Truncar a un tamaño razonable para el modelo
  const max = 60_000;
  if (text.length > max) text = text.slice(0, max);

  return { text, redactedCount: count };
}
