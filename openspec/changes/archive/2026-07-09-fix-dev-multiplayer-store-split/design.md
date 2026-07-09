## Context

`getDefaultMatchStore.ts:31` holds `let _singleton: IMatchStore | null = null` at module scope. The design comment ("selection is a singleton so every HTTP handler + the WebSocket upgrade in one Node process share one store", `harden-multiplayer-transport` D1) assumes one module instance per process. `npm run dev` violates that: `server.js:278-281` loads the socket path via `require('tsx/cjs')` + direct `.ts` requires (CommonJS graph), while Next 16/Turbopack compiles the API routes (`/api/multiplayer/*`) into its own graph — two copies of the module state, two `InMemoryMatchStore`s. Evidence from the 2026-07-07 playtest: `[InMemoryMatchStore] dev-only store in use` printed at boot AND again at first match creation; every socket accept immediately closed `1008 unknown-campaign-match`/`unknown-match`; `MULTIPLAYER_STORE=durable` (Playwright webServer env) works because `DurableMatchStore` is backed by one shared SQLite file.

## Goals / Non-Goals

**Goals:** one store instance per Node process in every load topology (plain dev, e2e dev, packaged, prod); manual dev multiplayer (co-op join + 1v1 lobby) works; regression coverage that fails if the singleton splits again.
**Non-Goals:** switching dev to the durable store by default; touching socket binding, auth, or match semantics; Turbopack/module-graph configuration work.

## Decisions

**D1 — `globalThis`-anchored singleton (the Next.js dev-singleton pattern).**
Cache the instance on `globalThis[Symbol.for('mekstation.multiplayer.matchStore')]` inside `getDefaultMatchStore()`; module-level `_singleton` goes away (test hooks `_setDefaultMatchStoreForTests`/`_resetDefaultMatchStore` write the same global slot). `Symbol.for` (global symbol registry) rather than a module-scoped `Symbol()` — the whole point is cross-graph identity. Alternatives: (a) default dev to durable — masks the broken singleton contract rather than fixing it, changes dev semantics (state survives restarts), rejected; (b) inject the store from `server.js` into routes — impossible for Next-owned route handlers, rejected.

**D2 — Player store gets the same treatment.**
`InMemoryPlayerStore` logged its dev banner at match-creation time in the playtest logs, indicating the same factory-per-graph duplication. Apply the identical `globalThis` anchor to its factory (implementer verifies the factory shape first; if it has no singleton factory, wire it through one rather than leaving per-import instances).

**D3 — Banner logs once, by construction.**
The "dev-only store in use" warning moves to the singleton-construction branch (it already is there implicitly — constructor side effect); with the global anchor the constructor runs once per process, restoring the spec'd "warns loudly (once at startup)" meaning. No log-dedup hack.

**D4 — Regression test simulates graph duplication with `jest.isolateModules`.**
Two `jest.isolateModules` loads of `getDefaultMatchStore` (fresh module state each) must return the SAME store object (via the `globalThis` anchor) — this red-lines the exact failure mode without needing a real dual-bundler harness. A second test asserts `_resetDefaultMatchStore` clears the global slot (suite isolation). Live transport proof is a verification task, not a jest test: create match via REST on the running dev server and confirm the socket upgrade resolves it (no 1008).

## Risks / Trade-offs

- [globalThis anchor survives Turbopack HMR module re-evaluation → stale store after hot edits to store code] → acceptable and standard for this pattern (same as dev DB clients); a full server restart clears it, and store code changes are rare.
- [Durable-store path also routes through the anchor] → identical behavior (one instance), no functional change in prod.
- [Hidden third consumer constructing `InMemoryMatchStore` directly] → grep for direct `new InMemoryMatchStore(` outside tests as part of implementation; route any found through the factory.

## Migration Plan

No data or API change; revert the PR to roll back. After landing, the manual-dev proof (verification task) should be added to the deep-play co-op journey's expectations (harness change `extend-ux-audit-deep-play-journeys` records the store-config divergence today — its finding text can be retired once this fix lands).

## Open Questions

None.
