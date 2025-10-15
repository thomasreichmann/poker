"use client";

import { DevOnly } from "@/components/dev/DevOnly";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlayingCard } from "@/components/ui/playing-card";
import { useToast } from "@/components/ui/toast";
import { Player } from "@/db/schema/players";
import type { PlayingCard as IPlayingCard } from "@/lib/gameTypes";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

type PlayerSeatProps = {
  player: Player;
  isCurrent: boolean;
  isYou: boolean;
  phase: string;
  cards: IPlayingCard[];
  highlightIds?: Set<string>;
  positionStyle: React.CSSProperties;
  activeKey: string;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  turnDurationMs: number;
  gameId: string;
};

export function PlayerSeat({
  player,
  isCurrent,
  isYou,
  phase,
  cards,
  highlightIds,
  positionStyle,
  activeKey,
  isSmallBlind = false,
  isBigBlind = false,
  turnDurationMs,
  gameId,
}: PlayerSeatProps) {
  const prevIsCurrent = useRef<boolean>(false);
  const prevHasFolded = useRef<boolean>(player.hasFolded);
  const trpc = useTRPC();
  const { toast } = useToast();

  const forceLeaveMutation = useMutation(
    trpc.dev.forceLeavePlayer.mutationOptions()
  );

  useEffect(() => {
    if (!prevIsCurrent.current && isCurrent) {
      // previously triggered effect animation; now handled by CSS tweak below
    }
    prevIsCurrent.current = isCurrent;
  }, [isCurrent, player.id]);

  useEffect(() => {
    if (!prevHasFolded.current && player.hasFolded) {
      // previously triggered fold animation; simplified below
    }
    prevHasFolded.current = player.hasFolded;
  }, [player.hasFolded, player.id]);

  const durationSec = `${Math.max(
    1,
    Math.floor((turnDurationMs ?? 30000) / 10) / 100
  )}s`;

  return (
    <div className="absolute" style={positionStyle}>
      <motion.div
        className={`relative`}
        animate={{ scale: isCurrent ? 1.1 : 1 }}
        transition={{ duration: 0.3 }}
        layout
      >
        <Card
          className={`bg-slate-800 border-2 transition-all duration-300 relative overflow-hidden ${
            player.hasFolded
              ? "border-slate-600 opacity-70 pointer-events-none saturate-50 brightness-90 contrast-90"
              : isCurrent
              ? "border-emerald-400 shadow-lg shadow-emerald-400/20"
              : "border-slate-600"
          }`}
        >
          {player.hasFolded && (
            <div className="absolute inset-0 bg-slate-950/20 z-10 pointer-events-none" />
          )}
          <CardContent
            className={`grid grid-cols-[auto_auto] items-start content-start gap-x-4 gap-y-2 ${
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
                    : `Jogador ${player.seat}`}
                </div>
                <div
                  className={`text-xs ${
                    player.hasFolded ? "text-slate-400" : "text-emerald-400"
                  }`}
                >
                  R$ {player.stack}
                </div>
                {(player.currentBet ?? 0) > 0 && (
                  <div
                    className={`text-xs ${
                      player.hasFolded ? "text-slate-500" : "text-yellow-400"
                    }`}
                  >
                    Aposta: R$ {player.currentBet}
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex justify-center-safe gap-x-1 w-[5.75rem] shrink-0">
              {cards.length > 0
                ? cards.map((card, cardIndex) => (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      size="sm"
                      isVisible={isYou || player.showCards === true}
                      highlighted={Boolean(
                        highlightIds && highlightIds.has(card.id)
                      )}
                      className={
                        highlightIds
                          ? highlightIds.has(card.id)
                            ? undefined
                            : "opacity-50"
                          : undefined
                      }
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
                    "--turn-timer-duration": durationSec,
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
        {!isYou && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Player options"
                aria-disabled={Boolean(player.hasFolded)}
                className={`absolute top-1 right-1 p-1 rounded-full text-slate-200 z-20 pointer-events-auto ${
                  player.hasFolded
                    ? "bg-slate-700/50 hover:bg-slate-700/50 opacity-60 grayscale"
                    : "bg-slate-700/80 hover:bg-slate-600/80"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Info className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6}>
              <DropdownMenuItem disabled onClick={(e) => e.stopPropagation()}>
                Ver Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled
                variant="destructive"
                onClick={(e) => e.stopPropagation()}
              >
                Reportar Jogador
              </DropdownMenuItem>
              <DevOnly>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await forceLeaveMutation.mutateAsync({
                        gameId,
                        targetUserId: player.userId,
                      });
                      toast({
                        title: "Player forced to leave",
                        description:
                          "They will be folded now and removed after the hand.",
                      });
                    } catch (err) {
                      const message =
                        err instanceof Error ? err.message : "Unknown error";
                      toast({
                        title: "Failed to force leave",
                        description: message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Force quit game
                </DropdownMenuItem>
              </DevOnly>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </motion.div>
    </div>
  );
}
