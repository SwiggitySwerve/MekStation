## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Multiple Design Variants
The system SHALL provide 5 distinct armor diagram designs for user selection.

#### Scenario: Available variants
- **WHEN** the armor diagram is rendered
- **THEN** the system supports these variants:
  - Clean Tech (default)
  - Neon Operator
  - Tactical HUD
  - Premium Material
  - MegaMek
- **AND** each variant maintains identical functionality
- **AND** each variant displays all locations for the current configuration
- **AND** each variant applies consistently to all mech configurations (Biped, Quad, Tripod, LAM, QuadVee)

## Component Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| CleanTechDiagram | `armor/variants/CleanTechDiagram.tsx` | Clean Tech variant (Biped) |
| NeonOperatorDiagram | `armor/variants/NeonOperatorDiagram.tsx` | Neon Operator variant (Biped) |
| TacticalHUDDiagram | `armor/variants/TacticalHUDDiagram.tsx` | Tactical HUD variant (Biped) |
| PremiumMaterialDiagram | `armor/variants/PremiumMaterialDiagram.tsx` | Premium Material variant (Biped) |
| MechSilhouette | `armor/shared/MechSilhouette.tsx` | SVG path definitions |
| ArmorFills | `armor/shared/ArmorFills.tsx` | Gradients and filters |
| VariantLocationRenderer | `armor/shared/VariantLocationRenderer.tsx` | Shared variant-aware location SVG renderer |
| VariantStyles | `armor/shared/VariantStyles.tsx` | Container/header/button/legend styling per variant |
