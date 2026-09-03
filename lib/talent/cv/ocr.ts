export class OcrNeededError extends Error {
  readonly code = "NEEDS_OCR";
  constructor(message = "El documento requiere OCR") {
    super(message);
    this.name = "OcrNeededError";
  }
}

export type OcrProvider = {
  name: string;
  extract(buffer: Buffer, mime: string): Promise<string>;
};

/** Proveedor nulo: fuerza estado NEEDS_OCR sin inventar texto. */
export class NullOcrProvider implements OcrProvider {
  name = "null";
  async extract(_buffer: Buffer, _mime: string): Promise<string> {
    throw new OcrNeededError();
  }
}

/**
 * Stub opcional: POST binario a OCR_PROVIDER_URL.
 * No se usa en staging salvo que exista la URL.
 */
export class ExternalOcrProvider implements OcrProvider {
  name = "external";
  constructor(private readonly url = process.env.OCR_PROVIDER_URL || "") {}

  async extract(buffer: Buffer, mime: string): Promise<string> {
    if (!this.url) throw new OcrNeededError("OCR_PROVIDER_URL no configurada");
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "content-type": mime || "application/octet-stream" },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) throw new OcrNeededError(`OCR externo falló (${res.status})`);
    const text = await res.text();
    return text.trim();
  }
}

export function getOcrProvider(): OcrProvider {
  if (process.env.OCR_PROVIDER_URL) return new ExternalOcrProvider();
  return new NullOcrProvider();
}
