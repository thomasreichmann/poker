"use client";
// Todo: the community cards animation is not working as expected, when new cards comes in
// it just appears as if there is no animation, the animation only happens if we manually click the
// reveal button on the debug panel.
// also, another bug, when we are using the simulator panel, moving to another panel,
// like the animation one, causes the simulator to disable
// also, another bug, sometimes when the player acts, there is no feedback to the player and the game
// does not update untill we refresh the page (I also think that no realtime notification is sent?).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  disposeMotion,
  initializeMotion,
  play as playAdapter,
} from "./adapter";
import type {
  AnimAttrs,
  MotionContextValue,
  MotionEvent,
  MotionSettings,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";

const MotionContext = createContext<MotionContextValue | null>(null);

const STORAGE_KEY = "motion.settings.v1";

function loadSettings(): MotionSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<MotionSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: MotionSettings) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch {}
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<MotionSettings>(loadSettings);
  const [events, setEvents] = useState<MotionEvent[]>([]);
  const idRef = useRef(0);
  const lastProcessedId = useRef<string | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Initialize motion library on client
  useEffect(() => {
    let mounted = true;
    if (typeof window !== "undefined") {
      initializeMotion(() => settings);
    }
    return () => {
      if (!mounted) return;
      disposeMotion();
      mounted = false;
    };
  }, [settings]);

  // Forward events to motion adapter
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!settings.enabled || settings.preset === "none") return;
    const next = events[0];
    if (!next) return;
    if (lastProcessedId.current === next.id) return;
    lastProcessedId.current = next.id;
    void playAdapter(next.name, next.payload);
  }, [events, settings.enabled, settings.preset]);

  const setSettings = useCallback(
    (updater: (prev: MotionSettings) => MotionSettings) => {
      setSettingsState((prev) => updater(prev));
    },
    []
  );

  const toggleEnabled = useCallback(() => {
    setSettingsState((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const setDebugOutlines = useCallback((value: boolean) => {
    setSettingsState((prev) => ({ ...prev, debugOutlines: value }));
  }, []);

  const setSpeedMultiplier = useCallback((value: number) => {
    setSettingsState((prev) => ({
      ...prev,
      speedMultiplier: Math.max(0.1, Math.min(4, value || 1)),
    }));
  }, []);

  const setPreset = useCallback((value: MotionSettings["preset"]) => {
    setSettingsState((prev) => ({ ...prev, preset: value }));
  }, []);

  const emit = useCallback(
    (name: string, payload?: Record<string, unknown>) => {
      setEvents((prev) => {
        const id = ++idRef.current;
        const evt: MotionEvent = {
          id: String(id),
          name,
          at: Date.now(),
          payload,
        };
        return [evt, ...prev].slice(0, 200);
      });
    },
    []
  );

  const clearEvents = useCallback(() => setEvents([]), []);

  const getAnimAttrs = useCallback(
    (
      tag: string,
      options?: {
        id?: string | number;
        role?: string;
        sequenceIndex?: number;
        totalInSequence?: number;
        delayMs?: number;
      }
    ): AnimAttrs => {
      const attrs: Record<string, unknown> = {
        "data-anim": tag,
        "data-anim-id": options?.id ?? undefined,
        "data-anim-role": options?.role ?? undefined,
        "data-anim-index": options?.sequenceIndex ?? undefined,
        "data-anim-total": options?.totalInSequence ?? undefined,
      };
      if (options?.delayMs != null) {
        attrs.style = { animationDelay: `${Math.max(0, options.delayMs)}ms` };
      }
      return attrs as AnimAttrs;
    },
    []
  );

  const value = useMemo<MotionContextValue>(
    () => ({
      settings,
      setSettings,
      toggleEnabled,
      setDebugOutlines,
      setSpeedMultiplier,
      setPreset,
      events,
      emit,
      clearEvents,
      getAnimAttrs,
    }),
    [
      settings,
      setSettings,
      toggleEnabled,
      setDebugOutlines,
      setSpeedMultiplier,
      setPreset,
      events,
      emit,
      clearEvents,
      getAnimAttrs,
    ]
  );

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  );
}

export function useMotion() {
  const ctx = useContext(MotionContext);
  if (!ctx) throw new Error("useMotion must be used within MotionProvider");
  return ctx;
}
