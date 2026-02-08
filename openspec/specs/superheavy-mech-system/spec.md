# Superheavy Mech System Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-07
**Dependencies**: critical-slot-allocation, battle-value-system, mech-configuration-system, engine-system, gyro-system, cockpit-system
**Affects**: construction-rules-core, equipment-placement, critical-slots-display

---

## Overview

### Purpose

Defines the rules, data model, and UI behavior for Superheavy BattleMechs (105-200 tons). Superheavy mechs use a double-slot critical system where each critical entry can hold two single-crit items, require dedicated cockpit and gyro types, and have distinct BV calculation rules due to altered engine side-torso slot counts.

### Scope

**In Scope:**

- Superheavy detection (tonnage > 100 threshold)
- Double-slot critical system (CritEntry composition model)
- Equipment slot calculation (ceil(N/2) rule)
- Superheavy-specific construction constraints (cockpit, gyro, tonnage)
- BV calculation variants (engine multiplier, ammo counting, gyro normalization)
- Structure points for 105-200 ton range
- Customizer UI for double-slot rendering and pairing interactions
- Data loading for pipe-separated critical slot entries

**Out of Scope:**

- Standard mech (20-100t) construction rules (see `construction-rules-core`)
- Tripod/Quad/LAM/QuadVee configuration rules (see `mech-configuration-system`)
- General BV2 calculation algorithm (see `battle-value-system`)
- Aerospace or vehicle superheavy rules

### Key Concepts

- **Superheavy Mech**: A BattleMech weighing 105-200 tons (exclusive of the 100t boundary)
- **Double-Slot**: A critical entry that can hold two single-crit items (ammo bins or single heat sinks) in one physical slot position
- **CritEntry**: The composition wrapper that models one slot position containing a primary mount and an optional secondary mount
- **Pipe-Separated Crit**: The MTF/JSON notation (e.g., `"IS Gauss Ammo|IS Gauss Ammo"`) representing two items paired in one double-slot
- **Side-Torso Crit Reduction**: Superheavy engines use fewer side-torso critical slots than standard counterparts, which changes the BV engine multiplier

---

## Requirements

### Requirement: Superheavy Detection

The system SHALL classify any BattleMech with tonnage greater than 100 as a Superheavy Mech.

**Rationale**: All superheavy-specific rules (double-slots, cockpit/gyro restrictions, BV multipliers) are gated on this classification.

**Priority**: Critical

#### Scenario: Tonnage boundary

- **GIVEN** a BattleMech unit
- **WHEN** tonnage is 100 or less
- **THEN** the unit SHALL NOT be classified as superheavy
- **AND** standard mech rules SHALL apply

#### Scenario: Superheavy classification

- **GIVEN** a BattleMech unit
- **WHEN** tonnage is 105 or greater (up to 200)
- **THEN** the unit SHALL be classified as superheavy
- **AND** tonnage SHALL be a multiple of 5
- **AND** tonnage SHALL NOT exceed 200

#### Scenario: Detection utility

- **WHEN** determining superheavy status programmatically
- **THEN** a single canonical `isSuperHeavy(tonnage: number): boolean` function SHALL be used
- **AND** all tonnage-conditional code SHALL reference this function rather than ad-hoc comparisons

---

### Requirement: Double-Slot Critical System

Superheavy mechs SHALL use a double-slot critical system where each critical entry position can hold up to two single-crit items.

**Rationale**: Superheavy mechs have the same number of critical entry positions per location as standard mechs (12 for torsos/arms, 6 for head/legs), but each position is a "double-slot" that can accommodate two single-crit items (ammo bins or single heat sinks). Multi-crit equipment uses ceil(N/2) entries.

**Priority**: Critical

#### Scenario: Entry count per location

- **GIVEN** a superheavy mech
- **WHEN** determining critical entry positions for a location
- **THEN** Head SHALL have 6 entries
- **AND** Center Torso SHALL have 12 entries
- **AND** Side Torsos SHALL have 12 entries each
- **AND** Arms SHALL have 12 entries each
- **AND** Legs SHALL have 6 entries each
- **AND** entry counts SHALL be identical to standard mech slot counts

#### Scenario: Equipment entry calculation

- **GIVEN** a piece of equipment requiring N critical slots
- **WHEN** determining how many critical entries it consumes on a superheavy
- **THEN** entries consumed SHALL equal ceil(N / 2)
- **AND** a 1-crit item SHALL consume 1 entry
- **AND** a 2-crit item SHALL consume 1 entry
- **AND** a 3-crit item SHALL consume 2 entries
- **AND** a 6-crit item SHALL consume 3 entries
- **AND** a 7-crit item SHALL consume 4 entries

#### Scenario: Double-slot pairing eligibility

- **GIVEN** a superheavy mech critical entry with a single-crit item already mounted
- **WHEN** attempting to pair a second item in the same entry
- **THEN** the second item SHALL only be allowed if it is a single-crit item
- **AND** the second item SHALL only be allowed if it is an ammo bin or single heat sink
- **AND** the second item SHALL NOT need to be the same type as the first item
- **AND** multi-crit equipment SHALL NOT be pairable

#### Scenario: Standard mech zero-cost

- **GIVEN** a standard mech (tonnage <= 100)
- **WHEN** constructing CritEntry data
- **THEN** isDoubleSlot SHALL be false
- **AND** secondary mount SHALL be undefined
- **AND** no behavioral change from current system SHALL occur

---

### Requirement: CritEntry Data Model

The system SHALL use a CritEntry composition type to wrap SlotContent for all mech types.

**Rationale**: The CritEntry wrapper cleanly separates the double-slot concept from the per-item SlotContent, preventing pollution of the standard mech codebase while sharing the common foundation.

**Priority**: Critical

#### Scenario: CritEntry interface

- **WHEN** defining the CritEntry type
- **THEN** CritEntry SHALL have an `index` field (0-based slot position)
- **AND** CritEntry SHALL have a `primary` field of type SlotContent (always present)
- **AND** CritEntry SHALL have an optional `secondary` field of type SlotContent
- **AND** CritEntry SHALL have an `isDoubleSlot` boolean field

#### Scenario: LocationData update

- **WHEN** defining LocationData
- **THEN** LocationData SHALL include an `entries: CritEntry[]` array as the canonical slot source
- **AND** LocationData SHALL include an `isSuperheavy: boolean` flag
- **AND** LocationData SHALL retain `slots: SlotContent[]` for backward compatibility during migration

#### Scenario: Equipment flattening utility

- **WHEN** any code needs to count all equipment across entries (BV scanning, tonnage accounting, validation)
- **THEN** a `flattenEntries(entries: CritEntry[]): SlotContent[]` utility SHALL be used
- **AND** the utility SHALL return both primary and secondary mounts from all entries
- **AND** consumers SHALL NOT iterate entries manually to check secondary mounts

---

### Requirement: Superheavy Construction Constraints

Superheavy mechs SHALL have specific construction constraints distinct from standard mechs.

**Rationale**: Per TechManual and MegaMek implementation, superheavy mechs require dedicated cockpit and gyro types and operate within a different tonnage range.

**Priority**: Critical

#### Scenario: Cockpit type restriction

- **GIVEN** a mech with tonnage > 100
- **WHEN** validating cockpit configuration
- **THEN** cockpit type SHALL be SUPERHEAVY
- **AND** Standard, Small, Command Console, and other cockpit types SHALL NOT be valid

#### Scenario: Gyro type restriction

- **GIVEN** a mech with tonnage > 100
- **WHEN** validating gyro configuration
- **THEN** gyro type SHALL be SUPERHEAVY
- **AND** Standard, XL, Compact, and Heavy-Duty gyro types SHALL NOT be valid

#### Scenario: Tonnage range validation

- **WHEN** validating tonnage for a superheavy mech
- **THEN** valid tonnage range SHALL be 105 to 200 (inclusive)
- **AND** tonnage SHALL be a multiple of 5
- **AND** tonnage values 101-104 SHALL be invalid

#### Scenario: Engine rating limits

- **GIVEN** a superheavy mech
- **WHEN** selecting engine rating
- **THEN** engine rating SHALL follow standard formula (Tonnage x Walk MP)
- **AND** maximum engine rating of 400 SHALL still apply

#### Scenario: Auto-configuration on tonnage change

- **GIVEN** a user changes tonnage from standard range (20-100) to superheavy range (105-200)
- **WHEN** the tonnage value crosses the 100t boundary
- **THEN** cockpit type SHALL be automatically set to SUPERHEAVY
- **AND** gyro type SHALL be automatically set to SUPERHEAVY
- **AND** a warning banner SHALL be displayed about superheavy construction rules

---

### Requirement: Superheavy BV Calculation

BV calculations for superheavy mechs SHALL account for altered engine multipliers, double-slot ammo counting, and gyro type normalization.

**Rationale**: Superheavy engines have fewer side-torso critical slots than standard counterparts, which changes the engine BV multiplier used in structure BV calculation. Double-slot ammo entries represent two tons of ammo, not one.

**Priority**: High

#### Scenario: Superheavy engine BV multiplier

- **WHEN** calculating structure BV for a superheavy mech
- **THEN** the engine BV multiplier SHALL be determined by actual side-torso critical slot count
- **AND** IS XL Engine (superheavy) SHALL use multiplier 0.75 (2 side-torso crits instead of 3)
- **AND** Clan XL Engine (superheavy) SHALL use multiplier 1.0 (1 side-torso crit instead of 2)
- **AND** IS XXL Engine (superheavy) SHALL use multiplier 0.5 (3 side-torso crits instead of 6)
- **AND** Standard and Compact engines SHALL retain multiplier 1.0
- **AND** Light Engine (superheavy) SHALL use multiplier 1.0 (1 side-torso crit instead of 2)

#### Scenario: Standard engine multiplier unaffected

- **GIVEN** a standard mech (tonnage <= 100)
- **WHEN** calculating structure BV
- **THEN** engine BV multipliers SHALL remain unchanged from battle-value-system spec
- **AND** IS XL SHALL use 0.5
- **AND** Clan XL SHALL use 0.75

#### Scenario: Double-slot ammo BV counting

- **GIVEN** a superheavy mech with pipe-separated ammo entries (e.g., `"IS Gauss Ammo|IS Gauss Ammo"`)
- **WHEN** calculating ammo contribution to offensive BV
- **THEN** each pipe-separated entry SHALL be counted as two separate 1-ton ammo bins
- **AND** total ammo BV SHALL reflect both tons
- **AND** explosive penalty SHALL apply to both ammo bins independently

#### Scenario: Gyro BV multiplier normalization

- **WHEN** looking up gyro BV multiplier
- **THEN** input key SHALL be normalized (lowercase, underscores replaced with hyphens)
- **AND** `"HEAVY_DUTY"` SHALL match the `"heavy-duty"` multiplier entry (1.0)
- **AND** `"SUPERHEAVY"` SHALL match the `"superheavy"` multiplier entry (0.5)
- **AND** Superheavy gyro multiplier SHALL be 0.5

#### Scenario: Explosive penalty slot counting

- **GIVEN** a superheavy mech with explosive equipment
- **WHEN** calculating explosive BV penalties
- **THEN** penalty SHALL be based on actual critical slots (not ceil(N/2) entries)
- **AND** each slot of explosive equipment SHALL subtract from defensive BV per standard rules
- **AND** double-mounted ammo SHALL count both bins for penalty purposes

---

### Requirement: Structure Points

Superheavy mechs SHALL use a dedicated structure points table for tonnages 105-200.

**Rationale**: Structure point values differ from the standard table and are already defined in `STRUCTURE_POINTS_TABLE` in `InternalStructureType.ts`.

**Priority**: High

#### Scenario: Structure points lookup

- **GIVEN** a superheavy mech of a specific tonnage
- **WHEN** looking up structure points
- **THEN** values SHALL be retrieved from `STRUCTURE_POINTS_TABLE` entries for 105-200 tons
- **AND** head structure SHALL be 4 (increased from standard 3)
- **AND** other locations SHALL scale with tonnage per the existing table

#### Scenario: Structure weight calculation

- **GIVEN** a superheavy mech
- **WHEN** calculating internal structure weight
- **THEN** structure weight SHALL equal tonnage / 5.0 (for standard structure)
- **AND** Endo Steel SHALL use tonnage / 10.0
- **AND** rounding rules SHALL follow standard construction rules

---

### Requirement: Customizer UI - Double-Slot Display

The customizer critical slots grid SHALL render superheavy double-slots with clear visual distinction.

**Rationale**: Users need to understand that each row can hold two items, and need intuitive interactions for pairing and unpairing equipment.

**Priority**: High

#### Scenario: DoubleSlotRow rendering - single mount

- **GIVEN** a superheavy mech critical entry with only a primary mount
- **WHEN** rendering the entry in the critical slots grid
- **THEN** the primary equipment SHALL span the full row width
- **AND** a subtle visual indicator SHALL show the entry supports a second item
- **AND** the indicator SHALL only appear for single-crit equipment (ammo or heat sink)

#### Scenario: DoubleSlotRow rendering - paired mounts

- **GIVEN** a superheavy mech critical entry with both primary and secondary mounts
- **WHEN** rendering the entry in the critical slots grid
- **THEN** the row SHALL be visually split to show both items
- **AND** each item SHALL be independently identifiable
- **AND** each item SHALL show its equipment name

#### Scenario: DoubleSlotRow rendering - standard mech

- **GIVEN** a standard mech (not superheavy)
- **WHEN** rendering critical entries
- **THEN** standard SlotRow rendering SHALL be used
- **AND** no double-slot visual indicators SHALL appear

---

### Requirement: Customizer UI - Double-Slot Pairing

The customizer SHALL support pairing compatible single-crit items in superheavy double-slots via drag-and-drop and click-to-assign.

**Rationale**: MegaMekLab supports this via drag-and-drop of compatible ammo/heat sink items onto occupied slots. MekStation should provide the same functionality with clearer affordances.

**Priority**: High

#### Scenario: Drag-and-drop pairing

- **GIVEN** a superheavy mech with a single-crit ammo bin in a critical entry
- **AND** user drags another single-crit ammo bin over that entry
- **WHEN** the dragged item is dropped on the occupied entry
- **THEN** the dropped item SHALL be mounted as the secondary item in that entry
- **AND** both items SHALL be visible in the double-slot row

#### Scenario: Click-to-assign pairing

- **GIVEN** a superheavy mech with a single-crit item selected in the equipment tray
- **AND** user clicks on an occupied critical entry containing a single-crit item
- **WHEN** both items are pairing-eligible (ammo or single heat sink)
- **THEN** the selected item SHALL be mounted as the secondary item
- **AND** the equipment selection SHALL be cleared

#### Scenario: Pairing rejection - multi-crit equipment

- **GIVEN** a superheavy mech critical entry occupied by a multi-crit weapon
- **WHEN** user attempts to pair another item in that entry
- **THEN** pairing SHALL be rejected
- **AND** the slot SHALL show standard occupied (red) drop indicator

#### Scenario: Assignable slot visual for pairable entries

- **GIVEN** a superheavy mech with single-crit equipment selected
- **WHEN** highlighting assignable slots in the critical grid
- **THEN** empty slots SHALL show green highlight (standard behavior)
- **AND** occupied-but-pairable slots SHALL show a distinct highlight (blue)
- **AND** occupied non-pairable slots SHALL NOT be highlighted

#### Scenario: Unpair context menu

- **GIVEN** a superheavy mech critical entry with both primary and secondary mounts
- **WHEN** user right-clicks on the entry
- **THEN** context menu SHALL show "Unpair" option
- **AND** "Unpair" SHALL remove only the secondary mount
- **AND** "Unassign" SHALL remove both mounts from the entry

---

### Requirement: Tonnage Selector Update

The StructureTab tonnage selector SHALL support the superheavy tonnage range with appropriate warnings.

**Rationale**: Users need to be able to create superheavy mechs from the customizer with clear feedback about the constraints that will be applied.

**Priority**: Medium

#### Scenario: Extended tonnage range

- **WHEN** displaying the tonnage selector
- **THEN** valid values SHALL include 20-200 in increments of 5
- **AND** values 105-200 SHALL be visually distinguished as superheavy

#### Scenario: Superheavy warning banner

- **GIVEN** user selects a tonnage value greater than 100
- **WHEN** the tonnage crosses the superheavy boundary
- **THEN** an info banner SHALL appear explaining superheavy construction rules
- **AND** the banner SHALL mention: double-slot crits, required cockpit/gyro types

#### Scenario: Automatic cockpit/gyro adjustment

- **GIVEN** user changes tonnage from 100 to 105
- **WHEN** the tonnage transitions to superheavy range
- **THEN** cockpit type SHALL be automatically set to SUPERHEAVY
- **AND** gyro type SHALL be automatically set to SUPERHEAVY
- **AND** cockpit and gyro type selectors SHALL be locked to SUPERHEAVY

---

### Requirement: Data Loading - Pipe-Separated Crits

The unit loading layer SHALL parse pipe-separated critical slot entries into CritEntry primary and secondary mounts.

**Rationale**: MegaMek's MTF format uses pipe notation (e.g., `"IS Gauss Ammo|IS Gauss Ammo"`) to represent two items sharing one superheavy double-slot. This must be parsed at load time, not deferred to UI rendering.

**Priority**: High

#### Scenario: Pipe-separated ammo parsing

- **GIVEN** a unit JSON file with a critical slot entry `"IS Gauss Ammo|IS Gauss Ammo"`
- **WHEN** loading the unit data
- **THEN** a CritEntry SHALL be created with:
  - primary: SlotContent with name `"IS Gauss Ammo"` and type `"equipment"`
  - secondary: SlotContent with name `"IS Gauss Ammo"` and type `"equipment"`
  - isDoubleSlot: true

#### Scenario: Non-piped entry parsing

- **GIVEN** a unit JSON file with a standard critical slot entry `"IS Medium Laser"`
- **WHEN** loading the unit data
- **THEN** a CritEntry SHALL be created with:
  - primary: SlotContent with name `"IS Medium Laser"` and type `"equipment"`
  - secondary: undefined
  - isDoubleSlot: false (or true if unit is superheavy, depending on location context)

#### Scenario: Equipment accounting from pipe entries

- **GIVEN** a superheavy unit with 4 pipe-separated ammo entries
- **WHEN** counting total ammo tonnage
- **THEN** total SHALL equal 8 tons (4 entries x 2 tons each)
- **AND** `flattenEntries()` SHALL return 8 SlotContent items for the ammo

---

### Requirement: Gyro Type Mapping

The system SHALL support SUPERHEAVY as a gyro type and normalize gyro type keys for BV lookup.

**Rationale**: Unit JSON files store gyro types in `UPPER_SNAKE_CASE` (e.g., `"HEAVY_DUTY"`) but BV multiplier maps use `kebab-case` (e.g., `"heavy-duty"`). A normalization layer prevents silent lookup failures and incorrect fallback values.

**Priority**: High

#### Scenario: Superheavy gyro type

- **WHEN** a unit has gyro type `SUPERHEAVY`
- **THEN** the gyro type SHALL be recognized as valid
- **AND** gyro BV multiplier SHALL be 0.5
- **AND** gyro weight calculation SHALL follow standard formula

#### Scenario: Key normalization

- **WHEN** looking up a gyro BV multiplier
- **THEN** the input key SHALL be lowercased
- **AND** underscores SHALL be replaced with hyphens
- **AND** `"HEAVY_DUTY"` SHALL resolve to multiplier 1.0
- **AND** `"SUPERHEAVY"` SHALL resolve to multiplier 0.5
- **AND** `"XL"` SHALL resolve to multiplier 0.5

#### Scenario: MTF conversion mapping

- **WHEN** converting MTF files to MekStation JSON format
- **THEN** `enum_mappings.py` SHALL include `SUPERHEAVY` in the gyro type mapping
- **AND** converted unit files SHALL use the normalized gyro type key

---

### Requirement: Superheavy Validation Rules

The system SHALL provide validation rules specific to superheavy mech construction.

**Rationale**: Following the pattern of `TripodValidationRules.ts` and `QuadVeeValidationRules.ts`, superheavy-specific rules are isolated in their own module.

**Priority**: High

#### Scenario: Cockpit type validation

- **GIVEN** a mech with tonnage > 100
- **WHEN** running validation
- **THEN** a validation error SHALL be raised if cockpit type is not SUPERHEAVY
- **AND** error message SHALL state "Superheavy mechs require SUPERHEAVY cockpit"
- **AND** severity SHALL be ERROR

#### Scenario: Gyro type validation

- **GIVEN** a mech with tonnage > 100
- **WHEN** running validation
- **THEN** a validation error SHALL be raised if gyro type is not SUPERHEAVY
- **AND** error message SHALL state "Superheavy mechs require SUPERHEAVY gyro"
- **AND** severity SHALL be ERROR

#### Scenario: Standard mech exclusion

- **GIVEN** a mech with tonnage <= 100
- **WHEN** running superheavy validation rules
- **THEN** all superheavy validation rules SHALL be skipped (canValidate returns false)

#### Scenario: Equipment slot overflow

- **GIVEN** a superheavy mech
- **WHEN** validating critical slot allocation
- **THEN** equipment crit entries SHALL be calculated using ceil(N/2)
- **AND** total entries per location SHALL NOT exceed location entry count
- **AND** overflow SHALL generate a validation error

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Composition wrapper for one critical slot position.
 * Standard mechs use only primary; superheavy mechs can pair a secondary.
 */
interface CritEntry {
  /** Slot index in the location (0-based) */
  readonly index: number;
  /** Primary mount (always present) */
  readonly primary: SlotContent;
  /** Secondary mount (superheavy double-slot only) */
  readonly secondary?: SlotContent;
  /** Whether this entry supports double-mounting */
  readonly isDoubleSlot: boolean;
}
```

### Required Properties

| Property       | Type          | Required | Description                                | Valid Values     | Default     |
| -------------- | ------------- | -------- | ------------------------------------------ | ---------------- | ----------- |
| `index`        | `number`      | Yes      | 0-based position in the location           | 0 to slotCount-1 | N/A         |
| `primary`      | `SlotContent` | Yes      | The primary (or only) mounted item         | Any SlotContent  | N/A         |
| `secondary`    | `SlotContent` | No       | Paired item in superheavy double-slot      | Single-crit only | `undefined` |
| `isDoubleSlot` | `boolean`     | Yes      | Whether pairing is supported at this entry | true/false       | false       |

### Type Constraints

- `secondary` MUST only be set when `isDoubleSlot` is true
- `secondary` MUST only contain single-crit items (ammo bins or single heat sinks)
- When `isDoubleSlot` is false, `secondary` SHALL be undefined
- `index` MUST match `primary.index`

---

## Calculation Formulas

### Equipment Crit Entries

**Formula**:

```
critEntries = isSuperHeavy ? ceil(criticalSlots / 2) : criticalSlots
```

**Where**:

- `criticalSlots` = standard critical slot count for the equipment
- `isSuperHeavy` = true when unit tonnage > 100

**Example**:

```
Input: criticalSlots = 6, isSuperHeavy = true
Calculation: critEntries = ceil(6 / 2) = 3
Output: 3 entries consumed

Input: criticalSlots = 1, isSuperHeavy = true
Calculation: critEntries = ceil(1 / 2) = 1
Output: 1 entry consumed (can be paired with another single-crit)
```

### Superheavy Engine BV Multiplier

**Formula**:

```
multiplier = lookup(engineType, sideTorsoCritSlots)
```

**Where**:

- `sideTorsoCritSlots` = reduced crit slot count for superheavy variant of the engine

**Lookup Table**:

| Engine Type | Standard Side Crits | Superheavy Side Crits | Standard Multiplier | Superheavy Multiplier |
| ----------- | ------------------- | --------------------- | ------------------- | --------------------- |
| Standard    | 0                   | 0                     | 1.0                 | 1.0                   |
| Compact     | 0                   | 0                     | 1.0                 | 1.0                   |
| Light       | 2                   | 1                     | 0.75                | 1.0                   |
| XL (IS)     | 3                   | 2                     | 0.5                 | 0.75                  |
| XL (Clan)   | 2                   | 1                     | 0.75                | 1.0                   |
| XXL (IS)    | 6                   | 3                     | 0.25                | 0.5                   |

---

## Validation Rules

### Validation: Superheavy Cockpit Required

**Rule**: Mechs with tonnage > 100 must have SUPERHEAVY cockpit

**Severity**: Error

**Condition**:

```typescript
if (tonnage > 100 && cockpitType !== 'SUPERHEAVY') {
  // invalid - emit error
}
```

**Error Message**: "Superheavy mechs (>100 tons) require a Superheavy cockpit"

**User Action**: Change cockpit type to SUPERHEAVY or reduce tonnage to 100 or below

### Validation: Superheavy Gyro Required

**Rule**: Mechs with tonnage > 100 must have SUPERHEAVY gyro

**Severity**: Error

**Condition**:

```typescript
if (tonnage > 100 && gyroType !== 'SUPERHEAVY') {
  // invalid - emit error
}
```

**Error Message**: "Superheavy mechs (>100 tons) require a Superheavy gyro"

**User Action**: Change gyro type to SUPERHEAVY or reduce tonnage to 100 or below

### Validation: Superheavy Slot Overflow

**Rule**: Equipment crit entries must not exceed location capacity

**Severity**: Error

**Condition**:

```typescript
const entries = getEquipmentCritEntries(equipment.criticalSlots, true);
if (usedEntries + entries > locationEntryCount) {
  // invalid - not enough room
}
```

**Error Message**: "Location {name} has {used}/{max} crit entries used; {equipment} requires {needed} entries"

**User Action**: Remove equipment or move to a location with available entries

---

## Dependencies

### Depends On

- **critical-slot-allocation**: Slot counts per location, fixed component placement, MechLocation enum
- **battle-value-system**: Base BV2 calculation algorithm, speed factor formulas, pilot skill matrix
- **mech-configuration-system**: Configuration registry, location definitions, actuator rules
- **engine-system**: Engine types, side-torso crit slot counts, engine rating calculations
- **gyro-system**: Gyro types, gyro weight formula, gyro slot placement
- **cockpit-system**: Cockpit types, head slot layout

### Used By

- **construction-rules-core**: Tonnage validation, equipment placement validation
- **equipment-placement**: Slot assignment logic, drag-and-drop handlers
- **critical-slots-display**: CritEntry rendering, DoubleSlotRow component

### Construction Sequence

1. User selects tonnage > 100 in StructureTab
2. System detects superheavy, auto-sets cockpit and gyro types
3. CritEntry model activates double-slot support for all locations
4. Equipment placement uses ceil(N/2) for entry calculation
5. BV calculation uses superheavy engine multipliers and counts double-slot ammo correctly

---

## Implementation Notes

### Performance Considerations

- `flattenEntries()` creates a new array on each call; cache results when iterating multiple times in tight loops (e.g., BV calculation)
- Standard mechs incur zero overhead: CritEntry with `isDoubleSlot: false` and no secondary is structurally identical to the current model

### Edge Cases

- **Odd-crit equipment on superheavy**: A 3-crit weapon uses ceil(3/2) = 2 entries. The second entry has one slot "wasted" (cannot be paired with another item since the weapon occupies it)
- **Engine type change while superheavy**: Changing engine type must recalculate the BV engine multiplier using the superheavy lookup table, not the standard one
- **Tonnage change across boundary**: Transitioning from 100t to 105t must migrate all slot data to CritEntry format and auto-set cockpit/gyro. Transitioning from 105t to 100t must strip any secondary mounts and revert cockpit/gyro restrictions

### Common Pitfalls

- **Pitfall**: Using `ENGINE_BV_MULTIPLIERS` directly for superheavy mechs
  - **Solution**: Always use `getEngineBVMultiplier(engineType, isSuperHeavy)` which selects the correct lookup table

- **Pitfall**: Counting pipe-separated ammo as 1 ton instead of 2
  - **Solution**: Split crit slot strings on `|` before processing; each segment is a separate item

- **Pitfall**: Gyro type key mismatch (`HEAVY_DUTY` vs `heavy-duty`)
  - **Solution**: Normalize all gyro type keys to lowercase-hyphenated before lookup

- **Pitfall**: Forgetting to check secondary mounts when iterating equipment
  - **Solution**: Always use `flattenEntries()` rather than iterating `entries[].primary` directly

---

## Examples

### Example 1: Omega SHP-4X (150 tons, IS XL Engine)

**Input**:

```typescript
const unit = {
  tonnage: 150,
  engine: { type: 'XL_IS', rating: 300 },
  gyro: { type: 'SUPERHEAVY' },
  // criticalSlots includes: "IS Gauss Ammo|IS Gauss Ammo" entries
};
```

**BV Calculation**:

```typescript
// Structure BV
const engineMultiplier = getEngineBVMultiplier('XL_IS', true); // 0.75 (not 0.5)
const structureBV = totalStructurePoints * 1.5 * structureMultiplier * 0.75;
const gyroBV = 150 * 0.5; // superheavy gyro = 75

// Ammo counting
// "IS Gauss Ammo|IS Gauss Ammo" -> 2 tons -> 2 * ammoPerTonBV
```

**Output**: BV = 3001 (matches MegaMek reference)

### Example 2: Equipment Slot Allocation

**Input**: AC/20 (10 critical slots) on a superheavy mech

```typescript
const critEntries = getEquipmentCritEntries(10, true);
// Result: ceil(10/2) = 5 entries
```

**Visual**:

```
Entry 0: [AC/20 ...........]  (double-width, 2 crits)
Entry 1: [AC/20 ...........]  (double-width, 2 crits)
Entry 2: [AC/20 ...........]  (double-width, 2 crits)
Entry 3: [AC/20 ...........]  (double-width, 2 crits)
Entry 4: [AC/20 ...........]  (double-width, 2 crits)
```

### Example 3: Ammo Double-Slot Pairing

**Input**: Two IS Gauss Ammo bins in one entry

```typescript
const entry: CritEntry = {
  index: 5,
  primary: {
    index: 5,
    type: 'equipment',
    name: 'IS Gauss Ammo',
    equipmentId: 'ammo-1',
  },
  secondary: {
    index: 5,
    type: 'equipment',
    name: 'IS Gauss Ammo',
    equipmentId: 'ammo-2',
  },
  isDoubleSlot: true,
};

// flattenEntries returns both:
// [{ name: 'IS Gauss Ammo', equipmentId: 'ammo-1' }, { name: 'IS Gauss Ammo', equipmentId: 'ammo-2' }]
```

---

## References

### Official BattleTech Rules

- **TechManual**: Pages 48-53 - Superheavy BattleMech construction rules
- **TechManual**: Pages 302-307 - Battle Value 2 calculation

### Related Documentation

- MegaMek source: `megamek/src/megamek/common/units/Mek.java` - Double-slot handling via `addEquipment(etype, etype2, ...)`
- MegaMek source: `megamek/src/megamek/common/equipment/Engine.java` - `getSideTorsoCriticalSlots()` and `getBVMultiplier()`
- MegaMek source: `megamek/src/megamek/common/battleValue/MekBVCalculator.java` - Superheavy explosive crit counting

---

## Changelog

### Version 1.0 (2026-02-07)

- Initial specification covering double-slot critical system, BV calculation variants, construction constraints, and UI requirements
