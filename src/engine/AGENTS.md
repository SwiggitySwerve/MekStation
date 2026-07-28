# Engine

## OVERVIEW

- `GameEngine` is the complete/interactive game entry. `InteractiveSession` owns command, event, recovery, and completion lifecycle.
- Engine callers span pre-battle hooks, quick-game stores, campaign fast-forward, multiplayer, and simulation quick resolve.

## STRUCTURE

- `GameEngine.ts` resolves configuration and creates complete or interactive runs.
- `InteractiveSession.*` splits setup, commands, persistence, recovery, and event publication.
- Seed derivation, adapters, AI, and public types remain adjacent to the lifecycle they support.

## WHERE TO LOOK

- `GameEngine.ts`: resolved map/turn/victory/seed config and session construction.
- `InteractiveSession.ts` plus `.setup`, `.recovery`, `.persistence`, and `.sessionEvents`: guarded commands and event lifecycle.
- `combatSeedDerivation.ts`: deterministic armor, structure, heat, and critical-location seed projection.
- `types.ts`: public construction contract and legacy defaults.

## CONVENTIONS

- Resolve config defaults once in `GameEngine`; downstream helpers must not silently re-default map radius or turn limit.
- Preserve adapted unit combat metadata and stable player/opponent maps across setup, AI, recovery, and outcomes.
- `runToCompletion` uses a seeded AI/action stream. Interactive sessions deliberately isolate AI `SeededRandom` from `SeededD6Roller(seed)`.
- Route actions through session methods and event append/persist helpers; player actions require an active session.
- Recovery requires an ordered, non-empty event log beginning with `GameCreated`; rebuild runtime caches from persisted state.
- Preserve session/match identifiers and publish outcomes once. Report disk-tail divergence or corruption instead of masking it.
- Clock diagnostics may vary; seed, event order, outcomes, and replay state must remain deterministic.

## ANTI-PATTERNS

- Do not mutate cached state/event arrays directly, call lower-level reducers from UI/server callers, or bypass active-state guards.
- Do not reach gameplay's default `Math.random` roller from seeded engine paths or add hidden global RNG state.
- Do not recover from an arbitrary event suffix, reuse abandoned in-memory maps, or convert corrupt persistence into a fresh game.
- Do not conflate the simulation Mulberry32 stream with the terrain LCG in `utils/gameplay/terrainGeneratorTypes.ts`.

## VERIFICATION

- Cover both `runToCompletion` and `createInteractiveSession`.
- Add persisted replay/recovery proof for lifecycle changes and inspect multiplayer/campaign consumers for constructor changes.

## COMMANDS

- Focused tests: `npm test -- src/engine/`.
- Cross-layer static proof: `npm run typecheck` and `npm run lint`.
