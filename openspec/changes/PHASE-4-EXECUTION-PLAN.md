# Phase 4 Execution Plan — Multiplayer Foundation

**Branch:** `feat/phase-4-multiplayer-foundation`
**Roadmap reference:** [docs/plans/2026-04-17-combat-and-multiplayer-roadmap.md](../../docs/plans/2026-04-17-combat-and-multiplayer-roadmap.md) §Phase 4 (lines 168-203)
**Phase 1 status:** ✅ COMPLETE (PRs #301-#320)
**Phase 2 status:** ✅ COMPLETE (PR #321)
**Phase 3 status:** ✅ COMPLETE (PR #322)

---

## Context

Phase 4 turns the single-player engine into 2–8 player live multiplayer with
authoritative state and roll arbitration. The roadmap's checkpoint:

> "Two humans on different machines play a full match against each other; a
> third joins the same side as co-op; AI fills remaining slots."

Phase 4 has THREE pre-spec'd sub-phases:

- **4a (P2P, 1v1)** — `add-p2p-game-session-sync`,
  `add-game-session-invite-and-lobby-1v1`,
  `add-game-session-persistence-for-reconnect`. Yjs-room-based, host-authoritative.
  **DEFERRED** to a future change set: 4a is a transitional path that 4b
  supersedes per the proposal text. Skipping 4a removes ~3 weeks of work that
  the server-authoritative model replaces wholesale.
- **4b (Server, 2–8)** — `add-multiplayer-server-infrastructure`,
  `add-player-identity-and-auth`, `add-multiplayer-lobby-and-matchmaking-2-8`,
  `add-authoritative-roll-arbitration`,
  `add-reconnection-and-session-rehydration`. **PRIMARY SCOPE for this branch.**
- **4c (Fog of war)** — `add-fog-of-war-event-filtering`. Roadmap explicitly
  marks fog as "optional for Phase 4, could be Phase 4.5". **DEFERRED.**

Total Phase-4-this-branch scope: 5 OpenSpec changes, ~604 task checkboxes.

| Change                                          | Roadmap PR(s)         | Surface                        |
| ----------------------------------------------- | --------------------- | ------------------------------ |
| `add-multiplayer-server-infrastructure`         | #1 transport, #2 auth | Server scaffold + WebSocket    |
| `add-player-identity-and-auth`                  | #5 auth               | Identity + token contract      |
| `add-authoritative-roll-arbitration`            | #3 server authority   | Server-only DiceRoller         |
| `add-multiplayer-lobby-and-matchmaking-2-8`     | #4 lobby              | Lobby + invite + AI fill       |
| `add-reconnection-and-session-rehydration`      | #6 reconnect          | Replay-on-rejoin               |
| `phase-4-capstone-ui-and-e2e` (this branch only)| #7 (integration)      | UI + capstone E2E + outcome    |

Last row is **NOT** a separate OpenSpec change — it's the integration glue this
branch lands inline with Wave 5: lobby UI page, multiplayer client hook,
capstone integration test, and an outcome-bus passthrough so completed
multiplayer matches still feed the campaign store via the Phase 3 path.

---

## Dependency graph (DAG)

```
                   ┌─────────────────────────────────────────┐
                   │ Phase 1+2+3 (merged into main)          │
                   │  - InteractiveSession + getOutcome()    │
                   │  - combatOutcomeBus                     │
                   │  - useCampaignStore + sub-stores        │
                   │  - Pages Router /api/* infrastructure   │
                   │  - SeededRandom (deterministic)         │
                   │  - dice-system / DiceRoller             │
                   │  - existing user-identity (Ed25519)     │
                   └─────────────────────────────────────────┘
                                     │
                                     ▼
              ╔══════════════════════════════════════════╗
     Wave 1   ║  1. add-multiplayer-server-infrastructure║   (solo, blocks all)
              ╚══════════════════════════════════════════╝
                                     │
                                     ▼
              ╔══════════════════════════════════════════╗
     Wave 2   ║  2. add-player-identity-and-auth         ║   (solo, depends on 1)
              ╚══════════════════════════════════════════╝
                                     │
                ┌────────────────────┴────────────────────┐
                ▼                                         ▼
       ╔══════════════════════╗            ╔══════════════════════════════╗
Wave 3 ║ 3a. authoritative-   ║   PARALLEL ║ 3b. lobby-matchmaking-2-8    ║
       ║     roll-arbitration ║            ║                              ║
       ╚══════════════════════╝            ╚══════════════════════════════╝
                │                                         │
                └────────────────────┬────────────────────┘
                                     ▼
              ╔══════════════════════════════════════════╗
     Wave 4   ║  4. reconnection-and-session-rehydration ║   (solo, depends on 3a+3b)
              ╚══════════════════════════════════════════╝
                                     │
                                     ▼
              ╔══════════════════════════════════════════╗
     Wave 5   ║  5. capstone UI + integration test +     ║   (solo, terminal)
              ║     outcome-bus passthrough              ║
              ╚══════════════════════════════════════════╝
```

**Critical path:** 1 → 2 → (3a ∥ 3b) → 4 → 5.
**Maximum parallelism:** Wave 3 only (2 agents). Phase 4 is mostly serial because
each layer encapsulates the previous (transport → identity → authority+lobby →
reconnect → UI).

---

## File-scope ownership matrix

| Change                     | Creates                                                                                                                                                                                                                                                                                          | Modifies                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **1. server-infra**        | `src/types/multiplayer/Protocol.ts` (msg unions), `src/lib/multiplayer/server/IMatchStore.ts`, `src/lib/multiplayer/server/InMemoryMatchStore.ts`, `src/lib/multiplayer/server/ServerMatchHost.ts`, `src/lib/multiplayer/client.ts`, `src/pages/api/multiplayer/socket.ts`, `server.js` (custom)  | `package.json` (add `ws` + `zod` if missing), `next.config.js` (allow custom server)                           |
| **2. identity-auth**       | `src/types/multiplayer/Player.ts` (`IPlayerRef`, `IPlayerToken`, `IPlayerProfile`), `src/lib/multiplayer/server/auth.ts`, `src/lib/multiplayer/server/IPlayerStore.ts`, `src/lib/multiplayer/server/InMemoryPlayerStore.ts`, `src/lib/multiplayer/client/issuePlayerToken.ts`                     | `src/pages/api/multiplayer/socket.ts` (require token), `src/lib/multiplayer/server/ServerMatchHost.ts`         |
| **3a. roll-arbitration**   | `src/lib/multiplayer/server/CryptoDiceRoller.ts`, `src/lib/multiplayer/server/__tests__/CryptoDiceRoller.test.ts`                                                                                                                                                                                | `src/lib/multiplayer/server/ServerMatchHost.ts` (inject roller), event payloads add `rolls: number[]`†         |
| **3b. lobby**              | `src/types/multiplayer/Lobby.ts` (`TeamLayout`, `IMatchSeat`), `src/lib/multiplayer/server/lobby/lobbyStateMachine.ts`, `src/pages/api/multiplayer/matches/index.ts`, `src/pages/api/multiplayer/matches/[id].ts`, `src/pages/api/multiplayer/invites/[roomCode].ts`                              | `src/lib/multiplayer/server/IMatchStore.ts` (extend `IMatchMeta` with seats), `ServerMatchHost.ts` (intents)   |
| **4. reconnection**        | `src/lib/multiplayer/server/reconnection/PendingPeerTracker.ts`, `src/lib/multiplayer/server/reconnection/replayStream.ts`                                                                                                                                                                       | `src/lib/multiplayer/server/ServerMatchHost.ts`, `src/lib/multiplayer/client.ts` (resume from `lastSeq`)       |
| **5. capstone**            | `src/pages/multiplayer/index.tsx`, `src/pages/multiplayer/lobby/[roomCode].tsx`, `src/components/multiplayer/LobbyPanel.tsx`, `src/hooks/useMultiplayerSession.ts`, `src/__tests__/integration/phase4Multiplayer.test.ts`                                                                         | `src/engine/combatOutcomeBus.ts` (server-emit passthrough), campaign dashboard (banner shows MP matches)       |

**† Audit correction (Wave 3a)**: Existing event types in
`src/types/gameplay/GameSessionInterfaces.ts` may not all have a `rolls` field.
Wave 3a should ADD an OPTIONAL `rolls?: readonly number[]` to relevant payloads
(`InitiativeRolled`, `WeaponAttackResolved`, `HitLocationResolved`, etc.) so
backward compatibility holds with single-player and Phase 1-3 code.

**Conflict points:**

- `src/lib/multiplayer/server/ServerMatchHost.ts` — Waves 1, 2, 3a, 3b, 4 all
  modify it. Each wave merges into the integration branch BEFORE the next
  spawns, so conflicts are sequential not parallel — except Wave 3a vs 3b which
  ARE parallel. **Wave 3 conflict resolution:** 3a touches `runSession()`
  (injects roller), 3b touches lobby intent handling — keep them in separate
  methods so the textual diff is non-overlapping.
- `src/lib/multiplayer/server/IMatchStore.ts` — Waves 1 (definition) and 3b
  (extend with seats). Sequential.
- `src/lib/multiplayer/client.ts` — Waves 1 (basic), 4 (resume). Sequential.

---

## Sub-branch execution plan

| Wave | Sub-branch                              | Agent                | Depends on        |
| ---- | --------------------------------------- | -------------------- | ----------------- |
| 1    | `feat/phase-4--server-infra`            | hephaestus #1        | Phase 1+2+3 (main)|
| 2    | `feat/phase-4--identity-auth`           | hephaestus #2        | Wave 1            |
| 3    | `feat/phase-4--roll-arb` ∥ `feat/phase-4--lobby` | hephaestus #3a + #3b | Wave 2            |
| 4    | `feat/phase-4--reconnect`               | hephaestus #4        | Wave 3 (both)     |
| 5    | `feat/phase-4--capstone`                | hephaestus #5        | Wave 4            |

Each wave merges into `feat/phase-4-multiplayer-foundation` before the next
wave spawns. Wave 3's two agents merge in either order with manual conflict
resolution if both touched `ServerMatchHost.ts`.

---

## Key architectural decisions (locked at branch start)

These avoid agent debate and shorten briefs:

1. **Transport: `ws` library + custom `server.js`** — Next.js Pages Router
   API routes don't natively support WebSocket upgrades on serverless deploys;
   for local dev + self-host, a custom server is the cleanest path. The
   `ws` library is a smaller dep than Socket.IO and matches the proposal's
   "WebSocket-based" wording. `npm install ws zod`.
2. **Persistence: `InMemoryMatchStore` + `InMemoryPlayerStore` only** — the
   proposals explicitly defer SQLite/Postgres to a separate change. We'll ship
   the contracts plus in-memory implementations. Production hosting picks the
   real store later.
3. **Auth: vault-identity Ed25519 path** — the existing `user-identity` system
   already has Ed25519 keypairs. Use the existing `VaultIdentityService`
   (or whatever the closest equivalent is) for token signing. Stub OAuth
   to a TODO — proposal says it's a "future change".
4. **Server runs in same Node process as Next.js** — `server.js` boots both
   Next and the WebSocket upgrade handler. Same port. Production splits later.
5. **Seat AI uses existing BotPlayer** — `ServerMatchHost.runAITurn(side)`
   delegates to the existing `BotPlayer` from `src/simulation/ai/BotPlayer.ts`
   exactly as `InteractiveSession.runAITurn` does today.
6. **Campaign integration via combat outcome bus** — when a server-side match
   completes, `ServerMatchHost` derives the `ICombatOutcome` and publishes it
   on `combatOutcomeBus`. Wave 5 wires the campaign store to listen for these
   in addition to local matches (the bus is already in-process pub/sub).
7. **Reconnect via `playerId + lastSeq`** — proposal-aligned. `lastSeq` from
   client, `playerId` from token, server streams `events[lastSeq..]`.
8. **Defer fog of war** — explicitly out of scope per roadmap. Wave 3a's
   "rolls in events" change does NOT include visibility filtering.

---

## Reusable Phase 1 / Phase 2 / Phase 3 / existing code (verified)

| Need                                   | Path                                                                                          | Notes                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Engine session                         | `src/engine/InteractiveSession.ts`                                                            | Wraps GameEngine, exposes `getOutcome()`       |
| Combat outcome bus                     | `src/engine/combatOutcomeBus.ts`                                                              | Already in-process pub/sub                     |
| BotPlayer (AI)                         | `src/simulation/ai/BotPlayer.ts`                                                              | `playMovementPhase` / `playAttackPhase` etc.   |
| SeededRandom                           | `src/simulation/core/SeededRandom.ts`                                                         | Server uses crypto for prod, seeded for tests  |
| Existing user-identity (Ed25519)       | `src/services/vault/identity/VaultIdentityService.ts` or `src/lib/identity/...`               | Look for Ed25519 keypair store                 |
| Encounter service                      | `src/services/encounter/EncounterService.ts`                                                  | Phase 3 launches single-player matches         |
| Combat outcome model                   | `src/types/combat/CombatOutcome.ts` + `src/lib/combat/outcome/combatOutcome.ts`               | Phase 3 — multiplayer reuses                   |
| Existing 6-char room codes (vault P2P) | `src/lib/p2p/roomCodes.ts` or similar                                                         | Reuse for invite codes                         |
| Pages Router API pattern               | `src/pages/api/encounters/[id]/launch.ts` etc.                                                | Reference shape for new `/api/multiplayer/*`   |
| Game session interfaces                | `src/types/gameplay/GameSessionInterfaces.ts`                                                 | `IGameEvent`, payload shapes                   |

---

## Pre-execution issues to fix during agent briefing

1. **`server.js` is a NEW file at the repo root** — Next.js Pages Router uses
   the default server unless a custom one is present. Wave 1 must add this
   file AND update `package.json` `dev` script to run it: `node server.js`.
2. **Existing identity API**: Wave 2's agent must search the codebase for the
   actual identity API surface — could be `VaultIdentityService`,
   `IdentityKeyring`, or named differently. Proposal says "user-identity"; the
   agent verifies and adapts.
3. **Custom server compatibility**: `next dev` already wraps the dev server;
   Wave 1's `server.js` must use `next({ dev: process.env.NODE_ENV !== 'production' })`
   pattern from Next.js docs. Test that `npm run dev` still works via the new
   custom server.
4. **Event payload backward compat (Wave 3a)**: `rolls?: readonly number[]`
   must be OPTIONAL on `IGameEventPayload` shapes — single-player code paths
   produce no rolls field today and must continue to work.
5. **Capstone test (Wave 5)** — the integration test runs without a real
   browser. Use `ServerMatchHost` directly + a mock client that records
   broadcasts; assert the full match → outcome → bus publish path.
6. **`combatOutcomeBus` already exists** (Phase 3 shipped). Wave 5 just needs
   to ensure server-side hosts publish via the same module.
7. **Conflict resolution Wave 3a/3b**: 3a writes `runSession()` (engine loop
   + roller injection). 3b writes lobby state machine + intent handlers.
   Keep them in DIFFERENT methods of `ServerMatchHost.ts` to avoid textual
   conflict.

---

## Verification chain (per sub-branch and at final integration)

```bash
npx tsc --noEmit                                      # 0 errors required
npx jest --testPathIgnorePatterns=e2e --silent        # 100% pass required
npx oxlint .                                          # 0 errors (warnings ok)
npx oxfmt --check .                                   # clean required
npx next build                                        # build success required
```

**End-to-end smoke (final integration via capstone test):**

1. Start an in-process `ServerMatchHost` for a `1v1` match
2. Connect 2 mock clients with valid `IPlayerToken`s, occupy seats
3. Both ready, host launches → server fires the engine
4. Mock clients receive `Event` broadcasts in order; assert `rolls` payload
   shows up on resolution events
5. Resolve a full match (via mock client intents); assert `CombatOutcomeReady`
   fires once on the bus
6. Drop a client mid-match → server marks seat `pending`, pause flag set
7. Reconnect with same `playerId`, `lastSeq=N` → server streams `events[N..]`
8. Multi-side AI fill: an unfilled seat is set to `kind: 'ai'`; server
   drives it via `BotPlayer.playMovementPhase` etc.

---

## Phase 4 done definition

- [ ] All 5 OpenSpec changes' `tasks.md` fully checked off
- [ ] One squashed PR `feat/phase-4-multiplayer-foundation` → `main` merged
- [ ] All 5 OpenSpec changes archived to `openspec/archive/`
- [ ] Roadmap doc Phase 4 section marked complete (notes 4a + 4c deferred)
- [ ] E2E test: 2 mock clients + 1 AI seat finish a 1v1+AI match end-to-end
      with rolls in events and outcome published to bus
- [ ] No regressions: existing jest tests still passing
- [ ] `npm run dev` works via the new `server.js` custom server

---

## Risk register

| Risk                                                              | Likelihood | Mitigation                                                            |
| ----------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| Custom `server.js` breaks `next dev` HMR                          | Medium     | Use Next.js docs pattern verbatim; verify HMR works post-merge        |
| `ws` upgrade not firing under Next.js's request handler           | Medium     | Standard Node `http.Server.on('upgrade')` pattern                     |
| Wave 3a/3b textual conflict in `ServerMatchHost.ts`               | Medium     | Brief both agents to keep edits in different methods                  |
| Existing identity API surface shape unknown                       | Medium     | Wave 2 agent grep first, adapt to actual API                          |
| Event payload field bloat (`rolls` everywhere)                    | Low        | Optional field; only attached where dice were rolled                  |
| Reconnect race: `appendEvent` arrives between `getEvents` snapshot and stream end | Medium | Use sequence cursor + tail-subscribe pattern    |
| Bot driving via AI in server context: `setInterval` leaks         | Low        | `ServerMatchHost` lifecycle owns timers, cleared on `closeMatch`      |
| `ICombatOutcome` derive flow expects `InteractiveSession` (single-player) | Medium | Server's `ServerMatchHost` reuses `InteractiveSession` internally|

---

## What this branch does NOT deliver

- **4a P2P sync** (`add-p2p-game-session-sync` etc.) — superseded by 4b server
- **4c Fog of war** (`add-fog-of-war-event-filtering`) — Phase 4.5 per roadmap
- **OAuth identity provider** — proposal says "future change"
- **Production persistence (SQLite / Postgres)** — proposal says "deferred"
- **Production hosting decision** (Fly.io / Railway / self-host) — out of scope
- **Cross-tab session sync** — `combatOutcomeBus` is in-process only
- **Spectator mode** — proposal explicitly defers
- **In-game chat** — not in any Phase 4 proposal
- **Replay viewer** — outcome model already supports it via `ICombatOutcome`,
  but a UI is Phase 7 polish

---

## Next step

After this outline is committed → spawn Wave 1 (server infrastructure) on an
isolated worktree. When it lands and merges, spawn Wave 2. And so on.

Maximum concurrency happens at Wave 3 (2 agents in parallel). The rest is
serial — Phase 4's nature is layered infrastructure, not greenfield UI.
