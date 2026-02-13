# equipment-browser Specification

## Purpose

Provides a searchable, filterable equipment catalog UI for adding equipment to BattleMech units.

## Requirements

### Requirement: Equipment Categories

The Equipment Browser SHALL include all equipment types from the equipment database, including physical/melee weapons.

#### Scenario: Physical weapons in equipment list

- **WHEN** equipment browser loads equipment data
- **THEN** physical weapons (Hatchet, Sword, Claws, Mace, Lance, Talons, Retractable Blade, Flail, Wrecking Ball) are included
- **AND** physical weapons are categorized as PHYSICAL_WEAPON
- **AND** physical weapons appear when "Physical" category filter is active

#### Scenario: Variable property display

- **WHEN** physical weapon is displayed in equipment table
- **THEN** weight shows as 0 (variable based on mech tonnage)
- **AND** critical slots show as 0 (variable based on mech tonnage)
- **AND** the equipment can be added to the unit loadout

### Requirement: Equipment Table Display

The system SHALL display equipment in a sortable table format.

#### Scenario: Table columns

- **WHEN** equipment table is rendered
- **THEN** columns show Name, Category, Tech, Weight, Crits, Damage, Heat
- **AND** columns are sortable by clicking headers
- **AND** sort direction indicator shows current sort

### Requirement: Equipment Filtering

The system SHALL provide filters for narrowing equipment selection.

#### Scenario: Tech base filter

- **WHEN** user selects tech base filter (IS, Clan, All)
- **THEN** only equipment matching the filter is displayed
- **AND** filter defaults to unit's tech base

#### Scenario: Category filter

- **WHEN** user selects equipment category
- **THEN** only equipment in that category is displayed
- **AND** pagination resets to first page

#### Scenario: Search filter

- **WHEN** user types in search box
- **THEN** equipment is filtered by name match
- **AND** search is case-insensitive

### Requirement: Category Toggle Selection

The system SHALL provide toggle buttons for category filtering with exclusive and multi-select modes.

#### Scenario: Exclusive selection (single click)

- **WHEN** user clicks a category button
- **THEN** only that category is selected
- **AND** all other categories are deselected
- **AND** equipment list shows only items in that category

#### Scenario: Multi-select (Ctrl+click)

- **WHEN** user Ctrl+clicks (or Cmd+clicks on Mac) a category button
- **THEN** category is toggled (added or removed from selection)
- **AND** other selected categories remain selected
- **AND** equipment list shows items in all selected categories

#### Scenario: Show All button

- **WHEN** user clicks "Show All"
- **THEN** all category filters are cleared
- **AND** equipment list shows all available equipment

### Requirement: Combined "Other" Category

The system SHALL treat "Other" as a combined category for non-primary equipment.

#### Scenario: Other category contents

- **WHEN** "Other" category is selected
- **THEN** equipment list includes Electronics category items
- **AND** equipment list includes Misc Equipment category items
- **AND** equipment list includes items with additionalCategories containing MISC_EQUIPMENT

#### Scenario: Dual-category equipment visibility

- **WHEN** equipment has additionalCategories (e.g., AMS)
- **THEN** equipment appears when its primary category is selected
- **AND** equipment appears when any of its additionalCategories is selected

### Requirement: Excluded Equipment

The system SHALL exclude equipment configured via the Structure tab.

#### Scenario: Structure-tab equipment

- **WHEN** equipment browser loads items
- **THEN** Jump Jets are NOT displayed (configured in Movement section)
- **AND** Heat Sinks are NOT displayed (configured in Heat Sink section)

### Requirement: Pagination

The system SHALL paginate large equipment lists.

#### Scenario: Pagination controls

- **WHEN** equipment list exceeds page size
- **THEN** pagination controls show page numbers
- **AND** previous/next buttons are enabled appropriately
- **AND** page size can be changed (10, 25, 50, 100)

### Requirement: Add Equipment Action

The system SHALL provide an Add button for each equipment row to add it to the unit.

#### Scenario: Add equipment from row

- **WHEN** user clicks Add button on equipment row
- **THEN** equipment is added to the unit's mounted equipment list
- **AND** loadout sidebar updates to show the new item
- **AND** status bar totals update immediately

### Requirement: Equipment Details Display

The system SHALL display relevant equipment statistics.

#### Scenario: Equipment row

- **WHEN** equipment row is displayed
- **THEN** name is shown with type color coding
- **AND** tech base badge shows IS or CLAN
- **AND** weight and slots are displayed
- **AND** damage and heat are shown for weapons

### Requirement: Loading and Error States

The system SHALL handle loading and error states gracefully.

#### Scenario: Loading state

- **WHEN** equipment data is loading
- **THEN** loading skeleton is displayed
- **AND** filters are disabled

#### Scenario: Error state

- **WHEN** equipment data fails to load
- **THEN** error message is displayed
- **AND** retry button is available

### Requirement: Range Brackets Column

The Equipment Browser SHALL display weapon range brackets in the equipment table.

#### Scenario: Range column display for weapons

- **WHEN** equipment is a weapon (energy, ballistic, missile, artillery, physical)
- **THEN** Range column displays Short/Medium/Long values in "S/M/L" format
- **AND** values are separated by forward slashes (e.g., "3/6/9")

#### Scenario: Range column display for non-weapons

- **WHEN** equipment is not a weapon (ammo, electronics, misc)
- **THEN** Range column displays dash (-)

#### Scenario: Partial range data

- **WHEN** weapon has only long range defined (e.g., minimum range weapons)
- **THEN** Range column displays only the long range value

#### Scenario: Mobile range display

- **WHEN** viewport is mobile width
- **THEN** Range column appears after Damage column
- **AND** column header shows "RNG"
- **AND** column content aligns with header

### Requirement: Category Filter Bar Layout

The equipment browser category filter buttons SHALL be displayed in a balanced grid for even row distribution.

#### Scenario: Filter button layout

- **WHEN** category filter buttons render
- **THEN** buttons are displayed in BalancedGrid component
- **AND** minItemWidth is 85px to account for icon+label width
- **AND** gap is 4px between buttons

#### Scenario: Balanced row distribution

- **WHEN** 8 category buttons render (Energy, Ballistic, Missile, Artillery, Physical, Ammo, Other, All)
- **THEN** buttons are distributed as 4+4 across two rows when container is narrow
- **AND** buttons show in single row when container is wide enough
- **AND** NOT as 7+1 or 5+3 uneven distribution

#### Scenario: Fallback grid template

- **WHEN** grid is in fallback state (before measurement)
- **THEN** uses `repeat(auto-fill, minmax(40px, 1fr))`
- **AND** allows natural wrapping until balanced calculation is ready

#### Scenario: Button content

- **WHEN** category button renders
- **THEN** icon emoji is always visible
- **AND** text label is hidden on mobile (hidden sm:inline)
- **AND** this affects actual button width vs minItemWidth calculation

---

## Hook Architecture

### Requirement: useEquipmentBrowser Orchestrator Hook

The system SHALL provide a `useEquipmentBrowser` hook that orchestrates equipment browsing with filtering, sorting, and pagination.

**Source**: `src/hooks/useEquipmentBrowser.ts:170-351`

#### Scenario: Hook initialization

- **GIVEN** equipment browser component mounts
- **WHEN** `useEquipmentBrowser()` is called
- **THEN** equipment is loaded from `equipmentLookupService`
- **AND** unit context (year, tech base, weapon IDs) is synced from unit store if available
- **AND** loading state is set to true during initialization
- **AND** error state is set if loading fails

#### Scenario: Unit context synchronization

- **GIVEN** equipment browser is used within a unit context (BattleMech or Vehicle)
- **WHEN** unit's year, tech base, or equipment changes
- **THEN** equipment store's unit context is updated
- **AND** availability filtering reflects the new unit context
- **AND** ammo filtering reflects the new weapon list

#### Scenario: Standalone usage without unit context

- **GIVEN** equipment browser is used outside a unit context
- **WHEN** `useEquipmentBrowser()` is called
- **THEN** unit context values are null
- **AND** equipment browser functions normally without availability filtering
- **AND** no errors are thrown for missing context

#### Scenario: Filtered equipment computation

- **GIVEN** equipment data is loaded
- **WHEN** filters, search, or sort state changes
- **THEN** filtered equipment is recomputed via `getFilteredEquipment()`
- **AND** pagination resets to page 1
- **AND** total pages is recalculated based on filtered count

#### Scenario: Paginated equipment computation

- **GIVEN** filtered equipment is available
- **WHEN** page or page size changes
- **THEN** paginated equipment is computed via `getPaginatedEquipment()`
- **AND** only items for the current page are returned
- **AND** pagination controls reflect the current page state

### Requirement: useEquipmentCalculations Hook

The system SHALL provide a `useEquipmentCalculations` hook that computes total weight, critical slots, and heat for mounted equipment.

**Source**: `src/hooks/useEquipmentCalculations.ts:110-160`

#### Scenario: Equipment totals calculation

- **GIVEN** unit has mounted equipment
- **WHEN** `useEquipmentCalculations(equipment)` is called
- **THEN** total weight is computed via `getTotalEquipmentWeight()`
- **AND** total critical slots is computed via `getTotalEquipmentSlots()`
- **AND** total heat is summed from all equipment items
- **AND** item count reflects total number of equipment instances

#### Scenario: Allocated vs unallocated separation

- **GIVEN** unit has both allocated and unallocated equipment
- **WHEN** calculations are performed
- **THEN** allocated equipment (location !== undefined) is separated
- **AND** unallocated equipment (location === undefined) is separated
- **AND** allocated count and unallocated count are provided
- **AND** both lists are available for UI display

#### Scenario: Category-level summaries

- **GIVEN** equipment spans multiple categories
- **WHEN** calculations are performed
- **THEN** equipment is grouped by category via `getEquipmentByCategory()`
- **AND** each category summary includes count, weight, slots, heat
- **AND** all EquipmentCategory values have a summary (empty if no items)

#### Scenario: Registry-aware heat calculation

- **GIVEN** equipment registry is ready
- **WHEN** calculations are performed
- **THEN** heat values are taken from equipment items
- **AND** calculations trigger re-computation when registry becomes ready
- **AND** heat totals reflect accurate values from the registry

### Requirement: useEquipmentFiltering Hook

The system SHALL provide a `useEquipmentFiltering` hook that filters equipment by category and separates allocated/unallocated items.

**Source**: `src/hooks/useEquipmentFiltering.ts:22-65`

#### Scenario: Category filtering

- **GIVEN** equipment with various categories
- **WHEN** `useEquipmentFiltering(equipment, activeCategory)` is called
- **THEN** filtered equipment includes only items matching activeCategory
- **AND** activeCategory 'ALL' returns all equipment
- **AND** activeCategory MISC_EQUIPMENT returns items in OTHER_CATEGORIES

#### Scenario: Other category expansion

- **GIVEN** activeCategory is MISC_EQUIPMENT
- **WHEN** filtering is applied
- **THEN** equipment in MISC_EQUIPMENT category is included
- **AND** equipment in PHYSICAL_WEAPON category is included
- **AND** equipment in MOVEMENT category is included
- **AND** equipment in ARTILLERY category is included
- **AND** equipment in STRUCTURAL category is included

#### Scenario: Allocated/unallocated grouping

- **GIVEN** filtered equipment
- **WHEN** filtering is applied
- **THEN** unallocated items (isAllocated = false) are grouped separately
- **AND** allocated items (isAllocated = true) are grouped separately
- **AND** both groups are further grouped by category via `groupByCategory()`

### Requirement: useEquipmentRegistry Hook

The system SHALL provide a `useEquipmentRegistry` hook that tracks equipment registry initialization state.

**Source**: `src/hooks/useEquipmentRegistry.ts:25-59`

#### Scenario: Registry initialization tracking

- **GIVEN** equipment registry is not yet initialized
- **WHEN** `useEquipmentRegistry()` is called
- **THEN** isReady is false
- **AND** registry initialization is triggered
- **AND** isReady becomes true when initialization completes

#### Scenario: Already initialized registry

- **GIVEN** equipment registry is already initialized
- **WHEN** `useEquipmentRegistry()` is called
- **THEN** isReady is immediately true
- **AND** no additional initialization is triggered

#### Scenario: Initialization failure handling

- **GIVEN** equipment registry initialization fails
- **WHEN** initialization error occurs
- **THEN** error is logged via logger.error
- **AND** isReady remains false
- **AND** component can handle the failure gracefully

#### Scenario: Manual ready state recheck

- **GIVEN** registry state may have changed externally
- **WHEN** `recheckReady()` is called
- **THEN** registry ready state is re-evaluated
- **AND** isReady is updated if registry became ready
- **AND** component re-renders with new state

### Requirement: useEquipmentStore Zustand Store

The system SHALL provide a `useEquipmentStore` Zustand store that manages equipment catalog state including filters, search, pagination, and sorting.

**Source**: `src/stores/useEquipmentStore.ts:213-583`

#### Scenario: Store initialization

- **GIVEN** equipment store is created
- **WHEN** store is first accessed
- **THEN** equipment array is empty
- **AND** isLoading is false
- **AND** error is null
- **AND** filters are set to DEFAULT_FILTERS
- **AND** pagination is set to DEFAULT_PAGINATION (page 1, size 25)
- **AND** sort is set to DEFAULT_SORT (name, asc)

#### Scenario: Equipment data loading

- **GIVEN** equipment data is fetched
- **WHEN** `setEquipment(items)` is called
- **THEN** equipment array is updated
- **AND** pagination.totalItems is set to items.length
- **AND** current page remains unchanged

#### Scenario: Unit context synchronization

- **GIVEN** unit year, tech base, or weapon IDs change
- **WHEN** `setUnitContext(year, techBase, weaponIds)` is called
- **THEN** unitContext is updated with new values
- **AND** pagination resets to page 1
- **AND** filtered equipment reflects new availability rules

#### Scenario: Search filtering

- **GIVEN** user types in search box
- **WHEN** `setSearch(query)` is called
- **THEN** filters.search is updated
- **AND** pagination resets to page 1
- **AND** filtered equipment includes only items with names containing query (case-insensitive)

#### Scenario: Tech base filtering

- **GIVEN** user selects tech base filter
- **WHEN** `setTechBaseFilter(techBase)` is called
- **THEN** filters.techBase is updated
- **AND** pagination resets to page 1
- **AND** filtered equipment includes only items matching techBase

#### Scenario: Category selection (exclusive mode)

- **GIVEN** user clicks a category button without Ctrl
- **WHEN** `selectCategory(category, false)` is called
- **THEN** activeCategories is set to only the selected category
- **AND** showAllCategories is set to false
- **AND** pagination resets to page 1
- **AND** filtered equipment shows only items in that category

#### Scenario: Category selection (multi-select mode)

- **GIVEN** user Ctrl+clicks a category button
- **WHEN** `selectCategory(category, true)` is called
- **THEN** category is toggled in activeCategories
- **AND** other selected categories remain selected
- **AND** pagination resets to page 1
- **AND** filtered equipment shows items in all selected categories

#### Scenario: Other category multi-select

- **GIVEN** user Ctrl+clicks "Other" (MISC_EQUIPMENT) category
- **WHEN** `selectCategory(MISC_EQUIPMENT, true)` is called
- **THEN** all OTHER_COMBINED_CATEGORIES are toggled together
- **AND** MISC_EQUIPMENT and ELECTRONICS are both added or removed
- **AND** filtered equipment reflects the combined category selection

#### Scenario: Show all categories

- **GIVEN** user clicks "Show All" button
- **WHEN** `showAllCategories()` is called
- **THEN** activeCategories is cleared
- **AND** showAllCategories is set to true
- **AND** pagination resets to page 1
- **AND** filtered equipment shows all items

#### Scenario: Hide prototype toggle

- **GIVEN** user toggles "Hide Prototype" filter
- **WHEN** `toggleHidePrototype()` is called
- **THEN** filters.hidePrototype is toggled
- **AND** pagination resets to page 1
- **AND** filtered equipment excludes items with rulesLevel 'Experimental' or name containing 'prototype'

#### Scenario: Hide one-shot toggle

- **GIVEN** user toggles "Hide One-Shot" filter
- **WHEN** `toggleHideOneShot()` is called
- **THEN** filters.hideOneShot is toggled
- **AND** pagination resets to page 1
- **AND** filtered equipment excludes items with name containing 'one-shot'

#### Scenario: Hide unavailable toggle

- **GIVEN** user toggles "Hide Unavailable" filter
- **WHEN** `toggleHideUnavailable()` is called
- **THEN** filters.hideUnavailable is toggled
- **AND** pagination resets to page 1
- **AND** filtered equipment excludes items with introductionYear > unitYear
- **AND** filtered equipment excludes items with incompatible techBase

#### Scenario: Hide ammo without weapon toggle

- **GIVEN** user toggles "Hide Ammo Without Weapon" filter
- **WHEN** `toggleHideAmmoWithoutWeapon()` is called
- **THEN** filters.hideAmmoWithoutWeapon is toggled
- **AND** pagination resets to page 1
- **AND** filtered equipment excludes ammunition without matching weapon in unitWeaponIds

#### Scenario: Ammo-weapon matching logic

- **GIVEN** hideAmmoWithoutWeapon is true and unit has weapons
- **WHEN** filtering is applied
- **THEN** ammo name is normalized (replace '-' with '/')
- **AND** weapon ID is normalized (replace '-' with '/')
- **AND** ammo is included if normalized ammo name contains normalized weapon ID
- **AND** ammo is included if ammo name contains weapon ID without separator

#### Scenario: Sorting by column

- **GIVEN** user clicks a sortable column header
- **WHEN** `setSort(column)` is called
- **THEN** sort.column is set to the clicked column
- **AND** sort.direction toggles between 'asc' and 'desc' if same column
- **AND** sort.direction is 'asc' if different column
- **AND** pagination resets to page 1
- **AND** filtered equipment is sorted by the selected column

#### Scenario: Pagination controls

- **GIVEN** filtered equipment spans multiple pages
- **WHEN** `setPage(page)` is called
- **THEN** pagination.currentPage is updated
- **AND** paginated equipment shows items for the new page
- **WHEN** `setPageSize(size)` is called
- **THEN** pagination.pageSize is updated
- **AND** pagination.currentPage resets to 1
- **AND** total pages is recalculated

#### Scenario: Clear all filters

- **GIVEN** user has applied multiple filters
- **WHEN** `clearFilters()` is called
- **THEN** all filters are reset to DEFAULT_FILTERS
- **AND** activeCategories is cleared
- **AND** pagination resets to page 1
- **AND** filtered equipment shows all items

#### Scenario: Filtered equipment computation

- **GIVEN** equipment data and filters are set
- **WHEN** `getFilteredEquipment()` is called
- **THEN** equipment is filtered by search query
- **AND** equipment is filtered by tech base
- **AND** equipment is filtered by category (legacy single category)
- **AND** equipment is filtered by activeCategories (multi-select)
- **AND** equipment is filtered by hidePrototype
- **AND** equipment is filtered by hideOneShot
- **AND** equipment is filtered by hideUnavailable
- **AND** equipment is filtered by hideAmmoWithoutWeapon
- **AND** equipment is filtered by maxWeight
- **AND** equipment is filtered by maxCriticalSlots
- **AND** equipment is filtered by maxYear
- **AND** equipment is sorted by sort.column and sort.direction

#### Scenario: Paginated equipment computation

- **GIVEN** filtered equipment is available
- **WHEN** `getPaginatedEquipment()` is called
- **THEN** start index is calculated as (currentPage - 1) × pageSize
- **AND** end index is calculated as startIndex + pageSize
- **AND** filtered equipment is sliced to return only items in range
- **AND** returned array contains at most pageSize items

---

## Data Model Requirements

### EquipmentBrowserState Interface

**Source**: `src/hooks/useEquipmentBrowser.ts:30-92`

```typescript
interface EquipmentBrowserState {
  // Data
  readonly equipment: readonly IEquipmentItem[];
  readonly filteredEquipment: readonly IEquipmentItem[];
  readonly paginatedEquipment: readonly IEquipmentItem[];
  readonly isLoading: boolean;
  readonly error: string | null;

  // Unit context
  readonly unitYear: number | null;
  readonly unitTechBase: TechBase | null;

  // Pagination
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly totalItems: number;

  // Filters
  readonly search: string;
  readonly techBaseFilter: TechBase | null;
  readonly categoryFilter: EquipmentCategory | null;
  readonly activeCategories: Set<EquipmentCategory>;
  readonly showAllCategories: boolean;
  readonly hidePrototype: boolean;
  readonly hideOneShot: boolean;
  readonly hideUnavailable: boolean;
  readonly hideAmmoWithoutWeapon: boolean;

  // Sort
  readonly sortColumn: SortColumn;
  readonly sortDirection: 'asc' | 'desc';

  // Filter actions
  readonly setSearch: (search: string) => void;
  readonly setTechBaseFilter: (techBase: TechBase | null) => void;
  readonly setCategoryFilter: (category: EquipmentCategory | null) => void;
  readonly selectCategory: (
    category: EquipmentCategory,
    isMultiSelect: boolean,
  ) => void;
  readonly showAll: () => void;
  readonly toggleHidePrototype: () => void;
  readonly toggleHideOneShot: () => void;
  readonly toggleHideUnavailable: () => void;
  readonly toggleHideAmmoWithoutWeapon: () => void;
  readonly clearFilters: () => void;

  // Pagination actions
  readonly setPage: (page: number) => void;
  readonly setPageSize: (size: number) => void;
  readonly goToFirstPage: () => void;
  readonly goToLastPage: () => void;
  readonly goToPreviousPage: () => void;
  readonly goToNextPage: () => void;

  // Sort actions
  readonly setSort: (column: SortColumn) => void;

  // Utility
  readonly refresh: () => void;
}
```

### ICategorySummary Interface

**Source**: `src/hooks/useEquipmentCalculations.ts:28-33`

```typescript
interface ICategorySummary {
  readonly count: number;
  readonly weight: number;
  readonly slots: number;
  readonly heat: number;
}
```

### EquipmentCalculations Interface

**Source**: `src/hooks/useEquipmentCalculations.ts:38-57`

```typescript
interface EquipmentCalculations {
  readonly totalWeight: number;
  readonly totalSlots: number;
  readonly totalHeat: number;
  readonly itemCount: number;
  readonly allocatedCount: number;
  readonly unallocatedCount: number;
  readonly byCategory: Record<EquipmentCategory, ICategorySummary>;
  readonly unallocatedEquipment: readonly IMountedEquipmentInstance[];
  readonly allocatedEquipment: readonly IMountedEquipmentInstance[];
}
```

### SortColumn Type

**Source**: `src/stores/useEquipmentStore.ts:34-41`

```typescript
type SortColumn =
  | 'name'
  | 'category'
  | 'techBase'
  | 'weight'
  | 'criticalSlots'
  | 'damage'
  | 'heat';
```

### SortDirection Type

**Source**: `src/stores/useEquipmentStore.ts:29`

```typescript
type SortDirection = 'asc' | 'desc';
```

### UnitContext Interface

**Source**: `src/stores/useEquipmentStore.ts:47-54`

```typescript
interface UnitContext {
  readonly unitYear: number | null;
  readonly unitTechBase: TechBase | null;
  readonly unitWeaponIds: readonly string[];
}
```

### EquipmentFilters Interface

**Source**: `src/stores/useEquipmentStore.ts:59-84`

```typescript
interface EquipmentFilters {
  readonly search: string;
  readonly techBase: TechBase | null;
  readonly category: EquipmentCategory | null;
  readonly activeCategories: Set<EquipmentCategory>;
  readonly showAllCategories: boolean;
  readonly hidePrototype: boolean;
  readonly hideOneShot: boolean;
  readonly hideUnavailable: boolean;
  readonly hideAmmoWithoutWeapon: boolean;
  readonly maxWeight: number | null;
  readonly maxCriticalSlots: number | null;
  readonly maxYear: number | null;
}
```

### PaginationState Interface

**Source**: `src/stores/useEquipmentStore.ts:89-93`

```typescript
interface PaginationState {
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalItems: number;
}
```

### SortState Interface

**Source**: `src/stores/useEquipmentStore.ts:98-101`

```typescript
interface SortState {
  readonly column: SortColumn;
  readonly direction: SortDirection;
}
```

### OTHER_COMBINED_CATEGORIES Constant

**Source**: `src/stores/useEquipmentStore.ts:21-24`

The "Other" category (MISC_EQUIPMENT) SHALL include the following combined categories:

```typescript
const OTHER_COMBINED_CATEGORIES: readonly EquipmentCategory[] = [
  EquipmentCategory.MISC_EQUIPMENT,
  EquipmentCategory.ELECTRONICS,
];
```

**Note**: The equipment tray uses a different OTHER_CATEGORIES definition that includes PHYSICAL_WEAPON, MOVEMENT, ARTILLERY, and STRUCTURAL. The equipment browser uses a narrower definition focused on non-weapon equipment.

---

## Non-Goals

- Equipment database management (handled by `equipmentLookupService`)
- Equipment registry initialization logic (handled by `EquipmentRegistry`)
- Equipment mounting and critical slot allocation (handled by unit stores and critical slot allocation system)
- Equipment validation rules (handled by construction rules)
- Equipment cost and Battle Value calculations (handled by separate calculation systems)
- Record sheet rendering (handled by record sheet system)
- Equipment import/export (handled by unit import/export system)
