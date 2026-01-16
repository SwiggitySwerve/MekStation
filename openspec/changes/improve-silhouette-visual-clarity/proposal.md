# Change: Improve Silhouette Aesthetic Visual Clarity

## Why

Users have difficulty distinguishing between armor diagram variants in the settings UI. Thumbnails are nearly identical, layout proportions vary inconsistently across variants, and some variants have typography and accessibility issues that reduce usability.

Additionally, the current architecture has fundamental maintainability issues:
- Each silhouette config manually specifies absolute x/y/width/height for every location
- When viewBox changes or parts are repositioned, other components break (e.g., HUD arms clipping)
- No concept of connection points between parts or relative positioning
- No automatic viewBox calculation or overlap/gap validation
- Supporting new mech configurations (Quad, Tripod, LAM, QuadVee) requires duplicating hardcoded values

## What Changes

### Phase 1: Visual Clarity (Completed)

1. **Thumbnail differentiation** - Add variant-specific visual elements to all 5 thumbnails so users can distinguish styles at a glance
2. **Standardize layout proportions** - Use consistent 60/40 front/rear split across all variants
3. **Typography improvements** - Enforce minimum font sizes (9px labels, 12px values) across all variants
4. **MegaMek visual distinction** - Differentiate MegaMek from Standard using record sheet white/beige palette
5. **Shared header/footer** - Create variant-aware DiagramHeader component with consistent QuickSettings integration
6. **Accessibility compliance** - Verify WCAG AA compliance for all color combinations
7. **Variant consolidation** - Removed MegaMek Classic, renamed variants to: Standard, Glow, HUD, Chromatic, MegaMek
8. **Settings UX** - Added collapsible sections and hash-based navigation (e.g., `/settings#customizer`)

### Phase 2: Layout Engine Architecture (Implemented)

9. **Constraint-based Layout Engine** - A new system for automatic positioning of mech parts based on anchor points and connection constraints
10. **Anchor Point System** - Named connection points on each part (shoulder, hip, neck, etc.) for relative positioning
11. **Edge Definition System** - Each part defines its edges with connection zones; anchors can be positioned at specific points along edges (e.g., "30% along the top edge")
12. **Connection Alignment Modes** - Support for parts connecting with different coordinates (match, adjacent, offset modes) since connection points may not share the same position
13. **Orientation Support** - Parts can be rotated (0/90/180/270) and mirrored for left/right variants
14. **Layout Validation** - Overlap detection, gap validation, and anchor validation with automated tests
15. **Configuration Support** - Same code handles Biped, Quad, Tripod, LAM, QuadVee configurations
16. **Auto ViewBox Calculation** - ViewBox automatically computed from resolved positions + padding
17. **Visual Connector Rendering** - Optional component to draw joint connections for debugging

### Layout Position Format

The layout engine uses a declarative format for defining mech part positions:

#### Part Definition Structure
```typescript
{
  id: MechLocation,           // e.g., MechLocation.CENTER_TORSO
  baseWidth: number,          // Base width in pixels (e.g., 100)
  baseHeight: number,         // Base height in pixels (e.g., 120)
  shape: 'path' | 'rect',     // Rendering shape type
  isRoot?: boolean,           // True for the root part (CENTER_TORSO)
  anchors: AnchorPoint[],     // Connection points for other parts
  pathTemplate: string,       // SVG path with {x}, {y}, {x2}, {y2} placeholders
}
```

#### Anchor Point Positioning
Anchors define where parts connect. Each anchor has:
- **`position`**: Predefined location (`'top'`, `'bottom'`, `'left'`, `'right'`, `'top-left'`, `'top-right'`, `'bottom-left'`, `'bottom-right'`, `'center'`)
- **`edgePosition`**: Precise edge-relative position as `{ edge: EdgeName, at: number }` where `at` is 0-1 (0 = start, 0.5 = center, 1 = end)
- **`offset`**: Fine-tuning offset `{ x: number, y: number }`

Example anchor placements:
```typescript
// Center of top edge
{ id: 'neck', position: 'top', offset: { x: 0, y: 0 } }

// 25% along bottom edge (from left)
{ id: 'left_hip', position: 'bottom', edgePosition: { edge: 'bottom', at: 0.25 } }

// 75% down left edge (25% up from bottom)
{ id: 'rear_leg_mount', position: 'left', edgePosition: { edge: 'left', at: 0.75 } }

// Top-right corner for left-side parts
{ id: 'hip', position: 'top-right', offset: { x: 0, y: 0 } }
```

#### Constraint Definitions
Constraints connect parts via their anchors:
```typescript
{
  id: 'left-arm-to-torso',
  type: 'anchor-to-anchor',
  source: { part: MechLocation.LEFT_ARM, anchor: 'shoulder' },
  target: { part: MechLocation.LEFT_TORSO, anchor: 'arm_mount' },
  gap: 0,        // Pixel gap between anchors (0 = touching)
  priority: 80,  // Higher = resolved first
}
```

#### Mech Configuration Layouts
Each mech configuration has specific part arrangements:

| Config | Parts | Layout Strategy |
|--------|-------|-----------------|
| **Biped** | HEAD, CT, LT, RT, LA, RA, LL, RL | Arms on outer sides of torsos (25% down), legs at bottom of CT |
| **Quad** | HEAD, CT, LT, RT, FLL, FRL, RLL, RRL | Front legs at CT bottom, rear legs on outer torsos (75% down) |
| **QuadVee** | Same as Quad | Similar to Quad with transformation-ready proportions |
| **Tripod** | HEAD, CT, LT, RT, LA, RA, LL, RL, CL | Center leg at CT bottom center, side legs offset |
| **LAM** | HEAD, CT, LT, RT, LA, RA, LL, RL, LW, RW | Biped plus wing mounts on outer torsos |

## Impact

- Affected specs: `armor-diagram-variants`, `mech-configuration`
- New code:
  - `src/components/customizer/armor/shared/layout/LayoutTypes.ts` - Type definitions
  - `src/components/customizer/armor/shared/layout/LayoutEngine.ts` - Constraint resolver
  - `src/components/customizer/armor/shared/layout/LayoutValidator.ts` - Validation logic
  - `src/components/customizer/armor/shared/layout/useResolvedLayout.ts` - React hook
  - `src/components/customizer/armor/shared/layout/ConnectorOverlay.tsx` - Visual connectors
  - `src/components/customizer/armor/shared/layout/layouts/BipedLayout.ts` - Biped config
  - `src/components/customizer/armor/shared/layout/layouts/QuadLayout.ts` - Quad config (front legs at CT, rear at side torsos)
  - `src/components/customizer/armor/shared/layout/layouts/TripodLayout.ts` - Tripod config
  - `src/components/customizer/armor/shared/layout/layouts/LAMLayout.ts` - Land-Air Mech config
  - `src/components/customizer/armor/shared/layout/layouts/QuadVeeLayout.ts` - QuadVee config
  - `src/components/customizer/armor/shared/layout/__tests__/LayoutValidation.test.ts` - Layout validation tests
- Modified code:
  - `src/components/customizer/armor/VariantThumbnail.tsx` - Improve thumbnails
  - `src/components/customizer/armor/variants/*.tsx` - Migrate to layout engine
  - `src/components/customizer/armor/shared/DiagramHeader.tsx` - Create unified header
  - `src/components/customizer/armor/ArmorDiagramPreview.tsx` - Update variant info
  - `src/components/customizer/armor/shared/ArmorFills.tsx` - Update MegaMek colors
  - `src/components/customizer/armor/shared/VariantConstants.ts` - Centralized variant names
  - `src/pages/settings.tsx` - Collapsible sections with hash navigation

## Success Criteria

### Visual Clarity
- Each thumbnail is visually distinct at 40x60px size
- All variants use consistent 60/40 front/rear split for torso locations
- No font size below 9px for labels or 12px for values
- MegaMek variant visually distinct from Standard (different color palette)
- All variants have QuickSettings dropdown via shared header
- All text passes WCAG AA contrast requirements (4.5:1)

### Layout Engine
- Layout engine produces equivalent output to current hardcoded silhouettes
- ViewBox is automatically calculated from resolved positions (no more manual viewBox mismatches)
- Layout validation catches overlaps and gaps at design time
- Same layout engine code handles Biped, Quad, Tripod, LAM, QuadVee configurations
- Diagram variants can be migrated incrementally without breaking existing functionality
- Visual connector debugging shows relationships between parts
- Edge-relative positioning allows precise anchor placement (e.g., "25% along the right edge")
- Connection alignment modes support parts with different connection point coordinates
- Orientation support enables part rotation and mirroring for symmetric layouts
