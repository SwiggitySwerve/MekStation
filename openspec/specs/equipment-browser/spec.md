# equipment-browser Specification

## Purpose

Provides a searchable, filterable equipment catalog UI for adding equipment to the active unit in the customizer.

This capability is the **customizer catalog**, not the read-only Compendium catalog at `/compendium/equipment` (`openspec/specs/compendium-browser/spec.md`). Both surfaces load equipment definitions through `EquipmentLookupService`; they do not share `useEquipmentStore` filter, sort, or pagination state.

## Active route and data authority

- **Route:** `src/pages/customizer/[[...slug]].tsx` (`/customizer`, `/customizer/[unitId]`, `/customizer/[unitId]/equipment` via tab `id: 'equipment'`). No standalone `/equipment` page. UI: `EquipmentBrowser.tsx`, `CompactFilterBar.tsx`, `EquipmentCatalogCard.tsx`.
- **Data authority:** `getEquipmentLookupService()` (`src/services/equipment/EquipmentLookupService.ts`). Jump Jets and Heat Sinks omitted via `EXCLUDED_MISC_CATEGORIES`.
- **Store:** `useEquipmentStore` + `useEquipmentStore.filters.ts` (`filterEquipment`, `CATALOG_OTHER_CATEGORIES`); `useEquipmentBrowser` loads `getAllEquipment()` and syncs unit year/tech base/weapon IDs from unit or vehicle store context. Compendium `/compendium/equipment` uses page-local state and `GET /api/equipment/catalog` — shared definitions, not shared store.
- **Tray vs catalog Other:** catalog `CATALOG_OTHER_CATEGORIES` is MISC_EQUIPMENT, MOVEMENT, STRUCTURAL. Tray `OTHER_CATEGORIES` also includes PHYSICAL_WEAPON and ARTILLERY. Do not treat them as one filter.

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
- **THEN** variable weight and critical slots are labeled Variable rather than presented as fixed zero values
- **AND** expanded details explain that values are calculated for the active unit when added
- **AND** Add or Add and place uses the existing construction calculations

### Requirement: Equipment Table Display

The system SHALL display a dense catalog whose desktop header and collapsed rows share aligned columns.

#### Scenario: Desktop catalog columns

- **WHEN** the equipment catalog is rendered at desktop width
- **THEN** Name, Type, Tons, Slots, Heat, and Add occupy one six-column grid
- **AND** Name, Tons, and Slots expose sort controls and the selected sort direction
- **AND** the sticky header remains in the same scroll region as the catalog rows

#### Scenario: Narrow catalog

- **WHEN** the catalog is displayed at a narrow viewport
- **THEN** each row retains its equipment name, technology, weight or variable-property summary, detail toggle, and accessible Add control
- **AND** the Sort menu exposes Name, Tons, and Slots without requiring desktop columns
- **AND** expanding details makes weapon and equipment statistics available

### Requirement: Equipment Filtering

The system SHALL provide filters for narrowing equipment selection.

#### Scenario: Tech base filter

- **WHEN** user selects tech base filter (IS, Clan, All)
- **THEN** only equipment matching the filter is displayed
- **AND** dedicated `filters.techBase` defaults to null (all tech bases)
- **AND** `filters.hideUnavailable` defaults to true, which additionally hides items whose introduction year is after `unitContext.unitYear` or whose tech base is incompatible with `unitContext.unitTechBase` when unit context exists

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

- **WHEN** user clicks an ordinary category button
- **THEN** only that category is selected
- **AND** all other categories are deselected
- **AND** equipment list shows only items in that category
- **WHEN** the selected category is Other (`MISC_EQUIPMENT`)
- **THEN** the catalog selects `MISC_EQUIPMENT`, `MOVEMENT`, and `STRUCTURAL`
- **AND** Electronics, Physical, and Artillery remain excluded unless selected
  independently or admitted through an explicit secondary classification

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

The system SHALL treat Other as the remaining utility categories while providing Electronics as an independent primary filter.

#### Scenario: Independent Electronics selection

- **WHEN** Electronics is selected
- **THEN** the list includes Electronics and its explicit secondary classifications
- **AND** ammunition visibility does not determine whether Electronics can be found

#### Scenario: Other and multiple selection

- **WHEN** Other is selected or combined with another category
- **THEN** utility equipment and explicit secondary classifications are included
- **AND** Electronics requires independent selection or explicit Other classification
- **AND** Show All clears legacy and multiple-category restrictions

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
- **THEN** pagination controls show current/last page with first/previous/next/last enabled appropriately
- **AND** store default `pagination.pageSize` is 25; `setPageSize` exists on the store/hook
- **AND** a visible 10/25/50/100 page-size control remains a desired requirement not on the current `EquipmentBrowser` footer

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
- **THEN** the catalog shows a loading status (current `EquipmentBrowser` text: "Loading equipment...")
- **AND** a distinct skeleton remains desired; retry is offered after a load error

#### Scenario: Error state

- **WHEN** equipment data fails to load
- **THEN** error message is displayed
- **AND** retry button is available

### Requirement: Weapon Range Details

The Equipment Browser SHALL expose available weapon range data in an expandable catalog row.

#### Scenario: Weapon with range data

- **WHEN** the user expands a weapon row with range data
- **THEN** details show Range (S / M / L) using the short, medium, and long values
- **AND** a nonzero minimum range is shown separately
- **AND** these details remain available on desktop and narrow viewports

#### Scenario: Equipment without weapon ranges

- **WHEN** an item has no weapon-range data
- **THEN** its details do not invent ranges or reserve a misleading range column

### Requirement: Category Filter Bar Layout

The equipment catalog SHALL separate search and visibility controls from an independently scrollable category strip.

#### Scenario: Category strip

- **WHEN** the catalog filters render
- **THEN** the Equipment categories group provides All, Energy, Ballistic, Missile, Artillery, Physical, Ammo, Electronics, and Other
- **AND** each button exposes its text name, pressed state, and at least a 44px hit target
- **AND** narrow widths scroll the strip horizontally without overflowing the document

#### Scenario: Search and visibility

- **WHEN** the user searches equipment or opens Filters
- **THEN** search and the Prototype, One-shot, Ammo without weapon, and Unavailable toggles remain independently operable
- **AND** the interface explains ammunition compatibility and category multi-selection
- **AND** enabled visibility filters remain observable and can be cleared

### Requirement: useEquipmentBrowser Orchestrator Hook

The system SHALL provide a `useEquipmentBrowser` hook that orchestrates equipment browsing with filtering, sorting, and pagination.

**Source**: `src/hooks/useEquipmentBrowser.ts` (`useEquipmentBrowser`, `EquipmentBrowserState`)

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

The system SHALL provide a `useEquipmentCalculations` hook that computes total weight, critical slots, and heat for **mounted** equipment. This hook is loadout/tray totaling (`@spec openspec/specs/equipment-tray/spec.md`), not catalog filtering.

**Source**: `src/hooks/useEquipmentCalculations.ts` (`useEquipmentCalculations`)

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

The system SHALL provide a `useEquipmentFiltering` hook that filters **mounted loadout** equipment by category and separates allocated/unallocated items. This hook uses tray `OTHER_CATEGORIES` from `src/components/customizer/equipment/equipmentConstants.ts`, not catalog `CATALOG_OTHER_CATEGORIES`.

**Source**: `src/hooks/useEquipmentFiltering.ts` (`useEquipmentFiltering`)

#### Scenario: Category filtering

- **GIVEN** equipment with various categories
- **WHEN** `useEquipmentFiltering(equipment, activeCategory)` is called
- **THEN** filtered equipment includes only items matching activeCategory
- **AND** activeCategory 'ALL' returns all equipment
- **AND** activeCategory MISC_EQUIPMENT returns items in OTHER_CATEGORIES

#### Scenario: Other category expansion

- **GIVEN** activeCategory is MISC_EQUIPMENT on the loadout-tray hook
- **WHEN** filtering is applied
- **THEN** equipment in tray `OTHER_CATEGORIES` is included: MISC_EQUIPMENT, PHYSICAL_WEAPON, MOVEMENT, ARTILLERY, and STRUCTURAL
- **AND** this expansion SHALL NOT be used as the customizer catalog Other set (`CATALOG_OTHER_CATEGORIES` excludes PHYSICAL_WEAPON, ARTILLERY, and ELECTRONICS)

#### Scenario: Allocated/unallocated grouping

- **GIVEN** filtered equipment
- **WHEN** filtering is applied
- **THEN** unallocated items (isAllocated = false) are grouped separately
- **AND** allocated items (isAllocated = true) are grouped separately
- **AND** both groups are further grouped by category via `groupByCategory()`

### Requirement: useEquipmentRegistry Hook

The system SHALL provide a `useEquipmentRegistry` hook that tracks equipment registry initialization state.

**Source**: `src/hooks/useEquipmentRegistry.ts` (`useEquipmentRegistry`)

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

**Source**: `src/stores/useEquipmentStore.ts` (`useEquipmentStore`, `EquipmentStoreState`)

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
- **THEN** all CATALOG_OTHER_CATEGORIES are toggled together
- **AND** MISC_EQUIPMENT, MOVEMENT, and STRUCTURAL are added or removed together
- **AND** independently selected ELECTRONICS is preserved
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
- **AND** filtered equipment excludes items whose name matches `/(?:one[ -]shot|\((?:i-)?os\))/i`

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
- **THEN** declared compatibleWeaponIds are compared with mounted weapon IDs
- **AND** declarations take precedence over the fallback
- **AND** only ammunition without compatibility declarations may use an exact normalized identity or complete normalized mounted-weapon name
- **AND** partial names SHALL NOT admit ammunition for a different weapon

#### Scenario: Sorting by column

- **GIVEN** user clicks a sortable column header
- **WHEN** `setSort(column)` is called
- **THEN** sort.column is set to the clicked column
- **AND** sort.direction toggles between 'asc' and 'desc' if same column
- **AND** sort.direction is 'asc' if different column
- **AND** pagination resets to page 1
- **AND** filtered equipment is sorted by `compareEquipment` in `src/stores/useEquipmentStore.filters.ts`
- **AND** catalog headers currently sort name/weight/criticalSlots; store `SortColumn` also has category, techBase, damage, heat, but damage/heat getters currently compare `item.name` (parent product follow-up)

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

### Requirement: Ammunition compatibility filtering

The catalog SHALL use declared compatible weapon identities, with conservative exact identity matching for imported records lacking declarations, and SHALL not use partial weapon-name matches.

#### Scenario: Compatible mounted weapon

- **GIVEN** a mounted SRM, LRM, Gauss or Clan weapon is declared compatible
- **WHEN** hiding ammunition without a compatible weapon
- **THEN** its ammunition remains available subject to independent availability filters
- **AND** AC/2 does not admit AC/20 ammunition

#### Scenario: Missing imported compatibility metadata

- **GIVEN** imported ammunition lacks compatibility declarations
- **WHEN** matching mounted equipment
- **THEN** only a conservative exact identity or full normalized weapon-name match admits it
- **AND** explicit declarations take precedence over fallback

#### Scenario: No weapons or no unit

- **WHEN** a unit has no compatible weapons and unmatched ammunition is hidden
- **THEN** no ammunition is shown
- **AND** non-ammunition remains unaffected
- **WHEN** browsing without a unit
- **THEN** the filter does not assume an empty loadout

### Requirement: Current catalog results

The visible list, result count and pages SHALL reflect the same current filter and active-unit context.

#### Scenario: Weapon edits and unit switching

- **WHEN** weapons are added, removed, undone, redone or the active unit changes
- **THEN** compatible ammo updates without another filter interaction
- **AND** pagination uses the same filtered result and resets appropriately

#### Scenario: Independent visibility constraints

- **WHEN** category, search, prototype, one-shot or availability controls change
- **THEN** enabled constraints apply consistently
- **AND** ammo compatibility does not hide unrelated categories
- **AND** Show All leaves no invisible legacy category restriction

### Requirement: Translucent catalog rows

The catalog SHALL use translucent category-colored row backgrounds with opaque readable content and controls.

#### Scenario: Desktop and mobile catalog

- **WHEN** rows render in supported themes and viewport sizes
- **THEN** category colors remain recognizable without fully opaque fills
- **AND** text, focus, selection, details and Add controls remain readable and operable
- **AND** desktop headings and matching name, type, numeric and action cells share one six-column grid with a sticky header in the same scrolling region
- **AND** ordinary collapsed desktop rows are no taller than 48px while Add keeps a 44px hit target around a smaller plus control

### Requirement: Add and place from catalog

The catalog SHALL offer optional Add and place with preview and validation through the existing Critical Slots authority.

#### Scenario: Valid placement

- **WHEN** that row's details are expanded and a legal location is confirmed
- **THEN** a new equipment instance is added and assigned legal slots
- **AND** weight and critical slots include variable-equipment calculations
- **AND** one Undo reverses the whole operation and Redo restores it
- **AND** the result survives browser-draft recovery

#### Scenario: Illegal, fixed or stale placement

- **WHEN** a location is restricted, occupied, lacks contiguous space, conflicts with configuration or changes before confirmation
- **THEN** the action explains the rejection
- **AND** no partial addition or history entry remains
- **AND** fixed OmniMech equipment is not moved or overwritten

#### Scenario: Cancellation, read-only and split allocation

- **WHEN** the chooser is cancelled or the unit is read-only
- **THEN** no edit occurs
- **WHEN** equipment requires split allocation unsupported by a single-location action
- **THEN** the catalog explains that Critical Slots is required
- **AND** no partial placement occurs

#### Scenario: Existing Add action

- **WHEN** Add is used without placement
- **THEN** a copy is added unassigned through the existing workflow
- **AND** the collapsed-row Add control is a plus that keeps the Add name accessible
- **AND** Add and place is not shown until that row's details are expanded

## Hook Architecture

---

## Data Model Requirements

### EquipmentBrowserState Interface

**Source**: `src/hooks/useEquipmentBrowser.ts` (`EquipmentBrowserState`)

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

**Source**: `src/hooks/useEquipmentCalculations.ts` (`ICategorySummary`)

```typescript
interface ICategorySummary {
  readonly count: number;
  readonly weight: number;
  readonly slots: number;
  readonly heat: number;
}
```

### EquipmentCalculations Interface

**Source**: `src/hooks/useEquipmentCalculations.ts` (`EquipmentCalculations`)

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

**Source**: `src/stores/useEquipmentStore.ts` (`SortColumn`)

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

**Source**: `src/stores/useEquipmentStore.ts` (`SortDirection`)

```typescript
type SortDirection = 'asc' | 'desc';
```

### UnitContext Interface

**Source**: `src/stores/useEquipmentStore.ts` (`UnitContext`)

```typescript
interface UnitContext {
  readonly unitYear: number | null;
  readonly unitTechBase: TechBase | null;
  readonly unitWeaponIds: readonly string[];
}
```

### EquipmentFilters Interface

**Source**: `src/stores/useEquipmentStore.ts` (`EquipmentFilters`)

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

**Source**: `src/stores/useEquipmentStore.ts` (`PaginationState`)

```typescript
interface PaginationState {
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalItems: number;
}
```

### SortState Interface

**Source**: `src/stores/useEquipmentStore.ts` (`SortState`)

```typescript
interface SortState {
  readonly column: SortColumn;
  readonly direction: SortDirection;
}
```

### CATALOG_OTHER_CATEGORIES Constant

**Source**: `src/stores/useEquipmentStore.filters.ts` (`CATALOG_OTHER_CATEGORIES`)

The "Other" category (MISC_EQUIPMENT) SHALL include the following combined categories:

```typescript
const CATALOG_OTHER_CATEGORIES: readonly EquipmentCategory[] = [
  EquipmentCategory.MISC_EQUIPMENT,
  EquipmentCategory.MOVEMENT,
  EquipmentCategory.STRUCTURAL,
];
```

**Note**: The equipment tray uses a different OTHER_CATEGORIES definition that includes PHYSICAL_WEAPON, MOVEMENT, ARTILLERY, and STRUCTURAL. The equipment browser groups miscellaneous, movement, and structural utility equipment; Electronics is independently selectable. Explicit secondary classifications remain eligible.

---

## Non-Goals

- Read-only Compendium equipment catalog at `/compendium/equipment` (handled by `openspec/specs/compendium-browser/spec.md`)
- Equipment database management and JSON/fallback loading (handled by `EquipmentLookupService` / `openspec/specs/equipment-services/spec.md`)
- Equipment registry initialization logic (handled by `EquipmentRegistry`)
- Equipment mounting and critical slot allocation (handled by unit stores and critical slot allocation system)
- Equipment validation rules (handled by construction rules)
- Equipment cost and Battle Value calculations (handled by separate calculation systems)
- Record sheet rendering (handled by record sheet system)
- Equipment import/export (handled by unit import/export system)
