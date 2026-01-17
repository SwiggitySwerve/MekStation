## MODIFIED Requirements

### Requirement: ArmorPipLayout Algorithm

The system SHALL support both legacy rectangle-based and modern polygon-based pip distribution algorithms for generating armor and structure pips.

**Rationale**: Polygon-based Poisson disk sampling produces visually superior "blue noise" distributions compared to row-based grid placement, while maintaining backward compatibility with existing rectangle-based templates.

**Priority**: Critical

#### Scenario: Legacy rectangle-based pip generation
- **GIVEN** an SVG group containing one or more `<rect>` elements
- **WHEN** `ArmorPipLayout.addPips(svgDoc, group, pipCount)` is called
- **THEN** generate `pipCount` circle elements within the bounding rectangle area
- **AND** pips are distributed evenly across rows
- **AND** pip size is calculated from average rect height
- **AND** pips are appended as children of the group element

#### Scenario: Multi-section pip layout (legacy)
- **GIVEN** a group with `style="mml-multisection:true"` attribute
- **WHEN** pips are generated using legacy algorithm
- **THEN** distribute pips proportionally across child groups based on area
- **AND** each child group receives appropriate share of total pips

#### Scenario: Gap handling in pip regions (legacy)
- **GIVEN** a rect element with `style="mml-gap:left,right"` attribute
- **WHEN** pips are generated for that row using legacy algorithm
- **THEN** exclude the gap region from pip placement
- **AND** split row into left and right sections around gap

#### Scenario: Polygon-based pip generation
- **GIVEN** a polygon region defined by vertex coordinates
- **WHEN** `distributePips(region, options)` is called with a target count
- **THEN** generate exactly `targetCount` points within the polygon boundary
- **AND** points are distributed using Poisson disk sampling for uniform "blue noise" spacing
- **AND** no points are placed outside the polygon boundary
- **AND** optional Lloyd's relaxation refines point positions for visual uniformity

#### Scenario: Polygon with holes
- **GIVEN** a polygon region with cut-out holes (e.g., cockpit window in head)
- **WHEN** pips are distributed within the region
- **THEN** no pips are placed inside the hole regions
- **AND** pips maintain minimum spacing from hole boundaries

#### Scenario: Exact count guarantee
- **GIVEN** any polygon region and target pip count
- **WHEN** pip distribution is calculated
- **THEN** the result SHALL contain exactly the target count of pips
- **AND** if Poisson sampling produces fewer points, additional points are added at maximum distance from existing points
- **AND** if Poisson sampling produces more points, excess points furthest from centroid are removed

#### Scenario: Algorithm selection
- **GIVEN** a record sheet template with pip regions
- **WHEN** armor pips are rendered
- **THEN** use polygon-based algorithm for regions with polygon definitions
- **OR** fall back to legacy rectangle-based algorithm for `<rect>` element regions

## ADDED Requirements

### Requirement: PolygonPipDistribution Service

The system SHALL provide a `PipDistribution` service for generating uniformly distributed points within arbitrary polygon boundaries.

**Rationale**: Poisson disk sampling produces visually superior distributions compared to grid-based approaches, with guaranteed minimum spacing between points and organic "blue noise" appearance.

**Priority**: High

#### Scenario: Basic polygon distribution
- **GIVEN** a simple convex polygon region
- **WHEN** `distributePips(region, { targetCount: 15 })` is called
- **THEN** return exactly 15 points
- **AND** all points are inside the polygon boundary
- **AND** points have approximately uniform spacing

#### Scenario: Complex polygon distribution
- **GIVEN** a concave polygon region (e.g., L-shaped torso)
- **WHEN** pips are distributed
- **THEN** all points remain within the concave boundary
- **AND** no points are placed in the concave "notch" area

#### Scenario: Variable density support
- **GIVEN** a polygon region and a density function
- **WHEN** `distributePips(region, { targetCount: 20, densityFunction })` is called
- **THEN** pip spacing varies according to the density function
- **AND** regions with higher density values have closer pip spacing

#### Scenario: Narrow region handling
- **GIVEN** a very narrow polygon region (width < 2x minimum pip spacing)
- **WHEN** pips are distributed
- **THEN** pips are placed in a single column
- **AND** exact count is still achieved by adjusting spacing

#### Scenario: Distribution bounds calculation
- **WHEN** pip distribution is calculated
- **THEN** result includes bounding box of the polygon region
- **AND** result includes computed optimal pip radius based on spacing

### Requirement: Polygon Region Definition

The system SHALL define polygon regions for all mech body part locations to support polygon-based pip distribution.

**Rationale**: Polygon regions enable accurate pip placement within complex body part shapes that cannot be represented by rectangles.

**Priority**: Medium

#### Scenario: Biped polygon regions
- **GIVEN** a biped mech configuration
- **WHEN** polygon regions are resolved
- **THEN** regions are defined for: HEAD, CENTER_TORSO, LEFT_TORSO, RIGHT_TORSO, LEFT_ARM, RIGHT_ARM, LEFT_LEG, RIGHT_LEG
- **AND** rear torso locations have separate polygon definitions

#### Scenario: Quad polygon regions
- **GIVEN** a quad mech configuration
- **WHEN** polygon regions are resolved
- **THEN** regions are defined for quad-specific locations: FRONT_LEFT_LEG, FRONT_RIGHT_LEG, REAR_LEFT_LEG, REAR_RIGHT_LEG

#### Scenario: Polygon coordinate system
- **WHEN** polygon vertices are defined
- **THEN** coordinates are in SVG template coordinate space
- **AND** first and last vertices form a closed ring
- **AND** vertices are ordered counter-clockwise for exterior, clockwise for holes
