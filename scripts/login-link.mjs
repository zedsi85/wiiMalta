#!/usr/bin/env node
/**
 * Mint a Supabase magic-link WITHOUT sending an email (Admin API) — kills the
 * built-in mailer's rate limit for testing. Local-only tool: it needs
 * SUPABASE_SECRET_KEY from apps/admin/.env.local and must never become an
 * HTTP endpoint.
 *
 * Usage:
 *   node scripts/login-link.mjs <email> [admin|guard|ambassador|web] [--local]
 *
 * Prints a one-click login URL for the chosen portal (prod by default).
 */
import fs from "node:fs";

const [email, portal = "admin", flag] = process.argv.slice(2);
if (!email || !email.includes("@")) {
  console.error("usage: node scripts/login-link.mjs <email> [admin|guard|ambassador] [--local]");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync("apps/admin/.env.local", "utf8")
    .split("\n")
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
);

const base = flag === "--local" ? "http://localhost:3001" : "https://wii-malta-admin.vercel.app";
const nextPath = { admin: "/", guard: "/guard/events", ambassador: "/ambassador", web: "/" }[portal] ?? "/";
const redirectTo = `${base}/auth/callback?next=${nextPath}`;
void redirectTo;

const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`, {
  method: "POST",
  headers: {
    apikey: env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ type: "magiclink", email, options: { redirect_to: redirectTo } }),
});
const json = await res.json();
if (!res.ok) {
  console.error(`generate_link failed (${res.status}):`, JSON.stringify(json, null, 2));
  process.exit(1);
}

// Build the link against OUR callback route with token_hash — verifyOtp does
// not consult the redirect allowlist, so this works regardless of dashboard
// config (and regardless of the mailer's rate limit).
const tokenHash = json.hashed_token ?? json.properties?.hashed_token;
if (!tokenHash) {
  console.error("no hashed_token in response:", JSON.stringify(json).slice(0, 300));
  process.exit(1);
}
const link = `${base}/auth/callback?token_hash=${tokenHash}&type=magiclink&next=${encodeURIComponent(nextPath)}`;

console.log(`\nLogin link for ${email} → ${portal} (${base}):\n`);
console.log(link);
console.log("\nOpen it in the browser/phone that should be signed in. Expires in ~1h, single use.");
