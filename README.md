This project is a Next.js app with a poker engine and simulator.

## Getting Started

Run the development server:

```bash
pnpm dev
```

Open http://localhost:3000 with your browser.

## Serverless Bot Simulator (Dev/Staging Only)

We use Upstash QStash delayed webhooks to perform one bot action per turn without in-memory timers. Production is hard-disabled.

Environment variables (add to `.env.local`):

```
SIM_BOT_ENABLED=true
SIM_BOT_SECRET=dev_shared_secret
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key
# Optional override for public URL (defaults to Vercel URL or http://localhost:3000)
SIM_BOT_BASE_URL=https://your-dev-domain
PUBLIC_BASE_URL=https://your-dev-domain # optional back-compat
```

API endpoint: `POST /api/sim/bot-act`

Payload:

```
{
  "gameId": "...",
  "expectedPlayerId": "...",
  "handId": 1,
  "scheduleKey": "${gameId}:${handId}:${expectedPlayerId}"
}
```

Auth:
- QStash signature header `Upstash-Signature` (recommended)
- Local fallback header `x-sim-bot-secret: ${SIM_BOT_SECRET}`

Behavior:
- After any action mutation, we call a scheduler that enqueues a delayed webhook if the current player is bot-controlled according to `games.simulatorConfig`.
- The webhook verifies: simulator enabled, environment not production, hand/turn still match, and then executes a single bot action using `handleActionPure`.
- After acting, it reschedules if the next player is also a bot.

Idempotency/Concurrency:
- We use `scheduleKey = ${gameId}:${handId}:${currentPlayerTurn}` as QStash `deduplicationId`.
- The webhook re-checks hand/turn and returns 200 no-op if the state has advanced.
- Engine writes are serialized per game via advisory locks.

Manual Test Plan:
- Create a dev table with `simulatorConfig.enabled = true` and `defaultStrategy: { id: "call_any" }`.
- Perform a human action; observe one delayed webhook and a bot action.
- Set `perSeatStrategy[currentPlayerId].id = "human"`; verify scheduling stops.
- Toggle `simulatorConfig.enabled = false`; verify scheduling stops.
