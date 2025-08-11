"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { PlayingCard } from "@/components/ui/playing-card";

type PlayerSeatProps = {
  player: any;
  isCurrent: boolean;
  isYou: boolean;
  phase: string;
  cards: Array<{ suit: string; rank: string; id: string }>;
  positionStyle: React.CSSProperties;
  activeKey: string;
};

export function PlayerSeat({
  player,
  isCurrent,
  isYou,
  phase,
  cards,
  positionStyle,
  activeKey,
}: PlayerSeatProps) {
  return (
    <div className="absolute" style={positionStyle}>
      <div
        className={`relative transition-all duration-300 ${
          isCurrent ? "scale-110" : "scale-100"
        }`}
      >
        <Card
          className={`bg-slate-800 border-2 transition-all duration-300 relative overflow-hidden ${
            isCurrent
              ? "border-emerald-400 shadow-lg shadow-emerald-400/20"
              : player.hasFolded
              ? "border-red-500 opacity-50"
              : "border-slate-600"
          }`}
        >
          <CardContent className="grid grid-cols-[auto_auto] gap-x-4 gap-y-2">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-emerald-600 text-white">
                    {String(player.seat).padStart(2, "0")}
                  </AvatarFallback>
                </Avatar>
                {player.isButton && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-black">
                    D
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {player.email
                    ? player.email.split("@")[0]
                    : `Player ${player.seat}`}
                </div>
                <div className="text-xs text-emerald-400">
                  R$ {player.stack}
                </div>
                {(player.currentBet ?? 0) > 0 && (
                  <div className="text-xs text-yellow-400">
                    Bet: R$ {player.currentBet}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center-safe gap-x-1">
              {cards.map((card, cardIndex) => (
                <PlayingCard
                  key={card.id}
                  card={card as any}
                  size="sm"
                  isVisible={isYou || phase === "showdown"}
                  isAnimating={false}
                  animationDelay={cardIndex * 100}
                />
              ))}
            </div>

            {isCurrent && phase !== "showdown" && (
              <div className="absolute left-0 right-0 bottom-0 h-1 bg-slate-700/70">
                <div
                  key={activeKey}
                  className="turn-timer-fill h-full bg-yellow-500/80"
                  style={{
                    // @ts-expect-error custom property
                    "--turn-timer-duration": "30s",
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
