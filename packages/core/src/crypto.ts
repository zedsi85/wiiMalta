import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * At-rest encryption for sensitive fields (ambassador payment details).
 * AES-256-GCM envelope: v1.<iv>.<ciphertext>.<authTag> (all base64url).
 * The key is a 32-byte base64 secret (PAYMENT_ENC_KEY) passed in by the
 * caller — pure functions, no env access here.
 */

function keyBuf(keyB64: string): Buffer {
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) throw new Error("encryption key must be 32 bytes (base64)");
  return key;
}

export function encryptJson(value: unknown, keyB64: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuf(keyB64), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${ct.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptJson<T = unknown>(envelope: string, keyB64: string): T {
  const [v, ivB64, ctB64, tagB64] = envelope.split(".");
  if (v !== "v1" || !ivB64 || !ctB64 || !tagB64) throw new Error("bad ciphertext envelope");
  const decipher = createDecipheriv("aes-256-gcm", keyBuf(keyB64), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, "base64url")), decipher.final()]);
  return JSON.parse(pt.toString("utf8")) as T;
}

/* ---------------- Payment-detail validation ---------------- */

/** IBAN mod-97 checksum (ISO 13616). */
export function isValidIban(input: string): boolean {
  const iban = input.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of v) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export const isValidEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());
export const isValidRevolutTag = (v: string) => /^@?[a-z0-9_]{3,30}$/i.test(v.trim());

export function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, "");
  return `IBAN ····${clean.slice(-4)}`;
}
export function maskEmail(email: string): string {
  const [local, domain] = email.trim().split("@");
  return `${local[0]}···@${domain}`;
}
