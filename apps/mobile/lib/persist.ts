import { dehydrate, hydrate, type QueryClient } from "@tanstack/react-query";

/**
 * Offline wallet persistence. React Query holds the cache in memory only, so a
 * killed app at a venue with no signal loses the ticket list and QR payloads.
 * This dehydrates the wallet-critical queries to AsyncStorage (bundled in Expo
 * Go — no native rebuild) so the wallet is readable immediately on next launch,
 * offline. QR *display* only — redemption is always server-side, and the token
 * still carries its own expiry, so a stale cached code shows the "reconnect for
 * a fresh QR" hint rather than admitting anyone.
 *
 * Defensive by design: if AsyncStorage is ever unavailable, every call no-ops
 * and the app runs exactly as before (in-memory cache).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AsyncStorage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
  AsyncStorage = null;
}

const KEY = "wii_wallet_cache_v1";
const MAX_AGE_MS = 7 * 24 * 3600_000; // a week of offline readability
// Only these query families are worth carrying across restarts.
const WALLET_KEYS = ["tickets", "ticket-qr", "account", "events", "event", "ambassador"];

const isWalletQuery = (queryKey: readonly unknown[]) =>
  WALLET_KEYS.includes(String(queryKey?.[0] ?? ""));

/** Rehydrate the wallet cache. Call once, before the first render. */
export async function restoreWalletCache(qc: QueryClient): Promise<void> {
  if (!AsyncStorage) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { ts?: number; state?: unknown };
    if (!parsed.ts || Date.now() - parsed.ts > MAX_AGE_MS) {
      await AsyncStorage.removeItem(KEY);
      return;
    }
    hydrate(qc, parsed.state);
  } catch {
    /* corrupt or unreadable — ignore, start with an empty cache */
  }
}

/** Subscribe to cache changes and persist wallet queries (debounced). */
export function attachWalletPersister(qc: QueryClient): () => void {
  if (!AsyncStorage) return () => {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  const save = async () => {
    try {
      const state = dehydrate(qc, {
        shouldDehydrateQuery: (q) => q.state.status === "success" && isWalletQuery(q.queryKey),
      });
      await AsyncStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), state }));
    } catch {
      /* best-effort */
    }
  };
  const unsubscribe = qc.getQueryCache().subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void save(), 1500);
  });
  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}

/** Clear persisted wallet data (call on sign-out). */
export async function clearWalletCache(): Promise<void> {
  if (!AsyncStorage) return;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
