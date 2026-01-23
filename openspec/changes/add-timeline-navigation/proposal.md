# Change: Add Timeline Navigation Section

## Why

The Timeline/Audit feature provides aggregate history views across campaigns, pilots, and units. It needs to be accessible from the main navigation as a top-level item (not inside Gameplay) because:

1. It aggregates data across ALL campaigns, not just one
2. It supports cross-campaign queries (e.g., "show pilot X's career across all campaigns")
3. It's a distinct "History" concern separate from active gameplay features

## What Changes

- Add `TimelineIcon` to NavigationIcons
- Add "History" navigation section with Timeline item between Gameplay and Settings
- Timeline links to `/audit/timeline`

## Impact

- Affected specs: `app-navigation`
- Affected code:
  - `src/components/common/icons/NavigationIcons.tsx`
  - `src/components/common/Sidebar.tsx`

## Dependencies

- None (can be implemented independently)

## Sequencing

Can be implemented in parallel with other navigation changes.
