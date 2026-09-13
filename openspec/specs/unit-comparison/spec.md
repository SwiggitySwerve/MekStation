# unit-comparison Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: Page unit types (`src/types/pages/UnitPageTypes.ts`), Canonical Unit Service, Unit Entity Model
**Affects**: Compendium UI, Unit Services

---

## Overview

### Purpose

Provides a side-by-side comparison interface for analyzing multiple BattleMech units, allowing users to compare key combat statistics, movement profiles, and equipment specifications across up to 4 units simultaneously.

### Scope

**In Scope:**

- Search-to-add unit selection flow
- Side-by-side comparison of 8 core statistics
- Responsive layout (desktop table vs mobile cards)
- Unit addition/removal with duplicate prevention
- Loading states for catalog and individual units
- Maximum capacity enforcement (4 units)

**Out of Scope (retained deferrals):**

- Battle Value comparison and advanced analytics
- Weapon loadout comparison
- Equipment detail comparison
- Cost/C-Bill comparison
- Export/sharing functionality
- Saved comparison sets
- A dedicated comparison API route

### Key Concepts

- **Catalog Entry** (`IUnitEntry`): Lightweight unit metadata for search results. Live page type is `src/types/pages/UnitPageTypes.ts` (id, name, chassis, variant, tonnage, techBase, plus era, weightClass, unitType, optional year/role/rulesLevel/cost/bv). Comparison search still matches name OR chassis.
- **Unit Details** (`IUnitDetails`): Full unit specification loaded for comparison. Live armor uses `allocation`, not `locations`.
- **Comparison Capacity**: Maximum of 4 units can be compared simultaneously
- **Responsive Comparison**: Desktop uses table layout, mobile uses stacked card layout
- **Active route:** `/compare` (`src/pages/compare/index.tsx`) with presentational helpers in `src/components/pages/compare/ComparePage.components.tsx`

---

## Requirements

### Requirement: Maximum Comparison Capacity

The system SHALL enforce a maximum of 4 units in the comparison workspace.

**Rationale**: Prevents UI overcrowding and maintains readability on standard displays

**Priority**: Critical

#### Scenario: Capacity enforcement

**GIVEN** 4 units are already selected for comparison
**WHEN** user attempts to add a fifth unit
**THEN** the add action is disabled
**AND** the search input is disabled
**AND** a capacity indicator shows remaining slots

#### Scenario: Capacity indicator display

**GIVEN** N units are selected (where N < 4)
**WHEN** comparison view is rendered
**THEN** a message displays "You can add {4-N} more unit{s} to compare"
**AND** the message is hidden when N = 4

### Requirement: Search-to-Add Flow

The system SHALL provide a search-driven workflow for adding units to comparison.

**Rationale**: Enables quick discovery and selection from the canonical unit catalog

**Priority**: Critical

#### Scenario: Catalog loading

**GIVEN** user navigates to comparison page
**WHEN** page mounts
**THEN** system fetches catalog from `/api/catalog`
**AND** catalog is stored as `IUnitEntry[]`
**AND** loading state is displayed until fetch completes

#### Scenario: Search filtering

**GIVEN** catalog is loaded
**WHEN** user types search term in input field
**THEN** catalog is filtered by name OR chassis (case-insensitive)
**AND** results are limited to top 10 matches
**AND** dropdown displays filtered results
**AND** dropdown is hidden when search term is empty

#### Scenario: Unit selection from dropdown

**GIVEN** search results are displayed
**WHEN** user clicks a unit in dropdown
**THEN** system fetches full unit details from `/api/units?id={id}`
**AND** loading spinner displays for that unit
**AND** unit is added to `selectedUnits` array on success
**AND** search term is cleared
**AND** dropdown closes

#### Scenario: Duplicate prevention

**GIVEN** unit with id "atlas-as7-d" is already selected
**WHEN** user searches and finds "Atlas AS7-D" in results
**THEN** the unit shows "Added" status in dropdown
**AND** the add button is disabled for that unit
**AND** clicking the unit does nothing

#### Scenario: Loading state per unit

**GIVEN** user clicks to add a unit
**WHEN** API request is in flight
**THEN** loading spinner displays next to that unit in dropdown
**AND** the unit button is disabled
**AND** other units remain interactive

### Requirement: Comparison Statistics Display

The system SHALL display 8 core statistics for each selected unit.

**Rationale**: Provides essential combat and mobility comparison data

**Priority**: Critical

#### Scenario: Statistics list

**GIVEN** units are selected for comparison
**WHEN** comparison view is rendered
**THEN** the following statistics are displayed for each unit:

- Tonnage (with "t" suffix)
- Walk MP (movement points)
- Run MP (calculated as `Math.ceil(walk × 1.5)`)
- Jump MP (movement points, 0 if none)
- Engine (type and rating, e.g., "XL Fusion 300")
- Heat Sinks (count and type, e.g., "10 Double")
- Armor Type (e.g., "Ferro-Fibrous")
- Total Armor (calculated via `calculateTotalArmor()`, with "pts" suffix)

#### Scenario: Missing data handling

**GIVEN** unit data is incomplete
**WHEN** a statistic field is null or undefined
**THEN** the display follows the field's current component fallback:

- missing Jump MP displays `0` via `unit.movement?.jump || 0`
- missing Engine, Heat Sinks, or Armor displays `--` (ASCII double hyphen)
- missing Walk MP displays `--` via the current truthiness fallback
**AND** no error is thrown
**AND** an em dash glyph remains a desired typography requirement not used by the current components

#### Scenario: Run MP calculation

**GIVEN** unit has walk MP of 4
**WHEN** Run MP is calculated
**THEN** result is `Math.ceil(4 × 1.5) = 6`

**GIVEN** unit has no walk MP (null/undefined)
**WHEN** Run MP is calculated
**THEN** result is "--"

### Requirement: Responsive Layout

The system SHALL adapt comparison display based on viewport size.

**Rationale**: Ensures usability on mobile devices and tablets

**Priority**: High

#### Scenario: Desktop table layout

**GIVEN** viewport width >= 768px (md breakpoint)
**WHEN** comparison view is rendered
**THEN** units are displayed in a table with:

- First column: statistic labels
- Subsequent columns: one per unit
- Header row: unit name, tonnage, tech base, remove button
- Body rows: 8 statistics via `CompareRow` component

#### Scenario: Mobile card layout

**GIVEN** viewport width < 768px
**WHEN** comparison view is rendered
**THEN** units are displayed as stacked cards
**AND** each card contains:

- Header: unit name, tonnage, tech base, remove button
- Body: 8 statistics via `MobileStatRow` component (label + value pairs)

#### Scenario: Empty state

**GIVEN** no units are selected
**WHEN** comparison view is rendered
**THEN** `EmptyState` component displays with:

- Icon: compare icon
- Title: "No Units Selected"
- Message: "Use the search bar above to add units to compare"

### Requirement: Unit Removal

The system SHALL allow users to remove units from comparison.

**Rationale**: Enables iterative comparison workflows

**Priority**: High

#### Scenario: Remove unit action

**GIVEN** unit "Atlas AS7-D" is in comparison
**WHEN** user clicks remove button (X icon) for that unit
**THEN** unit is removed from `selectedUnits` array
**AND** comparison view updates immediately
**AND** search input is re-enabled if capacity was at maximum

#### Scenario: Remove button accessibility

**GIVEN** unit is displayed in comparison
**WHEN** remove button is rendered
**THEN** button has `aria-label` of "Remove {unit name} from comparison"
**AND** button has minimum touch target of 44×44px
**AND** button shows hover state (color change to red)

### Requirement: Data Type Distinction

The system SHALL distinguish between catalog entries and full unit details.

**Rationale**: Optimizes initial load performance and API payload size

**Priority**: Medium

#### Scenario: Catalog entry structure

**GIVEN** catalog is fetched from `/api/catalog`
**WHEN** data is received
**THEN** each entry conforms to `IUnitEntry` interface:

- `id`: string
- `name`: string
- `chassis`: string
- `tonnage`: number
- `techBase`: string

#### Scenario: Unit details structure

**GIVEN** unit is fetched from `/api/units?id={id}`
**WHEN** data is received
**THEN** entry conforms to `IUnitDetails` interface including:

- Required `id` and `tonnage` fields
- Optional identity fields such as `name`, `chassis`, `model`, `variant`, and `techBase`
- `movement`: { walk, jump }
- `engine`: { type, rating }
- `heatSinks`: { count, type }
- `armor`: { type, allocation }

### Requirement: Search Input State Management

The system SHALL manage search input state based on comparison capacity.

**Rationale**: Provides clear feedback when capacity is reached

**Priority**: Medium

#### Scenario: Input disabled at capacity

**GIVEN** 4 units are selected
**WHEN** search input is rendered
**THEN** input is disabled
**AND** placeholder text remains visible
**AND** input has disabled styling

#### Scenario: Input enabled below capacity

**GIVEN** fewer than 4 units are selected
**WHEN** search input is rendered
**THEN** input is enabled
**AND** placeholder shows "Search for a unit to add..."
**AND** input accepts keyboard input

---

## Data Model Requirements

### Required Interfaces

The implementation MUST use the comparison-contract shapes below. The code block is a partial comparison excerpt, not a replacement declaration for the live page types. The authoritative declarations are `src/types/pages/UnitPageTypes.ts`: `IUnitEntry` and `IUnitDetails` are independent interfaces, `IUnitDetails` requires only `id` and `tonnage` among the identity fields shown here, and `armor` uses `allocation`.

```typescript
/**
 * Lightweight catalog entry for search results
 */
interface IUnitEntry {
  /**
   * Unique unit identifier
   * @example "atlas-as7-d"
   */
  readonly id: string;

  /**
   * Full unit name
   * @example "Atlas AS7-D"
   */
  readonly name: string;

  /**
   * Chassis designation
   * @example "Atlas"
   */
  readonly chassis: string;

  /**
   * Unit mass in tons
   * @example 100
   */
  readonly tonnage: number;

  /**
   * Tech base
   * @example "Inner_Sphere"
   */
  readonly techBase: string;
}

/**
 * Full unit details for comparison display
 */
interface IUnitDetails {
  /**
   * Unit identifier (required by the live page type)
   */
  id: string;

  /**
   * Optional display identity fields; details are not an IUnitEntry extension
   */
  name?: string;
  chassis?: string;
  model?: string;
  variant?: string;

  /**
   * Unit mass (required by the live page type)
   */
  tonnage: number;

  /**
   * Optional technology identity field
   */
  techBase?: string;

  /**
   * Movement profile
   */
  movement?: {
    walk: number;
    jump: number;
  };

  /**
   * Engine specification
   */
  engine?: {
    type: string;
    rating: number;
  };

  /**
   * Heat sink configuration
   */
  heatSinks?: {
    count: number;
    type: string;
  };

  /**
   * Armor configuration
   */
  armor?: {
    type: string;
    allocation: Record<string, number | { front: number; rear: number }>;
  };
}
```

### Component Props

```typescript
/**
 * Props for desktop table row component
 */
interface CompareRowProps {
  /** Row label (statistic name) */
  label: string;

  /** Array of units to compare */
  units: IUnitDetails[];

  /** Function to extract value from unit */
  getValue: (unit: IUnitDetails) => string | number;

  /** Whether to use monospace font */
  mono?: boolean;
}

/**
 * Props for mobile card row component
 */
interface MobileStatRowProps {
  /** Statistic label */
  label: string;

  /** Statistic value */
  value: string | number;

  /** Whether to use monospace font */
  mono?: boolean;
}
```

### State Management

```typescript
/**
 * Component state structure
 */
interface ComparePageState {
  /** Full catalog of units (IUnitEntry[]) */
  catalog: IUnitEntry[];

  /** Current search term */
  searchTerm: string;

  /** Units selected for comparison (IUnitDetails[]) */
  selectedUnits: IUnitDetails[];

  /** Set of unit IDs currently loading */
  loadingUnits: Set<string>;

  /** Whether catalog is loading */
  catalogLoading: boolean;
}
```

---

## Calculation Formulas

### Run MP Calculation

**Formula**:

```
runMP = Math.ceil(walkMP × 1.5)
```

**Where**:

- `walkMP` = unit's walk movement points
- `runMP` = calculated run movement points

**Example**:

```
Input: walkMP = 4
Calculation: runMP = Math.ceil(4 × 1.5) = Math.ceil(6.0) = 6
Output: runMP = 6

Input: walkMP = 5
Calculation: runMP = Math.ceil(5 × 1.5) = Math.ceil(7.5) = 8
Output: runMP = 8
```

**Special Cases**:

- When `walkMP` is null/undefined: display "--"
- When `walkMP` is 0: current components treat `0` as missing via `|| '--'` and display "--" (parent product follow-up if zero walk must remain visible)
- Jump MP uses `unit.movement?.jump || 0`, so missing jump displays 0 rather than "--"

### Total Armor Calculation

**Formula**:

```
totalArmor = calculateTotalArmor(armor)
```

**Where**:

- `armor` = unit's armor configuration object (`IArmorConfig` with `allocation`)
- `calculateTotalArmor()` = `src/types/pages/UnitPageTypes.ts` utility that sums numeric allocation values plus front + rear only when both object fields are numeric; a front-only object is not a valid `IArmorFrontRear` allocation and is not counted

**Example**:

```
Input: armor = {
  type: "Standard",
  allocation: {
    head: 9,
    centerTorso: { front: 47, rear: 14 },
    leftTorso: { front: 32, rear: 10 },
    rightTorso: { front: 32, rear: 10 },
    leftArm: 34,
    rightArm: 34,
    leftLeg: 41,
    rightLeg: 41
  }
}
Calculation: 9 + 47 + 14 + 32 + 10 + 32 + 10 + 34 + 34 + 41 + 41 = 304
Output: "304 pts"
```

**Special Cases**:

- When `armor` is null/undefined: display "--"

---

## Validation Rules

### Validation: Maximum Capacity

**Rule**: `selectedUnits.length <= MAX_COMPARE`

**Where**: `MAX_COMPARE = 4`

**Error Handling**:

- When capacity is reached:
  - Disable search input
  - Disable add buttons in dropdown
  - Show capacity indicator message

**Implementation**:

```typescript
if (selectedUnits.length >= MAX_COMPARE) {
  // Disable add functionality
  return;
}
```

### Validation: Duplicate Prevention

**Rule**: Unit ID must not already exist in `selectedUnits`

**Check**:

```typescript
if (selectedUnits.some((u) => u.id === entry.id)) {
  // Unit already added, disable add button
  return;
}
```

**Error Handling**:

- Show "Added" status in dropdown
- Disable add button for that unit
- No error message displayed

### Validation: Search Term Filtering

**Rule**: Only show dropdown when `searchTerm` is non-empty

**Check**:

```typescript
if (!searchTerm) {
  // Hide dropdown
  return false;
}
```

**Filter Logic**:

```typescript
const search = searchTerm.toLowerCase();
return (
  unit.name.toLowerCase().includes(search) ||
  unit.chassis.toLowerCase().includes(search)
);
```

---

## UI Component Structure

### Page Layout

```
PageLayout
├── title: "Unit Comparison"
├── subtitle: "Compare up to 4 units side-by-side"
└── children:
    ├── Search Bar Section
    │   ├── Input (search field)
    │   └── Dropdown (conditional)
    │       └── Search Results List
    │           └── Unit Entry Buttons
    ├── Comparison Display Section
    │   ├── EmptyState (if no units)
    │   ├── Mobile Cards (< 768px)
    │   │   └── Card per unit
    │   │       ├── Header (name, tonnage, tech base, remove)
    │   │       └── MobileStatRow × 8
    │   └── Desktop Table (>= 768px)
    │       ├── Header Row (unit names, remove buttons)
    │       └── CompareRow × 8
    └── Capacity Indicator (conditional)
```

### Search Dropdown States

| State              | Condition                                | Display                                  |
| ------------------ | ---------------------------------------- | ---------------------------------------- |
| Hidden             | `searchTerm` is empty                    | No dropdown                              |
| Results            | `searchTerm` non-empty AND matches found | List of up to 10 units                   |
| No Results         | `searchTerm` non-empty AND no matches    | "No units found matching '{searchTerm}'" |
| Loading (per unit) | Unit add in progress                     | Spinner next to unit                     |
| Already Added      | Unit ID in `selectedUnits`               | "Added" label, disabled button           |
| Capacity Reached   | `selectedUnits.length >= MAX_COMPARE`    | All buttons disabled                     |

### Comparison Display States

| State               | Condition                                     | Display              |
| ------------------- | --------------------------------------------- | -------------------- |
| Empty               | `selectedUnits.length === 0`                  | EmptyState component |
| Populated (mobile)  | `selectedUnits.length > 0` AND width < 768px  | Stacked cards        |
| Populated (desktop) | `selectedUnits.length > 0` AND width >= 768px | Table layout         |

---

## Tech Base Variants

### Tech Base Display

**Inner Sphere Units**:

- Display: "Inner Sphere" (with underscores replaced by spaces)
- Example: `techBase: "Inner_Sphere"` → "Inner Sphere"

**Clan Units**:

- Display: "Clan"
- Example: `techBase: "Clan"` → "Clan"

**Mixed Tech Units**:

- Current components display `techBase.replace(/_/g, ' ')` only (`ComparePage.components.tsx`)
- Example: `techBase: "Inner_Sphere"` → "Inner Sphere"
- Example: `techBase: "Mixed"` remains "Mixed"; mapping Mixed → "Mixed Tech" is a retained desired label, not applied by that replace

---

## Dependencies

### Required Specifications

- **Page unit types**: `IUnitEntry`, `IUnitDetails`, and `calculateTotalArmor` in `src/types/pages/UnitPageTypes.ts`
- **Unit Services**: Canonical unit index and detail via `CanonicalUnitService` (`openspec/specs/unit-services/spec.md`)
- **Unit Entity Model**: Broader unit data structure (`openspec/specs/unit-entity-model/spec.md`)

### Required Utilities

- **calculateTotalArmor**: Sums `armor.allocation` (numbers plus front/rear objects)

### Required APIs

- **GET /api/catalog**: Returns `{ success: true, data: IUnitEntry[], count: number }` from `getCanonicalUnitService().getIndex()` (`src/pages/api/catalog.ts`)
- **GET /api/units?id={id}**: Returns `{ success: true, data: IUnitDetails }` (`src/pages/api/units.ts`)
- There is no `/api/compare` route

---

## Implementation Notes

### Performance Considerations

1. **Catalog Loading**: Fetch catalog once on mount, cache in state
2. **Search Filtering**: Client-side filtering of the catalog index (size figures such as 4,200 are estimates, not counted runtime proof)
3. **Result Limiting**: Limit to 10 results to prevent DOM bloat
4. **Lazy Loading**: Only fetch full unit details when added to comparison

### Edge Cases

1. **API Failure**: Log error, do not add unit to comparison
2. **Partial Data**: Display "--" for missing Engine, Heat Sinks, Armor, and current Walk MP; display `0` for missing Jump MP; do not crash
3. **Concurrent Adds**: Use `Set` for `loadingUnits` to prevent duplicate requests
4. **Search Clear**: Clear search term after successful add to reset dropdown

### Accessibility

1. **Search Input**: `aria-label="Search units to compare"`
2. **Add Buttons**: `aria-label="Add {unit name} to comparison"`
3. **Remove Buttons**: `aria-label="Remove {unit name} from comparison"`
4. **Touch Targets**: Minimum 44×44px for mobile buttons
5. **Keyboard Navigation**: Dropdown items should be keyboard-accessible

### Styling Conventions

1. **Monospace Stats**: Tonnage, Walk/Run/Jump MP, Total Armor use `font-mono`
2. **Text Stats**: Engine, Heat Sinks, Armor Type use default font
3. **Hover States**: Table rows use `hover:bg-surface-raised/20`
4. **Disabled States**: Opacity 50%, cursor not-allowed

---

## Examples

### Example: Adding a Unit

```typescript
// User types "Atlas" in search
setSearchTerm("Atlas");

// Filtered results (client-side)
const filteredCatalog = catalog
  .filter((unit) => {
    const search = "atlas";
    return (
      unit.name.toLowerCase().includes(search) ||
      unit.chassis.toLowerCase().includes(search)
    );
  })
  .slice(0, 10);
// Result: [{ id: "atlas-as7-d", name: "Atlas AS7-D", ... }, ...]

// User clicks "Atlas AS7-D"
addUnit({ id: "atlas-as7-d", name: "Atlas AS7-D", ... });

// Set loading state
setLoadingUnits(new Set(["atlas-as7-d"]));

// Fetch full details
const response = await fetch("/api/units?id=atlas-as7-d");
const data = await response.json();

// Add to comparison
setSelectedUnits([...selectedUnits, data.data]);

// Clear loading and search
setLoadingUnits(new Set());
setSearchTerm("");
```

### Example: Displaying Statistics (Desktop)

```tsx
<CompareRow
  label="Walk MP"
  units={selectedUnits}
  getValue={(u) => u.movement?.walk || "--"}
  mono
/>

// Renders:
<tr>
  <td>Walk MP</td>
  <td className="font-mono">4</td>
  <td className="font-mono">5</td>
  <td className="font-mono">3</td>
</tr>
```

### Example: Displaying Statistics (Mobile)

```tsx
<MobileStatRow
  label="Engine"
  value={unit.engine ? `${unit.engine.type} ${unit.engine.rating}` : "--"}
/>

// Renders:
<div className="flex items-center justify-between px-4 py-3">
  <span className="text-text-theme-secondary">Engine</span>
  <span className="text-white">XL Fusion 300</span>
</div>
```

### Example: Capacity Indicator

```tsx
{
  selectedUnits.length > 0 && selectedUnits.length < MAX_COMPARE && (
    <div className="text-text-theme-secondary mt-4 text-center text-sm">
      You can add {MAX_COMPARE - selectedUnits.length} more unit
      {MAX_COMPARE - selectedUnits.length > 1 ? 's' : ''} to compare
    </div>
  );
}

// With 2 units selected:
// "You can add 2 more units to compare"

// With 3 units selected:
// "You can add 1 more unit to compare"
```

---

## References

### Official Rules

- N/A (UI feature, not a game rule)

### Related Specifications

- `equipment-database/spec.md` - Equipment definitions; not the unit catalog source
- `unit-services/spec.md` - Canonical unit index and detail APIs
- `compendium-browser/spec.md` - Compendium unit browser (separate from `/compare`)

### External Dependencies

- React 19 - Component framework
- Tailwind CSS 4 - Styling
- Next.js 16 - API routes

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Defined search-to-add flow
- Specified 8 comparison statistics
- Documented responsive layout (desktop table vs mobile cards)
- Defined capacity enforcement (4 units max)
- Specified data type distinction (IUnitEntry vs IUnitDetails)


### Current implementation evidence boundary

`/compare` (`src/pages/compare/index.tsx`, `ComparePage.components.tsx`) consumes `GET /api/catalog` and `GET /api/units?id={id}` only — no `/api/compare`. Missing Engine, Heat Sinks, Armor, and current Walk MP render `--`; missing Jump MP renders `0`; armor uses `calculateTotalArmor(armor)` and the function sums `armor.allocation`; search is name or chassis, top 10; `MAX_COMPARE = 4`. Out-of-scope deferrals remain unimplemented. Source presence is not browser proof or runtime acceptance.
