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
   - **Accepts status as prop** to avoid duplicate subscriptions

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

### DELETE Operation Handling

The system properly handles all PostgreSQL event types:
- **INSERT/UPDATE**: Data is available in `payload.new`
- **DELETE**: Data is available in `payload.old`
- The logic checks both sources: `payload.new || payload.old`

### Integration Points

The realtime hooks are integrated into:
- `ClientGameInterface` - Main game interface
- `PublicGamesWithRealtime` - Games list wrapper
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
import { usePokerRealtime, RealtimeStatus } from "~/app/_components/Realtime";

function MyComponent() {
  const realtimeStatus = usePokerRealtime();
  
  return (
    <div>
      <RealtimeStatus status={realtimeStatus} showDetails={true} />
      {/* Your game content */}
    </div>
  );
}
```

## Important Best Practices

### ⚠️ Avoid Duplicate Subscriptions

**CRITICAL**: Only call `usePokerRealtime()` once in your component tree. Multiple calls create duplicate Supabase subscriptions leading to:
- Resource overhead
- Double query invalidations
- Unnecessary network traffic

**✅ Correct Pattern:**
```tsx
// Parent component
function GameContainer() {
  const realtimeStatus = usePokerRealtime(); // Called once
  
  return (
    <div>
      <RealtimeStatus status={realtimeStatus} /> {/* Passed as prop */}
      <GameComponent />
    </div>
  );
}
```

**❌ Incorrect Pattern:**
```tsx
// This creates duplicate subscriptions!
function GameContainer() {
  const realtimeStatus = usePokerRealtime(); // First subscription
  
  return (
    <div>
      <RealtimeStatus /> {/* Second subscription inside component */}
      <GameComponent />
    </div>
  );
}
```

## Benefits

1. **Automatic Updates**: Game state updates across all connected clients immediately
2. **Reduced Server Load**: No need for polling or frequent manual refreshes
3. **Better UX**: Players see changes from other players in real-time
4. **Consistency**: All clients stay synchronized with the database state
5. **Proper Resource Management**: Single subscription per component tree

## Technical Notes

- Uses Supabase Realtime with PostgreSQL replication
- Implements debouncing to prevent excessive updates
- Maintains both immediate manual invalidation (for user actions) and realtime updates (for consistency)
- Includes error handling and connection status monitoring
- Properly handles INSERT/UPDATE/DELETE operations with correct data extraction
- Designed to prevent duplicate subscriptions through prop-based status sharing

## Bug Fixes Applied

### Fixed: Duplicate Realtime Subscriptions
- **Issue**: Multiple `usePokerRealtime()` calls created duplicate subscriptions
- **Solution**: Modified `RealtimeStatus` and test components to accept status as props
- **Impact**: Reduced resource overhead and eliminated double invalidations

### Fixed: Incorrect DELETE Operation Handling  
- **Issue**: DELETE operations only checked `payload.new`, causing incorrect gameId extraction
- **Solution**: Updated logic to check `payload.new || payload.old` for all event types
- **Impact**: Proper logging and handling of deleted records