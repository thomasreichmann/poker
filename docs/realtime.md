# Realtime Functionality

This document explains the realtime functionality implemented for the poker game to automatically update game state when the database changes.

## Overview

The realtime system uses Supabase's real-time capabilities to listen for PostgreSQL changes and automatically update the UI without requiring manual refreshes or polling.

## Components

### Core Hooks

1. **`usePokerRealtime`** - Main hook that listens to all poker-related table changes
   - Listens to: `poker_games`, `poker_players`, `poker_actions`, `poker_cards`
   - Automatically invalidates tRPC queries when changes occur
   - Includes debouncing to batch rapid changes
   - Provides connection status and error tracking

2. **`useGameRealtime`** - Specific hook for games table changes only
3. **`usePlayerRealtime`** - Specific hook for player-related changes

### Components

1. **`RealtimeStatus`** - Visual indicator showing connection status
   - Shows connection state, errors, and last update time
   - Only visible when there are issues (by default)

## Implementation Details

### Database Tables Monitored

- **poker_games**: Game state, status, current round, pot, etc.
- **poker_players**: Player positions, stacks, bets, folded status
- **poker_actions**: Player actions (bet, check, fold, etc.)
- **poker_cards**: Dealt cards and community cards

### Query Invalidation Strategy

When realtime changes are detected:
1. Changes are debounced (100ms) to batch rapid updates
2. Relevant tRPC queries are invalidated:
   - `player.getAllGames`
   - `game.getAll`
3. React Query automatically refetches the data
4. UI updates reflect the new state

### Integration Points

The realtime hooks are integrated into:
- `ClientGameInterface` - Main game interface
- `PublicGamesComponent` - Games list
- Individual game components receive updates automatically

## Usage

### Basic Integration

```tsx
import { usePokerRealtime } from "~/app/_components/Realtime";

function MyGameComponent() {
  // This will automatically handle realtime updates
  const status = usePokerRealtime();
  
  // Your existing tRPC queries will be automatically invalidated
  const [games] = api.player.getAllGames.useSuspenseQuery();
  
  return <div>Games update automatically!</div>;
}
```

### With Status Indicator

```tsx
import { RealtimeStatus } from "~/app/_components/Realtime";

function MyComponent() {
  return (
    <div>
      <RealtimeStatus showDetails={true} />
      {/* Your game content */}
    </div>
  );
}
```

## Benefits

1. **Automatic Updates**: Game state updates across all connected clients immediately
2. **Reduced Server Load**: No need for polling or frequent manual refreshes
3. **Better UX**: Players see changes from other players in real-time
4. **Consistency**: All clients stay synchronized with the database state

## Technical Notes

- Uses Supabase Realtime with PostgreSQL replication
- Implements debouncing to prevent excessive updates
- Maintains both immediate manual invalidation (for user actions) and realtime updates (for consistency)
- Includes error handling and connection status monitoring