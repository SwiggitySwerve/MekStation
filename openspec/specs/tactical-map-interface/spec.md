# Tactical Map Interface Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-01-31
**Dependencies**: [terrain-system, hex-grid-interfaces]
**Affects**: [combat-resolution, movement-validation, campaign-hud]

---

## Overview

### Purpose
Defines the interactive hex map rendering and interaction system for BattleTech tactical combat, including SVG-based hex grid display, pan/zoom controls, terrain visualization, effect overlays, and unit token rendering. This specification encodes the visual and interactive requirements for tactical map display.

### Scope
**In Scope:**
- Hex grid rendering using SVG for tactical maps (15x17 to 30x34 hexes)
- Pan and zoom controls (mouse wheel, drag, keyboard)
- Terrain visualization (colors, patterns by terrain type)
- Effect overlays (movement cost, cover level, LOS, heat)
- Unit token rendering (facing, selection, status)
- Hex selection and hover states
- Interactive feedback patterns (highlights, ranges, paths)

**Out of Scope:**
- Canvas/WebGL rendering (reserved for starmap with 500+ nodes)
- Campaign-level UI (see campaign-hud spec)
- Combat resolution logic (see combat-resolution spec)
- Multiplayer synchronization (handled by game state layer)
- Terrain data model (see terrain-system spec)

### Key Concepts
- **Hex Coordinate**: Axial coordinate system `{q, r}` for hex positioning
- **Flat-Top Orientation**: Standard hex orientation for tactical maps (vertices at top/bottom)
- **Viewport**: The visible portion of the map with pan/zoom transformations
- **Overlay**: Toggleable visual layer showing calculated effects (movement, cover, LOS)
- **Token**: Visual representation of a unit on the map with facing indicator
- **Level of Detail (LOD)**: Rendering optimization based on zoom level

---

## Requirements

### Requirement: Hex Grid Rendering
The system SHALL render a hex grid using SVG with flat-top orientation and axial coordinates.

**Rationale**: SVG provides crisp rendering, easy interaction, and good performance for tactical map sizes (<3000 hexes).

**Priority**: Critical

#### Scenario: Render hex grid from radius
**GIVEN** a map radius of 8 hexes
**WHEN** rendering the hex grid
**THEN** 217 hexes SHALL be rendered (formula: 3r² + 3r + 1)
**AND** each hex SHALL use axial coordinates {q, r}
**AND** hexes SHALL be positioned using flat-top orientation

#### Scenario: Hex-to-pixel conversion
**GIVEN** a hex at axial coordinate {q: 2, r: -1}
**WHEN** converting to pixel position
**THEN** x SHALL equal `HEX_SIZE * (3/2) * q`
**AND** y SHALL equal `HEX_SIZE * (√3/2 * q + √3 * r)`
**AND** the position SHALL be relative to the grid center

#### Scenario: Pixel-to-hex conversion
**GIVEN** a mouse click at pixel position (150, 200)
**WHEN** converting to hex coordinate
**THEN** the nearest hex coordinate SHALL be calculated using inverse transform
**AND** fractional coordinates SHALL be rounded to nearest hex
**AND** the result SHALL satisfy q + r + s = 0 (cube coordinate constraint)

---

### Requirement: Pan and Zoom Controls
The system SHALL provide pan and zoom controls for map navigation.

**Priority**: Critical

#### Scenario: Mouse wheel zoom
**GIVEN** the map is displayed at 1.0x zoom
**WHEN** the user scrolls the mouse wheel up
**THEN** zoom SHALL increase by 10% (multiply by 1.1)
**AND** zoom SHALL be clamped to range [0.5x, 3.0x]
**AND** zoom SHALL center on the current viewport center

#### Scenario: Middle-click drag pan
**GIVEN** the user middle-clicks on the map
**WHEN** the user drags the mouse
**THEN** the viewport SHALL pan following the mouse movement
**AND** pan SHALL continue until mouse button is released

#### Scenario: Alt+click drag pan
**GIVEN** the user holds Alt and left-clicks on the map
**WHEN** the user drags the mouse
**THEN** the viewport SHALL pan following the mouse movement
**AND** pan SHALL continue until mouse button is released

#### Scenario: Keyboard zoom
**GIVEN** the map is displayed
**WHEN** the user presses the "+" key
**THEN** zoom SHALL increase by 20% (multiply by 1.2)
**WHEN** the user presses the "-" key
**THEN** zoom SHALL decrease by 20% (divide by 1.2)

#### Scenario: Reset view
**GIVEN** the map has been panned and zoomed
**WHEN** the user clicks the reset button
**THEN** zoom SHALL be set to 1.0x
**AND** pan SHALL be set to (0, 0)
**AND** the map SHALL center on the origin

---

### Requirement: Terrain Visualization
The system SHALL render terrain types with distinct visual treatments based on terrain data.

**Priority**: High

#### Scenario: Clear terrain rendering
**GIVEN** a hex with terrain type Clear
**WHEN** rendering the hex
**THEN** fill color SHALL be light gray (#e2e8f0)
**AND** stroke SHALL be grid line color (#cbd5e1)

#### Scenario: Light woods rendering
**GIVEN** a hex with terrain type LightWoods
**WHEN** rendering the hex
**THEN** fill color SHALL be light green (#bbf7d0)
**AND** a woods pattern indicator SHALL be displayed

#### Scenario: Heavy woods rendering
**GIVEN** a hex with terrain type HeavyWoods
**WHEN** rendering the hex
**THEN** fill color SHALL be dark green (#86efac)
**AND** a dense woods pattern indicator SHALL be displayed

#### Scenario: Water depth rendering
**GIVEN** a hex with terrain type Water at depth 1
**WHEN** rendering the hex
**THEN** fill color SHALL be light blue (#bfdbfe)
**WHEN** depth is 2
**THEN** fill color SHALL be medium blue (#93c5fd)
**WHEN** depth is 3+
**THEN** fill color SHALL be dark blue (#60a5fa)

#### Scenario: Building rendering
**GIVEN** a hex with terrain type Building at level 2
**WHEN** rendering the hex
**THEN** fill color SHALL be gray (#94a3b8)
**AND** building height indicator SHALL be displayed
**AND** construction factor (CF) SHALL be shown if available

---

### Requirement: Effect Overlays
The system SHALL provide toggleable overlays showing calculated terrain effects.

**Priority**: High

#### Scenario: Movement cost overlay
**GIVEN** a unit is selected with movement type Walk
**WHEN** the movement cost overlay is enabled
**THEN** each hex SHALL display its movement cost in MP
**AND** hexes SHALL be color-coded (green=1MP, yellow=2-3MP, red=4+MP)
**AND** impassable hexes SHALL be marked with an X

#### Scenario: Cover level overlay
**GIVEN** the cover overlay is enabled
**WHEN** rendering the map
**THEN** hexes with no cover SHALL show no indicator
**AND** hexes with partial cover SHALL show a half-shield icon
**AND** hexes with full cover SHALL show a full-shield icon

#### Scenario: Heat effect overlay
**GIVEN** the heat overlay is enabled
**WHEN** rendering the map
**THEN** hexes with cooling effects SHALL have blue tint
**AND** hexes with heating effects SHALL have red tint
**AND** heat modifier value SHALL be displayed (+5, -2, etc.)

#### Scenario: Line of sight overlay
**GIVEN** a unit is selected at hex {q: 0, r: 0}
**WHEN** the LOS overlay is enabled
**THEN** raycasts SHALL be drawn from the selected hex to all visible hexes
**AND** blocked LOS SHALL be shown in red
**AND** clear LOS SHALL be shown in green

#### Scenario: Elevation overlay
**GIVEN** the elevation overlay is enabled
**WHEN** rendering the map
**THEN** hexes SHALL be shaded by elevation level
**AND** contour lines SHALL be drawn between elevation changes
**AND** elevation value SHALL be displayed on each hex

#### Scenario: Multiple overlays stacking
**GIVEN** movement cost and cover overlays are both enabled
**WHEN** rendering a hex
**THEN** both movement cost numbers AND cover icons SHALL be visible
**AND** visual elements SHALL NOT overlap
**AND** overlay priority SHALL be: terrain < movement < cover < LOS

---

### Requirement: Unit Token Rendering
The system SHALL render unit tokens with facing indicators, selection rings, and status markers.

**Priority**: Critical

#### Scenario: Player unit token
**GIVEN** a player-controlled unit at hex {q: 2, r: 1} facing Northeast
**WHEN** rendering the token
**THEN** a circular token SHALL be drawn at the hex center
**AND** token color SHALL be blue (#3b82f6)
**AND** facing arrow SHALL point Northeast (60° rotation)
**AND** unit designation SHALL be displayed in the center

#### Scenario: Opponent unit token
**GIVEN** an opponent-controlled unit at hex {q: -2, r: 1}
**WHEN** rendering the token
**THEN** token color SHALL be red (#ef4444)
**AND** all other rendering rules SHALL match player tokens

#### Scenario: Selected unit token
**GIVEN** a unit is selected
**WHEN** rendering the token
**THEN** a yellow selection ring SHALL be drawn around the token
**AND** ring radius SHALL be 0.7 × HEX_SIZE
**AND** ring stroke width SHALL be 3px

#### Scenario: Valid target token
**GIVEN** a unit is a valid attack target
**WHEN** rendering the token
**THEN** a red target ring SHALL be drawn around the token
**AND** ring SHALL pulse with animation

#### Scenario: Destroyed unit token
**GIVEN** a unit is destroyed
**WHEN** rendering the token
**THEN** token color SHALL be gray (#6b7280)
**AND** a red X SHALL be drawn over the token
**AND** the token SHALL remain visible but non-interactive

#### Scenario: Facing indicator
**GIVEN** a unit facing South (180°)
**WHEN** rendering the facing arrow
**THEN** the arrow SHALL point downward
**AND** arrow SHALL be white with dark stroke
**AND** arrow SHALL be clearly visible against token background

---

### Requirement: Hex Selection and Hover States
The system SHALL provide visual feedback for hex selection and hover interactions.

**Priority**: High

#### Scenario: Hex hover state
**GIVEN** the mouse hovers over a hex
**WHEN** rendering the hex
**THEN** fill color SHALL change to hover color (#f1f5f9)
**AND** cursor SHALL change to pointer
**AND** onHexHover callback SHALL be invoked with hex coordinate

#### Scenario: Hex selection state
**GIVEN** a hex is selected
**WHEN** rendering the hex
**THEN** fill color SHALL change to selected color (#fef3c7)
**AND** stroke width SHALL increase to 2px
**AND** stroke color SHALL be yellow (#fbbf24)

#### Scenario: Movement range highlight
**GIVEN** a unit is selected with 6 MP remaining
**WHEN** rendering hexes within movement range
**THEN** reachable hexes SHALL be tinted green (#dcfce7)
**AND** unreachable hexes (blocked) SHALL be tinted red (#fee2e2)
**AND** MP cost SHALL be displayed on each hex

#### Scenario: Attack range highlight
**GIVEN** a unit is selected with weapon range 10 hexes
**WHEN** rendering hexes within attack range
**THEN** hexes SHALL be tinted red (#fecaca)
**AND** hexes with valid targets SHALL have brighter tint

#### Scenario: Path preview highlight
**GIVEN** the mouse hovers over a hex in movement range
**WHEN** rendering the movement path
**THEN** hexes along the path SHALL be highlighted with yellow tint (#fef9c3)
**AND** path SHALL be drawn as a dotted line
**AND** total MP cost SHALL be displayed

---

### Requirement: Interactive Feedback Patterns
The system SHALL provide consistent interaction patterns matching Civilization-style conventions.

**Priority**: Medium

#### Scenario: Hex click interaction
**GIVEN** the user clicks on a hex
**WHEN** the hex is empty
**THEN** onHexClick callback SHALL be invoked with hex coordinate
**WHEN** the hex contains a unit token
**THEN** onTokenClick callback SHALL be invoked with unit ID
**AND** hex click SHALL NOT fire (token click takes precedence)

#### Scenario: Double-click to center
**GIVEN** the user double-clicks on a hex
**WHEN** the interaction is processed
**THEN** the viewport SHALL pan to center on that hex
**AND** zoom level SHALL remain unchanged

#### Scenario: Coordinate display toggle
**GIVEN** the showCoordinates prop is true
**WHEN** rendering hexes
**THEN** each hex SHALL display its {q, r} coordinate as text
**AND** text SHALL be small (10px) and gray
**AND** text SHALL be centered in the hex

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Props for the HexMapDisplay component.
 */
interface IHexMapDisplayProps {
  /** Map radius in hexes from center (e.g., 8 for 15x17 map) */
  readonly radius: number;
  
  /** Unit tokens to display on the map */
  readonly tokens: readonly IUnitToken[];
  
  /** Currently selected hex coordinate */
  readonly selectedHex: IHexCoordinate | null;
  
  /** Hexes showing movement range with MP costs */
  readonly movementRange?: readonly IMovementRangeHex[];
  
  /** Hexes showing attack range */
  readonly attackRange?: readonly IHexCoordinate[];
  
  /** Path to highlight for movement preview */
  readonly highlightPath?: readonly IHexCoordinate[];
  
  /** Terrain data for each hex */
  readonly terrainMap?: ReadonlyMap<string, IHexTerrain>;
  
  /** Active overlays to display */
  readonly activeOverlays?: readonly OverlayType[];
  
  /** Callback when hex is clicked */
  readonly onHexClick?: (hex: IHexCoordinate) => void;
  
  /** Callback when hex is hovered */
  readonly onHexHover?: (hex: IHexCoordinate | null) => void;
  
  /** Callback when token is clicked */
  readonly onTokenClick?: (unitId: string) => void;
  
  /** Show coordinate labels on hexes */
  readonly showCoordinates?: boolean;
  
  /** Optional className for styling */
  readonly className?: string;
}

/**
 * Individual hex cell rendering props.
 */
interface IHexCellProps {
  /** Hex coordinate */
  readonly hex: IHexCoordinate;
  
  /** Terrain data for this hex */
  readonly terrain?: IHexTerrain;
  
  /** Whether this hex is selected */
  readonly isSelected: boolean;
  
  /** Whether this hex is hovered */
  readonly isHovered: boolean;
  
  /** Movement range info if in range */
  readonly movementInfo?: IMovementRangeHex;
  
  /** Whether this hex is in attack range */
  readonly isInAttackRange: boolean;
  
  /** Whether this hex is in the highlighted path */
  readonly isInPath: boolean;
  
  /** Active overlays for this hex */
  readonly activeOverlays: readonly OverlayType[];
  
  /** Show coordinate label */
  readonly showCoordinate: boolean;
  
  /** Click handler */
  readonly onClick: () => void;
  
  /** Mouse enter handler */
  readonly onMouseEnter: () => void;
  
  /** Mouse leave handler */
  readonly onMouseLeave: () => void;
}

/**
 * Overlay configuration.
 */
interface IOverlayConfig {
  /** Overlay type identifier */
  readonly type: OverlayType;
  
  /** Whether overlay is currently active */
  readonly enabled: boolean;
  
  /** Keyboard shortcut to toggle */
  readonly toggleKey: string;
  
  /** Display name for UI */
  readonly displayName: string;
  
  /** Render priority (higher = on top) */
  readonly priority: number;
}

/**
 * Overlay type enumeration.
 */
enum OverlayType {
  MovementCost = 'movement_cost',
  CoverLevel = 'cover_level',
  HeatEffect = 'heat_effect',
  LineOfSight = 'line_of_sight',
  Elevation = 'elevation',
  WaterDepth = 'water_depth',
  Impassable = 'impassable',
}

/**
 * Map viewport state.
 */
interface IMapViewport {
  /** Pan offset in pixels */
  readonly pan: { x: number; y: number };
  
  /** Zoom level (1.0 = 100%) */
  readonly zoom: number;
  
  /** ViewBox dimensions */
  readonly viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Movement range hex with cost.
 */
interface IMovementRangeHex {
  /** Hex coordinate */
  readonly hex: IHexCoordinate;
  
  /** Movement point cost to reach this hex */
  readonly mpCost: number;
  
  /** Whether this hex is reachable with remaining MP */
  readonly reachable: boolean;
}

/**
 * Unit token visual representation.
 */
interface IUnitToken {
  /** Unique unit identifier */
  readonly unitId: string;
  
  /** Current hex position */
  readonly position: IHexCoordinate;
  
  /** Current facing direction */
  readonly facing: Facing;
  
  /** Unit designation (e.g., "A1", "E2") */
  readonly designation: string;
  
  /** Which side controls this unit */
  readonly side: GameSide;
  
  /** Whether this unit is selected */
  readonly isSelected: boolean;
  
  /** Whether this unit is a valid attack target */
  readonly isValidTarget: boolean;
  
  /** Whether this unit is destroyed */
  readonly isDestroyed: boolean;
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `radius` | `number` | Yes | Map radius in hexes | 1-20 typical | - |
| `tokens` | `IUnitToken[]` | Yes | Unit tokens to render | Any array | `[]` |
| `selectedHex` | `IHexCoordinate \| null` | Yes | Selected hex | Valid coordinate or null | `null` |
| `zoom` | `number` | No | Zoom level | 0.5-3.0 | 1.0 |
| `showCoordinates` | `boolean` | No | Show hex labels | true/false | false |

---

## Calculation Formulas

### Hex-to-Pixel Conversion

**Formula**:
```
x = HEX_SIZE * (3/2) * q
y = HEX_SIZE * (√3/2 * q + √3 * r)
```

**Where**:
- `HEX_SIZE` = radius of the hexagon (e.g., 30 pixels)
- `q` = axial q coordinate
- `r` = axial r coordinate
- `√3` ≈ 1.732050808

**Example**:
```
Input: hex = {q: 2, r: -1}, HEX_SIZE = 30
Calculation:
  x = 30 * (3/2) * 2 = 90
  y = 30 * (1.732/2 * 2 + 1.732 * -1) = 30 * (1.732 - 1.732) = 0
Output: {x: 90, y: 0}
```

### Pixel-to-Hex Conversion

**Formula**:
```
q = (2/3 * x) / HEX_SIZE
r = (-1/3 * x + √3/3 * y) / HEX_SIZE
Then round to nearest hex using cube coordinate rounding
```

**Rounding Algorithm**:
```typescript
function roundHex(q: number, r: number): IHexCoordinate {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);
  
  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  
  return { q: rq, r: rr };
}
```

### Hex Count from Radius

**Formula**:
```
hexCount = 3 * radius² + 3 * radius + 1
```

**Example**:
```
Input: radius = 8
Calculation: 3 * 64 + 3 * 8 + 1 = 192 + 24 + 1 = 217
Output: 217 hexes
```

### ViewBox Calculation

**Formula**:
```
padding = HEX_SIZE * 2
minX = -radius * HEX_WIDTH * 0.75 - padding
maxX = radius * HEX_WIDTH * 0.75 + padding
minY = -radius * HEX_HEIGHT - padding
maxY = radius * HEX_HEIGHT + padding
viewBoxWidth = maxX - minX
viewBoxHeight = maxY - minY
```

**Where**:
- `HEX_WIDTH` = HEX_SIZE * √3
- `HEX_HEIGHT` = HEX_SIZE * 2

---

## Validation Rules

### Validation: Valid Hex Coordinate
**Rule**: Hex coordinates MUST satisfy the cube coordinate constraint.

**Severity**: Error

**Condition**:
```typescript
if (hex.q + hex.r + (-hex.q - hex.r) !== 0) {
  // invalid - violates cube coordinate constraint
}
```

**Error Message**: "Invalid hex coordinate {q: {q}, r: {r}} - violates cube constraint"

**User Action**: Recalculate hex coordinate using proper conversion

### Validation: Zoom Range
**Rule**: Zoom level MUST be within [0.5, 3.0] range.

**Severity**: Warning

**Condition**:
```typescript
if (zoom < 0.5 || zoom > 3.0) {
  // clamp to valid range
  zoom = Math.max(0.5, Math.min(3.0, zoom));
}
```

**Error Message**: "Zoom level {zoom} out of range, clamped to [{min}, {max}]"

### Validation: Overlay Compatibility
**Rule**: Certain overlays cannot be active simultaneously.

**Severity**: Warning

**Condition**:
```typescript
if (activeOverlays.includes(OverlayType.MovementCost) && 
    activeOverlays.includes(OverlayType.Impassable)) {
  // redundant - impassable is shown in movement cost
}
```

**Error Message**: "Overlays {overlay1} and {overlay2} are redundant"

---

## Dependencies

### Depends On
- **terrain-system**: IHexTerrain, TerrainType, terrain properties for rendering
- **hex-grid-interfaces**: IHexCoordinate, Facing, hex math utilities

### Used By
- **combat-resolution**: Uses map display for combat visualization
- **movement-validation**: Uses movement range overlay for path planning
- **campaign-hud**: Embeds tactical map for mission encounters

---

## Implementation Notes

### Performance Considerations
- SVG rendering is suitable for <3000 hexes (typical tactical maps)
- For larger maps (starmap), consider Canvas or WebGL rendering
- Use React.memo for HexCell and UnitToken components to prevent unnecessary re-renders
- Pre-calculate hex positions and cache in useMemo
- Use Map for movement range lookup instead of array iteration

### Edge Cases
- **Overlapping overlays**: Use z-index layering (terrain < movement < cover < LOS)
- **Token click vs hex click**: Token click should stopPropagation to prevent hex click
- **Pan during zoom**: Maintain center point when zooming
- **Viewport bounds**: Allow panning beyond map edges for better UX

### Common Pitfalls
- **Pitfall**: Using offset coordinates instead of axial
  - **Solution**: Always use axial {q, r} for storage, convert to pixel only for rendering
- **Pitfall**: Forgetting to round fractional hex coordinates
  - **Solution**: Always use roundHex after pixel-to-hex conversion
- **Pitfall**: Overlays obscuring terrain
  - **Solution**: Use semi-transparent overlays and proper layering

---

## Examples

### Example 1: Basic Hex Map Display

**Input**:
```typescript
const props: IHexMapDisplayProps = {
  radius: 8,
  tokens: [
    {
      unitId: 'unit-1',
      position: { q: 0, r: 0 },
      facing: Facing.North,
      designation: 'A1',
      side: GameSide.Player,
      isSelected: true,
      isValidTarget: false,
      isDestroyed: false,
    },
  ],
  selectedHex: { q: 0, r: 0 },
  showCoordinates: false,
};
```

**Output**:
- 217 hexes rendered in flat-top orientation
- One blue player token at center facing north
- Yellow selection ring around token
- Selected hex highlighted in yellow

### Example 2: Movement Range Display

**Input**:
```typescript
const props: IHexMapDisplayProps = {
  radius: 8,
  tokens: [/* ... */],
  selectedHex: { q: 0, r: 0 },
  movementRange: [
    { hex: { q: 1, r: 0 }, mpCost: 1, reachable: true },
    { hex: { q: 2, r: 0 }, mpCost: 2, reachable: true },
    { hex: { q: 3, r: 0 }, mpCost: 4, reachable: false },
  ],
};
```

**Output**:
- Hexes at {1,0} and {2,0} tinted green with "1MP" and "2MP" labels
- Hex at {3,0} tinted red with "4MP" label (unreachable)

### Example 3: Multiple Overlays

**Input**:
```typescript
const props: IHexMapDisplayProps = {
  radius: 8,
  tokens: [/* ... */],
  activeOverlays: [OverlayType.MovementCost, OverlayType.CoverLevel],
  terrainMap: new Map([
    ['0,0', { type: TerrainType.LightWoods, level: 1, /* ... */ }],
  ]),
};
```

**Output**:
- Hex at {0,0} shows light green woods fill
- Movement cost "2MP" displayed
- Half-shield icon for partial cover displayed
- Both overlays visible without overlap

---

## References

### Design Resources
- **Red Blob Games - Hexagonal Grids**: https://www.redblobgames.com/grids/hexagons/
- **Civilization 5/6 UI Patterns**: Campaign map design research document Part 2

### Related Specifications
- **terrain-system**: Terrain data model and mechanical properties
- **combat-resolution**: Combat phase integration
- **movement-validation**: Movement path calculation

### Implementation Reference
- **Current Implementation**: `src/components/gameplay/HexMapDisplay.tsx`
- **Hex Constants**: `src/constants/hexMap.ts`
- **Gameplay Types**: `src/types/gameplay.ts`

---

## Changelog

### Version 1.0 (2026-01-31)
- Initial specification based on existing HexMapDisplay implementation
- Covers SVG rendering, pan/zoom, terrain visualization, overlays, unit tokens
- Defines interaction patterns and visual feedback requirements
