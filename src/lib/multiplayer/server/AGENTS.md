# Multiplayer server

## OVERVIEW

- Authoritative match and campaign-co-op runtime. Production transport is WebSocket at `/api/multiplayer/socket`.
- `server.js` owns upgrade wiring; `ServerMatchHost` owns one `InteractiveSession` per match.

## STRUCTURE

- Socket binding validates transport messages and routes intents to process-local host registries.
- Match/campaign hosts own authority; stores own durable state; registries own active process lifecycles.
- Client and P2P folders are consumers or fallbacks, never a second authoritative server.

## WHERE TO LOOK

- Contract: `TRANSPORT.md`; protocol/binding: `bindMultiplayerSocketConnection.ts`.
- Match authority: `ServerMatchHost.ts`, `MatchHostRegistry.ts`, `CampaignHostRegistry.ts`.
- Persistence: `IMatchStore.ts`, `DurableMatchStore.ts`, `InMemoryMatchStore.ts`, `getDefaultMatchStore.ts`.
- Campaign co-op: `CampaignMatchHost.ts`, `CampaignSyncSession.ts`, `CampaignGmArbiter.ts`.
- Client/P2P contrast: `../client.ts`, `../../../p2p/`, `../../../campaign/coop/`.

## CONVENTIONS

- Canonical events originate on the server; clients submit intents and mirror broadcasts.
- Validate intent before commit; preserve sequence, dice capture, fog redaction, replay protection, rate limits, and protocol checks.
- Keep socket binding and stores server-only. Read `TRANSPORT.md` before transport/replay changes.

## MATCH STORES

- `IMatchStore` is the async persistence contract; preserve atomic append semantics.
- Match lifecycle values are `lobby`, `active`, and `completed`.
- `DurableMatchStore` is the production SQLite implementation.
- `InMemoryMatchStore` is for development/tests and must remain loud about non-durability.
- `getDefaultMatchStore.ts` selects by `MULTIPLAYER_STORE` override, then `NODE_ENV`.
- Production defaults to durable storage; dev/test defaults to memory.
- The default store is process-global via `Symbol.for`; do not create per-request stores.
- Use `_setDefaultMatchStoreForTests` and `_resetDefaultMatchStore` for deterministic tests.

## HOST AND PLAYER LIFECYCLE

- `MatchHostRegistry` and `CampaignHostRegistry` are process-local active-host registries.
- Registries are not a shared multi-replica coordinator; preserve sticky/shared-state limitations.
- `bootstrapMultiplayerServer()` runs once per process and recovers durable active matches at boot.
- Keep restart bootstrap metadata sufficient to reconstruct active hosts.
- `InMemoryPlayerStore` follows the process-global singleton pattern; use its test reset helper.
- Registry tests must reset hosts, stores, transports, and player state between cases.
- Prefer dependency injection of `IMatchStore` over hidden production-store coupling.

## CAMPAIGN CO-OP

- `CampaignHostRegistry`, `CampaignMatchHost`, `CampaignSyncSession`, and `CampaignGmArbiter`
  define authoritative campaign synchronization.
- Guest projections may apply server-authoritative state, but cannot commit ledger mutations.
- Preserve participation buckets, GM arbitration, and monotonic campaign projections.
- Coordinate client-side helpers in `src/lib/campaign/coop`; do not duplicate server authority there.

## ANTI-PATTERNS

- `src/lib/p2p` is a non-authoritative fallback only.
- Yjs/y-webrtc synchronization may cover unit, pilot, and force data, not campaign ledger state.
- Any campaign intent must cross the authoritative host: intent -> validate -> commit -> broadcast.
- Do not advertise P2P as a supported authoritative match transport.
- Do not create per-request stores, bypass boot recovery, expose fogged events, or move authority into a client/CRDT.
- Do not treat process-local registries as shared multi-replica coordination.

## VERIFICATION

- Preserve Zod message validation, replay buffering, reconnect behavior, and protocol version checks.
- Exercise durable and memory store paths plus restart recovery when changing lifecycle code.
- Keep test-only reset hooks private/explicit; never use them as production lifecycle APIs.

## COMMANDS

- Focused tests: `npm test -- src/lib/multiplayer/server/`.
- Socket smoke: `npm run validate:multiplayer:dev-socket`; shared static proof: `npm run typecheck`.
