# Hull-Down Position Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: to-hit-resolution, combat-resolution
**Affects**: to-hit-resolution, combat-resolution

---

## Overview

### Purpose

Defines the hull-down defensive position for BattleMechs, where a mech uses terrain (typically a hill or ridge) to shield its lower body. Hull-down grants partial cover (+1 to-hit modifier) and prevents front-arc leg hits by re-rolling them to center torso. This specification covers entry conditions, combat modifiers, hit location modification, firing restrictions, and exiting the position.

### Scope

**In Scope:**

- Hull-down entry conditions (terrain requirements, deliberate action)
- To-hit modifier for attacks against hull-down targets (+1 partial cover)
- Hit location modification (front-arc leg hits re-roll to center torso)
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
- **Partial Cover**: +1 to-hit modifier applied to attacks against a hull-down target, stacking with existing partial cover rules
- **Leg Hit Re-roll**: When a front-arc attack would hit a leg location, the hit is re-rolled to center torso instead
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

The system SHALL apply a +1 to-hit modifier (partial cover) to all attacks against a hull-down target, representing the reduced target profile.

**Rationale**: A hull-down mech exposes less of its body, making it harder to hit — equivalent to partial cover per TotalWarfare.

**Priority**: Critical

#### Scenario: Attack against hull-down target gets +1 modifier

- **GIVEN** a target BattleMech is in hull-down position
- **WHEN** an attacker makes a weapon attack against the hull-down target
- **THEN** the to-hit calculation SHALL include a +1 hull-down modifier
- **AND** the modifier source SHALL be 'terrain'
- **AND** the modifier name SHALL be 'Hull-Down (Partial Cover)'

#### Scenario: Hull-down modifier stacks with other modifiers

- **GIVEN** a target is hull-down and the attacker has gunnery 4, fires at medium range while walking
- **WHEN** calculating the to-hit number
- **THEN** the final to-hit SHALL include the +1 hull-down modifier in addition to all other applicable modifiers
- **AND** the result SHALL be 4 (gunnery) + 2 (medium range) + 1 (walking) + 1 (hull-down) = 8

#### Scenario: Hull-down and existing partial cover do not double-stack

- **GIVEN** a target is hull-down AND also has partial cover from terrain
- **WHEN** calculating to-hit modifiers
- **THEN** the hull-down partial cover SHALL replace (not stack with) the terrain partial cover
- **AND** only +1 total partial cover modifier SHALL be applied

---

### Requirement: Hull-Down Hit Location Modification

The system SHALL re-roll front-arc leg hits to center torso when the target is hull-down, reflecting the shielded lower body.

**Rationale**: Hull-down position physically shields the mech's legs from frontal fire; hits that would strike the legs instead impact the exposed torso.

**Priority**: Critical

#### Scenario: Front-arc leg hit re-rolled to center torso

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
   * and re-rolls front-arc leg hits to center torso.
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

- **to-hit-resolution**: Hull-down adds a +1 partial cover modifier to the to-hit pipeline
- **combat-resolution**: Hit location modification for front-arc leg hits

---

## Implementation Notes

### Modifier Integration

The hull-down to-hit modifier integrates with the existing `calculatePartialCoverModifier()` function in `src/utils/gameplay/toHit.ts`. When a target is hull-down, it is treated as having partial cover. If the target already has `partialCover: true` from terrain, the hull-down does not add an additional +1 (partial cover is not cumulative from multiple sources — only +1 total).

### Hit Location Integration

The leg hit re-roll integrates into `determineHitLocationFromRoll()` in `src/utils/gameplay/hitLocation.ts`. After the standard table lookup, if the target is hull-down AND the arc is Front AND the location is a leg, the location is changed to `center_torso`.

### Performance Considerations

- Hull-down check is a simple boolean — O(1) per attack
- Leg hit re-roll is a conditional check after table lookup — no additional dice roll needed
- No new data structures required; extends existing `ITargetState`

### Edge Cases

- **Hull-down + Partial cover from terrain**: Only +1 total (not cumulative)
- **Hull-down from rear arc**: Leg hits are NOT re-rolled (only front arc is protected)
- **Hull-down + prone**: Mutually exclusive states
- **Cluster weapons vs hull-down**: Each individual hit checks hull-down leg re-roll separately

---

## Examples

### Example 1: Attack Against Hull-Down Target

```typescript
const target: ITargetState = {
  movementType: MovementType.Stationary,
  hexesMoved: 0,
  prone: false,
  immobile: false,
  partialCover: false, // hull-down provides its own partial cover
  hullDown: true,
};

// To-hit calculation includes +1 hull-down modifier
// Gunnery 4 + Short range 0 + Stationary 0 + Hull-down +1 = 5
```

### Example 2: Front-Arc Leg Hit Re-roll

```typescript
// Attack from front arc, target is hull-down
// Roll: 5 → normally 'right_leg' from FRONT_HIT_LOCATION_TABLE
// Hull-down: re-roll to 'center_torso'

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
