# Gameplay utilities

## OVERVIEW

- Event-sourced gameplay model shared by UI, engine, simulation, persistence, replay, campaign, and multiplayer.
- `gameSession.ts` is the public facade; `gameSessionEvents.ts` is the append/derive mutation boundary.

## STRUCTURE

- `gameSessionCore.ts`: create/hydrate/start/end/phase/initiative.
- `gameState/`: pure event dispatch and derived-state reducers.
- Attack, damage, heat, movement, physical, objective, terrain, and unit-family modules own their rule slices.
- `gameSessionReplay.ts`, `eventPayloads.ts`: replay, log projection, and documented legacy normalization.
- `diceTypes.ts`: injectable `D6Roller` plus legacy unseeded default.

## WHERE TO LOOK

- Public exports: `gameSession.ts`; state write path: `gameSessionEvents.ts`.
- Replay/P2P rolls: `../../lib/p2p/replayDiceRoller.ts` and host roll embedding.
- Engine seed injection: `../../engine/`; simulation adapter: `../../simulation/core/SeededD6Roller.ts`.
- Terrain RNG: `terrainGeneratorTypes.ts`; objective RNG: `objectives/objectivePlacement.ts`.

## CONVENTIONS

- `GameCreated` starts every hydratable log; ordered events derive all runtime state.
- Validate ammo, legality, liveness, and resources before appending an event.
- Thread an injected roller through every nested roll; preserve missing/extra/duplicate/mismatched replay-roll guards.
- New event types need serializable payloads, guards, reducer handling, replay coverage, and stable envelope semantics.
- Keep reducers pure and repeatable from the log alone; preserve documented legacy payload fallbacks until migration proof exists.
- Add cross-layer exports through the facade instead of creating a parallel session model.

## ANTI-PATTERNS

- Do not mutate cached state, insert/reuse event ids, consume dice before command acceptance, or hide unknown events.
- Do not depend on browser stores, wall-clock state, or mutable resolver caches during derivation.
- Do not replace an injected roller with `defaultD6Roller` or add ambient combat randomness.
- Do not interchange the terrain LCG with simulation Mulberry32; unseeded terrain fallback is compatibility-only.
- Inspect engine, simulation, replay, campaign, and multiplayer consumers before changing shared event shapes.

## COMMANDS

- Focused tests: `npm test -- src/utils/gameplay/`.
- Shared event-shape gates: `npm run typecheck` and `npm run lint`.
