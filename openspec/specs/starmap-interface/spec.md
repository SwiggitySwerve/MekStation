# Starmap Interface Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-01-31
**Dependencies**: None (standalone display component)
**Affects**: [campaign-hud]

---

## Overview

### Purpose
Defines the Inner Sphere starmap display system for BattleTech campaign navigation, including Canvas-based rendering, level-of-detail optimization, pan/zoom controls, system selection, and faction visualization. This specification enables strategic navigation across 2,000-3,500 star systems.

### Scope
**In Scope:**
- Canvas-based rendering using react-konva (NOT SVG)
- Level-of-detail (LOD) strategy for performance at scale
- Pan and zoom with smooth transitions
- System selection and hover interactions
- Faction coloring with distinct hues per faction
- Viewport culling for rendering optimization
- Star system data model (coordinates, faction, population, industrial rating)
- Performance thresholds and rendering recommendations

**Out of Scope:**
- Jump route pathfinding algorithm (future scope)
- Faction border rendering (future scope)
- Multiplayer synchronization
- Tactical hex grid (see tactical-map-interface)
- Campaign game logic (see campaign-hud)

### Key Concepts
- **Star System**: A planetary system in the Inner Sphere with coordinates, faction ownership, and strategic properties
- **Level of Detail (LOD)**: Rendering strategy that adjusts visual fidelity based on zoom level to maintain performance
- **Viewport Culling**: Only rendering systems visible within the current viewport bounds
- **Faction**: Political entity controlling star systems (e.g., Lyran Commonwealth, Draconis Combine)
- **Jump Route**: Potential DropShip travel path between systems (optional visualization, future)

---

## Requirements

### Requirement: Canvas-Based Rendering
The system SHALL use Canvas 2D rendering via react-konva for starmap display.

**Rationale**: The full Inner Sphere contains 2,000-3,500 star systems. SVG rendering degrades at 3,000-5,000 elements, while Canvas 2D remains comfortable up to 10,000 elements.

**Priority**: Critical

#### Scenario: Full Inner Sphere rendering
**GIVEN** a starmap with 3,359 star systems (SUCKit dataset)
**WHEN** rendering the complete Inner Sphere
**THEN** Canvas 2D rendering SHALL be used
**AND** performance SHALL remain above 30 FPS at 1x zoom

#### Scenario: Regional starmap rendering
**GIVEN** a starmap with 200-500 systems (regional view)
**WHEN** rendering a sector or region
**THEN** Canvas 2D rendering SHALL be used
**AND** performance SHALL remain above 60 FPS

#### Scenario: SVG not used for large maps
**GIVEN** a starmap with more than 1,000 systems
**WHEN** selecting rendering technology
**THEN** SVG rendering SHALL NOT be used
**AND** Canvas 2D SHALL be the primary renderer

---

### Requirement: Level of Detail (LOD) Strategy
The system SHALL implement a four-level LOD strategy based on zoom level to maintain performance.

**Rationale**: Rendering all system details at all zoom levels wastes GPU resources and degrades performance. LOD reduces visual complexity when zoomed out.

**Priority**: Critical

#### Scenario: Far zoom (overview)
**GIVEN** zoom level is 0.1x to 0.25x
**WHEN** rendering the starmap
**THEN** systems SHALL be rendered as 3-5px dots with faction color
**AND** system labels SHALL NOT be displayed
**AND** only faction region boundaries SHALL be visible

#### Scenario: Medium zoom (major systems)
**GIVEN** zoom level is 0.25x to 0.5x
**WHEN** rendering the starmap
**THEN** major systems (population > 1 billion) SHALL be rendered as 8px dots
**AND** major system labels SHALL be displayed
**AND** minor systems SHALL be rendered as 5px dots without labels

#### Scenario: Close zoom (all systems)
**GIVEN** zoom level is 0.5x to 2x
**WHEN** rendering the starmap
**THEN** all systems SHALL be rendered with full icons and faction colors
**AND** all system labels SHALL be displayed
**AND** jump routes SHALL be visible (if enabled)

#### Scenario: Detail zoom (tooltips)
**GIVEN** zoom level is 2x or greater
**WHEN** hovering over a system
**THEN** a tooltip SHALL display system details (population, industrial rating, faction)
**AND** HPG indicators SHALL be visible
**AND** jump range circles SHALL be visible (if enabled)

---

### Requirement: Pan and Zoom Controls
The system SHALL support pan and zoom interactions with smooth transitions.

**Rationale**: Strategic navigation requires fluid map exploration across large distances.

**Priority**: High

#### Scenario: Mouse wheel zoom
**GIVEN** the starmap is displayed
**WHEN** the user scrolls the mouse wheel
**THEN** the zoom level SHALL increase (scroll up) or decrease (scroll down)
**AND** zoom SHALL be centered on the mouse cursor position
**AND** zoom range SHALL be 0.1x to 3x

#### Scenario: Pan with click-drag
**GIVEN** the starmap is displayed
**WHEN** the user middle-clicks or Alt+clicks and drags
**THEN** the viewport SHALL pan in the drag direction
**AND** panning SHALL be smooth with no lag

#### Scenario: Keyboard zoom
**GIVEN** the starmap is displayed
**WHEN** the user presses + or - keys
**THEN** zoom SHALL increase (+) or decrease (-)
**AND** zoom SHALL be centered on the viewport center

#### Scenario: Double-click to center
**GIVEN** the starmap is displayed
**WHEN** the user double-clicks a system
**THEN** the viewport SHALL smoothly pan to center on that system
**AND** zoom level SHALL remain unchanged

#### Scenario: Minimap navigation
**GIVEN** a minimap is displayed
**WHEN** the user clicks a location on the minimap
**THEN** the main viewport SHALL jump to that location
**AND** zoom level SHALL remain unchanged

---

### Requirement: System Selection and Hover
The system SHALL support selecting and hovering over star systems with visual feedback.

**Rationale**: Users need to interact with systems to view details and initiate actions.

**Priority**: High

#### Scenario: Hover highlights system
**GIVEN** the starmap is displayed
**WHEN** the user hovers over a system
**THEN** the system SHALL be highlighted with a bright border
**AND** a tooltip SHALL appear showing system name and faction

#### Scenario: Click selects system
**GIVEN** the starmap is displayed
**WHEN** the user clicks a system
**THEN** the system SHALL be marked as selected
**AND** a selection ring SHALL be displayed around the system
**AND** the context panel SHALL update with system details

#### Scenario: Deselect by clicking empty space
**GIVEN** a system is selected
**WHEN** the user clicks empty space on the starmap
**THEN** the selection SHALL be cleared
**AND** the selection ring SHALL disappear

#### Scenario: Hover at far zoom
**GIVEN** zoom level is 0.1x (far zoom)
**WHEN** the user hovers over a system dot
**THEN** the system SHALL be highlighted
**BUT** no tooltip SHALL be displayed (too zoomed out)

---

### Requirement: Faction Coloring
The system SHALL display faction ownership using distinct hues per faction.

**Rationale**: Visual differentiation of political control is essential for strategic planning.

**Priority**: High

#### Scenario: Distinct faction colors
**GIVEN** the starmap displays multiple factions
**WHEN** rendering systems
**THEN** each faction SHALL have a unique color hue
**AND** colors SHALL be visually distinct (minimum 30° hue separation)
**AND** colors SHALL meet WCAG AA contrast requirements against the background

#### Scenario: Faction color consistency
**GIVEN** a faction controls multiple systems
**WHEN** rendering those systems
**THEN** all systems SHALL use the same faction color
**AND** the color SHALL remain consistent across zoom levels

#### Scenario: Neutral or unowned systems
**GIVEN** a system has no faction ownership
**WHEN** rendering the system
**THEN** the system SHALL be rendered in a neutral gray color

#### Scenario: Contested systems
**GIVEN** a system is marked as contested (multiple factions)
**WHEN** rendering the system
**THEN** the system SHALL be rendered with a striped or split color pattern
**OR** a special contested indicator icon

---

### Requirement: Viewport Culling
The system SHALL only render systems within the current viewport bounds plus a margin.

**Rationale**: Rendering off-screen systems wastes GPU resources and degrades performance.

**Priority**: High

#### Scenario: Cull off-screen systems
**GIVEN** the starmap has 3,000 systems
**WHEN** the viewport shows a region containing 200 systems
**THEN** only systems within the viewport bounds SHALL be rendered
**AND** systems outside the viewport SHALL be skipped

#### Scenario: Margin for smooth panning
**GIVEN** the viewport is being panned
**WHEN** calculating visible systems
**THEN** a margin of 10% viewport size SHALL be added to the culling bounds
**AND** systems within the margin SHALL be pre-rendered for smooth panning

#### Scenario: Culling updates on pan/zoom
**GIVEN** the viewport is panned or zoomed
**WHEN** the viewport bounds change
**THEN** the visible systems list SHALL be recalculated
**AND** rendering SHALL update to show newly visible systems

---

### Requirement: Performance Thresholds
The system SHALL meet defined performance thresholds for rendering and interaction.

**Rationale**: Smooth interaction is critical for user experience. Performance must be validated against known thresholds.

**Priority**: Critical

#### Scenario: Canvas 2D comfortable threshold
**GIVEN** the starmap uses Canvas 2D rendering
**WHEN** rendering fewer than 10,000 elements
**THEN** performance SHALL remain above 60 FPS
**AND** interaction SHALL feel responsive

#### Scenario: Canvas 2D degradation threshold
**GIVEN** the starmap uses Canvas 2D rendering
**WHEN** rendering 20,000-50,000 elements
**THEN** performance MAY degrade to 30-60 FPS
**AND** LOD SHALL be applied to reduce element count

#### Scenario: SVG not used for large maps
**GIVEN** the starmap has more than 1,000 systems
**WHEN** selecting rendering technology
**THEN** SVG SHALL NOT be used
**AND** Canvas 2D or WebGL SHALL be used instead

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Star system entity with strategic properties.
 */
interface IStarSystem {
  /**
   * Unique system identifier
   * @example "Terra"
   */
  readonly id: string;

  /**
   * Display name of the system
   * @example "Terra"
   */
  readonly name: string;

  /**
   * X coordinate in light-years (affine normalized)
   * @example 0.0
   */
  readonly x: number;

  /**
   * Y coordinate in light-years (affine normalized)
   * @example 0.0
   */
  readonly y: number;

  /**
   * Faction controlling this system (null if unowned)
   * @example "Lyran Commonwealth"
   */
  readonly faction: string | null;

  /**
   * Population in billions
   * @example 5.2
   */
  readonly population: number;

  /**
   * Industrial rating (0-5, higher = more production)
   * @example 4
   */
  readonly industrialRating: number;

  /**
   * Whether this system has an HPG station
   * @example true
   */
  readonly hasHPG: boolean;

  /**
   * Whether this system is a major strategic location
   * @example true
   */
  readonly isMajor: boolean;
}

/**
 * Starmap viewport state.
 */
interface IStarmapViewport {
  /**
   * Center X coordinate in world space
   * @example 0.0
   */
  readonly centerX: number;

  /**
   * Center Y coordinate in world space
   * @example 0.0
   */
  readonly centerY: number;

  /**
   * Zoom level (0.1x to 3x)
   * @example 1.0
   */
  readonly zoom: number;

  /**
   * Viewport width in pixels
   * @example 1920
   */
  readonly width: number;

  /**
   * Viewport height in pixels
   * @example 1080
   */
  readonly height: number;
}

/**
 * Level of Detail configuration.
 */
interface ILODConfig {
  /**
   * Zoom threshold for far LOD (faction blobs)
   * @example 0.25
   */
  readonly farThreshold: number;

  /**
   * Zoom threshold for medium LOD (major systems)
   * @example 0.5
   */
  readonly mediumThreshold: number;

  /**
   * Zoom threshold for close LOD (all systems)
   * @example 2.0
   */
  readonly closeThreshold: number;

  /**
   * System dot size at far zoom (pixels)
   * @example 3
   */
  readonly farDotSize: number;

  /**
   * System dot size at medium zoom (pixels)
   * @example 5
   */
  readonly mediumDotSize: number;

  /**
   * System icon size at close zoom (pixels)
   * @example 12
   */
  readonly closeDotSize: number;

  /**
   * Whether to show labels at medium zoom
   * @example true
   */
  readonly showLabelsAtMedium: boolean;

  /**
   * Whether to show labels at close zoom
   * @example true
   */
  readonly showLabelsAtClose: boolean;
}

/**
 * Starmap display component props.
 */
interface IStarmapDisplayProps {
  /**
   * Array of star systems to display
   */
  readonly systems: readonly IStarSystem[];

  /**
   * Current viewport state
   */
  readonly viewport: IStarmapViewport;

  /**
   * Level of detail configuration
   */
  readonly lodConfig: ILODConfig;

  /**
   * Selected system ID (null if none)
   */
  readonly selectedSystemId: string | null;

  /**
   * Callback when a system is selected
   */
  readonly onSystemSelect: (systemId: string | null) => void;

  /**
   * Callback when viewport changes (pan/zoom)
   */
  readonly onViewportChange: (viewport: IStarmapViewport) => void;

  /**
   * Whether to show jump routes (optional, future)
   * @default false
   */
  readonly showJumpRoutes?: boolean;

  /**
   * Whether to show faction borders (optional, future)
   * @default false
   */
  readonly showFactionBorders?: boolean;
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `id` | `string` | Yes | Unique system identifier | Non-empty string | - |
| `name` | `string` | Yes | Display name | Non-empty string | - |
| `x` | `number` | Yes | X coordinate (light-years) | Finite number | - |
| `y` | `number` | Yes | Y coordinate (light-years) | Finite number | - |
| `faction` | `string \| null` | Yes | Controlling faction | Faction name or null | null |
| `population` | `number` | Yes | Population (billions) | >= 0 | 0 |
| `industrialRating` | `number` | Yes | Industrial capacity | 0-5 | 0 |
| `zoom` | `number` | Yes | Zoom level | 0.1 to 3.0 | 1.0 |

### Type Constraints

- `x` and `y` MUST be finite numbers
- `zoom` MUST be between 0.1 and 3.0 (inclusive)
- `population` MUST be >= 0
- `industrialRating` MUST be between 0 and 5 (inclusive)
- `viewport.width` and `viewport.height` MUST be > 0

---

## Calculation Formulas

### Viewport Culling Formula

**Formula**:
```
isVisible = (
  systemX >= viewportMinX - margin &&
  systemX <= viewportMaxX + margin &&
  systemY >= viewportMinY - margin &&
  systemY <= viewportMaxY + margin
)
```

**Where**:
- `systemX`, `systemY` = star system coordinates in world space
- `viewportMinX` = `centerX - (width / 2) / zoom`
- `viewportMaxX` = `centerX + (width / 2) / zoom`
- `viewportMinY` = `centerY - (height / 2) / zoom`
- `viewportMaxY` = `centerY + (height / 2) / zoom`
- `margin` = `0.1 * (width / zoom)` (10% of viewport width)

**Example**:
```
Viewport: centerX=0, centerY=0, zoom=1.0, width=1920, height=1080
viewportMinX = 0 - (1920 / 2) / 1.0 = -960
viewportMaxX = 0 + (1920 / 2) / 1.0 = 960
margin = 0.1 * (1920 / 1.0) = 192

System at (500, 300):
  500 >= -960 - 192 && 500 <= 960 + 192 → true
  300 >= -540 - 108 && 300 <= 540 + 108 → true
  → System is visible
```

### LOD Level Determination

**Formula**:
```
lodLevel = 
  zoom < farThreshold ? LOD_FAR :
  zoom < mediumThreshold ? LOD_MEDIUM :
  zoom < closeThreshold ? LOD_CLOSE :
  LOD_DETAIL
```

**Where**:
- `farThreshold` = 0.25 (default)
- `mediumThreshold` = 0.5 (default)
- `closeThreshold` = 2.0 (default)

**Example**:
```
zoom = 0.15 → LOD_FAR (faction blobs)
zoom = 0.4 → LOD_MEDIUM (major systems only)
zoom = 1.0 → LOD_CLOSE (all systems)
zoom = 2.5 → LOD_DETAIL (tooltips, HPG indicators)
```

---

## Performance Thresholds

### Rendering Technology Recommendations

| Hex/System Count | Recommended Renderer | Performance Target |
|------------------|---------------------|-------------------|
| < 1,000 | SVG | 60 FPS |
| 1,000 - 10,000 | Canvas 2D (react-konva) | 60 FPS |
| 10,000 - 50,000 | Canvas 2D with LOD | 30-60 FPS |
| > 50,000 | WebGL (pixi-react) | 60 FPS |

### Full Inner Sphere Performance

| Dataset | System Count | Renderer | LOD Required | Expected FPS |
|---------|-------------|----------|--------------|--------------|
| SUCKit | ~3,359 | Canvas 2D | Yes | 60 FPS |
| InnerSphereMap | ~2,000 | Canvas 2D | Yes | 60 FPS |
| MekHQ | ~2,500 | Canvas 2D | Yes | 60 FPS |

---

## Validation Rules

### Validation: Valid Zoom Range
**Rule**: Zoom level MUST be within 0.1x to 3.0x range.

**Severity**: Error

**Condition**:
```typescript
if (zoom < 0.1 || zoom > 3.0) {
  // invalid
}
```

**Error Message**: "Zoom level {zoom} is out of range. Must be between 0.1 and 3.0."

**User Action**: Reset zoom to 1.0 or clamp to valid range.

### Validation: Valid Coordinates
**Rule**: System coordinates MUST be finite numbers.

**Severity**: Error

**Condition**:
```typescript
if (!isFinite(system.x) || !isFinite(system.y)) {
  // invalid
}
```

**Error Message**: "System {name} has invalid coordinates: ({x}, {y})"

**User Action**: Correct system data or exclude from rendering.

### Validation: Valid Industrial Rating
**Rule**: Industrial rating MUST be between 0 and 5.

**Severity**: Warning

**Condition**:
```typescript
if (system.industrialRating < 0 || system.industrialRating > 5) {
  // invalid - clamp to range
}
```

**Error Message**: "System {name} has invalid industrial rating {rating}. Clamping to 0-5 range."

**User Action**: Clamp to valid range (0-5).

---

## Dependencies

### Depends On
- None (standalone display component)

### Used By
- **campaign-hud**: Embeds starmap in campaign layout for strategic navigation

---

## Implementation Notes

### Performance Considerations
- Use spatial indexing (quadtree or R-tree) for fast hover/click detection
- Pre-calculate faction colors at load time
- Batch render systems by faction to reduce draw calls
- Use Canvas layer caching for static elements (faction regions)
- Debounce viewport change events to avoid excessive re-renders

### Edge Cases
- **Empty starmap**: Display message "No systems to display"
- **Single system**: Center viewport on that system
- **Overlapping systems**: Use z-index based on population or industrial rating
- **Very large zoom**: Clamp to 3.0x to prevent excessive detail
- **Very small zoom**: Clamp to 0.1x to prevent invisible systems

### Common Pitfalls
- **Pitfall**: Rendering all systems at all zoom levels
  - **Solution**: Implement LOD and viewport culling
- **Pitfall**: Using SVG for large starmaps
  - **Solution**: Use Canvas 2D or WebGL for > 1,000 systems
- **Pitfall**: Not caching faction colors
  - **Solution**: Pre-calculate and store in lookup table
- **Pitfall**: Recalculating visible systems on every frame
  - **Solution**: Only recalculate when viewport changes

---

## Examples

### Example 1: Basic Starmap Display

**Input**:
```typescript
const systems: IStarSystem[] = [
  {
    id: 'terra',
    name: 'Terra',
    x: 0.0,
    y: 0.0,
    faction: 'ComStar',
    population: 5.2,
    industrialRating: 5,
    hasHPG: true,
    isMajor: true,
  },
  {
    id: 'tharkad',
    name: 'Tharkad',
    x: -120.5,
    y: 200.3,
    faction: 'Lyran Commonwealth',
    population: 3.8,
    industrialRating: 4,
    hasHPG: true,
    isMajor: true,
  },
];

const viewport: IStarmapViewport = {
  centerX: 0.0,
  centerY: 0.0,
  zoom: 1.0,
  width: 1920,
  height: 1080,
};

const lodConfig: ILODConfig = {
  farThreshold: 0.25,
  mediumThreshold: 0.5,
  closeThreshold: 2.0,
  farDotSize: 3,
  mediumDotSize: 5,
  closeDotSize: 12,
  showLabelsAtMedium: true,
  showLabelsAtClose: true,
};
```

**Processing**:
```typescript
// Determine LOD level
const lodLevel = viewport.zoom < 0.25 ? 'FAR' :
                 viewport.zoom < 0.5 ? 'MEDIUM' :
                 viewport.zoom < 2.0 ? 'CLOSE' : 'DETAIL';

// Calculate visible systems
const visibleSystems = systems.filter(system => {
  const viewportMinX = viewport.centerX - (viewport.width / 2) / viewport.zoom;
  const viewportMaxX = viewport.centerX + (viewport.width / 2) / viewport.zoom;
  const viewportMinY = viewport.centerY - (viewport.height / 2) / viewport.zoom;
  const viewportMaxY = viewport.centerY + (viewport.height / 2) / viewport.zoom;
  const margin = 0.1 * (viewport.width / viewport.zoom);

  return system.x >= viewportMinX - margin &&
         system.x <= viewportMaxX + margin &&
         system.y >= viewportMinY - margin &&
         system.y <= viewportMaxY + margin;
});

// Render systems based on LOD
visibleSystems.forEach(system => {
  const dotSize = lodLevel === 'FAR' ? lodConfig.farDotSize :
                  lodLevel === 'MEDIUM' ? lodConfig.mediumDotSize :
                  lodConfig.closeDotSize;

  const showLabel = (lodLevel === 'MEDIUM' && lodConfig.showLabelsAtMedium) ||
                    (lodLevel === 'CLOSE' && lodConfig.showLabelsAtClose) ||
                    lodLevel === 'DETAIL';

  renderSystem(system, dotSize, showLabel);
});
```

**Output**:
```
LOD Level: CLOSE (zoom = 1.0)
Visible Systems: 2 (Terra, Tharkad)
Dot Size: 12px
Labels: Shown
```

### Example 2: Viewport Culling at Far Zoom

**Input**:
```typescript
const viewport: IStarmapViewport = {
  centerX: 0.0,
  centerY: 0.0,
  zoom: 0.1, // Far zoom
  width: 1920,
  height: 1080,
};

const systems: IStarSystem[] = [
  { id: 's1', name: 'System 1', x: 0, y: 0, /* ... */ },
  { id: 's2', name: 'System 2', x: 5000, y: 5000, /* ... */ }, // Off-screen
];
```

**Processing**:
```typescript
const viewportMinX = 0 - (1920 / 2) / 0.1 = -9600;
const viewportMaxX = 0 + (1920 / 2) / 0.1 = 9600;
const margin = 0.1 * (1920 / 0.1) = 1920;

System 1: 0 >= -9600 - 1920 && 0 <= 9600 + 1920 → visible
System 2: 5000 >= -9600 - 1920 && 5000 <= 9600 + 1920 → visible
```

**Output**:
```
Visible Systems: 2 (both within expanded viewport)
LOD Level: FAR
Dot Size: 3px
Labels: Hidden
```

---

## References

### Data Sources
- **SUCKit**: ~3,359 star system coordinates (GNU FDL 1.2) - https://docs.google.com/spreadsheets/d/1uO6aZ20rfEcAZJ-nDRhCnaNUiCPemuoOOd67Zqi1MVM
- **InnerSphereMap**: JSON per system with descriptions (GPL-3.0) - https://github.com/Morphyum/InnerSphereMap
- **MekHQ**: YAML with detailed planetary data (GPL-2.0) - https://github.com/MegaMek/mekhq

### Technical Resources
- **react-konva**: Canvas rendering for React - https://konvajs.org/docs/react/
- **Red Blob Games**: Hexagonal grids and spatial algorithms - https://www.redblobgames.com/grids/hexagons/

### Related Documentation
- **campaign-map-design-research.md**: Part 10 (data sources), Part 12 (Canvas vs SVG), Part 13 (LOD strategy)

---

## Changelog

### Version 1.0 (2026-01-31)
- Initial specification based on campaign map design research
- Canvas 2D rendering with react-konva
- Four-level LOD strategy (Far, Medium, Close, Detail)
- Viewport culling for performance
- Faction coloring and system selection
- Performance thresholds for 2,000-3,500 systems
