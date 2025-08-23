export type AnimEvent = "anim_start" | "anim_end" | "anim_interrupt";

export function emitAnimEvent(event: AnimEvent, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[telemetry]", event, data || {});
  }
}

export function startDroppedFrameLogger() {
  if (process.env.NODE_ENV === "production") return () => {};
  if (typeof PerformanceObserver === "undefined") return () => {};

  // Very lightweight rAF based monitor
  let last = performance.now();
  let dropped = 0;
  let running = true;

  function tick() {
    if (!running) return;
    const now = performance.now();
    const delta = now - last;
    last = now;
    // If delta > 34ms, consider a dropped frame for 60fps budget
    if (delta > 34) dropped += 1;
    requestAnimationFrame(tick);
  }
  const id = requestAnimationFrame(tick);

  const interval = setInterval(() => {
    if (!running) return;
    if (dropped > 0) {
      // eslint-disable-next-line no-console
      console.debug("[perf] dropped_frames", { dropped });
      dropped = 0;
    }
  }, 2000);

  return () => {
    running = false;
    cancelAnimationFrame(id);
    clearInterval(interval);
  };
}