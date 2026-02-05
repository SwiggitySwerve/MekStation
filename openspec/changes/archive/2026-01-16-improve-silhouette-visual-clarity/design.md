# Design: Improve Silhouette Aesthetic Visual Clarity

## Context

The armor diagram customizer provides 6 visual style variants. Users select their preferred style in Settings, but the current implementation has several visual clarity issues:

1. Thumbnails are nearly identical - Standard and MegaMek use same green fill
2. Layout proportions vary inconsistently between variants (55-65% front split)
3. Some variants use font sizes below readability thresholds (7px labels)
4. MegaMek Classic uses a different paradigm (pip display) without clear documentation
5. Not all variants include the QuickSettings dropdown

## Goals

- **G1**: Each variant thumbnail is visually distinct at 40x60px
- **G2**: Layout proportions are consistent across all variants
- **G3**: Typography meets accessibility standards (9px minimum)
- **G4**: Color contrast meets WCAG AA requirements (4.5:1)
- **G5**: All variants have consistent header/footer structure

## Non-Goals

- Changing the core visual identity of any variant
- Adding new variants
- Changing the schematic mode (only silhouette variants affected)
- Redesigning the settings page layout

## Decisions

### D1: Thumbnail Differentiation Strategy

**Decision**: Add variant-specific decorative elements to thumbnails that reflect each style's key visual trait.

| Variant         | Decorative Element                          |
| --------------- | ------------------------------------------- |
| Standard        | Horizontal divider line (front/rear split)  |
| Glow Effects    | Already has neon glow and dashed inner rect |
| LED Display     | Already has blue bar segments               |
| Metallic        | Add circular badge element                  |
| MegaMek         | Add shadow offset layer                     |
| MegaMek Classic | Add small pip dots (3-4 circles)            |

**Rationale**: Users can recognize the style from the thumbnail without needing to read the label.

### D2: Standardized Layout Proportions

**Decision**: Use 60/40 front/rear split with 1.4x torso height multiplier.

```
Current state:
- CleanTech:    65/35 split, no height multiplier
- NeonOperator: 55/45 split, 1.4x multiplier
- TacticalHUD:  55/45 split, 1.5x multiplier
- Premium:      58/42 split, 1.4x multiplier
- MegaMek:      65/35 split, no height multiplier

Target state (all variants):
- 60/40 split
- 1.4x torso height multiplier
- Consistent leg offset calculation
```

**Rationale**: Armor allocation feels consistent regardless of which variant is active.

### D3: MegaMek Color Palette

**Decision**: Change MegaMek from green (#22c55e) to beige/cream palette.

```
New MegaMek colors:
- Base fill: #f5f5dc (beige/cream)
- Outline: #8b7355 (brown/sepia)
- Selection: #3b82f6 (keep blue for consistency)
- Shadow: #1a1a1a (keep existing)
```

**Rationale**: Matches authentic BattleTech record sheet appearance and differentiates from Standard.

### D4: Minimum Typography Sizes

**Decision**: Enforce minimum sizes across all variants.

```
Labels (location names): >= 9px
Values (armor numbers): >= 12px
Capacity text (e.g., "/ 32"): >= 9px
```

**Rationale**: WCAG guidelines recommend minimum 12px for body text; 9px for supplementary labels with high contrast.

### D5: Shared Header Integration

**Decision**: All variants use DiagramHeader component with ArmorDiagramQuickSettings.

**Current state**:

- Standard, MegaMek, MegaMek Classic: DiagramHeader without QuickSettings
- Glow Effects, LED Display, Premium: Custom headers with QuickSettings

**Target state**: All use DiagramHeader with QuickSettings prop.

## Risks / Trade-offs

| Risk                                          | Mitigation                                             |
| --------------------------------------------- | ------------------------------------------------------ |
| MegaMek color change may surprise users       | Color is more authentic to record sheet style          |
| Layout changes affect visual balance          | Test thoroughly; 60/40 is close to most current values |
| Font size increases may crowd small locations | Test with minimum and maximum armor values             |

## Migration Plan

1. Update VariantThumbnail.tsx first (no functional impact)
2. Update shared ArmorFills.tsx for MegaMek colors
3. Update each variant diagram in sequence (test each)
4. Add QuickSettings to remaining variants
5. Run full visual regression test

## Phase 2: Layout Engine Architecture

### D6: Constraint-Based Layout System

**Decision**: Implement a constraint-based layout engine that computes absolute positions from anchor points and connection rules.

```
Architecture:
┌─────────────────────────────────────────────────────────────┐
│                      Input Layer                            │
│  ┌──────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ Part Defs    │ │ Constraints      │ │ Layout Config    │ │
│  └──────────────┘ └──────────────────┘ └──────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Layout Engine                           │
│  ┌──────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ Resolver     │ │ Validator        │ │ ViewBox Calc     │ │
│  └──────────────┘ └──────────────────┘ └──────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Output Layer                            │
│  ┌──────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ Positions    │ │ Validation Report│ │ Connector Paths  │ │
│  └──────────────┘ └──────────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Rationale**:

- Eliminates viewBox mismatches by auto-calculating from resolved positions
- Easy repositioning: change one constraint, all connected parts adjust
- Same code handles all mech configurations (Biped, Quad, Tripod, LAM, QuadVee)
- Validation catches overlaps and gaps at design time

### D7: Edge and Anchor Point System

**Decision**: Each part defines edges and named anchor points. Connection points on different parts can have different coordinates.

```typescript
// Edge definitions for each part
interface EdgeDefinition {
  edge: 'top' | 'bottom' | 'left' | 'right';
  allowConnections?: boolean; // Whether connections are allowed
  connectionZones?: Array<[number, number]>; // Valid zones (0-1 range)
  offset?: number; // Visual offset from bounding box
}

// Anchors can be positioned along edges
interface AnchorPoint {
  id: string; // e.g., 'shoulder', 'hip', 'neck'
  position: AnchorPosition; // Simple positioning
  edgePosition?: {
    // Edge-relative positioning (more precise)
    edge: 'top' | 'bottom' | 'left' | 'right';
    at: number; // 0-1 position along edge
  };
  offset?: { x: number; y: number };
  facing?: 'up' | 'down' | 'left' | 'right' | 'inward' | 'outward';
}

// Connection alignment - anchors don't need to share coordinates
interface ConnectionAlignment {
  mode: 'match' | 'adjacent' | 'offset';
  offset?: { x: number; y: number }; // For 'offset' mode
  sourceEdge?: EdgeName; // For 'adjacent' mode
  targetEdge?: EdgeName;
}

interface PartDefinition {
  id: MechLocation;
  baseWidth: number;
  baseHeight: number;
  anchors: AnchorPoint[];
  edges?: EdgeDefinition[]; // Edge connection rules
  shape: 'rect' | 'polygon' | 'path';
  pathTemplate?: string; // SVG path with placeholders
  orientation?: PartOrientation; // Rotation/flip
  isRoot?: boolean;
  mirrorable?: boolean; // Can be mirrored for left/right
}
```

**Rationale**:

- Anchors provide semantic connection points that are more maintainable than absolute coordinates
- Edge-relative positioning allows precise control (e.g., "30% along the top edge")
- Connection alignment modes support parts that connect with gaps or offsets between them
- Orientation support enables part rotation and mirroring

### D8: Constraint Types

**Decision**: Support multiple constraint types for flexible layouts.

| Constraint Type    | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `anchor-to-anchor` | Connect specific anchors between parts         |
| `align-horizontal` | Align part centers horizontally                |
| `align-vertical`   | Align part centers vertically                  |
| `stack-vertical`   | Stack parts vertically with gap                |
| `stack-horizontal` | Stack parts horizontally with gap              |
| `gap`              | Maintain gap between part edges                |
| `contain`          | One part contains another (for nested layouts) |

**Edge-to-Edge Constraints**: For more precise positioning, parts can define edge-to-edge connections:

```typescript
interface EdgeConstraint {
  source: MechLocation;
  sourceEdge: EdgeName;
  sourceAt: number; // Position along source edge (0-1)
  target: MechLocation;
  targetEdge: EdgeName;
  targetAt: number; // Position along target edge (0-1)
  gap?: number; // Gap between edges (can be negative)
}
```

**Rationale**: Different mech configurations require different layout strategies. Edge-to-edge constraints enable precise control when anchor points alone aren't sufficient.

### D9: Layout Validation

**Decision**: Validate layouts for common issues.

```typescript
Validation checks:
- No overlapping parts (unless intentional nesting)
- Minimum gap between non-connected parts
- All referenced anchors exist
- Connected anchors are within tolerance
- No circular dependencies
- All parts are resolved
```

**Rationale**: Catch layout issues at design time rather than runtime.

### D10: Settings Page UX Improvements

**Decision**: Add collapsible sections with hash-based navigation.

```
URL patterns:
- /settings#appearance    → Appearance section
- /settings#customizer    → Customizer section
- /settings#ui-behavior   → UI Behavior section
- /settings#accessibility → Accessibility section
- /settings#reset         → Reset section
```

**Rationale**:

- Quick navigation tags provide direct access to specific sections
- URL hash enables bookmarking and sharing specific settings
- Collapsible sections reduce visual clutter
- Only one section expanded at a time for cleaner navigation

### D11: Variant Name Standardization

**Decision**: Rename variants for clarity and remove deprecated variant.

| Old Name         | New Name  | Rationale                            |
| ---------------- | --------- | ------------------------------------ |
| Clean Tech       | Standard  | More intuitive                       |
| Glow Effects     | Glow      | Shorter, clearer                     |
| LED Display      | HUD       | More recognizable                    |
| Premium Material | Chromatic | Describes the metallic/chrome effect |
| MegaMek          | MegaMek   | No change - brand recognition        |
| MegaMek Classic  | (REMOVED) | Redundant with MegaMek               |

**Rationale**: Simpler names are easier to understand and remember.

## File Structure

```
src/components/customizer/armor/shared/
├── layout/
│   ├── index.ts                 # Module exports
│   ├── LayoutTypes.ts           # All type definitions
│   ├── LayoutEngine.ts          # Core resolver + viewBox calculator
│   ├── LayoutValidator.ts       # Validation logic
│   ├── useResolvedLayout.ts     # React hook for components
│   ├── ConnectorOverlay.tsx     # Visual connectors component
│   └── layouts/
│       ├── index.ts
│       ├── BipedLayout.ts       # Standard humanoid configuration
│       ├── QuadLayout.ts        # Four-legged configuration
│       └── TripodLayout.ts      # Three-legged configuration
├── VariantConstants.ts          # Centralized variant IDs and names
└── MechSilhouette.biped.ts      # Legacy (to be migrated)
```

## Migration Strategy

1. Build layout engine alongside existing system (complete)
2. Create layout configs that produce equivalent output to current silhouettes (complete)
3. Add validation tests to ensure output matches
4. Gradually migrate diagram variants to use layout engine
5. Remove hardcoded silhouette configs once all variants migrated

## Open Questions

- None - Phase 1 visual improvements are complete, Phase 2 layout engine foundation is complete
