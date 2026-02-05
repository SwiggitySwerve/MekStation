# Design: Record Sheet Visual Parity

## Context

The record sheet rendering system needs systematic validation and fixing. Each component (template, armor pips, structure pips, equipment table, critical slots) must be verified against MegaMekLab reference output before moving to the next.

## Goals / Non-Goals

**Goals:**

- Achieve pixel-accurate (or near-accurate) visual parity with MegaMekLab
- Create reusable A-B comparison tooling for ongoing validation
- Systematic component-by-component verification
- Support all 5 mech configurations (Biped, Quad, QuadVee, LAM, Tripod)

**Non-Goals:**

- Implementing new features not in MegaMekLab
- Changing the fundamental architecture
- Supporting custom/non-standard templates

## Decisions

### Decision 1: A-B Comparison Approach

**What**: Create a side-by-side comparison view for development/testing.

**Why**:

- Visual comparison is the most reliable way to verify rendering accuracy
- Enables rapid iteration - see changes immediately
- Documents expected output for future regression testing

**Implementation**:

```typescript
// RecordSheetComparison.tsx
interface ComparisonProps {
  unitConfig: IUnitConfig;
  referenceImageUrl: string; // MegaMekLab reference PNG/PDF
  showOverlay: boolean;
  zoom: number;
}
```

### Decision 2: Reference Output Capture

**What**: Store MegaMekLab-generated reference images in `test-fixtures/`.

**Why**:

- Provides ground truth for comparison
- Enables automated visual regression testing (future)
- Documents expected behavior

**Format**:

- PNG screenshots at 2x resolution for clarity
- Organized by configuration: `reference/biped-50t.png`, `reference/quad-50t.png`, etc.
- MTF files stored alongside for reproducibility

### Decision 3: Component-Isolated Testing

**What**: Test each rendering component in isolation before integration.

**Why**:

- Easier to identify and fix issues
- Prevents cascading failures
- Clear progress tracking

**Components**:

1. Template loading (SVG fetch and parse)
2. Text field population (all ID-based text elements)
3. Armor pip rendering (location-by-location)
4. Structure pip rendering (location-by-location)
5. Equipment table rendering (column-by-column)
6. Critical slot rendering (location-by-location)

### Decision 4: Configuration Order

**What**: Biped first, then Quad, QuadVee, LAM, Tripod.

**Why**:

- Biped is most common, highest priority
- Biped uses pre-made pip SVGs (simpler to validate)
- Quad/Tripod use dynamic pip generation (more complex)
- LAM/QuadVee are less common, lower priority

## Risks / Trade-offs

| Risk                                           | Mitigation                                        |
| ---------------------------------------------- | ------------------------------------------------- |
| MegaMekLab updates could invalidate references | Pin to specific MegaMekLab version for references |
| Manual visual comparison is slow               | Build overlay diff tooling to speed up            |
| Font differences between systems               | Use web-safe fonts or embed fonts                 |
| SVG rendering varies by browser                | Test in Chrome, Firefox, Safari                   |

## Technical Approach

### Comparison Component Architecture

```
RecordSheetComparisonPage
├── ConfigSelector (select mech config to test)
├── UnitBuilder (quick unit setup)
├── ComparisonPanel
│   ├── LeftPane (MekStation live render)
│   │   └── RecordSheetPreview
│   ├── RightPane (Reference image)
│   │   └── ReferenceImage
│   └── OverlayToggle
└── ZoomControls (synced across both panes)
```

### Overlay Diff Mode

When overlay is enabled:

1. Render MekStation output to canvas A
2. Load reference image to canvas B
3. Blend with difference mode to highlight discrepancies
4. Red pixels = MekStation has content reference doesn't
5. Blue pixels = Reference has content MekStation doesn't

### Test Fixture Structure

```
test-fixtures/
└── record-sheets/
    ├── reference/
    │   ├── biped-20t.png
    │   ├── biped-50t.png
    │   ├── biped-100t.png
    │   ├── quad-50t.png
    │   ├── quadvee-50t.png
    │   ├── lam-55t.png
    │   └── tripod-60t.png
    └── mtf/
        ├── biped-20t.mtf
        ├── biped-50t.mtf
        └── ...
```

## Migration Plan

1. **Phase 1**: Build comparison framework (no breaking changes)
2. **Phase 2**: Fix biped rendering issues (may change output)
3. **Phase 3-6**: Fix other configurations (isolated changes)
4. **Phase 7**: Final validation and cleanup

No breaking API changes expected. Output may change to match reference.

## Open Questions

1. Should comparison tooling be dev-only or accessible in production for debugging?
2. Should we add automated visual regression tests (e.g., Percy, Chromatic)?
3. What tolerance is acceptable for "near-pixel-accurate"? (font anti-aliasing, etc.)
