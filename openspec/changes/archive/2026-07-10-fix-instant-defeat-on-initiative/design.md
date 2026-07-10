## Context

Observed (walkthrough-2, deterministic ×2): fresh campaign 4v4 → Play Manually → battle renders (Initiative, 8 rail units, tokens present) → one click of `sp-advance-phase-button` → "Defeat — Destruction" screen; campaign event timeline shows exactly one `PendingOutcomeAdded`; dev-server log shows no errors. Contrast: on 2026-07-08 (iteration-3 live smoke, pre round-3b merge state) the identical flow advanced to Movement and a move locked successfully — and in that session the selected Locust showed Armor 64 / Structure 33 in the unit panel.

Timeline of suspects between "worked" and "broken": iteration-3 rounds 2–3b (BV/stat resolution rework: `NodeCanonicalUnitService` BV merge, `ForceRepository.helpers` canonical-stats fallback then server-boundary split into `.server.ts` with an injected resolver), #1016 (store singletons — server-side, unlikely), #1017 (starmap component — unrelated). Prime hypothesis (H1): the round-3b restructure changed the stat source used by `preBattleSessionBuilder.buildGameUnits` (or its upstream force/assignment adapter) such that campaign-launched units now enter the session with zero/undefined armor+structure; the outcome check that runs on phase advance (`tryFinalizeAndPublish` after `advanceInteractiveSessionPhase`) then reads every player unit as destroyed → Destruction. H2: outcome calculator predicate regression (reads a field renamed/moved in round 3b). H3: double-advance or finalize-ordering bug specific to multi-unit sessions.

## Goals / Non-Goals

**Goals:** pin the root cause with evidence before fixing; restore playable campaign battles; make launch integrity (units alive with real HP at session start) a tested invariant so stat-resolution refactors can't silently zero units again.
**Non-Goals:** touching outcome rules for genuinely destroyed forces; co-op sync (separate change); reworking the stat-resolution architecture beyond what the root cause requires.

## Decisions

**D1 — Investigate before editing (mandatory first wave).** Reproduce headlessly: build the session the same way the battle page does (fresh campaign → materialize → launch snapshot → InteractiveSession), dump each unit's armor/structure/heat at session start, advance Initiative once, capture the outcome decision inputs. The fix wave only starts after the failing value and its producer are identified in writing (notes/ file in this change).

**D2 — Fix at the producer, not the judge.** If units enter with zero HP, fix the stat source (builder/adapter/resolver path); do NOT teach `GameOutcomeCalculator` to ignore zero-HP forces at battle start — that would mask real data corruption. If instead the predicate itself regressed (H2), fix the predicate and add a table test over alive/dead force shapes.

**D3 — Launch-integrity regression test.** Extend the existing campaign-launch integration test (`src/__tests__/integration/campaignMissionEncounterLaunch.test.ts`) or add a sibling: after launch, every unit has armor>0 AND structure>0 matching its canonical sheet; after one Initiative advance, phase == Movement, no terminal outcome, 8 units alive. This is the invariant the walkthrough caught being violated.

**D4 — Keep the 1v1 path green.** Whatever changes, the quick-game and prior 1v1 paths must stay green (they passed the whole loop); tests must cover the campaign multi-unit path specifically, since single-unit coverage demonstrably missed this.

## Risks / Trade-offs

- [Root cause may sit in merged archive code paths touched by round 3b] → the investigation wave dumps concrete values; fix follows evidence, not the hypothesis list.
- [Existing 30k-test suite was green through the regression] → the launch-integrity test (D3) is specifically shaped to catch this class; add it BEFORE the fix to watch it fail (red-green).

## Migration Plan

No data changes. Revert PR to roll back.

## Open Questions

None blocking — H1/H2/H3 are for the investigation wave to resolve with evidence.
