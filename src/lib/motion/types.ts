export type MotionPreset = "dev-stub" | "none";

export type MotionSettings = {
  enabled: boolean;
  debugOutlines: boolean;
  speedMultiplier: number; // 1 = normal, <1 slower, >1 faster
  preset: MotionPreset;
};

export type MotionEvent = {
  id: string;
  name: string;
  at: number; // epoch ms
  payload?: Record<string, unknown>;
};

export type GetAnimAttrsOptions = {
  id?: string | number;
  role?: string;
  sequenceIndex?: number;
  totalInSequence?: number;
  delayMs?: number;
};

export type AnimAttrs = {
  [key: string]: unknown;
};

export type MotionContextValue = {
  settings: MotionSettings;
  setSettings: (updater: (prev: MotionSettings) => MotionSettings) => void;
  toggleEnabled: () => void;
  setDebugOutlines: (value: boolean) => void;
  setSpeedMultiplier: (value: number) => void;
  setPreset: (value: MotionPreset) => void;

  // Event bus
  events: MotionEvent[];
  emit: (name: string, payload?: Record<string, unknown>) => void;
  clearEvents: () => void;

  // Helper to attach attributes for future motion integration
  getAnimAttrs: (tag: string, options?: GetAnimAttrsOptions) => AnimAttrs;
};

export const DEFAULT_SETTINGS: MotionSettings = {
  enabled: true,
  debugOutlines: false,
  speedMultiplier: 1,
  preset: "dev-stub",
};

