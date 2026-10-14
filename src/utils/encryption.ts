import crypto from "node:crypto";
import { env } from "../config/env.js";

function getKey(): Buffer {
  return Buffer.from(env.DATA_ENCRYPTION_KEY, "hex");
}

// AES-256-GCM encrypts note bodies and detects tampering. Use a fresh IV for every value.
export function encryptText(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptText(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) throw new Error("Encrypted note has an invalid format.");

  const [ivHex, tagHex, dataHex] = parts;
  if (!ivHex || !tagHex || dataHex === undefined) throw new Error("Encrypted note has an invalid format.");

  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}
