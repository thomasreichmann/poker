"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MotionChip } from "./MotionChip";
import { motion as tokens } from "./tokens";

export type ChipFlight = {
  id: string;
  fromSeatId: string;
  to: "pot" | { seatId: string };
  color?: string;
  delayMs?: number;
  durationMs?: number;
};

export function ChipFlightsOverlay({ flights }: { flights: ChipFlight[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  const rootRect = useRect(rootRef);
  const seatRects = useMemo(() => getRectsByData("seat-id"), []);
  const potRect = useMemo(() => getRectByData("pot-center"), []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-40">
      {flights.map((f) => {
        const from = seatRects.get(f.fromSeatId);
        const to = f.to === "pot" ? potRect : seatRects.get(f.to.seatId);
        if (!from || !to) return null;

        const fromCenter = centerOf(from);
        const toCenter = centerOf(to);
        const x = fromCenter.x - rootRect.left - 7;
        const y = fromCenter.y - rootRect.top - 7;
        const toX = toCenter.x - rootRect.left - 7;
        const toY = toCenter.y - rootRect.top - 7;

        return (
          <MotionChip
            key={f.id}
            x={x}
            y={y}
            toX={toX}
            toY={toY}
            durationMs={f.durationMs ?? tokens.duration.slow}
            delayMs={f.delayMs ?? 0}
            color={f.color}
          />
        );
      })}
    </div>
  );
}

function useRect(elRef: React.RefObject<HTMLElement | null>) {
  const [rect, setRect] = useState<DOMRect>(
    new DOMRect(0, 0, typeof window !== "undefined" ? window.innerWidth : 0, typeof window !== "undefined" ? window.innerHeight : 0)
  );
  useEffect(() => {
    const update = () => {
      const el = elRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect(r);
    };
    update();
    window.addEventListener("resize", update);
    const id = window.setInterval(update, 300);
    return () => {
      window.removeEventListener("resize", update);
      window.clearInterval(id);
    };
  }, [elRef]);
  return rect;
}

function getRectsByData(dataName: string): Map<string, DOMRect> {
  if (typeof document === "undefined") return new Map();
  const nodes = Array.from(document.querySelectorAll(`[data-${dataName}]`));
  const map = new Map<string, DOMRect>();
  nodes.forEach((n) => {
    const id = (n as HTMLElement).dataset[dataName] || "";
    if (!id) return;
    map.set(id, (n as HTMLElement).getBoundingClientRect());
  });
  return map;
}

function getRectByData(dataName: string): DOMRect | null {
  if (typeof document === "undefined") return null;
  const node = document.querySelector(`[data-${dataName}]`);
  return node ? (node as HTMLElement).getBoundingClientRect() : null;
}

function centerOf(r: DOMRect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}