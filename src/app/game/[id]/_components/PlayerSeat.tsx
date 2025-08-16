"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { PlayingCard } from "@/components/ui/playing-card";
import { Player } from "@/db/schema/players";
import type { PlayingCard as IPlayingCard } from "@/lib/gameTypes";

type PlayerSeatProps = {
  player: Player;
  isCurrent: boolean;
  isYou: boolean;
  phase: string;
  cards: IPlayingCard[];
  positionStyle: React.CSSProperties;
  activeKey: string;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
};

export function PlayerSeat({
  player,
  isCurrent,
  isYou,
  phase,
  cards,
  positionStyle,
  activeKey,
  isSmallBlind = false,
  isBigBlind = false,
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
              ? "border-slate-500 opacity-50 pointer-events-none grayscale"
              : "border-slate-600"
          }`}
        >
          <CardContent
            className={`grid grid-cols-[auto_auto] gap-x-4 gap-y-2 ${
              player.hasFolded ? "text-slate-500" : ""
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="w-12 h-12">
                  <AvatarFallback
                    className={`text-white ${
                      player.hasFolded ? "bg-slate-600" : "bg-emerald-600"
                    }`}
                  >
                    {String(player.seat).padStart(2, "0")}
                  </AvatarFallback>
                </Avatar>
                {player.isButton && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-black">
                    D
                  </div>
                )}
                {isSmallBlind && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    SB
                  </div>
                )}
                {isBigBlind && (
                  <div className="absolute -top-1 -left-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    BB
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {player.displayName
                    ? player.displayName
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
              {cards.length > 0
                ? cards.map((card, cardIndex) => (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      size="sm"
                      isVisible={isYou || phase === "showdown"}
                      isAnimating={false}
                      animationDelay={cardIndex * 100}
                    />
                  ))
                : [1, 2].map((i) => (
                    <PlayingCard
                      key={String(i)}
                      card={{ id: String(i), suit: "clubs", rank: "2" }}
                      size="sm"
                      isVisible={false}
                      isAnimating={false}
                      animationDelay={i * 100}
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
