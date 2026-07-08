## 1. Global singleton (D1, D2, D3)

- [x] 1.1 Rework `src/lib/multiplayer/server/getDefaultMatchStore.ts`: cache the instance on `globalThis[Symbol.for('mekstation.multiplayer.matchStore')]`; remove the module-level `_singleton`; `_setDefaultMatchStoreForTests` / `_resetDefaultMatchStore` operate on the global slot. Preserve `shouldUseDurableStore()` semantics unchanged.
- [x] 1.2 Apply the same `globalThis` anchor to the player-store factory (locate the `InMemoryPlayerStore` default factory; if consumers construct it per-import, introduce the factory and route them through it). Grep for direct `new InMemoryMatchStore(` / `new InMemoryPlayerStore(` outside tests and route any hits through the factories.
- [x] 1.3 Confirm the dev-only banner is emitted by singleton construction only (once per process under the anchor); do not add log-dedup logic.

## 2. Regression coverage (D4)

- [x] 2.1 Jest test: two `jest.isolateModules` loads of the match-store factory return the SAME instance (global anchor bridges isolated module states); `_resetDefaultMatchStore` clears the slot between suites.
- [x] 2.2 Same-shape test for the player-store factory.

## 3. Verification

- [x] 3.1 `npm run typecheck && npm run lint` clean; multiplayer server suites pass (`src/lib/multiplayer/server/__tests__`), then full `npm run test:stable` once.
- [x] 3.2 Live transport proof on plain `npm run dev` (NO `MULTIPLAYER_STORE` override): mint token → `POST /api/multiplayer/matches` → open the socket for that match → connection stays open (no `1008 unknown-match`), and the server log shows the dev-store banner exactly once. Then two-browser co-op: create co-op campaign, guest joins with the room code, guest receives the host snapshot (no timeout). Screenshots/log excerpts to `.sisyphus/evidence/playtest/`. (May be skipped by the implementing worker; the orchestrator runs it — this is the step the in-process validator falsely green-lit.)
- [x] 3.3 Confirm `validate:multiplayer:dev-socket` (and the e2e multiplayer browser suite under its durable-store config) still pass — no regression on the covered paths.
