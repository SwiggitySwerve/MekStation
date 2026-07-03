# tactical-map-interface (delta)

Delta for `attack-phase-intent-composer`: Target Lock Visualization extends from the single `attackPlan.targetId` ring to composer-driven primary/secondary encodings, and a new Attack Intent Map Interaction requirement covers click-assigns-target plus at-source feasibility visuals while composing. Context Menus Mirror Command Registry is intentionally unchanged (menus keep mirroring the registry; the registry's weapon commands route into composer state per `tactical-attack-intent` Single Attack Authority).

## MODIFIED Requirements

### Requirement: Target Lock Visualization

The tactical map interface SHALL render a pulsing red target ring around the composed volley's **primary** target token during the Weapon Attack phase, and a visually distinct secondary-target encoding (non-color-redundant) around each additional target carrying at least one weapon assignment. Ring visibility SHALL bind to the composer's target assignments while the Attack Intent Composer is active, and to `useGameplayStore.attackPlan.targetId` when it is not.

**Priority**: Critical

#### Scenario: Target lock pulses red

- **GIVEN** the composed volley's primary target is unit-42 during the Weapon Attack phase
- **WHEN** the token for unit-42 renders
- **THEN** a red target ring SHALL pulse around the token
- **AND** the ring stroke width SHALL be 3px

#### Scenario: Secondary target carries a distinct encoding

- **GIVEN** a composed volley with weapons assigned to a primary and one secondary target
- **WHEN** the secondary target's token renders
- **THEN** it SHALL carry a secondary encoding visually distinct from the primary ring
- **AND** the distinction SHALL NOT rely on hue alone

#### Scenario: Clearing target removes ring

- **GIVEN** a target ring is visible
- **WHEN** the last weapon assignment on that target is removed
- **THEN** the ring SHALL disappear within a single re-render

#### Scenario: Target ring only in Weapon Attack phase

- **GIVEN** target assignments exist but the phase is Heat
- **WHEN** the token renders
- **THEN** no target ring SHALL be visible

## ADDED Requirements

### Requirement: Attack Intent Map Interaction

While the Attack Intent Composer is active, clicking an enemy token SHALL focus it as the composer's working target (target-first assignment, ADR 0002 D6) — weapon toggles then assign against the focused target — and enemy tokens SHALL carry at-source feasibility visuals for the composing unit — out-of-arc, out-of-range, and no-LOS states rendered with a non-color-redundant encoding and the rules-backed reason available on inspection. Feasibility visuals SHALL recompute live when the composed torso-twist intent changes.

#### Scenario: Enemy click focuses the working target

- **GIVEN** the composer is active and an enemy is in range and arc
- **WHEN** the player clicks the enemy token
- **THEN** the enemy SHALL become the composer's focused working target
- **AND** subsequent weapon toggles SHALL assign against it
- **AND** no attack SHALL be declared by the click itself

#### Scenario: Infeasible enemy shows the reason at source

- **GIVEN** an enemy outside every assigned weapon's arc
- **WHEN** the map renders during composition
- **THEN** the enemy token SHALL carry the infeasible encoding
- **AND** inspection SHALL name the arc restriction
