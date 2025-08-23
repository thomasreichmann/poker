"use client";

import { useState } from "react";
import { PlayingCard } from "./playing-card";
import type { PlayingCard as IPlayingCard } from "@/lib/gameTypes";

export default function PlayingCardExample() {
  const [show, setShow] = useState(false);
  const sample: IPlayingCard[] = [
    { id: "A-hearts", suit: "hearts", rank: "A" },
    { id: "K-spades", suit: "spades", rank: "K" },
  ];
  return (
    <div className="p-4 space-y-4">
      <button className="px-3 py-1 bg-slate-700 rounded" onClick={() => setShow((s) => !s)}>
        Toggle Reveal
      </button>
      <div className="flex gap-2">
        {sample.map((c, i) => (
          <PlayingCard
            key={c.id}
            card={c}
            size="md"
            isVisible
            isAnimating={!show}
            animationDelay={i * 40}
          />
        ))}
      </div>
    </div>
  );
}
