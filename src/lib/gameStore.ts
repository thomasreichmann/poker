import { GameState, Player } from "./gameTypes";
import { createDeck } from "./gameUtils";

class GameStore {
  private state: GameState = {
    phase: "waiting",
    pot: 0,
    currentBet: 0,
    activePlayerIndex: 0,
    communityCards: [],
    players: [],
    dealerIndex: 0,
    smallBlind: 1,
    bigBlind: 2,
    handNumber: 1,
    testingMode: false,
  };

  private listeners: Set<(state: GameState) => void> = new Set();

  getState(): GameState {
    return this.state;
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  setState(newState: Partial<GameState>) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  toggleTestingMode() {
    const newTestingMode = !this.state.testingMode;
    this.setState({ testingMode: newTestingMode });

    // If enabling testing mode and game is in progress, deal all community cards immediately
    if (newTestingMode) {
      const deck = createDeck();
      const numPlayers = this.state.players.length || 4;
      const offset = numPlayers * 2; // hole cards dealt
      const allCommunityCards = deck.slice(offset, offset + 5);

      this.setState({
        communityCards: allCommunityCards,
      });
    }
  }

  initializeGame() {
    const initialPlayers: Player[] = [
      {
        id: "player1",
        name: "Você",
        avatar: "",
        chips: 1000,
        position: 0,
        cards: [],
        currentBet: 0,
        totalBet: 0,
        isActive: true,
        isFolded: false,
        isAllIn: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
      },
      {
        id: "player2",
        name: "Ana Silva",
        avatar: "",
        chips: 850,
        position: 1,
        cards: [],
        currentBet: 0,
        totalBet: 0,
        isActive: true,
        isFolded: false,
        isAllIn: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
      },
      {
        id: "player3",
        name: "Carlos Lima",
        avatar: "",
        chips: 1200,
        position: 2,
        cards: [],
        currentBet: 0,
        totalBet: 0,
        isActive: true,
        isFolded: false,
        isAllIn: false,
        isDealer: false,
        isSmallBlind: true,
        isBigBlind: false,
      },
      {
        id: "player4",
        name: "Maria Santos",
        avatar: "",
        chips: 750,
        position: 3,
        cards: [],
        currentBet: 0,
        totalBet: 0,
        isActive: true,
        isFolded: false,
        isAllIn: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: true,
      },
      {
        id: "player5",
        name: "João Pedro",
        avatar: "",
        chips: 900,
        position: 4,
        cards: [],
        currentBet: 0,
        totalBet: 0,
        isActive: true,
        isFolded: false,
        isAllIn: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
      },
      {
        id: "player6",
        name: "Luisa Moraes",
        avatar: "",
        chips: 1100,
        position: 5,
        cards: [],
        currentBet: 0,
        totalBet: 0,
        isActive: true,
        isFolded: false,
        isAllIn: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
      },
    ];

    this.setState({
      players: initialPlayers,
      dealerIndex: 3, // Dealer at index 3 -> BB at 5 -> UTG (first to act) is index 0 (you)
    });

    // Start new hand after initialization
    setTimeout(() => {
      this.startNewHand(initialPlayers);
    }, 1000);
  }

  startNewHand(players: Player[]) {
    const deck = createDeck();
    let cardIndex = 0;

    // Reset players
    const resetPlayers: Player[] = players.map((player) => ({
      ...player,
      cards: [],
      currentBet: 0,
      totalBet: 0,
      isFolded: false,
      isAllIn: false,
      action: undefined,
    }));

    // Determine blinds based on dealerIndex
    const dealerIndex = this.state.dealerIndex;
    const smallBlindIndex = (dealerIndex + 1) % resetPlayers.length;
    const bigBlindIndex = (dealerIndex + 2) % resetPlayers.length;

    // Clear blind flags
    resetPlayers.forEach((p, idx) => {
      p.isDealer = idx === dealerIndex;
      p.isSmallBlind = idx === smallBlindIndex;
      p.isBigBlind = idx === bigBlindIndex;
    });

    // Post blinds
    resetPlayers[smallBlindIndex].currentBet = this.state.smallBlind;
    resetPlayers[smallBlindIndex].totalBet = this.state.smallBlind;
    resetPlayers[smallBlindIndex].chips -= this.state.smallBlind;
    resetPlayers[bigBlindIndex].currentBet = this.state.bigBlind;
    resetPlayers[bigBlindIndex].totalBet = this.state.bigBlind;
    resetPlayers[bigBlindIndex].chips -= this.state.bigBlind;

    // Deal hole cards
    resetPlayers.forEach((player) => {
      player.cards = [deck[cardIndex++], deck[cardIndex++]];
    });

    // Handle testing mode - deal all community cards at once
    const testingMode = this.state.testingMode;
    const offset = resetPlayers.length * 2;
    const initialCommunityCards = testingMode
      ? deck.slice(offset, offset + 5)
      : [];

    const potAfterBlinds = this.state.smallBlind + this.state.bigBlind;
    const firstToActIndex = (bigBlindIndex + 1) % resetPlayers.length; // UTG

    this.setState({
      phase: "preflop",
      pot: potAfterBlinds,
      currentBet: this.state.bigBlind,
      activePlayerIndex: firstToActIndex,
      communityCards: initialCommunityCards,
      players: resetPlayers,
      handNumber: this.state.handNumber + 1,
    });
  }

  handlePlayerAction(action: string, amount?: number) {
    const newState = { ...this.state };
    const currentPlayer = newState.players[newState.activePlayerIndex];

    switch (action) {
      case "fold":
        currentPlayer.isFolded = true;
        currentPlayer.action = "fold";
        break;

      case "call":
        const callAmount = Math.min(
          newState.currentBet - currentPlayer.currentBet,
          currentPlayer.chips
        );
        currentPlayer.currentBet += callAmount;
        currentPlayer.totalBet += callAmount;
        currentPlayer.chips -= callAmount;
        newState.pot += callAmount;
        currentPlayer.action = "call";
        if (currentPlayer.chips === 0) currentPlayer.isAllIn = true;
        break;

      case "raise":
        const raiseTotal = amount || newState.currentBet * 2;
        const raiseAmountActual = raiseTotal - currentPlayer.currentBet;
        const actualRaise = Math.min(raiseAmountActual, currentPlayer.chips);
        currentPlayer.currentBet += actualRaise;
        currentPlayer.totalBet += actualRaise;
        currentPlayer.chips -= actualRaise;
        newState.pot += actualRaise;
        newState.currentBet = currentPlayer.currentBet;
        currentPlayer.action = "raise";
        if (currentPlayer.chips === 0) currentPlayer.isAllIn = true;
        break;

      case "check":
        currentPlayer.action = "check";
        break;
    }

    // Move to next active player
    let nextPlayerIndex =
      (newState.activePlayerIndex + 1) % newState.players.length;
    while (
      newState.players[nextPlayerIndex].isFolded ||
      !newState.players[nextPlayerIndex].isActive
    ) {
      nextPlayerIndex = (nextPlayerIndex + 1) % newState.players.length;
    }

    // Check if betting round is complete
    const activePlayers = newState.players.filter(
      (p) => !p.isFolded && p.isActive
    );
    const bettingComplete = activePlayers.every(
      (p) => p.currentBet === newState.currentBet || p.isAllIn || p.chips === 0
    );

    if (bettingComplete || activePlayers.length === 1) {
      // Move to next phase
      newState.players.forEach((p) => (p.currentBet = 0));

      if (activePlayers.length === 1) {
        // Only one player left, they win
        const winningPlayer = activePlayers[0];
        winningPlayer.chips += newState.pot;
        newState.phase = "waiting";
        setTimeout(() => this.startNewHand(newState.players), 3000);
      } else {
        switch (newState.phase) {
          case "preflop":
            newState.phase = "flop";
            if (!newState.testingMode) {
              newState.communityCards = createDeck().slice(0, 3);
            }
            break;
          case "flop":
            newState.phase = "turn";
            if (!newState.testingMode) {
              newState.communityCards.push(createDeck()[3]);
            }
            break;
          case "turn":
            newState.phase = "river";
            if (!newState.testingMode) {
              newState.communityCards.push(createDeck()[4]);
            }
            break;
          case "river":
            newState.phase = "showdown";
            // Determine winner (simplified)
            const winner =
              activePlayers[Math.floor(Math.random() * activePlayers.length)];
            winner.chips += newState.pot;
            // Rotate dealer for next hand
            newState.dealerIndex =
              (newState.dealerIndex + 1) % newState.players.length;
            setTimeout(() => this.startNewHand(newState.players), 3000);
            break;
        }
        // Reset current bet for the new betting round
        newState.currentBet = 0;
        // Next betting round starts from first active player after dealer
        if (newState.phase !== "showdown") {
          let idx = (newState.dealerIndex + 1) % newState.players.length;
          // Ensure we pick an active, not-folded player
          while (
            newState.players[idx].isFolded ||
            !newState.players[idx].isActive
          ) {
            idx = (idx + 1) % newState.players.length;
          }
          newState.activePlayerIndex = idx;
        }
      }
    } else {
      newState.activePlayerIndex = nextPlayerIndex;
    }

    this.setState(newState);
  }
}

export const gameStore = new GameStore();
