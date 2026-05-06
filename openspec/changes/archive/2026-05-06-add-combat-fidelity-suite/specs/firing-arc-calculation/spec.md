# Firing Arc Calculation (delta)

## ADDED Requirements

### Requirement: Firing Arc Stamped on Every Attack Event

Every `AttackDeclared` and `AttackResolved` event emitted by `weaponAttack.ts` SHALL carry a `firingArc` field with one of the canonical values `'front' | 'left' | 'right' | 'rear'`. The arc MUST be computed from the attacker's facing and the relative bearing to the target at the moment the attack is declared, using the existing arc utilities in `src/utils/gameplay/firingArc/` (or successor location). Downstream hit-location resolution depends on this field — emitting it incorrectly produces wrong hit-location tables.

#### Scenario: Atlas attacks target directly in front

- **GIVEN** an Atlas at hex (0,0) facing 0 (north)
- **AND** a target at hex (0,-3) (3 hexes north, within front-arc cone)
- **WHEN** the Atlas declares a weapon attack
- **THEN** the emitted `AttackDeclared.firingArc` MUST be `'front'`
- **AND** any resulting `AttackResolved.hitLocation` MUST be drawn from the front-arc 2d6 table at `src/utils/gameplay/hitLocation.ts`

#### Scenario: Locust attacks target directly behind attacker

- **GIVEN** a Locust facing 0 (north)
- **AND** a target at hex (0,3) (3 hexes south, in the rear-arc cone)
- **WHEN** the attack declares
- **THEN** `AttackDeclared.firingArc` MUST be `'rear'`
- **AND** the rear-arc hit-location table MUST be used for resolution

### Requirement: Side Arc Tie-Breaking on Hex Boundaries

When a target lies exactly on the hex boundary between two firing arcs (e.g., the 30°/60° corner between front and side), the firing arc resolution SHALL use a deterministic tie-break rule documented in code: the more restrictive arc wins (front beats side, side beats rear). This rule MUST be the same on every invocation given the same inputs.

#### Scenario: Target on front-side boundary resolves to front

- **GIVEN** an attacker facing 0 (north)
- **AND** a target at the exact hex coordinate where the 60° front-cone boundary intersects the side-cone
- **WHEN** the firing arc is computed
- **THEN** the resolved arc MUST be `'front'` (the more restrictive arc), not `'left'` or `'right'`

### Requirement: Determinism of Firing Arc Computation

Firing arc computation MUST be a pure function of (attacker hex, attacker facing, target hex). It MUST NOT depend on `Math.random`, `Date.now`, mutable global state, or any field outside the input set. Two calls with identical inputs MUST return identical arcs.

#### Scenario: Same inputs produce same arc

- **GIVEN** attacker hex `(0,0)`, facing `2`, target hex `(3,-1)`
- **WHEN** the firing arc function is called twice
- **THEN** both invocations MUST return the same arc value
