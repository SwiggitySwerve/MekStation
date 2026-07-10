## Why

Campaign battles are unplayable again, differently: on a fresh 4v4 campaign battle (post-#1015/#1016/#1017 main), clicking "Roll Initiative & Begin" immediately ends the game with "Defeat — Destruction". The event timeline records a single `PendingOutcomeAdded` — no initiative event, no attacks, no destruction sequence. Deterministic: reproduced on two fresh encounters (walkthrough-2, 2026-07-09, screenshots walk2/07-10). The same composition played correctly earlier on 2026-07-08 (iteration-3 smoke: initiative rolled, movement composed and locked), so the regression window is narrow — the prime suspect set is the iteration-3 round-3b restructuring of unit-stat resolution (`ForceRepository.helpers` server-boundary split) changing what the pre-battle session builder feeds the engine (e.g., units entering the session with zero armor/structure, which the outcome calculator immediately reads as force destruction).

## What Changes

- Root-cause investigation pinning why a fresh campaign 4v4 session terminates as Destruction on the first phase advance with zero combat events.
- Fix at the root (candidate surfaces: `preBattleSessionBuilder` unit stat resolution, `GameOutcomeCalculator` destruction predicate, `advanceInteractiveSessionPhase`→`tryFinalizeAndPublish` ordering) — no outcome-calculator special-casing that masks bad unit data.
- Regression guard: an integration test that launches a campaign 4v4 into an interactive session, advances Initiative once, and asserts the session is in Movement with all 8 units alive (armor/structure > 0) and NO terminal outcome.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `campaign-combat-loop`: "Campaign-Linked Encounter Launch" gains a launch-integrity scenario — a freshly launched campaign session SHALL contain units with their full armor/structure values, and advancing out of Initiative SHALL NOT produce a terminal outcome without combat events.

## Impact

- Suspects to investigate: `src/components/gameplay/pages/preBattleSessionBuilder.ts` (unit stat sourcing — changed in iteration-3 round 3/3b), `src/services/forces/ForceRepository.helpers.ts` + `.server.ts` split (stat resolution moved across the boundary), `src/services/game-resolution/GameOutcomeCalculator*`, `src/engine/InteractiveSession.phases.ts` finalize ordering.
- Tests: new launch-integrity integration test; existing `campaignMissionEncounterLaunch.test.ts` may need an armor/structure assertion (it verified counts + pilots, evidently not HP).
- Non-goals: co-op sync propagation (separate change `fix-coop-mutation-propagation`), any outcome-rule changes for legitimately destroyed forces.
