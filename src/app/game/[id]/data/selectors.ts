import type { PlayingCard as IPlayingCard } from "@/lib/gameTypes";
import type { CachedGameData } from "../_hooks/realtime/applyBroadcastToCache";

export type GameDerivedState = {
  yourDbPlayer: CachedGameData["players"][number] | null;
  isYourTurn: boolean;
  communityCards: IPlayingCard[];
  playersBySeat: CachedGameData["players"];
  playersByView: CachedGameData["players"];
  activePlayerIndex: number;
  activePlayerIndexByView: number;
  phaseLabel: string;
  callAmount: number;
  minRaiseTotal: number;
  maxRaiseTotal: number;
  canCheck: boolean;
  canCall: boolean;
  connectedCount: number;
  playerIdToCards: Map<string, IPlayingCard[]>;
};

const roundLabel: Record<string, string> = {
  "pre-flop": "Pré-flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

function rotate<T>(list: T[], offset: number): T[] {
  if (!list.length) return list;
  const normalized = ((offset % list.length) + list.length) % list.length;
  return list.slice(normalized).concat(list.slice(0, normalized));
}

export function buildGameDerivedState(
  snapshot: CachedGameData | null,
  viewerUserId: string | null | undefined
): GameDerivedState {
  const game = snapshot?.game ?? null;
  const players = snapshot?.players ?? [];
  const cards = snapshot?.cards ?? [];

  const playersBySeat = [...players].sort((a, b) => a.seat - b.seat);
  const yourDbPlayer =
    viewerUserId != null
      ? players.find((p) => p.userId === viewerUserId) ?? null
      : null;
  const communityCards: IPlayingCard[] = cards
    .filter((card) => card.playerId === null)
    .map((card, idx) => ({
      suit: card.suit as IPlayingCard["suit"],
      rank: card.rank as IPlayingCard["rank"],
      id: `${card.rank}-${card.suit}-${idx}`,
    }));

  const playerIdToCards = new Map<string, IPlayingCard[]>();
  const counters = new Map<string, number>();
  for (const card of cards) {
    if (!card.playerId) continue;
    const counter = (counters.get(card.playerId) ?? 0) + 1;
    counters.set(card.playerId, counter);
    const arr = playerIdToCards.get(card.playerId) ?? [];
    arr.push({
      suit: card.suit as IPlayingCard["suit"],
      rank: card.rank as IPlayingCard["rank"],
      id: `${card.rank}-${card.suit}-${card.playerId}-${counter - 1}`,
    });
    playerIdToCards.set(card.playerId, arr);
  }

  const activePlayerIndex = Math.max(
    0,
    playersBySeat.findIndex((p) => p.id === game?.currentPlayerTurn)
  );
  const selfSeatIndex = Math.max(
    0,
    playersBySeat.findIndex((p) => p.id === yourDbPlayer?.id)
  );
  const playersByView = rotate(playersBySeat, selfSeatIndex);
  const activePlayerIndexByView =
    playersBySeat.length === 0
      ? 0
      : (activePlayerIndex - selfSeatIndex + playersBySeat.length) %
        playersBySeat.length;

  const connectedCount = playersBySeat.filter((p) => p.isConnected).length;
  const phaseLabel =
    game?.currentRound != null
      ? roundLabel[game.currentRound] ?? "Pré-flop"
      : "";

  const currentHighestBet = game?.currentHighestBet ?? 0;
  const currentPlayerBet = yourDbPlayer?.currentBet ?? 0;
  const stack = yourDbPlayer?.stack ?? 0;
  const callAmount = Math.max(0, Math.min(currentHighestBet - currentPlayerBet, stack));
  const minRaiseTotal =
    game == null
      ? 0
      : currentHighestBet === 0
      ? game.bigBlind
      : Math.max(currentHighestBet * 2, game.bigBlind);
  const maxRaiseTotal =
    yourDbPlayer == null ? 0 : currentPlayerBet + (yourDbPlayer.stack ?? 0);
  const canCheck =
    !!game &&
    !!yourDbPlayer &&
    currentHighestBet <= (yourDbPlayer.currentBet ?? 0);
  const canCall =
    !!game &&
    !!yourDbPlayer &&
    currentHighestBet > (yourDbPlayer.currentBet ?? 0) &&
    yourDbPlayer.stack > 0;

  const isYourTurn =
    !!game && !!yourDbPlayer && game.currentPlayerTurn === yourDbPlayer.id;

  return {
    yourDbPlayer,
    isYourTurn,
    communityCards,
    playersBySeat,
    playersByView,
    activePlayerIndex,
    activePlayerIndexByView,
    phaseLabel,
    callAmount,
    minRaiseTotal,
    maxRaiseTotal,
    canCheck,
    canCall,
    connectedCount,
    playerIdToCards,
  };
}
