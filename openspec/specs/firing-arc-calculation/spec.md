# firing-arc-calculation Specification

## Purpose

Defines firing arc calculations for BattleMech combat. The system determines which firing arc (Front, Left, Right, Rear) a target occupies relative to an attacker's position and facing direction. This specification covers arc determination from hex coordinates, arc-based weapon validation, and arc direction utilities for tactical positioning and hit location table selection.

**Implementation**: `src/utils/gameplay/firingArcs.ts`
## Requirements
### Requirement: Firing Arc Determination from Hex Position

The system SHALL determine the firing arc (Front, Left, Right, Rear) from the attacker's hex position relative to the target's facing.

#### Scenario: Attack from front arc

- **WHEN** the attacker is positioned in a hex that falls within the target's front arc (facing direction ±1 hex-side)
- **THEN** the firing arc SHALL be `FiringArc.Front`
- **AND** the front hit location table SHALL be used

#### Scenario: Attack from left arc

- **WHEN** the attacker is positioned in a hex that falls within the target's left arc (facing +2 hex-side)
- **THEN** the firing arc SHALL be `FiringArc.Left`
- **AND** the left side hit location table SHALL be used

#### Scenario: Attack from right arc

- **WHEN** the attacker is positioned in a hex that falls within the target's right arc (facing -2 hex-side)
- **THEN** the firing arc SHALL be `FiringArc.Right`
- **AND** the right side hit location table SHALL be used

#### Scenario: Attack from rear arc

- **WHEN** the attacker is positioned in a hex that falls within the target's rear arc (facing +3 hex-side, directly behind)
- **THEN** the firing arc SHALL be `FiringArc.Rear`
- **AND** the rear hit location table SHALL be used (hits rear armor)

### Requirement: Hex Coordinate Arc Calculation

The system SHALL use hex coordinate math to determine the relative angle from the target to the attacker and map it to a firing arc.

#### Scenario: Arc calculation using hex coordinates

- **WHEN** the target is at hex (5, 5) facing direction 0 (north) and the attacker is at hex (5, 3)
- **THEN** the relative angle SHALL map to front arc
- **AND** the FiringArc.Front SHALL be returned

#### Scenario: Arc boundary handling

- **WHEN** the attacker is positioned exactly on the boundary between two arcs
- **THEN** the system SHALL resolve the boundary consistently (front arc takes precedence on front boundaries)

### Requirement: FiringArc Enum

The system SHALL return a `FiringArc` enum value from the arc calculation.

#### Scenario: FiringArc enum values

- **WHEN** computing a firing arc
- **THEN** the result SHALL be one of: Front, Left, Right, or Rear

### Requirement: Firing Arc Used by Hit Location Tables

The computed firing arc SHALL be used to select the correct hit location table column.

#### Scenario: Front arc uses front table

- **WHEN** the firing arc is Front and a hit is scored
- **THEN** the front column of the 2d6 hit location table SHALL be used

#### Scenario: Rear arc uses rear table

- **WHEN** the firing arc is Rear and a hit is scored
- **THEN** the rear column SHALL be used and hits SHALL apply to rear armor

#### Scenario: Side arc uses side table

- **WHEN** the firing arc is Left and a hit is scored
- **THEN** the left side column SHALL be used (left-side locations more probable)

### Requirement: Torso Twist Arc Extension

Torso twist SHALL extend the front arc by one hex-side in the twist direction.

#### Scenario: Torso twisted left extends front arc

- **WHEN** a unit has twisted its torso to the left
- **THEN** the front arc for that unit's attacks SHALL extend one hex-side to the left
- **AND** the rear arc SHALL shift accordingly

#### Scenario: Torso twist affects attacker's weapon arcs

- **WHEN** a unit with torso twist fires weapons
- **THEN** arm-mounted weapons SHALL use the twisted front arc
- **AND** torso-mounted weapons SHALL use the twisted front arc
- **AND** rear-mounted weapons SHALL use the twisted rear arc

### Requirement: Arc Direction Utilities

The system SHALL provide utility functions to get the hex directions that correspond to each firing arc.

#### Scenario: Get front arc directions

- **WHEN** calling `getFrontArcDirections(facing)` with facing = 0
- **THEN** the result SHALL be an array of 3 Facing values: [5, 0, 1]
- **AND** these represent the three hex directions in the front arc

#### Scenario: Get rear arc directions

- **WHEN** calling `getRearArcDirections(facing)` with facing = 0
- **THEN** the result SHALL be an array of 3 Facing values: [2, 3, 4]
- **AND** these represent the three hex directions in the rear arc

#### Scenario: Get left side direction

- **WHEN** calling `getLeftArcDirection(facing)` with facing = 0
- **THEN** the result SHALL be Facing value 2
- **AND** this represents the left side direction relative to facing

#### Scenario: Get right side direction

- **WHEN** calling `getRightArcDirection(facing)` with facing = 0
- **THEN** the result SHALL be Facing value 4
- **AND** this represents the right side direction relative to facing

### Requirement: Arc Hexes Enumeration

The system SHALL provide a function to enumerate all hexes within a specific arc at a given range.

#### Scenario: Get all hexes in front arc

- **WHEN** calling `getArcHexes(center, facing, FiringArc.Front, maxRange)` with center = (0, 0), facing = 0, maxRange = 2
- **THEN** the result SHALL be an array of IHexCoordinate values
- **AND** all returned hexes SHALL be within maxRange distance from center
- **AND** all returned hexes SHALL fall within the front arc relative to facing
- **AND** the center hex SHALL NOT be included

#### Scenario: Get all hexes in rear arc

- **WHEN** calling `getArcHexes(center, facing, FiringArc.Rear, maxRange)` with center = (0, 0), facing = 0, maxRange = 2
- **THEN** the result SHALL be an array of IHexCoordinate values
- **AND** all returned hexes SHALL fall within the rear arc relative to facing

#### Scenario: Get all hexes in left side arc

- **WHEN** calling `getArcHexes(center, facing, FiringArc.Left, maxRange)` with center = (0, 0), facing = 0, maxRange = 2
- **THEN** the result SHALL be an array of IHexCoordinate values
- **AND** all returned hexes SHALL fall within the left side arc relative to facing

#### Scenario: Get all hexes in right side arc

- **WHEN** calling `getArcHexes(center, facing, FiringArc.Right, maxRange)` with center = (0, 0), facing = 0, maxRange = 2
- **THEN** the result SHALL be an array of IHexCoordinate values
- **AND** all returned hexes SHALL fall within the right side arc relative to facing

### Requirement: Replace Hardcoded FiringArc.Front

The system SHALL compute firing arc from actual positions instead of using the hardcoded `FiringArc.Front` default.

#### Scenario: All attacks use computed arc

- **WHEN** any weapon attack is resolved
- **THEN** the firing arc SHALL be computed from attacker position and target facing
- **AND** `FiringArc.Front` SHALL NOT be assumed as a default

### Requirement: Vehicle Firing Arcs

The firing-arc calculator SHALL compute vehicle arcs from facing and turret state.

#### Scenario: Ground vehicle Front arc

- **GIVEN** a tracked combat vehicle facing north
- **WHEN** firing arc is computed for the Front location
- **THEN** the arc SHALL be a 60° wedge centered on north

#### Scenario: Ground vehicle Side arcs

- **GIVEN** the same vehicle
- **WHEN** firing arcs are computed for Left Side and Right Side
- **THEN** each arc SHALL span 120°
- **AND** together with Front (60°) and Rear (60°) SHALL cover the full 360°

#### Scenario: Turret arc overrides chassis facing

- **GIVEN** a vehicle with an unlocked Single turret
- **WHEN** firing arc is computed for the Turret location
- **THEN** the arc SHALL be 360° and independent of chassis facing

#### Scenario: Locked turret reverts to Front arc

- **GIVEN** a vehicle whose turret has taken a Turret Locked critical
- **WHEN** firing arc is computed for turret weapons
- **THEN** the arc SHALL be the chassis Front arc only

#### Scenario: Sponson forward-side arc

- **GIVEN** a vehicle with a left sponson turret
- **WHEN** firing arc is computed for that sponson
- **THEN** the arc SHALL be the 180° left-front hemisphere only

### Requirement: Vehicle Chin Turret Pivot Penalty

When a ground vehicle fires a weapon mounted in a chin turret, and the turret has pivoted from its previous facing during the same turn, the to-hit calculation SHALL apply a +1 to-hit modifier (equivalent to a −1 effective gunnery skill) to that weapon attack.

This requirement closes a half-implemented item from archived `add-vehicle-combat-behavior` task 9.3. The 360° chin-turret arc shipped in that change; the pivot-penalty modifier was deferred without a pickup task. Per the Tier 5 audit, the penalty is small in scope and the rule is canonical (mirrors MegaMek `Tank.java` chin-turret handling), so it is being landed rather than de-scoped.

#### Scenario: Chin-turret weapon fires after pivoting in same turn

- **WHEN** a ground vehicle's chin turret pivoted from facing N to facing N+1 during the current turn
- **AND** a weapon mounted in that chin turret fires at a target within the (now-current) firing arc
- **THEN** the to-hit calculation includes a `+1` modifier with attribution `chin-turret-pivot`
- **AND** the resulting modified to-hit number reflects the penalty in the modifier breakdown

#### Scenario: Chin-turret weapon fires without pivoting

- **WHEN** a ground vehicle's chin turret has not pivoted during the current turn
- **AND** a weapon mounted in that chin turret fires at a target within the firing arc
- **THEN** the to-hit calculation does NOT include the chin-turret-pivot modifier

#### Scenario: Non-chin-turret weapon unaffected by chin-turret pivot

- **WHEN** a ground vehicle's chin turret pivoted during the current turn
- **AND** a weapon mounted in a body or sponson location fires
- **THEN** the to-hit calculation for the body/sponson weapon does NOT include the chin-turret-pivot modifier

### Requirement: Per-Hex Arc Classification For UI

The firing arc system SHALL expose a per-hex classifier that returns
`front | left-side | right-side | rear | out-of-arc` so the UI can
shade a unit's arcs without reimplementing the arc math.

#### Scenario: Arc classifier returns front for forward wedge

- **GIVEN** a unit at position (0,0) facing 0 (north)
- **WHEN** classifying the hex directly in front
- **THEN** the classifier SHALL return `front`

#### Scenario: Arc classifier returns rear for opposite wedge

- **GIVEN** a unit facing 0
- **WHEN** classifying a hex in the rear 180-degree wedge
- **THEN** the classifier SHALL return `rear`

#### Scenario: Side arcs distinguish left from right

- **GIVEN** a unit facing 0
- **WHEN** classifying a hex to the unit's left side
- **THEN** the classifier SHALL return `left-side`
- **AND** a hex to the right SHALL return `right-side`

#### Scenario: Out-of-map hex returns out-of-arc

- **GIVEN** a target hex outside map bounds
- **WHEN** classifying
- **THEN** the classifier SHALL return `out-of-arc`

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

### Requirement: Firing Arc Overlay Label Density Bound

The firing-arc overlay SHALL bound the number of per-hex text labels it stamps:
it SHALL render an arc text label only on a bounded representative or boundary
subset of each arc (or as a single per-arc legend entry), not on every in-arc
hex out to weapon maximum range, and SHALL suppress per-hex text labels below a
configured zoom threshold in favor of the arc legend. The bound SHALL NOT change
firing-arc classification, arc legality, hit-location selection, or the per-hex
arc fill and shape area shading — those SHALL continue to be applied to every
in-arc hex exactly as before.

#### Scenario: Long-range wide arc stamps a bounded label count

- **GIVEN** a unit with a weapon whose maximum range classifies several hundred
  hexes in a single arc (for example a 120-degree arc at range 18 to 23)
- **WHEN** the firing-arc overlay renders that arc
- **THEN** the number of per-hex arc text labels SHALL be bounded by a small
  per-arc constant rather than one label per in-arc hex
- **AND** the arc fill and arc shape SHALL still render on every in-arc hex.

#### Scenario: Labels suppressed when zoomed out

- **GIVEN** the firing-arc overlay is visible
- **WHEN** the map zoom is below the configured label-visibility threshold
- **THEN** the overlay SHALL suppress per-hex arc text labels
- **AND** the arc legend SHALL remain available as the arc reference
- **AND** the arc fill and shape SHALL still convey each arc's area.

#### Scenario: Label thinning does not change arc classification

- **GIVEN** the set of hexes classified into each firing arc for a unit
- **WHEN** the overlay thins its text labels to the bounded representative set
- **THEN** the hexes classified into Front, Left, Right, Rear, and out-of-arc
  SHALL be identical to the classification before the label thinning
- **AND** the firing arc used for hit-location selection SHALL be unchanged.

