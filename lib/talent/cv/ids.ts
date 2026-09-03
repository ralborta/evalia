import { randomBytes } from "node:crypto";

/** Identificador tipo cuid suficiente para IDs de documento. */
export function createId(prefix = "c") {
  return `${prefix}${Date.now().toString(36)}${randomBytes(8).toString("hex")}`;
}
