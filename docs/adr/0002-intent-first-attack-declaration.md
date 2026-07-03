# ADR 0002: Intent-First Attack Declaration (Attack-Phase Intent Composer)

- **Status:** Accepted (OQ1–OQ5 ratified by the user, 2026-07-02 design pass)
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

## Resolved Questions (user-ratified, 2026-07-02)

- **OQ1 — assignment UX → target-first.** Clicking an enemy focuses it as the working target; weapons toggle into the volley against the focused target. First-assigned target is primary; focusing another enemy and toggling more weapons creates secondary assignments with their penalties surfaced inline. Closest to existing muscle memory.
- **OQ2 — torso twist → in-composer.** Twist is an intent item; arc feasibility recomputes live as it changes. Rationale: an outside twist invalidating a composed volley recreates the compose→overflow→uncompose loop this ADR family exists to kill. The ~⅓ larger wave is accepted.
- **OQ3 — called shots and TAG/indirect → consumed-as-is in v1.** Existing sub-flows keep working; the composer treats their outputs as opaque modifiers. Revisit after soak.
- **OQ4 — surface replacement → full.** The composer fully owns the weapon-attack phase; `CombatPlanningPanel`'s weapon-attack content is gated off (movement-composer precedent) and `ToHitForecastModal`'s confirm role is absorbed by the composer's Fire resolver.
- **OQ5 — overheat guardrails → always-visible threshold chips** in a consistent ledger slot (shutdown risk, ammo-explosion exposure), matching the movement ledger's consequence-line style.

## Consequences

- The `attackPlan` store slice contract is preserved as the commit boundary (composer state compiles down to it), keeping resolution and networking untouched.
- E2e specs and evidence capture re-anchor from WeaponSelector/modal interactions to composer interactions (same migration shape as PR #993's re-anchoring).
- The dock keeps non-declaration commands (phase, utility, critical); its weapon declare/fire entries become composer routers — removal of duplicated surfaces mirrors ADR 0001's Single Movement Authority cleanup.
