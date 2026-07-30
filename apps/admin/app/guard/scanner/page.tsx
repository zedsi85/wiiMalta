"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QrScanner from "qr-scanner";

/**
 * Camera check-in scanner — RA/Shotgun-style.
 *
 * Flow: decode → pause camera → verify (peek) → attendee card with
 * Admit / Cancel (or instant-admit in Fast mode) → full-screen verdict
 * (green admitted / orange already-in / red reject) → auto-resume.
 *
 * Offline: scans queue in localStorage with a client UUID and flush through
 * /guard/api/sync (idempotent server-side) when connectivity returns.
 */

const QUEUE_KEY = "wii_guard_queue_v1";
const RESUME_MS = 1600;

interface TicketInfo {
  ticketId: string;
  serial: string;
  status: string;
  tierName: string;
  eventTitle: string;
  customerName: string;
  orderRef: string;
  redeemedAt: string | null;
  redeemedGate: string | null;
}

type Screen =
  | { kind: "scanning" }
  | { kind: "checking" }
  | { kind: "confirm"; info: TicketInfo; code: string }
  | { kind: "admitted"; info?: TicketInfo; serial: string; tierName: string }
  | { kind: "already"; serial: string; tierName: string; at: string | null; gate: string | null }
  | { kind: "reject"; reason: string }
  | { kind: "queued"; queueSize: number };

interface QueuedScan {
  code: string;
  clientScanId: string;
  eventId?: string;
  scannedAt: string;
  device: string;
}

const REASON_TEXT: Record<string, string> = {
  invalid: "Not one of our tickets",
  expired_qr: "QR expired — ask them to refresh their ticket page",
  revoked: "Ticket revoked — refund or fraud",
  not_active: "Ticket not admittable",
  wrong_version: "Outdated QR (screenshot?) — ask for the live ticket",
  wrong_event: "Ticket is for a different event",
  network: "Network error — scan queued? Try again",
};

const deviceString = () =>
  typeof navigator === "undefined" ? "unknown" : navigator.userAgent.slice(0, 110);

function loadQueue(): QueuedScan[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveQueue(q: QueuedScan[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = ok ? 1200 : 260;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    setTimeout(() => void ctx.close(), 400);
  } catch {
    /* audio unavailable */
  }
}

function haptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* iOS Safari: no vibration API */
  }
}

function ScannerInner() {
  const params = useSearchParams();
  const eventId = params.get("event") ?? undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationRef = useRef<string | undefined>(undefined);

  const [screen, setScreen] = useState<Screen>({ kind: "scanning" });
  const [fastMode, setFastMode] = useState(false);
  const [torch, setTorch] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [online, setOnline] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const screenRef = useRef(screen);
  screenRef.current = screen;
  const fastRef = useRef(fastMode);
  fastRef.current = fastMode;

  /* ---------- offline queue ---------- */

  const flushQueue = useCallback(async () => {
    const queue = loadQueue();
    if (queue.length === 0) return;
    try {
      const res = await fetch("/guard/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scans: queue }),
      });
      if (res.ok) {
        saveQueue([]);
        setQueueSize(0);
      }
    } catch {
      /* still offline */
    }
  }, []);

  useEffect(() => {
    setQueueSize(loadQueue().length);
    setOnline(navigator.onLine);
    const up = () => {
      setOnline(true);
      void flushQueue();
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const interval = setInterval(() => void flushQueue(), 20_000);
    // Optional geolocation (never blocks scanning)
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        locationRef.current = `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
      },
      () => {},
      { maximumAge: 600_000, timeout: 5_000 }
    );
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      clearInterval(interval);
    };
  }, [flushQueue]);

  const enqueue = useCallback((code: string) => {
    const queue = loadQueue();
    queue.push({
      code,
      clientScanId: crypto.randomUUID(),
      eventId,
      scannedAt: new Date().toISOString(),
      device: deviceString(),
    });
    saveQueue(queue);
    setQueueSize(queue.length);
    haptic([40, 60, 40]);
    beep(true);
    setScreen({ kind: "queued", queueSize: queue.length });
    scheduleResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  /* ---------- scan pipeline ---------- */

  const scheduleResume = useCallback((ms: number = RESUME_MS) => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setScreen({ kind: "scanning" }), ms);
  }, []);

  const admit = useCallback(
    async (code: string) => {
      const clientScanId = crypto.randomUUID();
      try {
        const res = await fetch("/guard/api/redeem", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            code,
            eventId,
            clientScanId,
            device: deviceString(),
            location: locationRef.current,
          }),
        });
        if (res.status === 401) {
          window.location.href = "/guard/login";
          return;
        }
        const result = await res.json();
        if (result.ok && !result.alreadyRedeemed) {
          haptic(80);
          beep(true);
          setScreen({ kind: "admitted", serial: result.serial, tierName: result.tierName });
        } else if (result.ok) {
          haptic([60, 80, 60]);
          beep(false);
          setScreen({
            kind: "already",
            serial: result.serial,
            tierName: result.tierName,
            at: result.redeemedAt ?? null,
            gate: result.gate ?? null,
          });
        } else {
          haptic([50, 50, 50, 50, 120]);
          beep(false);
          setScreen({ kind: "reject", reason: result.reason ?? "invalid" });
        }
      } catch {
        enqueue(code);
        return;
      }
      scheduleResume();
    },
    [eventId, enqueue, scheduleResume]
  );

  const onDecode = useCallback(
    async (code: string) => {
      // ignore rapid duplicate decodes + only act while scanning
      const now = Date.now();
      if (screenRef.current.kind !== "scanning") return;
      if (lastCodeRef.current.code === code && now - lastCodeRef.current.at < 3000) return;
      lastCodeRef.current = { code, at: now };

      setScreen({ kind: "checking" });

      if (!navigator.onLine) {
        enqueue(code);
        return;
      }

      if (fastRef.current) {
        await admit(code);
        return;
      }

      try {
        const res = await fetch("/guard/api/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code, eventId, device: deviceString() }),
        });
        if (res.status === 401) {
          window.location.href = "/guard/login";
          return;
        }
        const result = await res.json();
        if (!result.ok) {
          haptic([50, 50, 50, 50, 120]);
          beep(false);
          setScreen({ kind: "reject", reason: result.reason ?? "invalid" });
          scheduleResume();
          return;
        }
        const info: TicketInfo = result.info;
        if (info.status === "redeemed") {
          haptic([60, 80, 60]);
          beep(false);
          setScreen({
            kind: "already",
            serial: info.serial,
            tierName: info.tierName,
            at: info.redeemedAt,
            gate: info.redeemedGate,
          });
          scheduleResume(2500);
          return;
        }
        if (info.status !== "active") {
          haptic([50, 50, 50, 50, 120]);
          beep(false);
          setScreen({ kind: "reject", reason: info.status === "revoked" ? "revoked" : "not_active" });
          scheduleResume();
          return;
        }
        haptic(30);
        setScreen({ kind: "confirm", info, code });
      } catch {
        enqueue(code);
      }
    },
    [eventId, admit, enqueue, scheduleResume]
  );

  /* ---------- camera lifecycle ---------- */

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const scanner = new QrScanner(video, (result) => void onDecode(result.data), {
      preferredCamera: "environment",
      highlightScanRegion: true,
      highlightCodeOutline: true,
      maxScansPerSecond: 12,
      returnDetailedScanResult: true,
    });
    scannerRef.current = scanner;
    scanner
      .start()
      .then(() => scanner.hasFlash())
      .then(setHasTorch)
      .catch(() =>
        setCameraError(
          "Camera unavailable. Allow camera access for this site (Settings → Safari/Chrome → Camera), then reload."
        )
      );
    return () => {
      scanner.destroy();
      scannerRef.current = null;
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [onDecode]);

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.toggleFlash();
      setTorch(scanner.isFlashOn());
    } catch {
      /* no flash */
    }
  };

  const timeFmt = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Malta",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date(iso))
      : "—";

  /* ---------- UI ---------- */

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-void">
      {/* Camera */}
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <Link
          href={eventId ? `/guard/event/${eventId}` : "/guard/events"}
          className="rounded-pill bg-void/70 px-4 py-2 font-mono text-xs backdrop-blur"
        >
          ← Back
        </Link>
        <div className="flex items-center gap-2">
          {!online && (
            <span className="rounded-pill bg-gold/90 px-3 py-1.5 font-mono text-[0.625rem] font-bold uppercase text-void">
              offline
            </span>
          )}
          {queueSize > 0 && (
            <span className="rounded-pill bg-void/70 px-3 py-1.5 font-mono text-[0.625rem] backdrop-blur">
              {queueSize} queued
            </span>
          )}
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`rounded-pill px-3 py-1.5 font-mono text-xs backdrop-blur ${torch ? "bg-bone text-void" : "bg-void/70"}`}
            >
              ⚡
            </button>
          )}
          <button
            onClick={() => setFastMode((f) => !f)}
            className={`rounded-pill px-3 py-1.5 font-mono text-[0.625rem] uppercase backdrop-blur ${fastMode ? "bg-go text-void" : "bg-void/70"}`}
          >
            fast
          </button>
        </div>
      </div>

      {/* Scan hint */}
      {screen.kind === "scanning" && !cameraError && (
        <div className="absolute inset-x-0 bottom-10 z-10 text-center font-mono text-xs text-smoke">
          Point at the ticket QR{fastMode ? " · fast mode: instant admit" : ""}
        </div>
      )}
      {screen.kind === "checking" && (
        <div className="absolute inset-x-0 bottom-10 z-10 text-center font-mono text-sm text-bone">
          ◌ Checking…
        </div>
      )}
      {cameraError && (
        <div className="absolute inset-x-4 top-24 z-10 rounded-lg bg-void/90 p-4 text-center text-sm text-ember-300">
          {cameraError}
        </div>
      )}

      {/* Confirm card */}
      {screen.kind === "confirm" && (
        <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-xl bg-charcoal p-5 pb-8 shadow-pop">
          <div className="mb-4">
            <div className="text-2xl font-bold">{screen.info.customerName}</div>
            <div className="mt-1 text-sm text-sand">
              {screen.info.tierName} · {screen.info.eventTitle}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs text-fog">
              <span>Ticket {screen.info.serial}</span>
              <span>Order {screen.info.orderRef}</span>
              <span className="text-go">VALID · not yet admitted</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setScreen({ kind: "scanning" })}
              className="btn-admin justify-center py-4 text-base"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setScreen({ kind: "checking" });
                void admit(screen.code);
              }}
              className="justify-center rounded-md bg-go py-4 text-center text-base font-bold text-void active:scale-[0.98]"
            >
              Admit →
            </button>
          </div>
        </div>
      )}

      {/* Verdict overlays */}
      {screen.kind === "admitted" && (
        <button
          onClick={() => setScreen({ kind: "scanning" })}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-go text-void"
        >
          <div className="text-7xl">✓</div>
          <div className="mt-2 text-3xl font-black uppercase">Admitted</div>
          <div className="mt-3 font-mono text-sm">
            {screen.serial} · {screen.tierName}
          </div>
          <div className="mt-8 font-mono text-xs opacity-70">tap to continue</div>
        </button>
      )}
      {screen.kind === "already" && (
        <button
          onClick={() => setScreen({ kind: "scanning" })}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gold text-void"
        >
          <div className="text-7xl">⚠</div>
          <div className="mt-2 text-3xl font-black uppercase">Already in</div>
          <div className="mt-3 font-mono text-sm">
            {screen.serial} · {screen.tierName}
          </div>
          <div className="mt-1 font-mono text-sm font-bold">
            admitted {timeFmt(screen.at)}
            {screen.gate ? ` · gate ${screen.gate}` : ""}
          </div>
          <div className="mt-8 font-mono text-xs opacity-70">tap to continue</div>
        </button>
      )}
      {screen.kind === "reject" && (
        <button
          onClick={() => setScreen({ kind: "scanning" })}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-ember-600 text-bone"
        >
          <div className="text-7xl">✕</div>
          <div className="mt-2 text-3xl font-black uppercase">Do not admit</div>
          <div className="mt-3 max-w-xs px-6 text-center font-mono text-sm">
            {REASON_TEXT[screen.reason] ?? screen.reason}
          </div>
          <div className="mt-8 font-mono text-xs opacity-70">tap to continue</div>
        </button>
      )}
      {screen.kind === "queued" && (
        <button
          onClick={() => setScreen({ kind: "scanning" })}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-azure-600 text-bone"
        >
          <div className="text-7xl">⇪</div>
          <div className="mt-2 text-3xl font-black uppercase">Queued offline</div>
          <div className="mt-3 max-w-xs px-6 text-center font-mono text-sm">
            {screen.queueSize} scan{screen.queueSize === 1 ? "" : "s"} will sync when back online.
            Verify the ticket visually before letting them in.
          </div>
          <div className="mt-8 font-mono text-xs opacity-70">tap to continue</div>
        </button>
      )}
    </main>
  );
}

export default function ScannerPage() {
  return (
    <Suspense>
      <ScannerInner />
    </Suspense>
  );
}
