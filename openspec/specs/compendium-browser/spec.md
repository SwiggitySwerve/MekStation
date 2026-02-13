# compendium-browser Specification

## Purpose

Provides a comprehensive reference browser for canonical BattleTech units, equipment, and construction rules. The Compendium serves as the primary knowledge base for the MekStation application, offering searchable, filterable access to 4,200+ units, equipment catalog, and TechManual construction rules.

## Scope

**In Scope:**

- Compendium hub page with navigation to unit database, equipment catalog, and rules reference
- Unit browser with advanced filtering (tech base, weight class, rules level, year/tonnage/BV ranges), sorting (10 columns), and pagination (50 items/page)
- Equipment browser with category/tech base/rules level filters, three view modes (grid/list/table), and pagination (36 items/page)
- Rules reference page with 7 construction rule sections, anchor navigation, and scroll tracking
- CompendiumAdapter for converting canonical unit data to game engine format
- API integration with `/api/catalog`, `/api/units?id=`, `/api/equipment/catalog`, `/api/equipment?id=`

**Out of Scope:**

- Compendium data sources and BLK file parsing (handled by data layer)
- Unit editing or customization (handled by Unit Builder)
- Equipment selection for unit construction (handled by Equipment Browser in builder context)
- Campaign-specific unit management (handled by Force Builder)

## Key Concepts

### Compendium Hub

The main entry point for the Compendium section, providing:

- **Featured Navigation Cards**: Large, visually distinct cards for Unit Database and Equipment Catalog
- **Quick Reference Panel**: Sticky sidebar with key construction constants (78 critical slots, 10 min heat sinks, 9 max head armor, 10% structure weight)
- **Construction Rules Preview**: Inline navigation to 7 rule sections with search filtering

### Unit Browser

A high-performance table view for browsing 4,200+ canonical units:

- **FilterState**: 10 filter fields (search, techBase, weightClass, rulesLevel, yearMin/Max, tonnageMin/Max, bvMin/Max)
- **SortState**: 10 sortable columns (chassis, variant, tonnage, year, weightClass, techBase, unitType, rulesLevel, cost, bv)
- **Pagination**: 50 units per page with page navigation controls
- **Advanced Filters**: Collapsible panel for year/tonnage/BV range filters

### Equipment Browser

A flexible catalog view with multiple display modes:

- **ViewMode**: Three display modes (grid, list, table) for different browsing preferences
- **Category Filtering**: Filter by equipment category (weapons, electronics, ammunition, etc.)
- **Tech Base Filtering**: Filter by Inner Sphere, Clan, or all tech bases
- **Rules Level Filtering**: Filter by Introductory, Standard, Advanced, or Experimental
- **Pagination**: 36 items per page (optimized for grid layout)

### Rules Reference

A single-page reference with all construction rules:

- **7 Rule Sections**: Structure, Engine, Armor, Heat Sinks, Gyro, Movement, Criticals
- **Anchor Navigation**: Sticky navigation bar with section links
- **Scroll Tracking**: IntersectionObserver updates active section on scroll
- **Formula Display**: Inline formula cards with monospace formatting

### CompendiumAdapter

Converts canonical unit data to game engine format:

- **Weapon Database**: Static lookup table for 16 common weapons (lasers, autocannons, missiles)
- **Location Mapping**: Converts uppercase location keys (HEAD, CENTER_TORSO) to lowercase (head, center_torso)
- **Structure Lookup**: Uses STANDARD_STRUCTURE_TABLE to determine hit points by tonnage
- **Armor Extraction**: Handles both simple (number) and complex (front/rear) armor values
- **Movement Calculation**: Derives runMP (walk × 1.5) and jumpMP from unit data
- **Async/Sync Adaptation**: Provides both `adaptUnit` (async, loads from service) and `adaptUnitFromData` (sync, uses pre-loaded data)

## Requirements

### Requirement: Compendium Hub Navigation

The Compendium hub page SHALL provide clear navigation to all three major sections.

#### Scenario: Hub page layout

- **GIVEN** user navigates to `/compendium`
- **WHEN** page loads
- **THEN** two featured cards are displayed: "Unit Database" and "Equipment Catalog"
- **AND** featured cards use distinct accent colors (emerald for units, cyan for equipment)
- **AND** featured cards include decorative grid backgrounds and gradient glows
- **AND** Quick Reference panel displays 4 construction constants
- **AND** Construction Rules section displays 7 rule category links

#### Scenario: Unit Database navigation

- **GIVEN** user is on Compendium hub
- **WHEN** user clicks "Unit Database" card
- **THEN** browser navigates to `/compendium/units`
- **AND** unit browser loads with default filters (no filters active)

#### Scenario: Equipment Catalog navigation

- **GIVEN** user is on Compendium hub
- **WHEN** user clicks "Equipment Catalog" card
- **THEN** browser navigates to `/compendium/equipment`
- **AND** equipment browser loads with default view mode (table)

#### Scenario: Construction Rules navigation

- **GIVEN** user is on Compendium hub
- **WHEN** user clicks a rule category link (e.g., "Structure")
- **THEN** browser navigates to `/compendium/rules#structure`
- **AND** rules page scrolls to the Structure section

#### Scenario: Hub search filtering

- **GIVEN** user is on Compendium hub
- **WHEN** user types "armor" in search box
- **THEN** Construction Rules section filters to show only "Armor" category
- **AND** other categories are hidden
- **AND** empty state displays if no matches found

### Requirement: Unit Browser Filtering

The unit browser SHALL support comprehensive filtering with 10 filter fields.

#### Scenario: Text search filter

- **GIVEN** user is on unit browser
- **WHEN** user types "Atlas" in search box
- **THEN** units are filtered to show only those with "Atlas" in chassis, variant, or name
- **AND** search is case-insensitive
- **AND** pagination resets to page 1
- **AND** results count updates to show filtered count

#### Scenario: Tech base filter

- **GIVEN** user is on unit browser
- **WHEN** user selects "Clan" from tech base dropdown
- **THEN** units are filtered to show only Clan tech base units
- **AND** Inner Sphere units are hidden
- **AND** pagination resets to page 1

#### Scenario: Weight class filter

- **GIVEN** user is on unit browser
- **WHEN** user selects "Assault" from weight class dropdown
- **THEN** units are filtered to show only Assault class (80-100 tons)
- **AND** other weight classes are hidden
- **AND** pagination resets to page 1

#### Scenario: Rules level filter

- **GIVEN** user is on unit browser
- **WHEN** user selects "Standard" from rules level dropdown
- **THEN** units are filtered to show only Standard rules level units
- **AND** Introductory, Advanced, and Experimental units are hidden
- **AND** pagination resets to page 1

#### Scenario: Year range filter

- **GIVEN** user is on unit browser
- **WHEN** user enters "3025" in yearMin and "3050" in yearMax
- **THEN** units are filtered to show only those with design year between 3025 and 3050 (inclusive)
- **AND** units with no year data are excluded
- **AND** pagination resets to page 1

#### Scenario: Tonnage range filter

- **GIVEN** user is on unit browser
- **WHEN** user enters "50" in tonnageMin and "75" in tonnageMax
- **THEN** units are filtered to show only those with tonnage between 50 and 75 (inclusive)
- **AND** pagination resets to page 1

#### Scenario: Battle Value range filter

- **GIVEN** user is on unit browser
- **WHEN** user enters "1000" in bvMin and "2000" in bvMax
- **THEN** units are filtered to show only those with BV between 1000 and 2000 (inclusive)
- **AND** units with no BV data are excluded
- **AND** pagination resets to page 1

#### Scenario: Combined filters

- **GIVEN** user is on unit browser
- **WHEN** user applies multiple filters (e.g., tech base = "Clan", weight class = "Heavy", yearMin = "3050")
- **THEN** units are filtered to match ALL active filters (AND logic)
- **AND** results count shows filtered count
- **AND** pagination resets to page 1

#### Scenario: Clear all filters

- **GIVEN** user has active filters
- **WHEN** user clicks "Clear" button
- **THEN** all filter fields are reset to empty/default values
- **AND** full unit list is displayed
- **AND** pagination resets to page 1

#### Scenario: Advanced filters toggle

- **GIVEN** user is on unit browser
- **WHEN** user clicks "▶ Filters" button
- **THEN** advanced filters panel expands to show year/tonnage/BV range inputs
- **AND** button changes to "▼ Filters"
- **AND** button shows "•" indicator if any advanced filters are active

### Requirement: Unit Browser Sorting

The unit browser SHALL support sorting by 10 columns with ascending/descending order.

#### Scenario: Sort by chassis

- **GIVEN** user is on unit browser
- **WHEN** user clicks "Chassis" column header
- **THEN** units are sorted alphabetically by chassis name (ascending)
- **AND** sort indicator shows "▲" next to "Chassis"
- **WHEN** user clicks "Chassis" header again
- **THEN** units are sorted reverse alphabetically (descending)
- **AND** sort indicator shows "▼" next to "Chassis"

#### Scenario: Sort by tonnage

- **GIVEN** user is on unit browser
- **WHEN** user clicks "Weight" column header
- **THEN** units are sorted numerically by tonnage (ascending)
- **AND** sort indicator shows "▲" next to "Weight"

#### Scenario: Sort by weight class

- **GIVEN** user is on unit browser
- **WHEN** user clicks "Class" column header
- **THEN** units are sorted by weight class order: Ultralight, Light, Medium, Heavy, Assault, Superheavy
- **AND** sort indicator shows "▲" next to "Class"

#### Scenario: Sort by rules level

- **GIVEN** user is on unit browser
- **WHEN** user clicks "Level" column header
- **THEN** units are sorted by rules level order: Introductory, Standard, Advanced, Experimental
- **AND** sort indicator shows "▲" next to "Level"

#### Scenario: Sort by Battle Value

- **GIVEN** user is on unit browser
- **WHEN** user clicks "BV" column header
- **THEN** units are sorted numerically by BV (ascending)
- **AND** units with no BV data are sorted to the end (treated as 0)
- **AND** sort indicator shows "▲" next to "BV"

#### Scenario: Sort persistence with filtering

- **GIVEN** user has sorted by tonnage (descending)
- **WHEN** user applies a filter (e.g., tech base = "Clan")
- **THEN** filtered results remain sorted by tonnage (descending)
- **AND** sort indicator remains on "Weight" column

### Requirement: Unit Browser Pagination

The unit browser SHALL paginate results at 50 units per page.

#### Scenario: Pagination controls

- **GIVEN** user is on unit browser with 4,200 units
- **WHEN** page loads
- **THEN** first 50 units are displayed
- **AND** pagination shows "Page 1 of 84"
- **AND** "Previous" button is disabled
- **AND** "Next" button is enabled

#### Scenario: Navigate to next page

- **GIVEN** user is on page 1
- **WHEN** user clicks "Next" button
- **THEN** units 51-100 are displayed
- **AND** pagination shows "Page 2 of 84"
- **AND** "Previous" button is enabled
- **AND** "Next" button is enabled

#### Scenario: Navigate to last page

- **GIVEN** user is on page 83
- **WHEN** user clicks "Next" button
- **THEN** units 4151-4200 are displayed (50 units)
- **AND** pagination shows "Page 84 of 84"
- **AND** "Next" button is disabled

#### Scenario: Pagination with filtering

- **GIVEN** user has filtered to 150 units
- **WHEN** page loads
- **THEN** first 50 units are displayed
- **AND** pagination shows "Page 1 of 3"
- **AND** results count shows "Showing 50 of 150 results (filtered from 4,200 total)"

#### Scenario: Pagination reset on filter change

- **GIVEN** user is on page 5
- **WHEN** user changes a filter
- **THEN** pagination resets to page 1
- **AND** first 50 filtered units are displayed

### Requirement: Unit Detail Page

The unit browser SHALL provide detailed unit information pages.

#### Scenario: Navigate to unit detail

- **GIVEN** user is on unit browser
- **WHEN** user clicks a unit chassis name (e.g., "Atlas")
- **THEN** browser navigates to `/compendium/units/[id]`
- **AND** unit detail page loads with full unit data

#### Scenario: Unit detail header

- **GIVEN** user is on unit detail page
- **WHEN** page loads
- **THEN** header displays unit name (chassis + variant)
- **AND** subtitle shows tonnage and tech base
- **AND** breadcrumbs show "Compendium > Units > [Unit Name]"
- **AND** badges display tonnage, tech base, unit type, and configuration

#### Scenario: Unit detail stats

- **GIVEN** user is on unit detail page
- **WHEN** page loads
- **THEN** three stat cards are displayed: Movement, Core Systems, Heat & Armor
- **AND** Movement card shows walk MP, run MP, jump MP, and jump jet type
- **AND** Core Systems card shows engine type/rating, gyro type, cockpit, and structure type
- **AND** Heat & Armor card shows heat sink count/type and armor type/total

#### Scenario: Armor allocation display

- **GIVEN** user is on unit detail page with armor data
- **WHEN** page loads
- **THEN** armor allocation section displays all locations (head, torsos, arms, legs)
- **AND** each location shows armor points
- **AND** torso locations show front/rear armor split (e.g., "24 / 8")

#### Scenario: Equipment list display

- **GIVEN** user is on unit detail page with equipment
- **WHEN** page loads
- **THEN** equipment table displays all equipment items
- **AND** each row shows equipment name, location, and notes
- **AND** rear-mounted equipment shows "Rear" badge

### Requirement: Equipment Browser View Modes

The equipment browser SHALL support three view modes: grid, list, and table.

#### Scenario: Grid view layout

- **GIVEN** user is on equipment browser
- **WHEN** user selects "Grid" view mode
- **THEN** equipment is displayed in a 3-column grid (1 column on mobile, 2 on tablet)
- **AND** each card shows equipment name, tech base badge, stats (weight, slots, damage, heat), and category badge
- **AND** cards are clickable and navigate to equipment detail page

#### Scenario: List view layout

- **GIVEN** user is on equipment browser
- **WHEN** user selects "List" view mode
- **THEN** equipment is displayed in compact rows
- **AND** each row shows category indicator bar (colored), name, quick stats, category badge, and tech base badge
- **AND** rows are clickable and navigate to equipment detail page

#### Scenario: Table view layout

- **GIVEN** user is on equipment browser
- **WHEN** user selects "Table" view mode
- **THEN** equipment is displayed in a data table
- **AND** columns show Name, Type, Tech, Weight, Slots, Damage, Heat
- **AND** rows are clickable and navigate to equipment detail page

#### Scenario: View mode persistence

- **GIVEN** user selects "List" view mode
- **WHEN** user applies a filter
- **THEN** view mode remains "List"
- **AND** filtered results are displayed in list view

### Requirement: Equipment Browser Filtering

The equipment browser SHALL support filtering by category, tech base, and rules level.

#### Scenario: Category filter

- **GIVEN** user is on equipment browser
- **WHEN** user selects "Energy Weapon" from category dropdown
- **THEN** equipment is filtered to show only energy weapons
- **AND** pagination resets to page 1
- **AND** results count updates

#### Scenario: Tech base filter

- **GIVEN** user is on equipment browser
- **WHEN** user selects "Clan" from tech base dropdown
- **THEN** equipment is filtered to show only Clan tech base items
- **AND** pagination resets to page 1

#### Scenario: Rules level filter

- **GIVEN** user is on equipment browser
- **WHEN** user selects "Advanced" from rules level dropdown
- **THEN** equipment is filtered to show only Advanced rules level items
- **AND** pagination resets to page 1

#### Scenario: Combined filters

- **GIVEN** user is on equipment browser
- **WHEN** user applies multiple filters (e.g., category = "Ballistic Weapon", tech base = "Inner Sphere")
- **THEN** equipment is filtered to match ALL active filters (AND logic)
- **AND** pagination resets to page 1

#### Scenario: Search filter

- **GIVEN** user is on equipment browser
- **WHEN** user types "laser" in search box
- **THEN** equipment is filtered to show only items with "laser" in name or ID
- **AND** search is case-insensitive
- **AND** pagination resets to page 1

#### Scenario: Filter toggle button

- **GIVEN** user is on equipment browser
- **WHEN** user clicks "Filters" button
- **THEN** filter panel expands to show category, tech base, and rules level dropdowns
- **AND** button shows active filter count badge (e.g., "2")
- **AND** button is highlighted if any filters are active

#### Scenario: Clear all filters

- **GIVEN** user has active filters
- **WHEN** user clicks "Clear All" button in filter panel
- **THEN** all filter fields are reset to empty/default values
- **AND** full equipment list is displayed
- **AND** pagination resets to page 1

### Requirement: Equipment Browser Pagination

The equipment browser SHALL paginate results at 36 items per page.

#### Scenario: Pagination controls

- **GIVEN** user is on equipment browser with 500 items
- **WHEN** page loads
- **THEN** first 36 items are displayed
- **AND** pagination shows "Page 1 of 14"
- **AND** "Previous" button is disabled
- **AND** "Next" button is enabled

#### Scenario: Pagination with filtering

- **GIVEN** user has filtered to 72 items
- **WHEN** page loads
- **THEN** first 36 items are displayed
- **AND** pagination shows "Page 1 of 2"

### Requirement: Equipment Detail Page

The equipment browser SHALL provide detailed equipment information pages.

#### Scenario: Navigate to equipment detail

- **GIVEN** user is on equipment browser
- **WHEN** user clicks an equipment item
- **THEN** browser navigates to `/compendium/equipment/[id]`
- **AND** equipment detail page loads with full equipment data

#### Scenario: Equipment detail header

- **GIVEN** user is on equipment detail page
- **WHEN** page loads
- **THEN** header displays equipment name
- **AND** breadcrumbs show "Compendium > Equipment > [Equipment Name]"
- **AND** badges display category, tech base, and rules level

#### Scenario: Equipment detail stats

- **GIVEN** user is on equipment detail page
- **WHEN** page loads
- **THEN** two stat cards are displayed: Physical Properties and Availability
- **AND** Physical Properties card shows weight, critical slots, cost (C-Bills), and battle value
- **AND** Availability card shows introduction year, extinction year (if applicable), and reintroduction year (if applicable)

#### Scenario: Weapon combat stats

- **GIVEN** user is on equipment detail page for a weapon
- **WHEN** page loads
- **THEN** two additional stat cards are displayed: Combat Stats and Range Profile
- **AND** Combat Stats card shows damage, heat, and ammo per ton (if applicable)
- **AND** Range Profile card shows minimum range (if > 0), short range, medium range, long range, and extreme range

#### Scenario: Special rules display

- **GIVEN** user is on equipment detail page with special rules
- **WHEN** page loads
- **THEN** special rules section displays all special rules as badges

### Requirement: Rules Reference Navigation

The rules reference page SHALL provide anchor navigation and scroll tracking for 7 rule sections.

#### Scenario: Rules page layout

- **GIVEN** user navigates to `/compendium/rules`
- **WHEN** page loads
- **THEN** sticky navigation bar displays 7 section buttons: Structure, Engine, Armor, Heat Sinks, Gyro, Movement, Criticals
- **AND** all 7 sections are displayed on a single page
- **AND** first section (Structure) is marked as active

#### Scenario: Anchor navigation

- **GIVEN** user is on rules page
- **WHEN** user clicks "Armor" button in navigation bar
- **THEN** page smoothly scrolls to Armor section
- **AND** "Armor" button is highlighted as active
- **AND** URL hash updates to `#armor`

#### Scenario: Scroll tracking

- **GIVEN** user is on rules page
- **WHEN** user scrolls down to Engine section
- **THEN** "Engine" button is automatically highlighted as active
- **AND** URL hash updates to `#engine`

#### Scenario: Initial hash navigation

- **GIVEN** user navigates to `/compendium/rules#gyro`
- **WHEN** page loads
- **THEN** page scrolls to Gyro section
- **AND** "Gyro" button is highlighted as active

#### Scenario: Rule section content

- **GIVEN** user is viewing a rule section (e.g., Structure)
- **WHEN** section is displayed
- **THEN** section header shows title and description
- **AND** rule items are displayed in a bordered card
- **AND** each rule item shows title, content, and formula (if applicable)
- **AND** formulas are displayed in monospace font with cyan color

### Requirement: CompendiumAdapter Weapon Database

The CompendiumAdapter SHALL provide a static weapon database for 16 common weapons.

#### Scenario: Weapon lookup

- **GIVEN** CompendiumAdapter is initialized
- **WHEN** `getWeaponData("medium-laser")` is called
- **THEN** weapon data is returned with id, name, shortRange, mediumRange, longRange, damage, heat, minRange, ammoPerTon, destroyed
- **AND** medium laser has shortRange = 3, mediumRange = 6, longRange = 9, damage = 5, heat = 3

#### Scenario: Weapon database coverage

- **GIVEN** CompendiumAdapter is initialized
- **WHEN** weapon database is queried
- **THEN** database includes 16 weapons: small-laser, medium-laser, large-laser, ppc, ac-2, ac-5, ac-10, ac-20, lrm-5, lrm-10, lrm-15, lrm-20, srm-2, srm-4, srm-6, machine-gun

#### Scenario: Unknown weapon lookup

- **GIVEN** CompendiumAdapter is initialized
- **WHEN** `getWeaponData("unknown-weapon")` is called
- **THEN** undefined is returned

### Requirement: CompendiumAdapter Location Mapping

The CompendiumAdapter SHALL convert uppercase location keys to lowercase with underscores.

#### Scenario: Location key conversion

- **GIVEN** CompendiumAdapter is processing unit data
- **WHEN** location key "CENTER_TORSO" is encountered
- **THEN** location key is converted to "center_torso"

#### Scenario: Location mapping coverage

- **GIVEN** CompendiumAdapter is processing unit data
- **WHEN** location keys are converted
- **THEN** mapping includes: HEAD → head, CENTER_TORSO → center_torso, LEFT_TORSO → left_torso, RIGHT_TORSO → right_torso, LEFT_ARM → left_arm, RIGHT_ARM → right_arm, LEFT_LEG → left_leg, RIGHT_LEG → right_leg

### Requirement: CompendiumAdapter Structure Lookup

The CompendiumAdapter SHALL use STANDARD_STRUCTURE_TABLE to determine hit points by tonnage.

#### Scenario: Structure lookup for 50-ton mech

- **GIVEN** CompendiumAdapter is processing a 50-ton unit
- **WHEN** `getStructureForTonnage(50)` is called
- **THEN** structure object is returned with head = 3, center_torso = 16, left_torso = 12, right_torso = 12, left_arm = 8, right_arm = 8, left_leg = 12, right_leg = 12

#### Scenario: Structure lookup for invalid tonnage

- **GIVEN** CompendiumAdapter is processing a unit with invalid tonnage (e.g., 37)
- **WHEN** `getStructureForTonnage(37)` is called
- **THEN** fallback structure for 50 tons is returned

### Requirement: CompendiumAdapter Armor Extraction

The CompendiumAdapter SHALL extract armor values from unit data, handling both simple and complex formats.

#### Scenario: Simple armor extraction

- **GIVEN** unit data has armor allocation with HEAD = 9
- **WHEN** `extractArmor` is called
- **THEN** armor object includes head = 9

#### Scenario: Front/rear armor extraction

- **GIVEN** unit data has armor allocation with CENTER_TORSO = { front: 24, rear: 8 }
- **WHEN** `extractArmor` is called
- **THEN** armor object includes center_torso = 24, center_torso_rear = 8

#### Scenario: Initial damage application

- **GIVEN** unit data has armor allocation with LEFT_ARM = 16
- **AND** initial damage specifies left_arm = 5
- **WHEN** `adaptUnitFromData` is called
- **THEN** armor object includes left_arm = 11 (16 - 5)

### Requirement: CompendiumAdapter Movement Calculation

The CompendiumAdapter SHALL calculate movement points from unit data.

#### Scenario: Movement calculation

- **GIVEN** unit data has movement = { walk: 4, jump: 3 }
- **WHEN** `calculateMovement` is called
- **THEN** movement object is returned with walkMP = 4, runMP = 6 (ceil(4 × 1.5)), jumpMP = 3

#### Scenario: Movement with no jump jets

- **GIVEN** unit data has movement = { walk: 5 }
- **WHEN** `calculateMovement` is called
- **THEN** movement object is returned with walkMP = 5, runMP = 8 (ceil(5 × 1.5)), jumpMP = 0

### Requirement: CompendiumAdapter Weapon Extraction

The CompendiumAdapter SHALL extract weapons from equipment list and generate unique IDs.

#### Scenario: Weapon extraction

- **GIVEN** unit data has equipment list with { id: "medium-laser", location: "RIGHT_ARM" }
- **WHEN** `extractWeapons` is called
- **THEN** weapons array includes one weapon with id = "[unitId]-medium-laser-1"
- **AND** weapon data matches WEAPON_DATABASE["medium-laser"]

#### Scenario: Multiple weapons of same type

- **GIVEN** unit data has equipment list with two "medium-laser" entries
- **WHEN** `extractWeapons` is called
- **THEN** weapons array includes two weapons with ids "[unitId]-medium-laser-1" and "[unitId]-medium-laser-2"

#### Scenario: Non-weapon equipment

- **GIVEN** unit data has equipment list with { id: "heat-sink", location: "CENTER_TORSO" }
- **WHEN** `extractWeapons` is called
- **THEN** weapons array does not include heat sink (not in WEAPON_DATABASE)

### Requirement: CompendiumAdapter Async/Sync Adaptation

The CompendiumAdapter SHALL provide both async and sync adaptation methods.

#### Scenario: Async adaptation

- **GIVEN** unit ID "atlas-as7-d" exists in canonical unit service
- **WHEN** `adaptUnit("atlas-as7-d")` is called
- **THEN** unit data is loaded from service asynchronously
- **AND** adapted unit is returned with all fields populated

#### Scenario: Async adaptation for missing unit

- **GIVEN** unit ID "invalid-unit" does not exist in canonical unit service
- **WHEN** `adaptUnit("invalid-unit")` is called
- **THEN** null is returned

#### Scenario: Sync adaptation

- **GIVEN** unit data is pre-loaded
- **WHEN** `adaptUnitFromData(fullUnit)` is called
- **THEN** adapted unit is returned synchronously with all fields populated

#### Scenario: Adaptation with options

- **GIVEN** unit data is pre-loaded
- **WHEN** `adaptUnitFromData(fullUnit, { side: GameSide.Enemy, position: { q: 5, r: 3 }, facing: Facing.South })` is called
- **THEN** adapted unit has side = GameSide.Enemy, position = { q: 5, r: 3 }, facing = Facing.South

### Requirement: CompendiumAdapter Ammo Initialization

The CompendiumAdapter SHALL initialize ammo for ballistic and missile weapons.

#### Scenario: Ammo initialization for ballistic weapon

- **GIVEN** unit has AC/10 weapon (ammoPerTon = 10)
- **WHEN** `adaptUnitFromData` is called
- **THEN** ammo object includes entry for AC/10 weapon ID with value = 10

#### Scenario: Ammo initialization for missile weapon

- **GIVEN** unit has LRM-15 weapon (ammoPerTon = 8)
- **WHEN** `adaptUnitFromData` is called
- **THEN** ammo object includes entry for LRM-15 weapon ID with value = 8

#### Scenario: No ammo for energy weapons

- **GIVEN** unit has medium laser weapon (ammoPerTon = -1)
- **WHEN** `adaptUnitFromData` is called
- **THEN** ammo object does not include entry for medium laser weapon ID

## Data Model Requirements

### CompendiumLayout Props

```typescript
interface CompendiumLayoutProps {
  /** Page title displayed in header */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Breadcrumb trail - last item is current page (no href) */
  breadcrumbs?: BreadcrumbItem[];
  /** Page content */
  children: React.ReactNode;
  /** Optional header actions (right side) */
  headerActions?: React.ReactNode;
  /** Max width variant */
  maxWidth?: 'default' | 'wide' | 'full';
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

### Unit Browser FilterState

```typescript
interface FilterState {
  search: string;
  techBase: string;
  weightClass: string;
  rulesLevel: string;
  yearMin: string;
  yearMax: string;
  tonnageMin: string;
  tonnageMax: string;
  bvMin: string;
  bvMax: string;
}
```

### Unit Browser SortState

```typescript
type SortColumn =
  | 'chassis'
  | 'variant'
  | 'tonnage'
  | 'year'
  | 'weightClass'
  | 'techBase'
  | 'unitType'
  | 'rulesLevel'
  | 'cost'
  | 'bv';

type SortDirection = 'asc' | 'desc';

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}
```

### Equipment Browser FilterState

```typescript
interface FilterState {
  search: string;
  category: EquipmentCategory | '';
  techBase: TechBase | '';
  rulesLevel: RulesLevel | '';
}
```

### Equipment Browser ViewMode

```typescript
type ViewMode = 'grid' | 'list' | 'table';
```

### CompendiumAdapter IWeaponData

```typescript
interface IWeaponData {
  id: string;
  name: string;
  shortRange: number;
  mediumRange: number;
  longRange: number;
  damage: number;
  heat: number;
  minRange: number;
  ammoPerTon: number; // -1 for energy weapons
  destroyed: boolean;
}
```

### CompendiumAdapter IAdaptedUnit

```typescript
interface IAdaptedUnit {
  id: string;
  side: GameSide;
  position: { q: number; r: number };
  facing: Facing;
  heat: number;
  movementThisTurn: MovementType;
  hexesMovedThisTurn: number;
  armor: Record<string, number>;
  structure: Record<string, number>;
  destroyedLocations: string[];
  destroyedEquipment: string[];
  ammo: Record<string, number>;
  pilotWounds: number;
  pilotConscious: boolean;
  destroyed: boolean;
  lockState: LockState;
  weapons: IWeapon[];
  walkMP: number;
  runMP: number;
  jumpMP: number;
}
```

### CompendiumAdapter IAdaptUnitOptions

```typescript
interface IAdaptUnitOptions {
  side?: GameSide;
  position?: { q: number; r: number };
  facing?: Facing;
  initialDamage?: Record<string, number>;
}
```

## Validation Rules

### Unit Browser Validation

- **Filter Validation**: Year/tonnage/BV range filters MUST accept only numeric input
- **Range Validation**: Min values MUST be <= max values for year/tonnage/BV ranges
- **Pagination Validation**: Current page MUST be >= 1 and <= total pages
- **Sort Validation**: Sort column MUST be one of 10 valid columns

### Equipment Browser Validation

- **View Mode Validation**: View mode MUST be one of 'grid', 'list', 'table'
- **Pagination Validation**: Current page MUST be >= 1 and <= total pages

### CompendiumAdapter Validation

- **Tonnage Validation**: Tonnage MUST be a valid number (fallback to 50 if invalid)
- **Armor Validation**: Armor values MUST be >= 0 after initial damage application
- **Weapon Validation**: Weapon IDs MUST exist in WEAPON_DATABASE to be included in weapons array

## Implementation Notes

### Performance Considerations

- **Unit Browser**: With 4,200+ units, filtering and sorting MUST be optimized using `useMemo` and `useCallback` hooks
- **Equipment Browser**: Pagination at 36 items/page reduces DOM size for grid view
- **Rules Reference**: IntersectionObserver is more performant than scroll event listeners for tracking active section
- **CompendiumAdapter**: Static weapon database avoids repeated lookups; sync adaptation avoids async overhead when data is pre-loaded

### Edge Cases

- **Unit Browser**: Units with missing year/BV data are excluded from year/BV range filters
- **Equipment Browser**: Equipment with no category displays without category badge
- **Rules Reference**: Invalid section IDs in URL hash redirect to rules index
- **CompendiumAdapter**: Invalid tonnage falls back to 50-ton structure table

### Common Pitfalls

- **Unit Browser**: Forgetting to reset pagination to page 1 when filters change leads to empty results
- **Equipment Browser**: Not handling both simple (number) and complex (front/rear) armor formats causes data loss
- **Rules Reference**: Using scroll event listeners instead of IntersectionObserver causes performance issues
- **CompendiumAdapter**: Forgetting to convert uppercase location keys to lowercase causes location mismatch in game engine

## Examples

### Example: Unit Browser with Filters

```typescript
// FilterState with multiple active filters
const filters: FilterState = {
  search: 'Atlas',
  techBase: TechBase.INNER_SPHERE,
  weightClass: WeightClass.ASSAULT,
  rulesLevel: RulesLevel.STANDARD,
  yearMin: '3025',
  yearMax: '3050',
  tonnageMin: '80',
  tonnageMax: '100',
  bvMin: '1500',
  bvMax: '2500',
};

// Apply filters with AND logic
const applyFilters = useCallback(() => {
  let result = [...units];

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      (unit) =>
        unit.name.toLowerCase().includes(searchLower) ||
        unit.chassis.toLowerCase().includes(searchLower) ||
        unit.variant.toLowerCase().includes(searchLower),
    );
  }

  if (filters.techBase) {
    result = result.filter((unit) => unit.techBase === filters.techBase);
  }

  if (filters.weightClass) {
    result = result.filter((unit) => unit.weightClass === filters.weightClass);
  }

  if (filters.rulesLevel) {
    result = result.filter((unit) => unit.rulesLevel === filters.rulesLevel);
  }

  if (filters.yearMin) {
    const minYear = parseInt(filters.yearMin, 10);
    if (!isNaN(minYear)) {
      result = result.filter((unit) => (unit.year ?? 0) >= minYear);
    }
  }

  if (filters.yearMax) {
    const maxYear = parseInt(filters.yearMax, 10);
    if (!isNaN(maxYear)) {
      result = result.filter((unit) => (unit.year ?? 9999) <= maxYear);
    }
  }

  if (filters.tonnageMin) {
    const minTon = parseInt(filters.tonnageMin, 10);
    if (!isNaN(minTon)) {
      result = result.filter((unit) => unit.tonnage >= minTon);
    }
  }

  if (filters.tonnageMax) {
    const maxTon = parseInt(filters.tonnageMax, 10);
    if (!isNaN(maxTon)) {
      result = result.filter((unit) => unit.tonnage <= maxTon);
    }
  }

  if (filters.bvMin) {
    const minBV = parseInt(filters.bvMin, 10);
    if (!isNaN(minBV)) {
      result = result.filter((unit) => (unit.bv ?? 0) >= minBV);
    }
  }

  if (filters.bvMax) {
    const maxBV = parseInt(filters.bvMax, 10);
    if (!isNaN(maxBV)) {
      result = result.filter((unit) => (unit.bv ?? 99999) <= maxBV);
    }
  }

  setFilteredUnits(result);
  setCurrentPage(1); // Reset pagination
}, [units, filters]);
```

### Example: Unit Browser Sorting

```typescript
// SortState with weight class sorting
const sort: SortState = {
  column: 'weightClass',
  direction: 'asc',
};

// Weight class sort order
const WEIGHT_CLASS_ORDER: Record<string, number> = {
  [WeightClass.ULTRALIGHT]: 0,
  [WeightClass.LIGHT]: 1,
  [WeightClass.MEDIUM]: 2,
  [WeightClass.HEAVY]: 3,
  [WeightClass.ASSAULT]: 4,
  [WeightClass.SUPERHEAVY]: 5,
};

// Sort filtered units
const sortedUnits = useMemo(() => {
  const sorted = [...filteredUnits];
  const { column, direction } = sort;
  const multiplier = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (column) {
      case 'weightClass':
        aVal = WEIGHT_CLASS_ORDER[a.weightClass] ?? 99;
        bVal = WEIGHT_CLASS_ORDER[b.weightClass] ?? 99;
        break;
      case 'tonnage':
        aVal = a.tonnage;
        bVal = b.tonnage;
        break;
      case 'bv':
        aVal = a.bv ?? 0;
        bVal = b.bv ?? 0;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return -1 * multiplier;
    if (aVal > bVal) return 1 * multiplier;
    return 0;
  });

  return sorted;
}, [filteredUnits, sort]);
```

### Example: Equipment Browser View Modes

```typescript
// ViewMode state
const [viewMode, setViewMode] = useState<ViewMode>('table');

// Render based on view mode
{viewMode === 'grid' && <EquipmentGridView equipment={displayedEquipment} />}
{viewMode === 'list' && <EquipmentListView equipment={displayedEquipment} />}
{viewMode === 'table' && <EquipmentTableView equipment={displayedEquipment} />}

// Grid view component
function EquipmentGridView({ equipment }: ViewProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {equipment.map((eq) => (
        <Link key={eq.id} href={`/compendium/equipment/${encodeURIComponent(eq.id)}`}>
          <div className="group bg-surface-base/40 border-border-theme-subtle/50 hover:bg-surface-base/60 hover:border-accent/50 cursor-pointer rounded-lg border p-3 transition-all">
            <h3 className="text-text-theme-primary group-hover:text-accent/90 line-clamp-1 text-sm leading-tight font-medium">
              {eq.name}
            </h3>
            {/* Stats and badges */}
          </div>
        </Link>
      ))}
    </div>
  );
}
```

### Example: Rules Reference Scroll Tracking

```typescript
// IntersectionObserver for scroll tracking
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    },
    {
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    },
  );

  ruleSections.forEach((section) => {
    const el = document.getElementById(section.id);
    if (el) observer.observe(el);
  });

  return () => observer.disconnect();
}, []);

// Smooth scroll to section
const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.pushState(null, '', `#${sectionId}`);
    setActiveSection(sectionId);
  }
};
```

### Example: CompendiumAdapter Usage

```typescript
// Async adaptation
const adaptedUnit = await adaptUnit('atlas-as7-d', {
  side: GameSide.Player,
  position: { q: 0, r: 0 },
  facing: Facing.North,
});

if (adaptedUnit) {
  console.log(adaptedUnit.weapons); // Array of IWeapon
  console.log(adaptedUnit.armor); // { head: 9, center_torso: 24, ... }
  console.log(adaptedUnit.walkMP); // 3
  console.log(adaptedUnit.runMP); // 5
}

// Sync adaptation with pre-loaded data
const fullUnit = await getCanonicalUnitService().getById('atlas-as7-d');
if (fullUnit) {
  const adaptedUnit = adaptUnitFromData(fullUnit, {
    side: GameSide.Enemy,
    position: { q: 10, r: 5 },
    facing: Facing.South,
    initialDamage: { left_arm: 5, center_torso: 10 },
  });

  console.log(adaptedUnit.armor.left_arm); // Original armor - 5
  console.log(adaptedUnit.armor.center_torso); // Original armor - 10
}

// Weapon lookup
const mediumLaser = getWeaponData('medium-laser');
console.log(mediumLaser?.damage); // 5
console.log(mediumLaser?.heat); // 3
console.log(mediumLaser?.shortRange); // 3
```

## Dependencies

### Depends On

- **Core Entity Types**: Uses `IUnitEntry`, `IUnitDetails`, `EquipmentEntry` interfaces
- **Core Enumerations**: Uses `TechBase`, `WeightClass`, `RulesLevel`, `EquipmentCategory` enums
- **Unit Services**: Uses `CanonicalUnitService` for loading unit data
- **Game Session Interfaces**: Uses `GameSide`, `LockState`, `Facing`, `MovementType` enums
- **Damage System**: Uses `STANDARD_STRUCTURE_TABLE` for structure lookup

### Used By

- **Unit Builder**: Uses CompendiumAdapter to load canonical units for customization
- **Force Builder**: Uses unit browser to select units for force composition
- **Game Session**: Uses CompendiumAdapter to initialize units for combat
- **Campaign System**: Uses unit browser to browse available units for acquisition

## References

- **BattleTech TechManual**: Construction rules and formulas
- **MegaMek mm-data**: Canonical unit data source (4,200+ units)
- **Equipment Database Spec**: `openspec/specs/equipment-database/spec.md`
- **Unit Entity Model Spec**: `openspec/specs/unit-entity-model/spec.md`
- **Game Session Management Spec**: `openspec/specs/game-session-management/spec.md`
