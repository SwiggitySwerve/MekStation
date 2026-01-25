# Change: Fix Preview Tab Unit Switch Data Sync

## Why

When switching between unit tabs while on the Preview tab, the record sheet SVG canvas displayed stale data from the previously selected unit despite the header updating correctly. This caused confusion as users saw mismatched unit information (e.g., 50t biped stats on a 70t quad mech).

## What Changes

- Add `unitId` subscription to RecordSheetPreview component for context-aware re-rendering
- Add `unitId` to useCallback dependencies in components consuming context-based Zustand stores
- Document architectural pattern for React Context + Zustand store integration

## Impact

- Affected specs: `unit-store-architecture`, `record-sheet-export`
- Affected code:
  - `src/components/customizer/preview/RecordSheetPreview.tsx`
  - `src/components/customizer/tabs/PreviewTab.tsx`
