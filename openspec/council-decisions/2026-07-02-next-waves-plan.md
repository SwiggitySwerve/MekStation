# Council Decision — Next-Waves Plan (Post Command-Screen Arc)

- **Date:** 2026-07-02
- **Variant:** Lean thin+ (Phase-0 Metis → Oracle + Prometheus + Explore-Deep + Momus), Phase 3 collapsed (adversary objection accepted wholesale; evidence settled factual disputes), synthesis verified by omo-judge 2-pass (VERIFIED + REVISE; revised with SHA/test-absence citations per the REVISE flags)
- **Headline:** The planned "soak wave" was dead on arrival — the council's own probe came back red (three production session builders still create 0-armor battles), and "resume Wave 8" was mostly a stale-memory mirage.

## Verified facts the decision rests on

- Wave-8 PR-K7/L2/L3 already merged: `b39d7624d` (#673), `43e0a8288` (#676), `c7e264ecc` (#679).
- PR #998's combat-seed splice has exactly two production callers (`GameEngine.ts:115`, `InteractiveSession.ts:202`). Three builders bypass it with raw `createGameSession`: `EncounterService.ts:389` (campaign encounter launch — highest severity), `lobbySessionBuilder.ts:76`, `preBattleSessionBuilder.ts:216`; the P2P mirror (`mirrorSession.ts`) inherits the host's gap by design.
- No armor assertion exists for those paths (zero `armorByLocation`/`structureByLocation` matches in `src/services/encounter/__tests__/` and `src/utils/gameplay/__tests__/`) — verification is test-authoring work (Momus's kill, accepted into scope).
- `resolveVibroClawAttack` (`src/utils/gameplay/battlearmor/vibroClaw.ts`) is fully implemented and unit-tested with zero production call sites; the `battle-armor-combat` spec's Vibroclaw Attack requirement already exists. PR-L4 is wiring, not a build.
- PR-M aerospace has no artifact beyond a placeholder seam comment (`src/engine/attackContext.ts:6-10`).
- Attack-phase surface for a composer: `CombatPlanningPanel.tsx` + `WeaponSelector.tsx` + `ToHitForecastModal.tsx` (~1,250 lines), `useGameplayStore.attackPlan` as the contract to preserve, `weaponAttackCommands.ts` as registry integration.

## Decision — three waves

1. **Wave 1 — Combat-Correctness Closeout (M).** OpenSpec changes `extend-combat-seed-to-all-session-producers` (red tests first, then route the three raw builders through the splice; P2P mirror inheritance check) and `wire-vibroclaw-attack-dispatch` (dispatch + declaration + gated UI per the existing spec requirement).
2. **Wave 2 — Attack-Phase Intent Composer (L), runway gated.** OpenSpec change `attack-phase-intent-composer` + ADR 0002 (Proposed). Implementation blocked on task phase 0: ratifying ADR 0002's OQ1–OQ5 with the user (assignment UX, torso twist, called shots/TAG placement, surface replacement extent, overheat guardrails).
3. **Wave 3 — Residuals batch (S).** Weapons ammo counters, capture provenance H2/H3, 9 BV outliers. PR-M aerospace remains its own future wave.

**Survival Score:** Modified — Momus's kill (Wave-1 sizing hid missing test harness) re-scoped Wave 1; Prometheus's soak file-scope corrected by evidence (gap at session creation, not persistence); Oracle's "third path" hunch confirmed at lobby/preBattle.
**Dissent on record:** Oracle preferred bundling vibroclaw into the composer wave; overruled on verification-regime grounds (engine vs UI).
**Open risks:** more raw `createGameSession` callers than the three found; OQ2 (torso twist) is the composer wave's scope hinge.
**Decision crux:** whether encounter-launched sessions get re-seeded elsewhere before play — Wave 1's first red test settles it.
