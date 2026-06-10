# Hull-Down Position Specification

**Status**: Active
**Version**: 1.1
**Last Updated**: 2026-05-24
**Dependencies**: to-hit-resolution, combat-resolution
**Affects**: to-hit-resolution, combat-resolution

---

## Overview

### Purpose

Defines the hull-down defensive position for BattleMechs, where a mech uses terrain (typically a hill or ridge) to shield its lower body. Hull-down grants a source-backed +2 to-hit modifier and prevents front-arc leg hits by redirecting them to center torso. This specification covers entry conditions, combat modifiers, hit location modification, firing restrictions, and exiting the position.

### Scope

**In Scope:**

- Hull-down entry conditions (terrain requirements, deliberate action)
- To-hit modifier for attacks against hull-down targets (+2)
- Hit location modification (front-arc leg hits redirect to center torso)
- Firing restrictions while hull-down
- Exiting hull-down position (movement action)
- Hull-down state tracking on unit combat state

**Out of Scope:**

- Vehicle hull-down rules (future: requires vehicle combat spec)
- Terrain system definition (see terrain-system spec)
- Prone position rules (separate mechanic)
- Partial cover from other sources (terrain, buildings — see to-hit-resolution)
- Physical attacks while hull-down

### Key Concepts

- **Hull-Down Position**: A defensive stance where a mech uses elevation or terrain to shield its legs from frontal attacks
- **Hull-Down Cover**: +2 to-hit modifier applied to attacks against a hull-down target, replacing normal terrain partial cover for the attack
- **Leg Hit Redirect**: When a front-arc attack would hit a leg location, the hit is redirected to center torso instead
- **Deliberate Action**: Entering hull-down requires spending movement phase action (the mech does not move)

---
## Requirements
### Requirement: Hull-Down Entry Conditions

The system SHALL allow a BattleMech to enter hull-down position as a deliberate action during the movement phase, provided the mech occupies a hex with suitable terrain (hill crest, ridge, or elevation change providing lower-body cover).

**Rationale**: Hull-down is a tactical choice requiring specific terrain; it cannot be used on flat ground.

**Priority**: High

#### Scenario: Mech enters hull-down on hill crest

- **GIVEN** a BattleMech occupies a hex at the edge of an elevation change (hill crest)
- **WHEN** the pilot chooses to enter hull-down during the movement phase
- **THEN** the mech SHALL be marked as hull-down
- **AND** the mech SHALL not move this turn (stationary)

#### Scenario: Mech cannot enter hull-down on flat terrain

- **GIVEN** a BattleMech occupies a flat hex with no elevation change
- **WHEN** the pilot attempts to enter hull-down
- **THEN** the system SHALL reject the action
- **AND** the mech SHALL NOT be marked as hull-down

#### Scenario: Hull-down via deployment option

- **GIVEN** a scenario with hull-down deployment enabled
- **WHEN** a defending unit is deployed
- **THEN** the unit MAY begin the game in hull-down position at a valid terrain hex

---

### Requirement: Hull-Down To-Hit Modifier

The system SHALL apply the MegaMek-backed hull-down target modifier to
represented Mek-style targets when the target is hull-down and LOS or terrain
cover is present.

#### Scenario: Covered hull-down target gets MegaMek modifier

- **GIVEN** a represented target is hull-down
- **AND** the attack LOS or target terrain grants partial cover
- **WHEN** an attacker previews or declares a weapon attack against that target
- **THEN** the to-hit calculation SHALL include a `Hull Down` terrain modifier
  of `+2`
- **AND** the modifier SHALL be separate from the represented partial-cover
  modifier already carried by the cover projection.

#### Scenario: Hull-down without cover does not add target modifier

- **GIVEN** a represented target is hull-down
- **AND** the attack LOS and target terrain do not provide cover
- **WHEN** an attacker previews or declares a weapon attack against that target
- **THEN** the to-hit calculation SHALL NOT add the `Hull Down` modifier.

### Requirement: Hull-Down Hit Location Modification

The system SHALL redirect front-arc leg hits to center torso when the target is hull-down, reflecting the shielded lower body.

**Rationale**: Hull-down position physically shields the mech's legs from frontal fire; hits that would strike the legs instead impact the exposed torso.

**Priority**: Critical

#### Scenario: Front-arc leg hit redirected to center torso

- **GIVEN** a target BattleMech is in hull-down position
- **AND** an attack from the front arc hits
- **WHEN** the hit location roll results in 'left_leg' or 'right_leg'
- **THEN** the hit location SHALL be changed to 'center_torso'
- **AND** the result SHALL indicate the original roll was modified due to hull-down

#### Scenario: Front-arc non-leg hits unaffected

- **GIVEN** a target BattleMech is in hull-down position
- **AND** an attack from the front arc hits
- **WHEN** the hit location roll results in 'center_torso', 'left_torso', 'right_torso', 'left_arm', 'right_arm', or 'head'
- **THEN** the hit location SHALL NOT be modified
- **AND** the original rolled location SHALL be used

#### Scenario: Side and rear arc leg hits not affected

- **GIVEN** a target BattleMech is in hull-down position
- **AND** an attack from the left, right, or rear arc hits
- **WHEN** the hit location roll results in a leg location
- **THEN** the hit location SHALL NOT be modified
- **AND** the leg hit SHALL apply normally

#### Scenario: Snake-eyes (roll of 2) front-arc still goes to CT

- **GIVEN** a target BattleMech is in hull-down position
- **AND** a front-arc attack rolls 2 on 2d6
- **THEN** the hit location SHALL be 'center_torso' (which is already the table result for roll 2)
- **AND** the hit SHALL be marked as critical

---

### Requirement: Firing Restrictions While Hull-Down

The system SHALL restrict weapon fire for a hull-down mech: arm-mounted and torso-mounted weapons in the upper body MAY fire, but the mech cannot use leg-mounted weapons or make physical attacks.

**Rationale**: A hull-down mech has its lower body behind cover; it can still fire weapons from exposed locations but cannot kick or use leg equipment.

**Priority**: Medium

#### Scenario: Hull-down mech can fire torso and arm weapons

- **GIVEN** a BattleMech is in hull-down position
- **AND** the mech has weapons mounted in arms and torsos
- **WHEN** the mech declares weapon attacks
- **THEN** arm-mounted and torso-mounted weapons SHALL be allowed to fire

#### Scenario: Hull-down mech cannot fire leg-mounted weapons

- **GIVEN** a BattleMech is in hull-down position
- **AND** the mech has a weapon mounted in a leg location
- **WHEN** the mech attempts to fire that leg-mounted weapon
- **THEN** the system SHALL prevent the attack
- **AND** an appropriate error message SHALL be displayed

---

### Requirement: Exiting Hull-Down Position

The system SHALL allow a hull-down mech to exit the position by spending a movement action. The mech stands up from hull-down at the start of its movement phase and may then move normally.

**Rationale**: Hull-down is voluntary; the pilot can choose to leave cover and maneuver.

**Priority**: High

#### Scenario: Mech exits hull-down by moving

- **GIVEN** a BattleMech is in hull-down position
- **WHEN** the pilot chooses to move during the movement phase
- **THEN** the mech SHALL exit hull-down position
- **AND** the mech SHALL be able to move normally (walk, run, or jump)
- **AND** the hull-down state SHALL be removed

#### Scenario: Mech remains hull-down if no movement declared

- **GIVEN** a BattleMech is in hull-down position
- **WHEN** the pilot chooses not to move during the movement phase
- **THEN** the mech SHALL remain in hull-down position
- **AND** hull-down modifiers SHALL continue to apply

---

### Requirement: Hull-Down Firing Restrictions

The system SHALL prevent represented hull-down vehicle attackers from firing
direct front-mounted weapons while preserving MegaMek's indirect-fire exception.

#### Scenario: Hull-down vehicle cannot directly fire front-mounted weapon

- **GIVEN** a represented vehicle attacker is hull-down
- **AND** the attacker has a front-mounted weapon
- **AND** the attack is not declared as indirect fire
- **WHEN** the player previews or declares a weapon attack with that weapon
- **THEN** the weapon option SHALL be marked unavailable
- **AND** the blocked reason SHALL explain that hull-down vehicle front-mounted
  weapons are blocked by terrain
- **AND** a commit containing only blocked front-mounted direct weapons SHALL
  emit an invalid attack before declaration.

#### Scenario: Hull-down vehicle can still fire front-mounted weapon indirectly

- **GIVEN** a represented vehicle attacker is hull-down
- **AND** the attacker has an indirect-fire-capable front-mounted weapon
- **WHEN** the weapon is declared in indirect mode
- **THEN** the hull-down front-mount restriction SHALL NOT block that weapon.

### Requirement: Hull-Down Physical Attack Restrictions

The system SHALL prevent a represented hull-down attacker from making a kick
attack and SHALL expose the restriction in physical attack projections before
commit.

#### Scenario: Hull-down attacker cannot kick

- **GIVEN** a represented attacker is hull-down
- **AND** an adjacent target is selected
- **WHEN** the map projects physical attack options
- **THEN** kick options SHALL be marked ineligible
- **AND** the restriction reason SHALL explain that the attacker is hull-down.

### Requirement: Standing Mek Hull-Down Entry Legality

The system SHALL treat represented standing Mek-style hull-down entry as a
movement posture action gated by Mek-style movement, sufficient entry MP, and
a non-destroyed gyro before the hull-down state is applied.

#### Scenario: Standing Mek entry sets hull-down state

- **GIVEN** a represented standing Mek-style unit is not already hull-down
- **AND** the unit has enough walk MP for the standing hull-down entry cost
- **AND** the unit does not have a destroyed gyro
- **WHEN** the unit commits the Hull Down movement action
- **THEN** the unit SHALL become hull-down
- **AND** the unit SHALL remain not prone.

#### Scenario: Blocked entry leaves posture unchanged

- **GIVEN** a represented unit is prone, already hull-down, non-Mek-style,
  lacks enough walk MP, or has a destroyed gyro
- **WHEN** the unit attempts the Hull Down movement action
- **THEN** the action SHALL be rejected with a player-facing reason
- **AND** the unit's prone and hull-down posture flags SHALL remain unchanged.

## Data Model Requirements

### Required Interfaces

The implementation MUST extend the existing `ITargetState` interface to include hull-down tracking:

```typescript
/**
 * Extension to ITargetState for hull-down position.
 */
interface ITargetState {
  // ... existing properties ...

  /**
   * Whether the target is in hull-down position.
   * When true, applies +1 partial cover to-hit modifier
   * and redirects front-arc leg hits to center torso.
   * @default false
   */
  readonly hullDown?: boolean;
}
```

### Required Properties

| Property   | Type      | Required | Description                    | Valid Values    | Default |
| ---------- | --------- | -------- | ------------------------------ | --------------- | ------- |
| `hullDown` | `boolean` | No       | Whether target is in hull-down | `true`, `false` | `false` |

### Type Constraints

- `hullDown` MUST default to `false` when not specified
- `hullDown` MUST be `false` when the mech is prone (mutually exclusive)
- `hullDown` MUST be `false` when the mech is not on valid hull-down terrain

---

## Validation Rules

### Validation: Hull-Down Terrain Check

**Rule**: A mech can only enter hull-down if occupying a hex with suitable terrain (elevation change).

**Severity**: Error

**Error Message**: "Cannot enter hull-down: hex does not have suitable terrain (requires elevation change or hill crest)"

**User Action**: Move the mech to a hex with appropriate terrain before entering hull-down.

### Validation: Hull-Down Prone Mutual Exclusion

**Rule**: A mech cannot be both hull-down and prone simultaneously.

**Severity**: Error

**Error Message**: "Cannot enter hull-down while prone"

**User Action**: Stand up before entering hull-down position.

---

## Dependencies

### Depends On

- **to-hit-resolution**: Partial cover modifier system and modifier aggregation pipeline
- **combat-resolution**: Attack resolution flow where hull-down modifiers are applied
- **terrain-system**: Terrain hex data for determining hull-down eligibility

### Used By

- **to-hit-resolution**: Hull-down adds a +2 terrain modifier to the to-hit pipeline
- **combat-resolution**: Hit location modification for front-arc leg hits

---

## Implementation Notes

### Modifier Integration

The hull-down to-hit modifier integrates with the existing `calculateHullDownModifier()` function in `src/utils/gameplay/toHit.ts`. When a target is hull-down, the normal partial-cover modifier is suppressed and the source-backed +2 hull-down terrain modifier is applied instead.

### Hit Location Integration

The leg hit redirect integrates into `determineHitLocationFromRoll()` in `src/utils/gameplay/hitLocation.ts`. After the standard table lookup, if the target is hull-down AND the arc is Front AND the location is a leg, the location is changed to `center_torso`.

### Performance Considerations

- Hull-down check is a simple boolean — O(1) per attack
- Leg hit redirect is a conditional check after table lookup; no additional dice roll is needed
- No new data structures required; extends existing `ITargetState`

### Edge Cases

- **Hull-down + Partial cover from terrain**: Only +2 hull-down total (not cumulative)
- **Hull-down from rear arc**: Leg hits are NOT redirected (only front arc is protected)
- **Hull-down + prone**: Mutually exclusive states
- **Cluster weapons vs hull-down**: Each individual hit checks hull-down leg redirect separately

---

## Examples

### Example 1: Attack Against Hull-Down Target

```typescript
const target: ITargetState = {
  movementType: MovementType.Stationary,
  hexesMoved: 0,
  prone: false,
  immobile: false,
  partialCover: false, // hull-down provides its own terrain modifier
  hullDown: true,
};

// To-hit calculation includes +2 hull-down modifier
// Gunnery 4 + Short range 0 + Stationary 0 + Hull-down +2 = 6
```

### Example 2: Front-Arc Leg Hit Re-roll

```typescript
// Attack from front arc, target is hull-down
// Roll: 5 → normally 'right_leg' from FRONT_HIT_LOCATION_TABLE
// Hull-down: redirect to 'center_torso'

const result = determineHitLocationFromRoll(FiringArc.Front, roll, {
  hullDown: true,
});
// result.location === 'center_torso' (not 'right_leg')
```

### Example 3: Side-Arc Leg Hit Not Affected

```typescript
// Attack from left arc, target is hull-down
// Roll: 3 → 'left_leg' from LEFT_HIT_LOCATION_TABLE
// Hull-down does NOT affect side/rear arcs

const result = determineHitLocationFromRoll(FiringArc.Left, roll, {
  hullDown: true,
});
// result.location === 'left_leg' (unchanged)
```

---

## References

### Official BattleTech Rules

- **TotalWarfare**: Hull-down position rules (p. 55-56)
- **TechManual**: Defensive positions and terrain usage

### Related Documentation

- `openspec/specs/to-hit-resolution/spec.md` — Partial cover modifier (+1)
- `src/utils/gameplay/toHit.ts:299-312` — `calculatePartialCoverModifier()` implementation
- `src/utils/gameplay/hitLocation.ts:142-166` — `determineHitLocation()` / `determineHitLocationFromRoll()`
- `src/types/gameplay/CombatInterfaces.ts:597-607` — `ITargetState` interface
- `src/constants/scenario/templates.ts:171` — Hull-down deployment flag

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Covers mech hull-down only (vehicle hull-down deferred to future spec)
