import { useCallback, useEffect, useState } from "react";

/** Recently viewed events (per device, newest first, max 8). Defensive: no-ops without AsyncStorage. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AsyncStorage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
  AsyncStorage = null;
}
const KEY = "wii_recent_v1";
const listeners = new Set<(slugs: string[]) => void>();
let cache: string[] | null = null;

async function load(): Promise<string[]> {
  if (cache) return cache;
  try {
    cache = JSON.parse((await AsyncStorage?.getItem(KEY)) ?? "[]");
  } catch {
    cache = [];
  }
  return cache!;
}

export async function pushRecent(slug: string): Promise<void> {
  const cur = await load();
  cache = [slug, ...cur.filter((s) => s !== slug)].slice(0, 8);
  listeners.forEach((l) => l(cache!));
  try {
    await AsyncStorage?.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

export function useRecent(): string[] {
  const [slugs, setSlugs] = useState<string[]>(cache ?? []);
  useEffect(() => {
    void load().then(setSlugs);
    listeners.add(setSlugs);
    return () => {
      listeners.delete(setSlugs);
    };
  }, []);
  return slugs;
}

export function useTrackRecent(slug?: string) {
  const track = useCallback(() => {
    if (slug) void pushRecent(slug);
  }, [slug]);
  useEffect(track, [track]);
}
