# Design: attack-phase-intent-composer

## D1 — Architecture inherited from the movement composer (decided)

The composer reuses the `MovementIntentComposer` architecture wholesale: a store-level intent slice with pure reducers and derived selectors, a horizontal composer band on the tactical HUD, block-at-source gating computed in selectors (never in render), and an explicit commit that compiles intent down to the existing store contract. Rationale: the pattern shipped, its e2e/evidence migration path is known, and reusing it keeps the two composers a matched pair for players.

## D2 — `attackPlan` is the commit boundary, not the working state (decided)

The composer maintains its own `attackIntent` slice (assignments, modes, working target focus). `Fire` compiles the composed volley into the existing `attackPlan` contract (`setAttackTargetLogic`, `togglePlannedWeaponLogic`, `setPlannedWeaponModeLogic`, `commitAttackLogic`) so resolution, replay, and networking see no new shapes. Rationale (council, Explore-Deep): the slice is the stable seam; everything downstream of it already works.

## D3 — Forecast math consumed verbatim (decided)

`buildToHitForecast` / `expectedHitsTotal` (`src/utils/gameplay/toHit/forecast.ts`) power the ledger unchanged. The ledger is a presentation of existing math, never a second implementation. Any gap found in forecast coverage during implementation is a `to-hit-resolution` bug filed separately, not patched in the composer.

## D4 — Never-block-hot, always-block-illegal (decided)

Gating splits hard from soft exactly as ADR 0001 did for movement: rules-illegal assignments (arc, range, LOS, ammo, destroyed) are unassignable at source with the reason shown; heat is consequence-displayed but never gates. Threshold consequences (shutdown risk, ammo-explosion exposure) render as ledger chips. The composer never auto-fires and never auto-deselects a hot weapon.

## D5 — Primary/secondary surfaced at assignment time (decided)

The first target assigned in the composed volley is primary (`secondary-target-tracking` consumed as-is). Assigning any weapon to a different target immediately shows that weapon's secondary penalty in its row and in the ledger. No new rules: this is early surfacing of an existing resolution-time modifier.

## Open Questions (resolve in task phase 0 — ADR 0002 ratification)

- **OQ1 — assignment interaction shape.** Candidates: (a) assign-mode toggle — select weapons, then click a target to bind them; (b) target-first — click target, then toggle weapons into it; (c) per-weapon chips dragged onto targets. (b) is closest to today's flow; (a) matches the movement composer's click-semantics feel. Needs the user's player-feel call.
- **OQ2 — torso twist.** Twist changes arcs and therefore feasibility. In-composer twist (an intent item recomputing arc gating live) is coherent but enlarges v1; keeping today's separate twist step means arc gating can shift under a composed volley. Recommendation pending user input: in-composer, because stale-arc composition reproduces the compose→overflow→uncompose loop ADR 0001 exists to kill.
- **OQ3 — called shots and TAG/indirect.** v1 options: consumed-as-is via existing sub-flows (modal/сommands unchanged, composer treats them as opaque modifiers) vs in-composer assignment modifiers. Recommendation: consumed-as-is in v1; revisit after soak.
- **OQ4 — surface replacement extent.** Full replacement of `CombatPlanningPanel` during the weapon-attack phase (movement precedent: legacy panel gated off when composer active) vs embedding the composer inside the panel. Recommendation: full replacement — the panel's remaining movement content is already superseded during movement phase.
- **OQ5 — overheat guardrail presentation.** Always-visible threshold chips vs escalating warnings past thresholds only. Pure presentation; defaulting to always-visible chips unless the design pass prefers quieter.

## Risks

- The weapon-attack surface is the widest UI surface touched since the movement composer; the e2e/evidence re-anchor set is correspondingly larger (dock commands, context menus, modal, selector, capture screens 09–11).
- OQ2 (twist) is the scope hinge: in-composer twist pulls facing/arc recomputation into live gating and could grow the wave by a third. The phase-0 design pass must size it before tasks lock.
