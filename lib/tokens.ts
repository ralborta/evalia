import { randomBytes } from "crypto";

export function generatePublicToken(): string {
  return randomBytes(24).toString("base64url");
}
