"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BellRing, CheckCircle2, Droplets, Loader2, Sparkles } from "lucide-react";

const STORAGE_KEY = "organiza_ary_last_water_at";
const PENDING_LOGIN_KEY = "organiza_ary_pending_login_water";
const SESSION_ACTIVE_KEY = "organiza_ary_water_session_active";
const REMINDER_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos
const CHECK_INTERVAL_MS = 15 * 1000;

function readLastWaterTimestamp(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeLastWaterTimestamp(timestamp: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(timestamp));
  } catch {
    // Ignore storage errors in restricted browser contexts
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

async function syncPushSubscription(): Promise<boolean> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (
    !vapidPublicKey ||
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return false;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });

  return response.ok;
}

export function WaterReminder() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [pushState, setPushState] = useState<
    "idle" | "subscribing" | "enabled" | "denied" | "unsupported"
  >("idle");

  const isAuthPage = pathname === "/login";

  const evaluateReminder = useCallback(() => {
    if (isAuthPage) return;

    const now = Date.now();
    let lastWaterAt = readLastWaterTimestamp();

    if (lastWaterAt === null) {
      lastWaterAt = now;
      writeLastWaterTimestamp(lastWaterAt);
    }

    if (now - lastWaterAt >= REMINDER_INTERVAL_MS) {
      setIsOpen(true);

      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        "serviceWorker" in navigator
      ) {
        navigator.serviceWorker.ready
          .then((registration) =>
            registration.showNotification("Beba agua Ary!", {
              body: "Já se passaram 30 minutos. Hora de se hidratar!",
              icon: "/logo.png",
              badge: "/logo.png",
              tag: "water-reminder",
            })
          )
          .catch(() => {});
      }
    }
  }, [isAuthPage]);

  useEffect(() => {
    if (isAuthPage) {
      try {
        window.localStorage.setItem(PENDING_LOGIN_KEY, "1");
        window.sessionStorage.removeItem(SESSION_ACTIVE_KEY);
      } catch {
        // Ignore storage errors
      }
      return;
    }

    let shouldShowImmediately = false;

    try {
      const pendingLogin = window.localStorage.getItem(PENDING_LOGIN_KEY) === "1";
      const hasActiveSession = window.sessionStorage.getItem(SESSION_ACTIVE_KEY) === "1";

      if (pendingLogin) {
        window.localStorage.removeItem(PENDING_LOGIN_KEY);
        shouldShowImmediately = true;
      }

      if (!hasActiveSession) {
        window.sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");
        shouldShowImmediately = true;
      }
    } catch {
      // Ignore storage errors
    }

    const now = Date.now();
    let lastWaterAt = readLastWaterTimestamp();
    if (lastWaterAt === null) {
      lastWaterAt = now;
      writeLastWaterTimestamp(lastWaterAt);
    }

    const remainingMs = shouldShowImmediately
      ? 0
      : Math.max(0, REMINDER_INTERVAL_MS - (now - lastWaterAt));

    const exactTimeout = window.setTimeout(() => {
      if (shouldShowImmediately) {
        setIsOpen(true);
      } else {
        evaluateReminder();
      }
    }, remainingMs);

    const interval = window.setInterval(evaluateReminder, CHECK_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        evaluateReminder();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const updated = Number(event.newValue);
      if (Number.isFinite(updated) && Date.now() - updated < REMINDER_INTERVAL_MS) {
        setIsOpen(false);
      } else {
        evaluateReminder();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("storage", handleStorage);

    // Sync Service Worker & Push status asynchronously
    const initPushTimer = window.setTimeout(() => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window) ||
        !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      ) {
        setPushState("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setPushState("denied");
        return;
      }

      if (Notification.permission === "granted") {
        syncPushSubscription()
          .then((ok) => setPushState(ok ? "enabled" : "idle"))
          .catch(() => setPushState("idle"));
        return;
      }

      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }, 0);

    return () => {
      window.clearTimeout(exactTimeout);
      window.clearTimeout(initPushTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [evaluateReminder, isAuthPage, isOpen]);

  const handleEnablePush = async () => {
    if (!("Notification" in window)) {
      setPushState("unsupported");
      return;
    }

    try {
      setPushState("subscribing");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "idle");
        return;
      }

      const ok = await syncPushSubscription();
      setPushState(ok ? "enabled" : "idle");
    } catch {
      setPushState("idle");
    }
  };

  const handleAlreadyDrank = () => {
    writeLastWaterTimestamp(Date.now());
    setIsOpen(false);
  };

  if (!isOpen || isAuthPage) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="water-reminder-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.16)_0%,_rgba(152,115,161,0.10)_45%,_transparent_70%)] pointer-events-none" />

      <div className="relative w-full max-w-sm rounded-3xl border border-sky-400/35 bg-[#1a151f] p-6 sm:p-8 shadow-[0_0_50px_-10px_rgba(56,189,248,0.3)] space-y-5 text-center z-10 animate-in zoom-in-95 duration-200">
        <div className="flex justify-center pt-1">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/20 via-cyan-400/20 to-[#9873a1]/25 border border-sky-300/35 flex items-center justify-center shadow-inner">
              <Droplets className="w-8 h-8 text-sky-400 animate-pulse" />
            </div>
            <div className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-[#1a151f] border border-sky-400/40 text-sky-300">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-sky-300/90 block">
            Lembrete de Hidratação
          </span>
          <h2
            id="water-reminder-title"
            className="text-xl sm:text-2xl font-semibold text-[#f4eff5] tracking-tight"
          >
            Beba agua Ary!
          </h2>
          <p className="text-xs sm:text-sm text-[#968a9c] leading-relaxed">
            Hora de se hidratar! Mantenha sua garrafinha por perto a cada 30 minutos para continuar com tudo.
          </p>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleAlreadyDrank}
            autoFocus
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-300 hover:from-sky-300 hover:via-cyan-300 hover:to-teal-200 text-[#120e15] font-semibold text-sm shadow-lg shadow-sky-950/40 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Droplets className="w-4 h-4" />
            <span>já bebi</span>
          </button>

          {pushState === "idle" && (
            <button
              type="button"
              onClick={handleEnablePush}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-sky-400/30 bg-[#231c29] hover:bg-[#2c2334] text-sky-300 font-medium text-xs transition-colors cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Ativar notificações no celular</span>
            </button>
          )}

          {pushState === "subscribing" && (
            <div className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs text-sky-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Ativando notificações...</span>
            </div>
          )}

          {pushState === "enabled" && (
            <div className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-emerald-300/90">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Notificações no celular ativadas</span>
            </div>
          )}

          {pushState === "denied" && (
            <p className="text-[11px] text-[#968a9c]">
              Notificações bloqueadas no navegador. Libere nas configurações do site para receber no celular.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
