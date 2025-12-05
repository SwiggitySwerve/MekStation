# Change: Add Critical Table Formatting Specification

## Why

The critical table rendering on record sheets must match MegaMekLab's exact formatting for visual consistency with official MegaMek output. Current implementation lacked detailed specification of positioning, spacing, and typography requirements. This spec codifies the exact measurements and layout rules derived from MegaMekLab's `PrintMek.java`.

## What Changes

- Add detailed formatting requirements for critical slot table layout
- Specify exact positioning formulas for title, slot numbers, and content
- Document font sizes, spacing, and alignment rules matching MegaMekLab
- Specify multi-slot bracket dimensions and positioning

## Impact

- Affected specs: `record-sheet-export`
- Affected code: `src/services/printing/SVGRecordSheetRenderer.ts`
- No breaking changes - documents existing implementation behavior
