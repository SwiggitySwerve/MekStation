# construction-rules-core Specification

## Purpose

TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.

## Requirements

### Requirement: Construction Sequence

The system SHALL implement 12-step construction sequence.

#### Scenario: Construction steps

- **WHEN** constructing a BattleMech
- **THEN** follow: tonnage → structure → engine → gyro → cockpit → heat sinks → armor → weapons → equipment → slots → weight → finalize

### Requirement: Weight Budget

Total component weight MUST equal mech tonnage exactly.

#### Scenario: Weight validation

- **WHEN** validating construction
- **THEN** sum of all weights MUST equal tonnage
- **AND** overweight SHALL produce error
- **AND** underweight SHALL produce warning

### Requirement: Minimum Requirements

All mechs SHALL meet minimum requirements.

#### Scenario: Minimum heat sinks

- **WHEN** validating heat sinks
- **THEN** total MUST be >= 10
- **OR** total MUST be >= heat-generating weapons if higher

### Requirement: Maximum Limits

Component limits SHALL be enforced.

#### Scenario: Armor maximum

- **WHEN** validating armor
- **THEN** total SHALL not exceed maximum (2× structure per location)

#### Scenario: Slot maximum

- **WHEN** validating critical slots
- **THEN** total SHALL not exceed 78 available slots

### Requirement: BattleMech Tonnage Classes

The system SHALL recognize distinct BattleMech tonnage classes with different construction constraints.

#### Scenario: Standard BattleMech tonnage

- **WHEN** creating a standard BattleMech
- **THEN** tonnage MUST be between 20 and 100 tons
- **AND** tonnage MUST be a multiple of 5

#### Scenario: Ultralight BattleMech tonnage

- **WHEN** creating an ultralight BattleMech
- **THEN** tonnage MUST be between 10 and 15 tons
- **AND** special construction rules apply
- **AND** rules level MUST be Experimental or higher

#### Scenario: Superheavy BattleMech tonnage

- **WHEN** creating a superheavy BattleMech
- **THEN** tonnage MUST be between 105 and 200 tons
- **AND** special construction rules apply
- **AND** rules level MUST be Experimental or higher

### Requirement: Engine Rating by Unit Type

The system SHALL enforce engine rating limits based on unit type.

#### Scenario: BattleMech engine rating limit

- **GIVEN** a standard BattleMech (20-100 tons)
- **WHEN** validating engine rating
- **THEN** rating MUST NOT exceed 400
- **AND** rating = Tonnage × Walk MP (max 4 Walk MP practical)

#### Scenario: Vehicle engine rating limit

- **GIVEN** a combat vehicle
- **WHEN** validating engine rating
- **THEN** rating MAY be up to 500
- **AND** higher ratings are feasible due to different weight fractions

### Requirement: BattleMech Location Name Mapping

The system SHALL provide bidirectional mapping between full location names and standard abbreviations.

**Source**: `src/utils/locationUtils.ts:1-26`

#### Scenario: Location shorthand lookup

- **GIVEN** a full location name (e.g., "Center Torso")
- **WHEN** requesting shorthand via `getLocationShorthand()`
- **THEN** return standard abbreviation ("CT")
- **AND** support all 12 locations: HD, CT, LT, RT, LA, RA, LL, RL, FLL, FRL, RLL, RRL

#### Scenario: Location full name reverse lookup

- **GIVEN** a shorthand abbreviation (e.g., "CT")
- **WHEN** requesting full name via `getLocationFullName()`
- **THEN** return full location name ("Center Torso")
- **AND** support all 12 locations including quad mech legs

#### Scenario: Unknown location handling

- **GIVEN** an unknown location name or shorthand
- **WHEN** requesting conversion
- **THEN** return the input string unchanged (passthrough behavior)
- **AND** do not throw errors or return null

### Requirement: UI Layout Constants

The system SHALL define centralized layout constants for responsive design and z-index layering.

**Source**: `src/constants/layout.ts:1-103`

#### Scenario: Sidebar dimension constants

- **WHEN** accessing `SIDEBAR` constants
- **THEN** provide `COLLAPSED_WIDTH: 64` (pixels, Tailwind w-16)
- **AND** provide `EXPANDED_WIDTH: 224` (pixels, Tailwind w-56)
- **AND** provide Tailwind margin classes: `MARGIN_COLLAPSED: 'lg:ml-16'`, `MARGIN_EXPANDED: 'lg:ml-56'`
- **AND** provide Tailwind width classes: `WIDTH_COLLAPSED: 'w-16'`, `WIDTH_EXPANDED: 'w-56'`

#### Scenario: Z-index layer constants

- **WHEN** accessing `Z_INDEX` constants
- **THEN** provide layered values from BASE (0) to TOAST (80)
- **AND** include: BASE, DROPDOWN, STICKY, SIDEBAR_DESKTOP, MOBILE_NAV, SIDEBAR_MOBILE, MODAL, TOOLTIP, TOAST
- **AND** ensure higher values render above lower values

## Data Model Requirements

### LOCATION_SHORTCUTS Record

**Source**: `src/utils/locationUtils.ts:1-14`

```typescript
const LOCATION_SHORTCUTS: Record<string, string> = {
  Head: 'HD',
  'Center Torso': 'CT',
  'Left Torso': 'LT',
  'Right Torso': 'RT',
  'Left Arm': 'LA',
  'Right Arm': 'RA',
  'Left Leg': 'LL',
  'Right Leg': 'RL',
  'Front Left Leg': 'FLL', // Quad mech
  'Front Right Leg': 'FRL', // Quad mech
  'Rear Left Leg': 'RLL', // Quad mech
  'Rear Right Leg': 'RRL', // Quad mech
};
```

**Requirements**:

- SHALL include all 12 BattleMech locations (8 biped + 4 quad)
- SHALL use consistent abbreviation format (uppercase, 2-3 letters)
- SHALL support quad mech leg locations (FLL, FRL, RLL, RRL)

### SIDEBAR Constants Object

**Source**: `src/constants/layout.ts:12-25`

```typescript
export const SIDEBAR = {
  COLLAPSED_WIDTH: 64, // pixels
  EXPANDED_WIDTH: 224, // pixels
  MARGIN_COLLAPSED: 'lg:ml-16',
  MARGIN_EXPANDED: 'lg:ml-56',
  WIDTH_COLLAPSED: 'w-16',
  WIDTH_EXPANDED: 'w-56',
} as const;
```

**Requirements**:

- SHALL provide pixel values matching Tailwind width classes
- SHALL provide Tailwind utility classes for responsive layout
- SHALL use `as const` for type safety

### Z_INDEX Constants Object

**Source**: `src/constants/layout.ts:31-50`

```typescript
export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 10,
  STICKY: 20,
  SIDEBAR_DESKTOP: 30,
  MOBILE_NAV: 40,
  SIDEBAR_MOBILE: 50,
  MODAL: 60,
  TOOLTIP: 70,
  TOAST: 80,
} as const;
```

**Requirements**:

- SHALL define 9 distinct z-index layers
- SHALL use increments of 10 for extensibility
- SHALL order from lowest (BASE) to highest (TOAST)
- SHALL use `as const` for type safety

## Non-Goals

- Location damage tracking (see `damage-system` spec)
- Location-specific armor allocation (see `armor-system` spec)
- Responsive breakpoint detection logic (see `mobile-interaction-patterns` spec)
- Animation timing implementation (see `theming-appearance-system` spec)
