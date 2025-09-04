// Lightweight dev replay event bus
// Usage:
//   import { emitReplay, useReplaySignal } from "@/lib/dev/replay";
//   const replayAt = useReplaySignal(); // Date changes on replay
//   useEffect(() => { /* rerun animation */ }, [replayAt])

import * as React from "react";

let listeners: Array<(at: number) => void> = [];

export function emitReplay(): void {
  const at = Date.now();
  for (const listener of listeners) listener(at);
}

export function useReplaySignal(): number {
  const [at, setAt] = React.useState<number>(0);
  React.useEffect(() => {
    function onReplay(next: number) {
      setAt(next);
    }
    listeners.push(onReplay);
    return () => {
      listeners = listeners.filter((l) => l !== onReplay);
    };
  }, []);
  return at;
}
