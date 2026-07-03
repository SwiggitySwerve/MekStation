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

## D6 — Target-first assignment (OQ1, user-ratified 2026-07-02)

Clicking an enemy focuses it as the working target; weapons toggle into the volley against the focused target. First-assigned target is primary; focusing another enemy and toggling further weapons creates secondary assignments with penalties surfaced inline (per D5). Rejected: assign-mode toggle (inverts attack muscle memory) and weapon→target chips (heaviest interaction + a11y cost).

## D7 — Torso twist in-composer (OQ2, user-ratified — the scope hinge, accepted)

Twist is an intent item; the composer recomputes arc feasibility live as it changes, and un-twisting restores gating exactly. Rationale: an outside twist invalidating a composed volley recreates the compose→overflow→uncompose loop the intent-first ADRs exist to kill. The ~⅓ larger wave is accepted; phases below are sized for it.

## D8 — Called shots and TAG/indirect consumed-as-is (OQ3, user-ratified)

Existing sub-flows keep working unchanged; the composer treats their outputs as opaque modifiers on forecast rows. Revisit after soak.

## D9 — Full surface replacement (OQ4, user-ratified)

The composer fully owns the weapon-attack phase: `CombatPlanningPanel`'s weapon-attack content is gated off while the composer is active (movement-composer precedent) and `ToHitForecastModal`'s confirm role is absorbed by the Fire resolver. No second half-owner survives.

## D10 — Always-visible heat threshold chips (OQ5, user-ratified)

Shutdown-risk and ammo-explosion-exposure chips render in a consistent ledger slot whenever the composed heat crosses them — glanceable every volley, no first-appearance layout shift mid-composition.

## Risks

- The weapon-attack surface is the widest UI surface touched since the movement composer; the e2e/evidence re-anchor set is correspondingly larger (dock commands, context menus, modal, selector, capture screens 09–11).
- D7 (in-composer twist) pulls facing/arc recomputation into live gating — the accepted ~⅓ scope growth. Twist legality (torso-twist rules, arc math) is consumed from existing helpers; only the recomputation wiring is new.
