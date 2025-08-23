"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const FLAG = process.env.NEXT_PUBLIC_ENABLE_MOTION;

export type MotionSettings = {
  enabled: boolean;
  reduced: boolean;
  setEnabled: (v: boolean) => void;
  setReduced: (v: boolean) => void;
};

const MotionContext = createContext<MotionSettings | null>(null);

function getSystemPrefersReduced(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState<boolean>(() => FLAG !== "false");
  const [reduced, setReduced] = useState<boolean>(() => getSystemPrefersReduced());

  useEffect(() => {
    // hydrate from localStorage
    try {
      const raw = localStorage.getItem("motion.settings");
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<MotionSettings>;
        if (typeof parsed.enabled === "boolean") setEnabled(parsed.enabled);
        if (typeof parsed.reduced === "boolean") setReduced(parsed.reduced);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // persist
    try {
      localStorage.setItem("motion.settings", JSON.stringify({ enabled, reduced }));
    } catch {}
  }, [enabled, reduced]);

  useEffect(() => {
    // watch system pref change
    const mql = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (!mql) return;
    const handler = () => setReduced((prev) => prev || mql.matches);
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);

  const value = useMemo<MotionSettings>(() => ({ enabled, reduced, setEnabled, setReduced }), [enabled, reduced]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotionSettings() {
  const ctx = useContext(MotionContext);
  if (!ctx) {
    // SSR or outside provider; default to safe settings
    return {
      enabled: FLAG !== "false",
      reduced: getSystemPrefersReduced(),
      setEnabled: () => {},
      setReduced: () => {},
    } satisfies MotionSettings;
  }
  return ctx;
}

export function useReducedMotion() {
  const { reduced } = useMotionSettings();
  return reduced;
}

export function logAnim(marker: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  try {
    // In dev builds, log to console; can be swapped with a proper analytics sink.
    // eslint-disable-next-line no-console
    console.debug(`[anim:${marker}]`, data ?? {});
  } catch {}
}