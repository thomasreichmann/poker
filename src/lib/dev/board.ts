import type {
  PlayingCard,
  Rank as PlayingRank,
  Suit as PlayingSuit,
} from "@/lib/gameTypes";
import type { CardBase } from "@/lib/poker/cards";
import {
  generateDeck,
  getAvailableCards,
  getRandomCards,
} from "@/lib/poker/cards";
import * as React from "react";

export type BoardPhase = "preflop" | "flop" | "turn" | "river";

export type BoardState = {
  enabled: boolean;
  cards: PlayingCard[];
  phase: BoardPhase;
};

type Listener = (s: BoardState) => void;

const defaultState: BoardState = {
  enabled: false,
  cards: [],
  phase: "preflop",
};
let state: BoardState = defaultState;
let listeners: Listener[] = [];

function notify() {
  for (const l of listeners) l(state);
}

export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  listener(state);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function setState(partial: Partial<BoardState>) {
  state = { ...state, ...partial };
  notify();
}

export function enableBoardOverride(on: boolean) {
  setState({ enabled: on });
}

function toPlayingCard(base: CardBase): PlayingCard {
  return {
    id: `${base.rank}${base.suit}`.toLowerCase(),
    rank: base.rank as unknown as PlayingRank,
    suit: base.suit as unknown as PlayingSuit,
  };
}

function toCardBase(card: PlayingCard): CardBase {
  return {
    rank: card.rank as unknown as CardBase["rank"],
    suit: card.suit as unknown as CardBase["suit"],
  };
}

export function dealFlop() {
  const deck = generateDeck();
  const taken = state.cards;
  const avail = getAvailableCards(deck, taken.map(toCardBase));
  const three = getRandomCards(avail, 3).map(toPlayingCard);
  setState({ cards: three, phase: "flop" });
}

export function dealTurn() {
  if (state.cards.length < 3) return dealFlop();
  const deck = generateDeck();
  const taken = state.cards;
  const avail = getAvailableCards(deck, taken.map(toCardBase));
  const one = getRandomCards(avail, 1).map(toPlayingCard)[0];
  setState({ cards: [...state.cards, one], phase: "turn" });
}

export function dealRiver() {
  if (state.cards.length < 4) return dealTurn();
  const deck = generateDeck();
  const taken = state.cards;
  const avail = getAvailableCards(deck, taken.map(toCardBase));
  const one = getRandomCards(avail, 1).map(toPlayingCard)[0];
  setState({ cards: [...state.cards, one], phase: "river" });
}

export function resetBoard() {
  setState({ cards: [], phase: "preflop" });
}

let simTimers: ReturnType<typeof setTimeout>[] = [];
function clearSimTimers() {
  for (const t of simTimers) clearTimeout(t);
  simTimers = [];
}

export function simulateFullBoard() {
  clearSimTimers();
  enableBoardOverride(true);
  resetBoard();
  // Stagger to let animations play between steps
  simTimers.push(setTimeout(() => dealFlop(), 50));
  simTimers.push(setTimeout(() => dealTurn(), 800));
  simTimers.push(setTimeout(() => dealRiver(), 1550));
}

export function useBoardState(): BoardState {
  const [s, setS] = React.useState<BoardState>(state);
  React.useEffect(() => subscribe(setS), []);
  return s;
}
