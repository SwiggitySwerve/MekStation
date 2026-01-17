## MODIFIED Requirements

### Requirement: Multiple Design Variants

The system SHALL provide 6 distinct armor diagram designs for user selection.

#### Scenario: Available variants
- **WHEN** the armor diagram is rendered
- **THEN** the system supports these variants:
  - Clean Tech (default)
  - Neon Operator
  - Tactical HUD
  - Premium Material
  - MegaMek
  - MegaMek Classic (uses mm-data assets)
- **AND** each variant maintains identical functionality
- **AND** each variant displays all locations for the current configuration
- **AND** each variant applies consistently to all mech configurations (Biped, Quad, Tripod, LAM, QuadVee)

#### Scenario: Variant thumbnails are visually distinct
- **WHEN** variant thumbnails are displayed in settings
- **THEN** each thumbnail SHALL include variant-specific decorative elements
- **AND** Standard thumbnail SHALL show front/rear divider line
- **AND** MegaMek thumbnail SHALL show shadow offset effect
- **AND** MegaMek Classic thumbnail SHALL show pip dot pattern
- **AND** Metallic thumbnail SHALL show circular badge element
- **AND** users can distinguish variants at 40x60px thumbnail size

### Requirement: Consistent Layout Proportions

All variants SHALL use consistent layout proportions for torso locations.

#### Scenario: Front/rear armor split
- **WHEN** a torso location is rendered in any variant
- **THEN** front section SHALL occupy 60% of location height
- **AND** rear section SHALL occupy 40% of location height
- **AND** torso locations SHALL use 1.4x height multiplier
- **AND** leg locations SHALL be offset to accommodate torso expansion

#### Scenario: Proportions apply to all variants
- **GIVEN** any silhouette variant is active
- **WHEN** viewing torso locations (CT, LT, RT)
- **THEN** the front/rear split SHALL be 60/40
- **AND** visual layout SHALL match across variant switches

### Requirement: Typography Accessibility

All variants SHALL meet minimum typography size requirements.

#### Scenario: Minimum font sizes
- **WHEN** text is rendered in any armor diagram variant
- **THEN** location labels SHALL be at least 9px
- **AND** armor values SHALL be at least 12px
- **AND** capacity text (e.g., "/ 32") SHALL be at least 9px

#### Scenario: Text effects do not reduce readability
- **WHEN** text effects (shadow, glow) are applied
- **THEN** effects SHALL not blur or obscure text
- **AND** text SHALL remain readable at all viewport sizes

### Requirement: MegaMek Variant

The system SHALL provide a MegaMek variant with authentic record sheet styling.

#### Scenario: MegaMek visual elements
- **WHEN** MegaMek variant is active
- **THEN** diagram uses realistic mech contour silhouette
- **AND** locations use beige/cream fill (#f5f5dc or similar)
- **AND** locations have brown/sepia outline (#8b7355 or similar)
- **AND** armor values are displayed with drop shadow for readability
- **AND** capacity is shown below values (e.g., "/ 32")
- **AND** selected location shows blue highlight (#3b82f6)

#### Scenario: MegaMek visual distinction from Standard
- **WHEN** comparing MegaMek and Standard variants
- **THEN** MegaMek SHALL use beige/cream color palette
- **AND** Standard SHALL use green color palette (#22c55e)
- **AND** variants SHALL be visually distinguishable

### Requirement: Shared Diagram Header

All silhouette variants SHALL use a consistent header component with variant selector.

#### Scenario: Header with quick settings
- **WHEN** any silhouette variant is rendered
- **THEN** diagram header SHALL display title
- **AND** header SHALL include ArmorDiagramQuickSettings dropdown
- **AND** quick settings dropdown allows switching variants without visiting Settings page

#### Scenario: Header theming
- **GIVEN** a silhouette variant with custom styling (e.g., Neon Operator)
- **WHEN** diagram header is rendered
- **THEN** header text and controls MAY use variant-appropriate colors
- **AND** functionality SHALL remain consistent across variants

### Requirement: Color Accessibility

All variants SHALL meet WCAG AA color contrast requirements.

#### Scenario: Text contrast compliance
- **WHEN** text is rendered on any variant background
- **THEN** text color SHALL have minimum 4.5:1 contrast ratio against background
- **AND** status colors (green, amber, orange, red) SHALL have minimum 3:1 contrast against fill

#### Scenario: Status color visibility
- **WHEN** armor status colors are displayed
- **THEN** all four status levels (75%+, 50%+, 25%+, <25%) SHALL be distinguishable
- **AND** colorblind users SHALL be able to distinguish status through value display

### Requirement: MegaMek Classic Variant

The system SHALL provide a "MegaMek Classic" armor diagram variant that matches MegaMekLab's visual style.

**Rationale**: Users familiar with MegaMekLab expect visual parity; using official assets ensures authenticity.

**Priority**: High

#### Scenario: MegaMek Classic rendering
- **WHEN** user selects "MegaMek Classic" variant in Settings
- **THEN** armor diagram SHALL render using mm-data pip SVG assets
- **AND** visual appearance SHALL match MegaMekLab's armor diagram
- **AND** pips are displayed as circles arranged per location

#### Scenario: MegaMek Classic pip loading
- **WHEN** armor diagram renders for a location
- **THEN** load pip SVG matching current armor value
- **AND** display correct number of filled circles
- **AND** rear armor uses separate rear pip SVGs for torso locations

#### Scenario: MegaMek Classic click interaction
- **WHEN** user clicks on a location in MegaMek Classic variant
- **THEN** invisible click target overlay registers the click
- **AND** location is selected for editing
- **AND** hover state displays on mouse enter

#### Scenario: MegaMek Classic paradigm documentation
- **WHEN** user views MegaMek Classic in variant selector
- **THEN** description SHALL indicate pip-based display paradigm
- **AND** users understand this variant shows armor as pip counts
