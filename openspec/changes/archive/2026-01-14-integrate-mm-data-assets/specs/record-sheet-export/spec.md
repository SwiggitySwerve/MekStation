# record-sheet-export Specification Delta

## Summary of Implemented Features

This specification documents the complete implementation of multi-configuration record sheet support,
including dynamic pip generation using the ArmorPipLayout algorithm ported from MegaMekLab.

### Key Accomplishments:
1. **ArmorPipLayout Algorithm**: Full port of MegaMekLab's Java ArmorPipLayout to TypeScript
2. **Dynamic Pip Generation**: All mech types now use dynamic pip generation via bounding rectangles
3. **Configuration-Aware Extraction**: extractArmor, extractStructure, extractCriticals handle all 5 mech types
4. **Text ID Mappings**: Complete mappings for armor/structure text labels for all locations
5. **Slot Count Corrections**: Fixed quad/quadvee/tripod leg slots from 12 to 6

## MODIFIED Requirements

### Requirement: SVG Template Rendering

The system SHALL use configuration-specific SVG templates from mm-data for all mech types.

MODIFIED: Expand template support to all mech configurations.

#### Scenario: Configuration-specific template loading (MODIFIED)
- **WHEN** record sheet renders for a unit
- **THEN** load template based on unit's MechConfiguration:
  - BIPED → `mek_biped_default.svg`
  - QUAD → `mek_quad_default.svg`
  - TRIPOD → `mek_tripod_default.svg`
  - LAM → `mek_lam_default.svg`
  - QUADVEE → `mek_quadvee_default.svg`
- **AND** templates are loaded from `/record-sheets/templates_us/` (or `templates_iso/` for A4)

#### Scenario: Quad template rendering (NEW)
- **WHEN** record sheet renders for QUAD configuration
- **THEN** template SHALL display quad mech silhouette
- **AND** armor locations SHALL include FLL, FRL, RLL, RRL (not LA, RA, LL, RL)
- **AND** pip positioning SHALL match quad template layout

#### Scenario: Tripod template rendering (NEW)
- **WHEN** record sheet renders for TRIPOD configuration
- **THEN** template SHALL display tripod mech silhouette
- **AND** armor locations SHALL include all 9 locations (including CENTER_LEG)
- **AND** pip positioning SHALL match tripod template layout

#### Scenario: LAM template rendering (NEW)
- **WHEN** record sheet renders for LAM configuration
- **THEN** template SHALL display LAM-specific layout
- **AND** template SHALL include mode indicator area

#### Scenario: QuadVee template rendering (NEW)
- **WHEN** record sheet renders for QUADVEE configuration
- **THEN** template SHALL display QuadVee-specific layout
- **AND** template SHALL include mode indicator area

### Requirement: Armor Pip Visualization

The system SHALL render armor pips using mm-data SVG assets for all mech configurations.

MODIFIED: Support all configuration types.

#### Scenario: Quad armor pip loading (NEW)
- **WHEN** armor diagram renders for QUAD configuration
- **THEN** load pip SVGs for quad locations
- **AND** file naming follows: `Armor_{QuadLocation}_{Count}_Quad.svg` if available
- **OR** fallback to Humanoid pips with position mapping

#### Scenario: Tripod armor pip loading (NEW)
- **WHEN** armor diagram renders for TRIPOD configuration
- **THEN** load pip SVGs for all 9 tripod locations
- **AND** CENTER_LEG uses `Armor_CL_{Count}_Humanoid.svg` format

### Requirement: Structure Pip Visualization

The system SHALL render internal structure pips using mm-data SVG assets for all mech configurations.

MODIFIED: Support all configuration types.

#### Scenario: Quad structure pip loading (NEW)
- **GIVEN** a QUAD mech with specific tonnage
- **WHEN** structure section renders
- **THEN** load pip SVGs following: `QuadIS{Tonnage}_{Location}.svg` if available
- **OR** fallback to BipedIS with appropriate position mapping

#### Scenario: Tripod structure pip loading (NEW)
- **GIVEN** a TRIPOD mech with specific tonnage
- **WHEN** structure section renders
- **THEN** load pip SVGs for all 9 locations including CENTER_LEG

## ADDED Requirements

### Requirement: Paper Size Selection

The system SHALL support both US Letter and A4 paper sizes for record sheet export.

**Rationale**: International users require A4 format; mm-data provides both template sets.

**Priority**: Medium

#### Scenario: Paper size setting
- **WHEN** user opens Settings > Export > Record Sheet Paper Size
- **THEN** options SHALL include "US Letter (8.5×11)" and "A4 (210×297mm)"
- **AND** selection persists to local storage

#### Scenario: Template directory selection
- **GIVEN** user has selected paper size preference
- **WHEN** record sheet template loads
- **THEN** load from `templates_us/` for US Letter
- **OR** load from `templates_iso/` for A4

### Requirement: ArmorPipLayout Algorithm

The system SHALL use the ArmorPipLayout algorithm to dynamically generate armor and structure pips within defined bounding rectangles.

**Rationale**: Port of MegaMekLab's proven algorithm ensures accurate pip positioning matching official record sheets.

**Priority**: Critical

#### Scenario: Dynamic pip generation from bounding rects
- **GIVEN** an SVG group containing one or more `<rect>` elements
- **WHEN** `ArmorPipLayout.addPips(svgDoc, group, pipCount)` is called
- **THEN** generate `pipCount` circle elements within the bounding rectangle area
- **AND** pips are distributed evenly across rows
- **AND** pip size is calculated from average rect height
- **AND** pips are appended as children of the group element

#### Scenario: Multi-section pip layout
- **GIVEN** a group with `style="mml-multisection:true"` attribute
- **WHEN** pips are generated
- **THEN** distribute pips proportionally across child groups based on area
- **AND** each child group receives appropriate share of total pips

#### Scenario: Gap handling in pip regions
- **GIVEN** a rect element with `style="mml-gap:left,right"` attribute
- **WHEN** pips are generated for that row
- **THEN** exclude the gap region from pip placement
- **AND** split row into left and right sections around gap

### Requirement: Text Label ID Mappings

The system SHALL map location abbreviations to template text element IDs for all mech configurations.

**Rationale**: Enables displaying armor/structure point values next to each location in the template.

**Priority**: High

#### Scenario: Armor text ID resolution
- **GIVEN** location abbreviation and mech type
- **WHEN** rendering armor values
- **THEN** resolve text element ID using ARMOR_TEXT_IDS mapping:
  - Biped: HD, CT, CTR, LT, LTR, RT, RTR, LA, RA, LL, RL → textArmor_*
  - Quad: FLL, FRL, RLL, RRL → textArmor_*
  - Tripod: CL → textArmor_CL

#### Scenario: Structure text ID resolution
- **GIVEN** location abbreviation and mech type
- **WHEN** rendering structure values
- **THEN** resolve text element ID using STRUCTURE_TEXT_IDS mapping:
  - All locations map to textIS_* format
  - Quad: FLL, FRL, RLL, RRL → textIS_*
  - Tripod: CL → textIS_CL

### Requirement: Critical Slot Configuration Awareness

The system SHALL extract critical slot data based on mech configuration type.

**Rationale**: Different mech types have different location sets and slot counts.

**Priority**: Critical

#### Scenario: Quad critical slot extraction
- **GIVEN** a QUAD configuration mech
- **WHEN** extractCriticals is called
- **THEN** include HEAD, CT, LT, RT, FLL, FRL, RLL, RRL locations
- **AND** each leg location has 6 slots with Hip, Upper/Lower Leg Actuator, Foot Actuator

#### Scenario: Tripod critical slot extraction
- **GIVEN** a TRIPOD configuration mech
- **WHEN** extractCriticals is called
- **THEN** include HEAD, CT, LT, RT, LA, RA, LL, RL, CL locations
- **AND** center leg has 6 slots with standard leg actuators

#### Scenario: Slot count by location
- **WHEN** determining slot count for a location
- **THEN** HEAD has 6 slots
- **AND** all torsos have 12 slots
- **AND** all arms have 12 slots
- **AND** all legs (biped, quad, tripod) have 6 slots

### Requirement: Armor Allocation Interface

The system SHALL support armor allocation for all mech configuration types.

**Rationale**: Different configurations have different limb locations requiring allocation support.

**Priority**: Critical

#### Scenario: IArmorAllocation interface completeness
- **WHEN** allocating armor to a mech
- **THEN** interface SHALL include standard locations (head, centerTorso, etc.)
- **AND** interface SHALL include quad locations (frontLeftLeg, frontRightLeg, rearLeftLeg, rearRightLeg)
- **AND** interface SHALL include tripod location (centerLeg)
- **AND** optional locations use TypeScript optional property syntax (?:)
