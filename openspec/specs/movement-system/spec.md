# movement-system Specification

## Purpose

TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.

## Requirements

### Requirement: Walk/Run MP Calculation

Movement points SHALL be calculated from engine rating and tonnage.

#### Scenario: Walk MP

- **WHEN** calculating walk MP
- **THEN** walkMP = floor(engineRating / tonnage)
- **AND** minimum walk MP = 1

#### Scenario: Run MP

- **WHEN** calculating run MP
- **THEN** runMP = floor(walkMP × 1.5)

### Requirement: Jump Jets

The system SHALL support 8 jump jet types.

#### Scenario: Standard jump jets

- **WHEN** using standard jump jets
- **THEN** jump MP = number of jump jets
- **AND** jump jets SHALL not exceed walk MP
- **AND** weight varies by tonnage class

### Requirement: Movement Enhancements

The system SHALL support MASC, TSM, Supercharger, and Partial Wing with accurate variable calculations using the `EquipmentCalculatorService`.

#### Scenario: MASC weight calculation (IS)

- **WHEN** calculating Inner Sphere MASC weight
- **THEN** weight = round(tonnage / 20) to nearest whole ton
- **AND** criticalSlots = weight
- **AND** cost = tonnage × 1000 C-Bills
- **AND** example: 85t mech = 4 tons (4.25 rounds to 4), 90t mech = 5 tons (4.5 rounds to 5)
- **AND** calculation SHALL use `EquipmentCalculatorService.calculateProperties('masc-is', context)`

#### Scenario: MASC weight calculation (Clan)

- **WHEN** calculating Clan MASC weight
- **THEN** weight = round(tonnage / 25) to nearest whole ton
- **AND** criticalSlots = weight
- **AND** cost = tonnage × 1000 C-Bills
- **AND** calculation SHALL use `EquipmentCalculatorService.calculateProperties('masc-clan', context)`

#### Scenario: Supercharger weight calculation

- **WHEN** calculating Supercharger weight
- **THEN** weight = ceil(engineWeight / 10) rounded to 0.5 tons
- **AND** criticalSlots = 1 (fixed, does not vary)
- **AND** cost = engineWeight × 10000 C-Bills
- **AND** calculation SHALL use `EquipmentCalculatorService.calculateProperties('supercharger', context)`

#### Scenario: Supercharger placement restrictions

- **WHEN** placing Supercharger on mech
- **THEN** Supercharger MUST be adjacent to engine
- **AND** Supercharger MUST be in torso location

#### Scenario: Partial Wing weight calculation

- **WHEN** calculating Partial Wing weight
- **THEN** weight = mechTonnage × 0.05 rounded to 0.5 tons
- **AND** criticalSlots = 3 per side torso (6 total)
- **AND** cost = weight × 50000 C-Bills

#### Scenario: TSM cost calculation

- **WHEN** calculating Triple Strength Myomer cost
- **THEN** cost = mechTonnage × 16000 C-Bills
- **AND** weight = 0 (replaces standard myomer)
- **AND** criticalSlots = 6 distributed across torso/legs

#### Scenario: Enhancement recalculation on engine change

- **WHEN** engine rating or engine type changes
- **AND** MASC or Supercharger is equipped
- **THEN** enhancement weight and slots SHALL be recalculated
- **AND** equipment instances SHALL be updated with new values

### Requirement: Variable Equipment Context

The system SHALL provide calculation context for variable equipment.

#### Scenario: Context availability

- **WHEN** calculating variable equipment properties
- **THEN** context SHALL provide mechTonnage
- **AND** context SHALL provide engineRating
- **AND** context SHALL provide engineWeight
- **AND** context SHALL provide directFireWeaponTonnage

### Requirement: Heat MP Reduction

Heat SHALL reduce available movement points using the formula `floor(heat / 5)`.

#### Scenario: Heat 9 reduces MP by 1

- **WHEN** a unit has heat level 9
- **THEN** available walking and running MP SHALL be reduced by `floor(9 / 5) = 1`

#### Scenario: Heat 15 reduces MP by 3

- **WHEN** a unit has heat level 15
- **THEN** available walking and running MP SHALL be reduced by `floor(15 / 5) = 3`

#### Scenario: Heat does not reduce MP below 0

- **WHEN** a unit with Walk 2 has heat level 15 (reduction of 3)
- **THEN** available Walk MP SHALL be 0 (not negative)
- **AND** the unit SHALL be unable to walk or run

### Requirement: Terrain PSR Triggers

The movement system SHALL trigger piloting skill rolls when entering specific terrain types.

#### Scenario: Entering rubble triggers PSR

- **WHEN** a unit enters a rubble hex during movement
- **THEN** a PSR SHALL be triggered

#### Scenario: Running through rough terrain triggers PSR

- **WHEN** a unit running enters a rough terrain hex
- **THEN** a PSR SHALL be triggered

#### Scenario: Entering water triggers PSR

- **WHEN** a unit enters a water hex (depth 1+) during movement
- **THEN** a PSR SHALL be triggered

#### Scenario: Exiting water triggers PSR

- **WHEN** a unit exits a water hex (depth 1+) during movement
- **THEN** a PSR SHALL be triggered

### Requirement: Prone/Standing-Up Movement Costs

Standing up from prone SHALL cost the unit's full walking MP and require a successful PSR.

#### Scenario: Standing up costs full walking MP

- **WHEN** a prone unit attempts to stand up in the movement phase
- **THEN** standing up SHALL cost the entire walking MP allotment
- **AND** the unit SHALL NOT move further that turn after standing

#### Scenario: Standing up requires PSR

- **WHEN** a prone unit attempts to stand up
- **THEN** a PSR SHALL be required
- **AND** failure SHALL leave the unit prone (MP still expended)

#### Scenario: Prone unit crawling

- **WHEN** a prone unit does not stand up
- **THEN** the unit SHALL be able to crawl at 1 MP per hex
- **AND** the unit SHALL remain prone while crawling

### Requirement: Shutdown Prevents Movement

A shutdown unit SHALL be unable to move during the movement phase.

#### Scenario: Shutdown unit cannot move

- **WHEN** a unit is in shutdown state during the movement phase
- **THEN** the unit SHALL NOT be permitted to move
- **AND** the unit SHALL skip the movement phase entirely

#### Scenario: Shutdown unit remains in place

- **WHEN** a shutdown unit's movement phase begins
- **THEN** the unit SHALL remain in its current hex
- **AND** movement type SHALL be set to "Stationary"

### Requirement: Movement Calculations Hook

The system SHALL provide a React hook for deriving movement statistics from unit configuration.

**Source**: `src/hooks/useMovementCalculations.ts:131-193`

#### Scenario: Compute Walk/Run MP from engine rating and tonnage

- **GIVEN** a unit with tonnage 50 and engine rating 200
- **WHEN** useMovementCalculations is called
- **THEN** walkMP SHALL be 4 (floor(200 / 50))
- **AND** runMP SHALL be 6 (ceil(4 × 1.5))

#### Scenario: Compute valid Walk MP range from tonnage

- **GIVEN** a unit with tonnage 50
- **WHEN** useMovementCalculations is called
- **THEN** walkMPRange.min SHALL be 1 (ceil(10 / 50) = 1)
- **AND** walkMPRange.max SHALL be 8 (floor(400 / 50) = 8)

#### Scenario: Compute max Jump MP for standard jump jets

- **GIVEN** a unit with walkMP 4 and jumpJetType STANDARD
- **WHEN** useMovementCalculations is called
- **THEN** maxJumpMP SHALL be 4 (standard jets limited to walk MP)

#### Scenario: Compute max Jump MP for improved jump jets

- **GIVEN** a unit with walkMP 4 and jumpJetType IMPROVED
- **WHEN** useMovementCalculations is called
- **THEN** maxJumpMP SHALL be 6 (improved jets can reach run MP = ceil(4 × 1.5))

#### Scenario: Compute enhanced max Run MP with MASC

- **GIVEN** a unit with walkMP 4 and enhancement MASC
- **WHEN** useMovementCalculations is called
- **THEN** maxRunMP SHALL be 8 (floor(4 × 2.0) = 8)

#### Scenario: Compute enhanced max Run MP with TSM

- **GIVEN** a unit with walkMP 4 and enhancement TSM
- **WHEN** useMovementCalculations is called
- **THEN** maxRunMP SHALL be 7 (floor(4 × 1.5) + 1 = 7)

#### Scenario: No enhanced max Run MP without enhancement

- **GIVEN** a unit with walkMP 4 and enhancement null
- **WHEN** useMovementCalculations is called
- **THEN** maxRunMP SHALL be undefined

#### Scenario: Detect max engine rating

- **GIVEN** a unit with engine rating 400
- **WHEN** useMovementCalculations is called
- **THEN** isAtMaxEngineRating SHALL be true

#### Scenario: Clamp Walk MP to valid range

- **GIVEN** a unit with tonnage 50 (valid range 1-8)
- **WHEN** clampWalkMP(10) is called
- **THEN** result SHALL be 8 (clamped to max)

#### Scenario: Clamp Jump MP to max allowed

- **GIVEN** a unit with walkMP 4 and jumpJetType STANDARD (maxJumpMP = 4)
- **WHEN** clampJumpMP(6) is called
- **THEN** result SHALL be 4 (clamped to maxJumpMP)

#### Scenario: Calculate engine rating for desired Walk MP

- **GIVEN** a unit with tonnage 50
- **WHEN** getEngineRatingForWalkMP(5) is called
- **THEN** result SHALL be 250 (50 × 5)

### Requirement: Engine Rating Constraints

Engine rating SHALL be constrained to the range 10-400 per BattleTech TechManual.

**Source**: `src/hooks/useMovementCalculations.ts:26-29`

#### Scenario: Minimum engine rating

- **WHEN** calculating valid Walk MP range
- **THEN** minimum engine rating SHALL be 10

#### Scenario: Maximum engine rating

- **WHEN** calculating valid Walk MP range
- **THEN** maximum engine rating SHALL be 400

#### Scenario: Walk MP range for 100-ton unit

- **GIVEN** a unit with tonnage 100
- **WHEN** calculating valid Walk MP range
- **THEN** walkMPRange.min SHALL be 1 (ceil(10 / 100) = 1)
- **AND** walkMPRange.max SHALL be 4 (floor(400 / 100) = 4)

### Requirement: Movement Enhancement Effects

The system SHALL calculate enhanced maximum Run MP based on active movement enhancements.

**Source**: `src/utils/construction/movementCalculations.ts:42-82`

#### Scenario: MASC enhancement

- **GIVEN** a unit with walkMP 4 and MASC equipped
- **WHEN** calculating enhanced max Run MP
- **THEN** runMultiplierBonus SHALL be 0.5
- **AND** maxRunMP SHALL be floor(4 × 2.0) = 8

#### Scenario: Supercharger enhancement

- **GIVEN** a unit with walkMP 4 and Supercharger equipped
- **WHEN** calculating enhanced max Run MP
- **THEN** runMultiplierBonus SHALL be 0.5
- **AND** maxRunMP SHALL be floor(4 × 2.0) = 8

#### Scenario: TSM enhancement

- **GIVEN** a unit with walkMP 4 and TSM equipped
- **WHEN** calculating enhanced max Run MP
- **THEN** flatMPBonus SHALL be 1
- **AND** maxRunMP SHALL be floor(4 × 1.5) + 1 = 7

#### Scenario: Multiple enhancements (MASC + TSM)

- **GIVEN** a unit with walkMP 4, MASC, and TSM equipped
- **WHEN** calculating enhanced max Run MP
- **THEN** runMultiplierBonus SHALL be 0.5
- **AND** flatMPBonus SHALL be 1
- **AND** maxRunMP SHALL be floor(4 × 2.0) + 1 = 9

### Requirement: Hook Memoization

The hook SHALL memoize all computed values to prevent unnecessary recalculations.

**Source**: `src/hooks/useMovementCalculations.ts:137-180`

#### Scenario: Memoize walkMP

- **GIVEN** a unit with engineRating and tonnage
- **WHEN** useMovementCalculations is called multiple times with same inputs
- **THEN** walkMP SHALL be computed only once (useMemo dependency: [engineRating, tonnage])

#### Scenario: Memoize runMP

- **GIVEN** a unit with walkMP
- **WHEN** useMovementCalculations is called multiple times with same walkMP
- **THEN** runMP SHALL be computed only once (useMemo dependency: [walkMP])

#### Scenario: Memoize maxRunMP

- **GIVEN** a unit with walkMP and enhancement
- **WHEN** useMovementCalculations is called multiple times with same inputs
- **THEN** maxRunMP SHALL be computed only once (useMemo dependency: [enhancement, walkMP])

#### Scenario: Memoize helper functions

- **GIVEN** a unit with tonnage
- **WHEN** useMovementCalculations is called multiple times with same tonnage
- **THEN** getEngineRatingForWalkMP, clampWalkMP, clampJumpMP SHALL be stable references

## Data Model Requirements

### JumpJetType

Jump jet type enumeration.

**Source**: `src/utils/construction/movementCalculations.ts:87-91`

```typescript
enum JumpJetType {
  STANDARD = 'Standard',
  IMPROVED = 'Improved',
  MECHANICAL = 'Mechanical Jump Boosters',
}
```

### MovementEnhancementType

Movement enhancement type enumeration.

**Source**: `src/types/construction/MovementEnhancement.ts`

```typescript
enum MovementEnhancementType {
  MASC = 'masc',
  TSM = 'tsm',
  SUPERCHARGER = 'supercharger',
}
```

### MIN_ENGINE_RATING

Minimum engine rating constant.

**Source**: `src/hooks/useMovementCalculations.ts:29`

```typescript
const MIN_ENGINE_RATING = 10;
```

### MAX_ENGINE_RATING

Maximum engine rating constant per BattleTech TechManual.

**Source**: `src/hooks/useMovementCalculations.ts:26`

```typescript
const MAX_ENGINE_RATING = 400;
```

### MovementCalculationsInput

Input parameters for movement calculations hook.

**Source**: `src/hooks/useMovementCalculations.ts:35-46`

```typescript
interface MovementCalculationsInput {
  /** Unit tonnage */
  readonly tonnage: number;
  /** Current engine rating */
  readonly engineRating: number;
  /** Current jump MP */
  readonly jumpMP: number;
  /** Jump jet type */
  readonly jumpJetType: JumpJetType;
  /** Movement enhancement (MASC, TSM, etc.) */
  readonly enhancement: MovementEnhancementType | null;
}
```

### MovementCalculationsResult

Result object returned by movement calculations hook.

**Source**: `src/hooks/useMovementCalculations.ts:48-67`

```typescript
interface MovementCalculationsResult {
  /** Current Walk MP (derived from engine rating / tonnage) */
  readonly walkMP: number;
  /** Current Run MP (ceil of walk × 1.5) */
  readonly runMP: number;
  /** Valid Walk MP range for this tonnage */
  readonly walkMPRange: { min: number; max: number };
  /** Maximum Jump MP based on walk MP and jump jet type */
  readonly maxJumpMP: number;
  /** Enhanced max Run MP when enhancement is active (undefined if no enhancement) */
  readonly maxRunMP: number | undefined;
  /** Whether engine is at maximum rating (400) */
  readonly isAtMaxEngineRating: boolean;
  /** Calculate new engine rating for a given Walk MP */
  readonly getEngineRatingForWalkMP: (walkMP: number) => number;
  /** Clamp Walk MP to valid range */
  readonly clampWalkMP: (walkMP: number) => number;
  /** Clamp Jump MP to valid range */
  readonly clampJumpMP: (jumpMP: number) => number;
}
```

### MovementModifiers

Movement enhancement modifiers.

**Source**: `src/utils/construction/movementCalculations.ts:35-40`

```typescript
interface MovementModifiers {
  /** Bonus added to base 1.5x run multiplier (e.g., MASC adds 0.5 for 2.0x total) */
  readonly runMultiplierBonus: number;
  /** Flat MP added after multiplication (e.g., TSM adds +1) */
  readonly flatMPBonus: number;
}
```

## Non-Goals

This specification does NOT cover:

- **Heat-based movement penalties**: Covered by heat-management spec
- **Terrain movement costs**: Covered by terrain-system spec
- **Piloting skill rolls**: Covered by personnel-management spec
- **Damage-based movement reduction**: Covered by damage-system spec
- **UI components**: Covered by customizer-tabs spec
- **Database persistence**: Covered by unit-services spec
