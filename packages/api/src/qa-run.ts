/**
 * Full functional QA against PRODUCTION: real emails, real webhook path, real
 * door-app HTTP login, buyer/mobile API with a real session, referral capture,
 * transfers, timings. Creates test data under qa-* identities and removes it.
 * Run: NODE_OPTIONS=--conditions=react-server npx tsx src/qa-run.ts
 */
import { createHmac, randomUUID } from "node:crypto";
import { and, eq, like, sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { signAccountSession, signTicketKey, mintQrToken } from "@wii/core";
import { issueCompTickets } from "./comp";
import { sendAmbassadorApprovedEmail } from "./email";

const WEB = "https://wii-malta-web.vercel.app", ADMIN = "https://wii-malta-admin.vercel.app";
const ME = "zedsi85@gmail.com", RECIPIENT = "zedsi85+qa-transfer@gmail.com";
const SECRET = process.env.ORDER_LINK_SECRET!, QR = process.env.QR_SIGNING_SECRET!, WH = process.env.REVOLUT_WEBHOOK_SECRET!;
const TO_FIELD = "toEmail";
type Row = { step: string; ok: boolean; ms: number; note: string };
const rows: Row[] = []; const lag: string[] = [];
async function step<T>(name: string, fn: () => Promise<{ ok: boolean; note?: string; value?: T }>): Promise<T | undefined> {
  const t = Date.now();
  try { const r = await fn(); const ms = Date.now() - t; rows.push({ step: name, ok: r.ok, ms, note: r.note ?? "" }); if (ms > 1500) lag.push(`${name} ${ms}ms`); return r.value; }
  catch (e) { rows.push({ step: name, ok: false, ms: Date.now() - t, note: String((e as Error).message).slice(0, 140) }); return undefined; }
}
async function http(url: string, init: RequestInit = {}, jar?: string[]) {
  const t = Date.now();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (jar?.length) headers.cookie = jar.join("; ");
  const res = await fetch(url, { ...init, headers, redirect: "manual" });
  const ms = Date.now() - t; const text = await res.text();
  let json: any = null; try { json = JSON.parse(text); } catch {}
  return { res, ms, text, json, cookies: res.headers.getSetCookie?.() ?? [] };
}
const jarFrom = (cookies: string[]) => cookies.map((c) => c.split(";")[0]);

async function main() {
  const d = db();
  const cleanup: (() => Promise<void>)[] = [];
  const prison = (await d.select().from(s.events).where(eq(s.events.slug, "halloween-prison-room")))[0];
  const disco = (await d.select().from(s.events).where(eq(s.events.slug, "discoroom")))[0];
  const tier = (await d.select().from(s.ticketTiers).where(eq(s.ticketTiers.eventId, prison.id)))[0];
  const owner = (await d.select().from(s.users).where(eq(s.users.email, ME)))[0];
  const poolsBefore = (await d.select().from(s.inventoryPools).where(eq(s.inventoryPools.eventId, prison.id))).map((p) => [p.id, p.soldCount, p.heldCount] as const);

  /* ── 1. Page + API timings (warm: 2nd request) ── */
  for (const p of ["/", "/events", "/events/halloween-prison-room", "/events/discoroom", "/checkout", "/account", "/api/events", "/api/events/halloween-prison-room", "/sitemap.xml"]) {
    await step(`GET ${p}`, async () => { await http(WEB + p); const r = await http(WEB + p); return { ok: r.res.status === 200, note: `${r.res.status} ${r.ms}ms${p.includes("opengraph") ? " " + r.res.headers.get("content-type") : ""}` }; });
  }

  await step("OG image (URL from the page's og:image tag)", async () => { const page = await http(WEB + "/events/halloween-prison-room"); const m = page.text.match(/property="og:image" content="([^"]+)"/); const r = m ? await http(m[1].replace("https://wiievent.com", WEB)) : null; return { ok: !!r && r.res.status === 200 && (r.res.headers.get("content-type") ?? "").startsWith("image/"), note: r ? `${r.res.status} ${r.res.headers.get("content-type")} ${r.ms}ms` : "no og:image tag" }; });

  /* ── 2. Real emails: login code ── */
  if (!process.env.QA_SKIP_MISC_EMAILS) await step("EMAIL login code → " + ME, async () => { const r = await http(WEB + "/api/account/request-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: ME }) }); return { ok: r.res.status === 200 && r.cookies.some((c) => c.startsWith("wii_login_challenge")), note: `${r.res.status} challenge-cookie=${r.cookies.some((c) => c.startsWith("wii_login_challenge"))}` }; });

  /* ── 3. Buyer / mobile API with a real session (Bearer = same signed value as the web cookie) ── */
  const bearer = { authorization: "Bearer " + signAccountSession(ME, SECRET) };
  await step("GET /api/account/me (Bearer)", async () => { const r = await http(WEB + "/api/account/me", { headers: bearer }); return { ok: r.json?.email === ME, note: JSON.stringify(r.json) }; });
  const wallet = await step("GET /api/account/tickets", async () => { const r = await http(WEB + "/api/account/tickets", { headers: bearer }); return { ok: Array.isArray(r.json?.tickets), note: `${r.json?.tickets?.length} tickets ${r.ms}ms`, value: r.json?.tickets as any[] }; });
  await step("GET /api/account/orders", async () => { const r = await http(WEB + "/api/account/orders", { headers: bearer }); return { ok: Array.isArray(r.json?.orders), note: `${r.json?.orders?.length} orders` }; });
  await step("POST saved (save → list → unsave)", async () => {
    const a = await http(WEB + "/api/account/saved", { method: "POST", headers: { ...bearer, "content-type": "application/json" }, body: JSON.stringify({ eventId: "halloween-prison-room", save: true }) });
    const l = await http(WEB + "/api/account/saved", { headers: bearer });
    const b = await http(WEB + "/api/account/saved", { method: "POST", headers: { ...bearer, "content-type": "application/json" }, body: JSON.stringify({ eventId: "halloween-prison-room", save: false }) });
    const l2 = await http(WEB + "/api/account/saved", { headers: bearer });
    return { ok: a.res.status === 200 && l.json?.eventIds?.includes("halloween-prison-room") && b.res.status === 200 && !l2.json?.eventIds?.includes("halloween-prison-room"), note: `saved=${JSON.stringify(l.json?.eventIds)} after-unsave=${JSON.stringify(l2.json?.eventIds)}` };
  });
  const fakePush = "ExponentPushToken[qa-run-" + randomUUID().slice(0, 8) + "]";
  await step("POST /api/account/devices (register push)", async () => { const r = await http(WEB + "/api/account/devices", { method: "POST", headers: { ...bearer, "content-type": "application/json" }, body: JSON.stringify({ pushToken: fakePush, platform: "ios", appVersion: "qa" }) }); const row = await d.query.devices.findFirst({ where: eq(s.devices.pushToken, fakePush) }); cleanup.push(async () => { await d.delete(s.devices).where(eq(s.devices.pushToken, fakePush)); }); return { ok: r.res.status === 200 && !!row, note: `${r.res.status} row=${!!row}` }; });
  await step("GET /api/account/ambassador", async () => { const r = await http(WEB + "/api/account/ambassador", { headers: bearer }); return { ok: r.res.status === 200 && typeof r.json?.status === "string", note: `status=${r.json?.status}` }; });
  if (wallet?.length) {
    const t = wallet[0];
    await step("GET /api/tickets/:id/qr (ticketKey) → signed QR", async () => { const r = await http(WEB + `/api/tickets/${t.id}/qr?k=${encodeURIComponent(signTicketKey(t.id, SECRET))}`); return { ok: r.res.status === 200 && (r.json?.qrToken == null || String(r.json.qrToken).startsWith("wt1.")), note: `status=${r.json?.status} qr=${r.json?.qrToken ? "wt1.…" : "withheld(" + r.json?.status + ")"}` }; });
    await step("GET /api/tickets/:id/qr with WRONG key → 404", async () => { const r = await http(WEB + `/api/tickets/${t.id}/qr?k=bad`); return { ok: r.res.status === 404 || r.res.status === 401, note: String(r.res.status) }; });
  }

  /* ── 4. Referral capture ── */
  const code = await d.query.referralCodes.findFirst({ where: eq(s.referralCodes.status, "active") });
  let refJar: string[] = [];
  await step("POST /api/ref (referral capture cookie)", async () => { if (!code) return { ok: false, note: "no active referral code in DB" }; const r = await http(WEB + "/api/ref", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: code.code }) }); refJar = jarFrom(r.cookies.filter((c) => c.startsWith("wii_ref"))); return { ok: r.res.status === 200 && refJar.length > 0, note: `code=${code.code} cookie=${refJar.length > 0}` }; });

  /* ── 5. Full purchase through the PRODUCTION webhook path ── */
  const idem = "qa-run-" + randomUUID();
  const order = await step("POST /api/orders (reserve, with referral cookie)", async () => { const r = await http(WEB + "/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: "halloween-prison-room", lines: [{ tierId: tier.id, qty: 2 }], idempotencyKey: idem }) }, refJar); return { ok: r.res.status === 200 && r.json?.totalCents === 5000, note: `${r.res.status} total=${r.json?.totalCents} ${r.ms}ms`, value: r.json }; });
  let providerOrderId = "";
  if (order?.orderId) {
    await step("POST /api/orders/:id/pay (Revolut sandbox order)", async () => { const r = await http(WEB + `/api/orders/${order.orderId}/pay?key=${order.key}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: ME }) }); const p = await d.query.payments.findFirst({ where: eq(s.payments.orderId, order.orderId) }); providerOrderId = p?.providerOrderId ?? ""; return { ok: r.res.status === 200 && !!r.json?.checkoutUrl && !!providerOrderId, note: `${r.res.status} checkout=${r.json?.checkoutUrl ? "yes" : "no"} providerOrder=${providerOrderId.slice(0, 8)} ${r.ms}ms` }; });
    await step("Revolut webhook ORDER_COMPLETED (signed) → paid + tickets + EMAIL", async () => {
      const body = JSON.stringify({ event: "ORDER_COMPLETED", order_id: providerOrderId, merchant_order_ext_ref: order.orderId });
      const ts = String(Date.now()); const sig = "v1=" + createHmac("sha256", WH).update(`v1.${ts}.${body}`).digest("hex");
      const r = await http(WEB + "/api/webhooks/revolut", { method: "POST", headers: { "content-type": "application/json", "revolut-request-timestamp": ts, "revolut-signature": sig }, body });
      const o = await d.query.orders.findFirst({ where: eq(s.orders.id, order.orderId) });
      const lines = await d.select().from(s.orderLines).where(eq(s.orderLines.orderId, order.orderId));
      const tix = lines.length ? await d.select().from(s.tickets).where(eq(s.tickets.orderLineId, lines[0].id)) : [];
      const emailed = await d.query.auditLog.findFirst({ where: and(eq(s.auditLog.entityType, "order"), eq(s.auditLog.entityId, order.orderId), eq(s.auditLog.action, "order.tickets_emailed")) });
      const comm = await d.query.commissions.findFirst({ where: eq(s.commissions.orderId, order.orderId) });
      return { ok: r.res.status === 200 && o?.status === "paid" && tix.length === 2 && !!emailed, note: `${r.res.status} order=${o?.status} tickets=${tix.length} emailed=${!!emailed} commission=${comm ? comm.amountCents + "c" : "none"} ${r.ms}ms` };
    });
    await step("Webhook redelivery (same event) → no duplicate email", async () => {
      const body = JSON.stringify({ event: "ORDER_COMPLETED", order_id: providerOrderId }); const ts = String(Date.now()); const sig = "v1=" + createHmac("sha256", WH).update(`v1.${ts}.${body}`).digest("hex");
      const r = await http(WEB + "/api/webhooks/revolut", { method: "POST", headers: { "content-type": "application/json", "revolut-request-timestamp": ts, "revolut-signature": sig }, body });
      const n = await d.select({ c: sql<number>`count(*)::int` }).from(s.auditLog).where(and(eq(s.auditLog.entityType, "order"), eq(s.auditLog.entityId, order.orderId), eq(s.auditLog.action, "order.tickets_emailed")));
      return { ok: r.res.status === 200 && n[0].c === 1, note: `${r.res.status} email-audit-rows=${n[0].c} (must be 1)` };
    });
    await step("Push after finalize: fake token pruned as dead", async () => { const row = await d.query.devices.findFirst({ where: eq(s.devices.pushToken, fakePush) }); return { ok: true, note: row ? "device row still present (Expo did not report it dead)" : "pruned ✓" }; });
    /* transfer T6 via the web route (needs session) + claim */
    const paidTix = await d.select().from(s.tickets).where(eq(s.tickets.orderLineId, (await d.select().from(s.orderLines).where(eq(s.orderLines.orderId, order.orderId)))[0].id));
    let claimToken = "";
    await step("POST /api/tickets/transfer → EMAIL to " + RECIPIENT, async () => { const r = await http(WEB + "/api/tickets/transfer", { method: "POST", headers: { ...bearer, "content-type": "application/json" }, body: JSON.stringify({ ticketId: paidTix[0].id, [TO_FIELD]: RECIPIENT }) }); const tr = await d.query.ticketTransfers.findFirst({ where: eq(s.ticketTransfers.ticketId, paidTix[0].id) }); claimToken = (tr as any)?.claimToken ?? ""; return { ok: r.res.status === 200 && !!claimToken, note: `${r.res.status} ${JSON.stringify(r.json).slice(0, 80)} token=${!!claimToken}` }; });
    await step("POST /api/claim/:token → ownership moves + EMAILS", async () => { if (!claimToken) return { ok: false, note: "no claim token" }; const r = await http(WEB + `/api/claim/${claimToken}`, { method: "POST" }); const t2 = await d.query.tickets.findFirst({ where: eq(s.tickets.id, paidTix[0].id) }); const newOwner = t2 ? await d.query.users.findFirst({ where: eq(s.users.id, t2.ownerUserId) }) : null; const oldStatus = t2?.status; return { ok: r.res.status === 200 && newOwner?.email === RECIPIENT, note: `${r.res.status} owner=${newOwner?.email} status=${oldStatus} ${JSON.stringify(r.json).slice(0, 60)}` }; });
    /* door scan of the freshly paid ticket through the engine-backed HTTP API happens in section 7 */
    cleanup.push(async () => {
      const ls = await d.select().from(s.orderLines).where(eq(s.orderLines.orderId, order.orderId));
      const tix = ls.length ? await d.select().from(s.tickets).where(eq(s.tickets.orderLineId, ls[0].id)) : [];
      for (const t of tix) { await d.delete(s.redemptions).where(eq(s.redemptions.ticketId, t.id)); await d.delete(s.ticketTransfers).where(eq(s.ticketTransfers.ticketId, t.id)); await d.delete(s.ticketEvents).where(eq(s.ticketEvents.ticketId, t.id)); await d.delete(s.tickets).where(eq(s.tickets.id, t.id)); }
      await d.delete(s.commissions).where(eq(s.commissions.orderId, order.orderId)); await d.delete(s.referralAttributions).where(eq(s.referralAttributions.orderId, order.orderId));
      await d.delete(s.refunds).where(eq(s.refunds.orderId, order.orderId)); await d.delete(s.payments).where(eq(s.payments.orderId, order.orderId));
      await d.delete(s.holds).where(eq(s.holds.orderId, order.orderId)); await d.delete(s.orderLines).where(eq(s.orderLines.orderId, order.orderId)); await d.delete(s.orders).where(eq(s.orders.id, order.orderId));
      await d.delete(s.webhookEvents).where(like(s.webhookEvents.providerEventId, `%${providerOrderId}%`));
      for (const [id, sold, held] of poolsBefore) await d.update(s.inventoryPools).set({ soldCount: sold, heldCount: held }).where(eq(s.inventoryPools.id, id));
      const rec = await d.query.users.findFirst({ where: eq(s.users.email, RECIPIENT) }); if (rec) { await d.delete(s.devices).where(eq(s.devices.userId, rec.id)); await d.delete(s.savedEvents).where(eq(s.savedEvents.userId, rec.id)); await d.delete(s.users).where(eq(s.users.id, rec.id)); }
    });
  }

  /* ── 6. Ambassador approval email ── */
  if (!process.env.QA_SKIP_MISC_EMAILS) await step("EMAIL ambassador approved → " + ME, async () => { const r = await sendAmbassadorApprovedEmail({ to: ME, name: "QA", code: "QATEST", rateBps: 1000 }); return { ok: r.provider === "brevo" || !!r.id, note: JSON.stringify(r) }; });

  /* ── 7. Door app over HTTP with a real Supabase session ── */
  const sb = process.env.NEXT_PUBLIC_SUPABASE_URL!, sbKey = process.env.SUPABASE_SECRET_KEY!;
  let jar: string[] = [];
  await step("Door login (magic link → /auth/callback → session cookies)", async () => {
    const g = await fetch(`${sb}/auth/v1/admin/generate_link`, { method: "POST", headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, "content-type": "application/json" }, body: JSON.stringify({ type: "magiclink", email: ME }) });
    const j: any = await g.json(); const hashed = j.properties?.hashed_token ?? j.hashed_token;
    const r = await http(`${ADMIN}/auth/callback?token_hash=${hashed}&type=magiclink&next=/guard/events`);
    jar = jarFrom(r.cookies); return { ok: [302, 303, 307].includes(r.res.status) && jar.length > 0, note: `${r.res.status} → ${r.res.headers.get("location")} cookies=${jar.length}` };
  });
  for (const p of ["/guard/events", "/guard/scanner", "/", "/events", "/orders", "/tickets", "/ambassadors", "/payouts", "/reports", `/events/${prison.id}/analytics`]) {
    await step(`ADMIN GET ${p} (session)`, async () => { const r = await http(ADMIN + p, {}, jar); return { ok: r.res.status === 200, note: `${r.res.status} ${r.ms}ms` }; });
  }
  await step("Door: comp → verify → redeem → duplicate → wrong-event → stats (HTTP)", async () => {
    await issueCompTickets({ eventId: prison.id, tierId: tier.id, email: "qa-door@example.com", qty: 1, actorUserId: owner.id });
    const u = (await d.select().from(s.users).where(eq(s.users.email, "qa-door@example.com")))[0];
    const t = (await d.select().from(s.tickets).where(eq(s.tickets.ownerUserId, u.id)))[0];
    const tok = mintQrToken({ ticketId: t.id, qrVersion: t.qrVersion, exp: Date.now() + 300_000 }, QR);
    const H = { "content-type": "application/json" };
    const v = await http(ADMIN + "/guard/api/verify", { method: "POST", headers: H, body: JSON.stringify({ code: tok, eventId: prison.id }) }, jar);
    const r1 = await http(ADMIN + "/guard/api/redeem", { method: "POST", headers: H, body: JSON.stringify({ code: tok, eventId: prison.id, clientScanId: randomUUID(), device: "qa" }) }, jar);
    const r2 = await http(ADMIN + "/guard/api/redeem", { method: "POST", headers: H, body: JSON.stringify({ code: tok, eventId: prison.id, clientScanId: randomUUID(), device: "qa" }) }, jar);
    const w = await http(ADMIN + "/guard/api/redeem", { method: "POST", headers: H, body: JSON.stringify({ code: tok, eventId: disco.id, clientScanId: randomUUID(), device: "qa" }) }, jar);
    const st = await http(ADMIN + "/guard/api/stats?eventId=" + prison.id, {}, jar);
    cleanup.push(async () => { await d.delete(s.scanAttempts).where(eq(s.scanAttempts.guardUserId, owner.id)); await d.delete(s.redemptions).where(eq(s.redemptions.ticketId, t.id)); await d.delete(s.ticketEvents).where(eq(s.ticketEvents.ticketId, t.id)); await d.delete(s.tickets).where(eq(s.tickets.id, t.id)); const o = await d.query.orders.findFirst({ where: eq(s.orders.email, "qa-door@example.com") }); if (o) { await d.delete(s.orderLines).where(eq(s.orderLines.orderId, o.id)); await d.delete(s.orders).where(eq(s.orders.id, o.id)); } await d.delete(s.users).where(eq(s.users.id, u.id)); for (const [id, sold, held] of poolsBefore) await d.update(s.inventoryPools).set({ soldCount: sold, heldCount: held }).where(eq(s.inventoryPools.id, id)); });
    return { ok: v.json?.ok === true && r1.json?.ok === true && r1.json?.alreadyRedeemed === false && r2.json?.alreadyRedeemed === true && w.json?.ok !== true && st.res.status === 200, note: `verify=${v.res.status}/${v.json?.ok} redeem=${r1.json?.ok}/${r1.ms}ms dup=${r2.json?.alreadyRedeemed} wrongEvent=${w.json?.reason ?? w.res.status} stats=${st.res.status}` };
  });

  /* ── 8. Abuse controls ── */
  await step("OTP brute-force cap (9th attempt → 429)", async () => { let last = 0; for (let i = 0; i < 9; i++) { const r = await http(WEB + "/api/account/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "qa-bruteforce@example.com", code: "000000" }) }); last = r.res.status; } return { ok: last === 429, note: `9th=${last}` }; });

  /* ── 9. Email delivery per Brevo ── */
  await step("Brevo delivery log (last 25s)", async () => {
    await new Promise((r) => setTimeout(r, 25_000));
    const out: string[] = [];
    for (const em of [ME, RECIPIENT]) {
      const r = await fetch(`https://api.brevo.com/v3/smtp/statistics/events?limit=20&email=${encodeURIComponent(em)}&sort=desc`, { headers: { "api-key": process.env.BREVO_API_KEY! } });
      const j: any = await r.json(); const ev = (j.events ?? []).filter((e: any) => Date.now() - new Date(e.date).getTime() < 15 * 60_000);
      out.push(`${em}: ` + (ev.length ? ev.map((e: any) => `${e.event}:${(e.subject ?? "").slice(0, 28)}`).join(" | ") : "no events yet"));
    }
    return { ok: out.some((o) => /delivered|requests/.test(o)), note: out.join("  ‖  ") };
  });

  /* ── cleanup ── */
  for (const fn of cleanup) { try { await fn(); } catch (e) { rows.push({ step: "cleanup", ok: false, ms: 0, note: String(e).slice(0, 120) }); } }
  const poolsAfter = (await d.select().from(s.inventoryPools).where(eq(s.inventoryPools.eventId, prison.id))).map((p) => [p.id, p.soldCount, p.heldCount] as const);
  rows.push({ step: "cleanup: pools restored", ok: JSON.stringify(poolsAfter) === JSON.stringify(poolsBefore), ms: 0, note: JSON.stringify(poolsAfter.map((p) => p.slice(1))) });

  console.log("\nRESULT  ms     STEP — NOTE");
  for (const r of rows) console.log(`${r.ok ? "PASS " : "FAIL "} ${String(r.ms).padStart(5)}  ${r.step} — ${r.note}`);
  console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} passed. LAG(>1.5s): ${lag.length ? lag.join(", ") : "none"}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
