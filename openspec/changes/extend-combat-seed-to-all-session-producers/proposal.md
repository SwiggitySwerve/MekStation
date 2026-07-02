# Proposal: extend-combat-seed-to-all-session-producers

## Why

PR #998 fixed the engine-level bug where BattleMechs entered combat with empty per-location armor/structure maps (`createInitialUnitState` hardcoded `armor: {}` / `structure: {}`), which made every penetrating hit destroy the location outright and rendered the record sheet's 0/0 readings "honest but catastrophic." The fix routes adapted catalog units through `gameUnitsWithAdaptedCombatSeeds` so `IGameUnit.armorByLocation` / `structureByLocation` / `heatSinks` flow through the `GameCreated` payload — but it was wired into only two producers: the `InteractiveSession` constructor (`src/engine/InteractiveSession.ts:202`) and `GameEngine.runToCompletion` (`src/engine/GameEngine.ts:115`).

Council evidence (2026-07-02 next-waves plan, Explore-Deep seat, Captain-verified) found three production session producers that still call `createGameSession` raw and therefore still create 0-armor battles:

- `src/services/encounter/EncounterService.ts:389` — **campaign encounter launch**, the highest-severity gap (active production entry point via `launchCampaignEncounter.ts`)
- `src/utils/gameplay/lobbySessionBuilder.ts:76` — lobby / hot-seat launch
- `src/utils/gameplay/preBattleSessionBuilder.ts:216` — pre-battle skirmish builder

Additionally `src/lib/p2p/mirrorSession.ts` deliberately mirrors the host session verbatim ("value-equal twin"), so a guest mirror inherits whatever seeding gap the host's producer had.

No test today asserts armor/structure presence at `GameCreated` for any of these paths (zero `armorByLocation`/`structureByLocation` matches across `src/services/encounter/__tests__/` and `src/utils/gameplay/__tests__/`) — the verification harness is part of this change, not a given (council adversary finding, accepted).

## What Changes

- **Every production session producer seeds combat state.** The three raw `createGameSession` callers route their units through `gameUnitsWithAdaptedCombatSeeds` (or supply equivalent `armorByLocation` / `structureByLocation` / `heatSinks` construction inputs) before the `GameCreated` event is created.
- **Per-producer armor assertions.** New tests assert that sessions produced by encounter launch, lobby launch, and the pre-battle builder derive non-empty per-location armor AND structure for BattleMech units, and that `startingInternalStructure` is seeded (retreat-trigger contract).
- **P2P mirror inheritance check.** A test asserts the guest mirror of a seeded host session carries the same seeded values (the mirror stays a verbatim twin; the guarantee comes from the host producer being seeded).
- **Legacy synthetic fixtures stay exempt.** Test fixtures that construct bare `IGameUnit` lists intentionally keep the empty-map behavior (`armorByLocation` absent → legacy path), unchanged from #998's compatibility contract.

## Capabilities

### Modified Capabilities

- `game-session-management`: new requirement **Combat State Seeding at Session Creation** — production session producers SHALL supply per-location armor/structure/heat-sink construction inputs on the units they pass to session creation, with scenarios covering each named producer and the mirror-inheritance guarantee.

_Not modified_: `combat-resolution`, `damage-system`, `movement-system` (rules unchanged — this closes producer coverage of an existing seeding mechanism); `encounter-system` (launch flow semantics unchanged; only the unit payload it forwards gains seeds).

## Non-goals

- No changes to how seeds are consumed (`createInitialUnitState` behavior from #998 is final).
- No re-verification of the two already-covered producers (`InteractiveSession`, `runToCompletion`) beyond existing suites.
- No ammo/weapon display work (separate residuals change).
- No new per-type (`vehicleInit`/`aerospaceInit`/…) construction blocks — those paths were never broken.

## Impact

- **Services**: `src/services/encounter/EncounterService.ts` (launch path), `src/utils/gameplay/lobbySessionBuilder.ts`, `src/utils/gameplay/preBattleSessionBuilder.ts` — each gains adapted-unit derivation (mirroring the `GameEngine.runToCompletion` inline pattern) or explicit construction inputs.
- **Tests**: new armor-assertion coverage in `src/services/encounter/__tests__/` and `src/utils/gameplay/__tests__/`; a mirror-inheritance case in the p2p suite.
- **Risk**: encounter/lobby battles get dramatically longer (armor now absorbs damage) — any test asserting battle length/outcomes on these paths may need the same 3× perf-budget treatment applied in #998.
