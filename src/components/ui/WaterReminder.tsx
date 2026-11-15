"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Droplets, Sparkles } from "lucide-react";

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

export function WaterReminder() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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

    return () => {
      window.clearTimeout(exactTimeout);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [evaluateReminder, isAuthPage, isOpen]);

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

        <div className="pt-1">
          <button
            type="button"
            onClick={handleAlreadyDrank}
            autoFocus
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-300 hover:from-sky-300 hover:via-cyan-300 hover:to-teal-200 text-[#120e15] font-semibold text-sm shadow-lg shadow-sky-950/40 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Droplets className="w-4 h-4" />
            <span>já bebi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
