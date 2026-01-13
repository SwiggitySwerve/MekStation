# Armor Diagram Variants Specification

## Purpose

The armor diagram in the customizer supports multiple visual design variants. Users can choose their preferred style from the settings page, and the selection persists across sessions.

## Requirements

### Requirement: Multiple Design Variants
The system SHALL provide 4 distinct armor diagram designs for user selection.

#### Scenario: Available variants
- **WHEN** the armor diagram is rendered
- **THEN** the system supports these variants:
  - Clean Tech (default)
  - Neon Operator
  - Tactical HUD
  - Premium Material
- **AND** each variant maintains identical functionality
- **AND** each variant displays all 8 mech locations

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
