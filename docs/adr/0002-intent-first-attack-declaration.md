# ADR 0002: Intent-First Attack Declaration (Attack-Phase Intent Composer)

- **Status:** Proposed (awaiting design-pass ratification — see Open Questions)
- **Date:** 2026-07-02
- **Builds on:** ADR 0001 (intent-first tactical movement), council decision 2026-07-02 (next-waves plan)

## Context

The weapon-attack phase today is a three-surface flow: `CombatPlanningPanel` hosts a `WeaponSelector` (per-weapon toggles with what-if preview columns), a `ToHitForecastModal` carries the commit step, and the `TacticalActionDock` + enemy-token context menus carry declare/fire commands that mutate the same `attackPlan` store slice from the side. Target selection is single-target-at-a-time (`attackPlan.targetId`), with the secondary-target rules (`secondary-target-tracking` capability) applied at resolution rather than surfaced during planning.

ADR 0001 established the intent-first pattern for movement: compose the turn as intent, total consequences live, block impossibilities at the source, and commit explicitly — never auto-pick. The movement composer shipped (PR #993) and its architecture (intent slice, live ledger, block-at-source gating, explicit lock-in, single authority) is proven on this codebase.

## Decision (proposed)

Bring the same model to the weapon-attack phase:

1. **Attack Intent Composer** is the single planning surface for the weapon-attack phase. The player composes a volley as intent items — weapon→target assignments with per-weapon fire modes — before anything commits.
2. **Heat & Effect Ledger** totals the composed volley live: heat generated (on top of banked movement heat), expected damage, and hit probabilities per weapon and for the volley, consuming the existing `toHit/forecast` calculators.
3. **Live feasibility gating** blocks illegal assignments at the source (destroyed weapon, no ammo, out of arc, out of range, no LOS) with the rules-backed reason. Legal-but-hot is NEVER blocked — heat is a strategic resource (TSM, cold-weather play); overheat consequences are displayed, not forbidden. This is the attack analog of ADR 0001's never-auto-pick principle.
4. **Explicit Fire commit** commits the whole composed volley atomically into the existing declaration pipeline. The composer never auto-fires; declining to fire is an explicit Hold Fire.
5. **Single attack authority**: dock weapon commands and enemy-token context menus route into composer state instead of mutating the attack plan from the side; the forecast modal's confirm role is absorbed by the composer's resolver panel.
6. **Rules are consumed, not changed**: `secondary-target-tracking` penalties, `to-hit-resolution`, `indirect-fire-system`, called-shot rules, and `weapon-resolution-system` apply verbatim — the composer reorders the player's decision flow only.

## Open Questions (must be resolved before implementation tasks execute)

- **OQ1 — per-weapon target assignment UX:** assign-mode toggle ("now clicking assigns weapon group B to a target") vs draggable weapon→target chips vs target-first grouping. MegaMek semantics allow per-weapon targets; the UX shape is a player-feel decision.
- **OQ2 — torso twist:** is twist an intent item inside the composer (it changes arcs, therefore feasibility) or a separate pre-step as today? Composer-owned twist is more coherent but enlarges v1.
- **OQ3 — called shots and TAG/indirect declarations:** in-composer as assignment modifiers in v1, or consumed-as-is via existing sub-flows until v2?
- **OQ4 — surface replacement extent:** does the composer fully replace `CombatPlanningPanel` during the weapon-attack phase (mirroring how the movement composer gated the legacy panel), or embed within it?
- **OQ5 — overheat guardrails:** threshold chips (shutdown risk, ammo-explosion risk at 19+/23+) always visible vs escalating warnings only past thresholds.

## Consequences

- The `attackPlan` store slice contract is preserved as the commit boundary (composer state compiles down to it), keeping resolution and networking untouched.
- E2e specs and evidence capture re-anchor from WeaponSelector/modal interactions to composer interactions (same migration shape as PR #993's re-anchoring).
- The dock keeps non-declaration commands (phase, utility, critical); its weapon declare/fire entries become composer routers — removal of duplicated surfaces mirrors ADR 0001's Single Movement Authority cleanup.
