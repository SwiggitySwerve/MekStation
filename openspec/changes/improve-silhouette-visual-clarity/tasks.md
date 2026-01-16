# Implementation Tasks

## Phase 1: Visual Clarity (Completed)

### 1. Thumbnail Visual Distinction

- [x] 1.1 Add front/rear divider line to Standard thumbnail
- [x] 1.2 Add layered shadow effect to MegaMek thumbnail
- [x] 1.3 ~~Add pip dots pattern to MegaMek Classic thumbnail~~ (removed variant)
- [x] 1.4 Add circular badge overlay to Chromatic thumbnail
- [x] 1.5 Verify Glow and HUD thumbnails are sufficiently distinct

### 2. Standardize Layout Proportions

- [x] 2.1 Update CleanTechDiagram to use 60/40 split
- [x] 2.2 Update NeonOperatorDiagram to use 60/40 split
- [x] 2.3 Update TacticalHUDDiagram to use 60/40 split
- [x] 2.4 Update PremiumMaterialDiagram to use 60/40 split
- [x] 2.5 Update MegaMekDiagram to use 60/40 split
- [x] 2.6 Remove torso height multiplier (caused layout issues)
- [x] 2.7 Fix HUD arms viewBox clipping issue

### 3. Typography Improvements

- [x] 3.1 Audit all diagrams for font sizes below 9px
- [x] 3.2 Fix HEAD section text overflow across all variants
- [x] 3.3 Use abbreviated labels (e.g., "LT-F", "R") for constrained spaces
- [x] 3.4 Fix all label font sizes to minimum 9px
- [x] 3.5 Fix all value font sizes to minimum 12px
- [x] 3.6 Adjust text positioning for small sections

### 4. Variant Consolidation

- [x] 4.1 Remove MegaMek Classic variant (redundant)
- [x] 4.2 Rename variants: Clean Tech→Standard, Neon Operator→Glow, Tactical HUD→HUD, Premium Material→Chromatic
- [x] 4.3 Create VariantConstants.ts for centralized variant IDs and names
- [x] 4.4 Update ArmorDiagramSettings.tsx to use constants
- [x] 4.5 Update ArmorDiagramQuickSettings.tsx to use constants
- [x] 4.6 Update ArmorDiagramPreview.tsx to use constants
- [x] 4.7 Update useAppSettingsStore.ts ArmorDiagramVariant type
- [x] 4.8 Remove MegaMekClassicDiagram.tsx and all references

### 5. Settings Page UX

- [x] 5.1 Create collapsible SettingsSection component
- [x] 5.2 Add QuickNavigation component with section tags
- [x] 5.3 Implement hash-based navigation (e.g., /settings#customizer)
- [x] 5.4 Update URL when navigating between sections
- [x] 5.5 Auto-expand section from URL hash on page load
- [x] 5.6 Add section icons to navigation tags

### 6. Accessibility

- [x] 6.1 Verify contrast ratios for all variants
- [x] 6.2 Fix text overflow in small sections (HEAD)
- [ ] 6.3 Add high-contrast mode support if needed
- [ ] 6.5 Run automated accessibility check on all variants

## Phase 2: Layout Engine Architecture (New)

### 9. Core Layout Types

- [x] 9.1 Create LayoutTypes.ts with AnchorPoint interface
- [x] 9.2 Create PartDefinition interface with baseWidth/baseHeight
- [x] 9.3 Create LayoutConstraint interface with constraint types
- [x] 9.4 Create MechLayoutConfig interface for complete layouts
- [x] 9.5 Create ResolvedPosition and ResolvedLayout interfaces
- [x] 9.6 Create ValidationError and ValidationResult interfaces
- [x] 9.7 Add EdgeName and EdgeDefinition types for edge-based connections
- [x] 9.8 Add EdgePosition for edge-relative anchor positioning
- [x] 9.9 Add ConnectionAlignment for offset/adjacent connection modes
- [x] 9.10 Add PartOrientation for rotation/flip support
- [x] 9.11 Add ResolvedEdge to track edge coordinates after layout
- [x] 9.12 Add EdgeConstraint for edge-to-edge positioning

### 10. Layout Engine Implementation

- [x] 10.1 Implement calculateAnchorPosition() for all anchor types
- [x] 10.2 Implement calculateAllAnchors() including standard anchors
- [x] 10.3 Implement resolvePathTemplate() with placeholder substitution
- [x] 10.4 Implement resolveConstraint() for anchor-to-anchor connections
- [x] 10.5 Implement resolveConstraint() for alignment constraints
- [x] 10.6 Implement resolveConstraint() for stack/gap constraints
- [x] 10.7 Implement resolveLayout() main function with iterative resolution
- [x] 10.8 Implement calculateViewBox() for automatic viewBox calculation
- [x] 10.9 Implement calculateEdges() for resolved edge coordinates
- [x] 10.10 Add edge-relative positioning to calculateAnchorPosition()
- [x] 10.11 Include edges and orientation in resolved positions

### 11. Layout Validation

- [x] 11.1 Implement boxesOverlap() for overlap detection
- [x] 11.2 Implement calculateGap() for gap measurement
- [x] 11.3 Implement checkOverlaps() with tolerance for connected parts
- [x] 11.4 Implement checkGapViolations() for non-connected parts
- [x] 11.5 Implement checkMissingParts() for constraint references
- [x] 11.6 Implement checkMissingAnchors() for anchor references
- [x] 11.7 Implement warning checks (tight gaps, large gaps, unused anchors)
- [x] 11.8 Implement formatValidationResult() for human-readable output

### 12. Biped Layout Configuration

- [x] 12.1 Create HEAD part definition with neck anchor
- [x] 12.2 Create CENTER_TORSO part definition with all connection anchors
- [x] 12.3 Create LEFT_TORSO and RIGHT_TORSO with inner/arm_mount anchors
- [x] 12.4 Create LEFT_ARM and RIGHT_ARM with shoulder anchors
- [x] 12.5 Create LEFT_LEG and RIGHT_LEG with hip anchors
- [x] 12.6 Create BIPED_CONSTRAINTS with all connection rules
- [x] 12.7 Create GEOMETRIC_BIPED_LAYOUT matching current GEOMETRIC_SILHOUETTE
- [x] 12.8 Create REALISTIC_BIPED_LAYOUT and MEGAMEK_BIPED_LAYOUT variants

### 13. React Integration

- [x] 13.1 Create useResolvedLayout() hook for component access
- [x] 13.2 Implement LAYOUT_REGISTRY for layout lookup
- [x] 13.3 Create getLayoutConfig() and registerLayout() functions
- [x] 13.4 Create utility hooks: useLayoutViewBox(), useLayoutPosition()
- [x] 13.5 Create resolveLayoutById() for non-React contexts

### 14. Visual Debugging

- [x] 14.1 Create Connector component for rendering connection lines
- [x] 14.2 Create AnchorIndicator component for showing anchor points
- [x] 14.3 Create ConnectorOverlay component with style options
- [x] 14.4 Create DebugOverlay component showing bounding boxes and centers
- [x] 14.5 Support multiple connector styles (line, bracket, joint, dashed)

### 15. Diagram Migration (Completed)

- [x] 15.1 Migrate TacticalHUDDiagram to use layout engine (proof of concept)
- [x] 15.2 Validate layout engine output matches current GEOMETRIC_SILHOUETTE (dimensions verified)
- [x] 15.3 Migrate CleanTechDiagram to use layout engine
- [x] 15.4 Migrate NeonOperatorDiagram to use layout engine
- [x] 15.5 Migrate PremiumMaterialDiagram to use layout engine
- [x] 15.6 Migrate MegaMekDiagram to use layout engine

### 16. Additional Configurations (Completed)

- [x] 16.1 Create QuadLayout.ts for four-legged mechs
  - Front legs connect at center torso bottom (like biped legs) at 20%/80% positions
  - Rear legs connect to outer edge of side torsos at 75% down (25% up from bottom)
  - Uses `front_left_hip`/`front_right_hip` anchors on CENTER_TORSO
  - Uses `rear_leg_mount` anchors on LEFT_TORSO/RIGHT_TORSO
- [x] 16.2 Create TripodLayout.ts for three-legged mechs
  - Standard biped layout with additional CENTER_LEG
  - Center leg connects at bottom center of CENTER_TORSO
- [x] 16.3 Create LAMLayout.ts for Land-Air Mechs
  - Biped layout with wing mount points on side torsos
  - Slightly adjusted proportions for transformation capability
- [x] 16.4 Create QuadVeeLayout.ts for transforming quads
  - Same structure as QuadLayout with adjusted dimensions
  - Front legs at CT bottom, rear legs at 75% down on side torsos
- [x] 16.5 Add mech type selector in ArmorDiagramSettings for previewing configurations
- [x] 16.6 Update diagram variants to dynamically select layouts based on mech type

### 17. Testing and Validation

- [x] 17.1 Add unit tests for layout engine resolution
- [x] 17.2 Add unit tests for layout validation
  - Created `LayoutValidation.test.ts` with comprehensive tests
  - Tests for: part resolution, viewBox validity, overlap detection, symmetric separation
  - Specific quad layout tests for front/rear leg positioning
  - All 92 tests passing
- [ ] 17.3 Add visual regression tests for migrated variants
- [x] 17.4 Verify TypeScript compilation
- [ ] 17.5 Test all variants on different mech configurations
- [x] 17.6 Add validation for symmetric part overlaps (legs, arms, torsos)
- [x] 17.7 Fix leg separation using edge-relative hip anchor positioning
- [x] 17.8 Fix quad/quadvee rear leg positioning (75% down on side torsos)
- [x] 17.9 All quad/quadvee overlap tests passing
