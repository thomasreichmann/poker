export const motion = {
  duration: {
    fast: 120,
    base: 200,
    slow: 320,
  },
  ease: {
    standard: [0.2, 0, 0, 1] as [number, number, number, number],
    decelerate: [0, 0, 0.2, 1] as [number, number, number, number],
  },
  stagger: {
    deal: 40,
  },
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}