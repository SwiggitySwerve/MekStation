# Change: Add Battle Value Display Integration

## Why

Battle Value (BV) is a critical unit statistic that players need to see at-a-glance during unit customization. The BV calculation service exists but was not wired up to the UI display components. Users need to see BV in:
1. The top info banner for quick reference while editing
2. The PDF record sheet preview for verification before export
3. The exported PDF for tabletop use

## What Changes

- **unit-info-banner**: Add BV as a new stat displayed in the capacity stats section, positioned before ENGINE with distinctive cyan color
- **record-sheet-export**: Ensure BV is calculated and passed through the rendering pipeline to populate the template's BV text element

## Impact

- Affected specs: `unit-info-banner`, `record-sheet-export`
- Affected code:
  - `src/components/customizer/shared/UnitInfoBanner.tsx` - Add BV display
  - `src/components/customizer/UnitEditorWithRouting.tsx` - Calculate and pass BV to banner
  - `src/components/customizer/preview/RecordSheetPreview.tsx` - Calculate BV for live preview
  - `src/components/customizer/tabs/PreviewTab.tsx` - Calculate BV for PDF export
- Related specs: `battle-value-system` (provides calculation logic, not modified)
