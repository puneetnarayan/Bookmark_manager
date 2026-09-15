import "server-only";
import { randomBytes } from "crypto";

export function generateShareId(): string {
  return randomBytes(12).toString("base64url");
}
