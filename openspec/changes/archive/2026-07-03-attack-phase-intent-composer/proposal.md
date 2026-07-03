# Proposal: attack-phase-intent-composer

## Why

The weapon-attack phase is the last combat phase still running the pre-doctrine flow: weapon toggles in `WeaponSelector` (551 lines), a commit step exiled to `ToHitForecastModal` (375 lines), a hosting `CombatPlanningPanel` (320 lines), and dock/context-menu commands that mutate the `attackPlan` slice from the side — two-and-a-half surfaces for one decision. Secondary-target penalties, heat consequences, and ammo pressure surface late or not at all during planning. ADR 0001's intent-first model (compose → total live → block at source → explicit commit → single authority) shipped for movement in PR #993 and is the proven pattern; ADR 0002 (Proposed) extends it to attack declaration.

## What Changes

- **New Attack Intent Composer** on the tactical HUD for the weapon-attack phase: the volley is composed as weapon→target assignments (with per-weapon fire modes) before anything commits.
- **Heat & Effect Ledger**: live totals for the composed volley — heat generated over banked movement heat, expected damage, per-weapon and volley hit probabilities — consuming the existing `toHit/forecast` calculators verbatim.
- **Live feasibility gating**: illegal assignments (destroyed, no ammo, out of arc/range, no LOS) are blocked at the source with rules-backed reasons; legal-but-hot is never blocked — overheat consequences display instead (never-auto-pick philosophy).
- **Primary/secondary surfaced during planning**: first-assigned target is primary; assignments to further targets show the secondary-target penalty inline as the assignment is made (rules from `secondary-target-tracking`, consumed as-is).
- **Volley Resolver with explicit Fire**: a summary panel commits the whole volley atomically into the existing declaration pipeline; empty commit is an explicit Hold Fire; the composer never auto-fires.
- **Single attack authority**: dock weapon commands and enemy-token context menus route into composer state; `ToHitForecastModal`'s confirm role is absorbed; the `attackPlan` slice remains the commit boundary (composer state compiles down to it).

## Capabilities

### New Capabilities

- `tactical-attack-intent`: the intent-first attack flow — attack intent items (weapon→target assignments, fire modes), target assignment semantics (primary-first, per-weapon secondary reassignment with inline penalties), weapon palette legality-at-source, Heat & Effect Ledger, live feasibility gating, Volley Resolver semantics (explicit Fire, Hold Fire, never-auto-fire), and Single Attack Authority.

### Modified Capabilities

- `tactical-map-interface`: Target Lock Visualization extends from the single `attackPlan.targetId` ring to composer-driven primary/secondary target encodings; a new Attack Intent Map Interaction requirement covers click-assigns-target and per-weapon assignment interaction on the map.

_Not modified_: `to-hit-resolution`, `secondary-target-tracking`, `weapon-resolution-system`, `indirect-fire-system`, `heat-management-system` (all consumed verbatim — this change reorders the player's decision flow, not the rules); `physical-attack-system` and its UI sub-panel (own phase, out of scope).

## Non-goals

- No changes to attack **rules** (to-hit math, secondary penalties, cluster tables, heat effects).
- No physical-attack composition (the physical sub-panel and its declaration commit stay as specified).
- No AI/bot changes; no networking protocol changes (committed volleys enter the same declaration path).
- No aerospace.

## Gating

Implementation tasks SHALL NOT begin until ADR 0002's Open Questions (OQ1–OQ5: assignment UX shape, torso-twist placement, called-shot/TAG placement, surface-replacement extent, overheat guardrail presentation) are ratified — that design pass is task phase 0 of this change.

## Impact

- **Components**: new composer suite under `src/components/gameplay/` (mirroring `MovementIntentComposer/` architecture); `CombatPlanningPanel.tsx`, `WeaponSelector.tsx`, `ToHitForecastModal.tsx` (~1,250 lines combined) absorbed/replaced per OQ4's resolution; `TacticalActionDock` weapon commands become composer routers.
- **State**: new attack-intent slice compiling down to the preserved `useGameplayStore.attackPlan` contract.
- **Tests/evidence**: e2e + command-screen evidence re-anchor from selector/modal to composer interactions (PR #993 migration shape).
- **Docs**: ADR 0002 (`docs/adr/0002-intent-first-attack-declaration.md`, Proposed → Accepted at ratification); glossary gains attack-intent terms at ratification.
