# Tasks: Add Record Sheet PDF Export

## Status: COMPLETE ✓

All tasks completed. Feature ready for production use.

---

## 1. Dependencies

- [x] 1.1 Add jsPDF dependency to package.json

## 2. Type Definitions

- [x] 2.1 Create src/types/printing/RecordSheetTypes.ts with core interfaces
- [x] 2.2 Create src/types/printing/index.ts barrel export

## 3. Service Layer

- [x] 3.1 Create SVGRecordSheetRenderer.ts for template-based rendering
- [x] 3.2 Create RecordSheetService.ts for orchestration and PDF export
- [x] 3.3 Create src/services/printing/index.ts barrel export
- [x] 3.4 ~~Remove legacy canvas renderers~~ (cleanup completed)

**Removed legacy files:**

- ~~RecordSheetLayout.ts~~ - Canvas positioning constants
- ~~ArmorDiagramRenderer.ts~~ - Canvas armor pip visualization
- ~~EquipmentTableRenderer.ts~~ - Canvas weapons/equipment table
- ~~MechRecordSheetRenderer.ts~~ - Canvas combining all elements

## 4. Preview Components

- [x] 4.1 Create RecordSheetPreview.tsx with SVG canvas preview
- [x] 4.2 Create PreviewToolbar.tsx with Download PDF and Print buttons
- [x] 4.3 Create floating zoom controls (zoom in/out, fit width/height)
- [x] 4.4 Create src/components/customizer/preview/index.ts barrel

## 5. Tab Integration

- [x] 5.1 Create PreviewTab.tsx component
- [x] 5.2 Update CustomizerTabs.tsx to include Preview tab
- [x] 5.3 Verify tab navigation works correctly

## 6. SVG Template Features

- [x] 6.1 Load and parse MegaMek SVG templates
- [x] 6.2 Fill text elements with unit data
- [x] 6.3 Load and insert armor pip SVGs
- [x] 6.4 Load and insert structure pip SVGs
- [x] 6.5 Render equipment table dynamically
- [x] 6.6 Render critical slots with proper styling
- [x] 6.7 Add document margins for proper page layout
- [x] 6.8 Fix copyright year placeholder

## 7. Testing

- [x] 7.1 Manual test PDF generation with various unit configurations
- [x] 7.2 Verify preview updates when unit changes
- [x] 7.3 Test print functionality in browser
- [x] 7.4 Test zoom controls (in/out, fit width, fit height)

---

## Final Implementation Summary

**Files Created:**

- `src/types/printing/RecordSheetTypes.ts` - Data interfaces
- `src/types/printing/index.ts` - Barrel export
- `src/services/printing/SVGRecordSheetRenderer.ts` - SVG template renderer
- `src/services/printing/RecordSheetService.ts` - Service orchestrator
- `src/services/printing/index.ts` - Barrel export
- `src/components/customizer/preview/RecordSheetPreview.tsx` - Preview component
- `src/components/customizer/preview/PreviewToolbar.tsx` - Toolbar component
- `src/components/customizer/preview/index.ts` - Barrel export
- `src/components/customizer/tabs/PreviewTab.tsx` - Tab wrapper

**Assets Required:**

- `public/record-sheets/templates/mek_biped_default.svg`
- `public/record-sheets/biped_pips/Armor_*.svg`
- `public/record-sheets/biped_pips/BipedIS*.svg`
