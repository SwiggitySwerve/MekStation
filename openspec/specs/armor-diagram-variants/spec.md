# Armor Diagram Variants Specification

## Purpose

The armor diagram in the customizer supports multiple visual design variants. Users can choose their preferred style from the settings page, and the selection persists across sessions.
## Requirements
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
  - MegaMek Classic (NEW - uses mm-data assets)
- **AND** each variant maintains identical functionality
- **AND** each variant displays all locations for the current configuration
- **AND** each variant applies consistently to all mech configurations (Biped, Quad, Tripod, LAM, QuadVee)

### Requirement: Clean Tech Variant
The system SHALL provide a Clean Tech design focused on maximum readability.

#### Scenario: Clean Tech visual elements
- **WHEN** Clean Tech variant is active
- **THEN** diagram uses realistic mech contour silhouette
- **AND** locations use solid gradient fills based on armor status
- **AND** armor values are displayed as plain bold numbers
- **AND** capacity is shown as small text (e.g., "/ 32")
- **AND** torso locations show stacked front/rear sections
- **AND** selected location shows simple border highlight

### Requirement: Neon Operator Variant
The system SHALL provide a Neon Operator design with sci-fi aesthetic.

#### Scenario: Neon Operator visual elements
- **WHEN** Neon Operator variant is active
- **THEN** diagram uses wireframe outline style
- **AND** locations use semi-transparent fills with glowing edges
- **AND** armor values are surrounded by circular progress rings
- **AND** a front/rear toggle switch is provided
- **AND** hovering triggers glow pulse animation
- **AND** scanline effects are applied as overlay

### Requirement: Tactical HUD Variant
The system SHALL provide a Tactical HUD design with military feel.

#### Scenario: Tactical HUD visual elements
- **WHEN** Tactical HUD variant is active
- **THEN** diagram uses geometric/polygonal shapes
- **AND** armor values use LED-style segmented display
- **AND** locations show tank-fill style (bottom-up) fill indicator
- **AND** horizontal bar gauges show capacity
- **AND** front and rear views are shown side-by-side
- **AND** corner brackets appear on hover/selection

### Requirement: Premium Material Variant
The system SHALL provide a Premium Material design with tactile feel.

#### Scenario: Premium Material visual elements
- **WHEN** Premium Material variant is active
- **THEN** diagram uses realistic mech contour silhouette
- **AND** locations use metallic/textured fills
- **AND** armor values are displayed in circular badges
- **AND** dot indicators show capacity (like battery level)
- **AND** rear armor plates are layered behind front with 3D offset
- **AND** hovering triggers lift/shadow effect

### Requirement: Consistent Functionality
All variants SHALL maintain identical armor management functionality.

#### Scenario: Functional consistency
- **GIVEN** any diagram variant is active
- **WHEN** user interacts with the diagram
- **THEN** clicking a location selects it for editing
- **AND** armor values update in real-time
- **AND** auto-allocate button functions identically
- **AND** keyboard navigation works (Tab, Enter, Space)
- **AND** ARIA labels are provided for accessibility

### Requirement: Status Color Coding
All variants SHALL use consistent color coding for armor status.

#### Scenario: Status colors
- **WHEN** armor is displayed on any variant
- **THEN** 75-100% capacity shows green (#22c55e)
- **AND** 50-74% capacity shows amber (#f59e0b)
- **AND** 25-49% capacity shows orange (#f97316)
- **AND** 0-24% capacity shows red (#ef4444)
- **AND** selected location shows blue (#3b82f6)

### Requirement: Variant Persistence
The system SHALL persist the user's variant selection.

#### Scenario: Selection persistence
- **WHEN** user selects a diagram variant
- **THEN** selection is saved to localStorage
- **AND** selection is restored on page reload
- **AND** selection applies across all customizer sessions

### Requirement: MegaMek Variant
The system SHALL provide a MegaMek variant with classic styling.

#### Scenario: MegaMek visual elements
- **WHEN** MegaMek variant is active
- **THEN** diagram uses realistic mech contour silhouette
- **AND** locations use solid fills with shadow/outline effects
- **AND** armor values are displayed as plain text with drop shadow
- **AND** capacity is shown below values (e.g., "/ 32")
- **AND** selected location shows classic blue highlight

### Requirement: Variant Configuration Compatibility
All visual variants SHALL render correctly on all mech configurations.

#### Scenario: Variant applies to Quad configuration
- **GIVEN** user has selected a visual variant in settings
- **WHEN** viewing a Quad mech in the armor tab
- **THEN** the armor diagram SHALL render using the selected variant's styling
- **AND** all 8 quad locations (HD, CT, LT, RT, FLL, FRL, RLL, RRL) SHALL display variant-specific fills and typography

#### Scenario: Variant applies to Tripod configuration
- **GIVEN** user has selected a visual variant in settings
- **WHEN** viewing a Tripod mech in the armor tab
- **THEN** the armor diagram SHALL render using the selected variant's styling
- **AND** all 9 tripod locations (HD, CT, LT, RT, LA, RA, LL, RL, CL) SHALL display variant-specific fills and typography

#### Scenario: Variant applies to LAM configuration
- **GIVEN** user has selected a visual variant in settings
- **WHEN** viewing a LAM in the armor tab
- **THEN** the armor diagram SHALL render using the selected variant's styling
- **AND** all mech mode locations SHALL display variant-specific fills and typography
- **AND** mode toggle control SHALL use variant-consistent button styling

#### Scenario: Variant applies to QuadVee configuration
- **GIVEN** user has selected a visual variant in settings
- **WHEN** viewing a QuadVee in the armor tab
- **THEN** the armor diagram SHALL render using the selected variant's styling
- **AND** all quad locations SHALL display variant-specific fills and typography
- **AND** mode toggle control SHALL use variant-consistent button styling

### Requirement: Shared Variant Location Renderer
The system SHALL use a shared component for rendering location content across all configurations.

#### Scenario: Location content rendering
- **WHEN** an armor location is rendered in any diagram
- **THEN** the system SHALL select appropriate variant renderer (CleanTech, Neon, Tactical, Premium, or MegaMek)
- **AND** renderer SHALL display armor value using variant-specific typography
- **AND** renderer SHALL display capacity indicator using variant-specific format
- **AND** renderer SHALL apply variant-specific fill patterns and effects

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

#### Scenario: MegaMek Classic default
- **GIVEN** user has not explicitly chosen a variant
- **WHEN** armor diagram renders
- **THEN** MegaMek Classic SHALL be the default variant

## Component Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| CleanTechDiagram | `armor/variants/CleanTechDiagram.tsx` | Clean Tech variant |
| NeonOperatorDiagram | `armor/variants/NeonOperatorDiagram.tsx` | Neon Operator variant |
| TacticalHUDDiagram | `armor/variants/TacticalHUDDiagram.tsx` | Tactical HUD variant |
| PremiumMaterialDiagram | `armor/variants/PremiumMaterialDiagram.tsx` | Premium Material variant |
| MechSilhouette | `armor/shared/MechSilhouette.tsx` | SVG path definitions |
| ArmorFills | `armor/shared/ArmorFills.tsx` | Gradients and filters |

## Shared Resources

### Silhouette Types
- `REALISTIC_SILHOUETTE` - Smooth curved mech shape
- `GEOMETRIC_SILHOUETTE` - Angular polygonal shapes

### SVG Filter Effects
- `armor-glow` - Standard glow effect
- `armor-neon-glow` - Strong neon glow for Neon Operator
- `armor-lift-shadow` - Drop shadow for Premium Material
- `armor-inner-shadow` - Depth effect
- `armor-scanlines` - CRT scanline pattern
- `armor-grid` - Technical grid overlay
- `armor-carbon` - Carbon fiber texture
- `armor-metallic` - Metallic gradient overlay
