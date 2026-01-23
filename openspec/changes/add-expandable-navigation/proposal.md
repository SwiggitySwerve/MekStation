# Change: Add Expandable Navigation Sections

## Why

The Gameplay section is growing with multiple sub-features (Pilots, Forces, Campaigns, Encounters, Games). A flat navigation list would make the sidebar too long and cluttered. An expandable/collapsible section pattern keeps the sidebar organized while providing quick access to all gameplay features.

## What Changes

- Add `ExpandableNavSection` component for collapsible navigation groups
- Add `ChevronDownIcon` to NavigationIcons for expand/collapse indicator
- Modify Gameplay section to use expandable pattern
- Add expansion state management (collapsed by default)
- Support tooltip-with-links when sidebar is in icon-only (collapsed) mode

## Impact

- Affected specs: `app-navigation`
- Affected code:
  - `src/components/common/Sidebar.tsx`
  - `src/components/common/icons/NavigationIcons.tsx`
  - `src/stores/useNavigationStore.ts` (optional, for persistence)

## Dependencies

- None (foundational UI change)

## Sequencing

This proposal should be implemented BEFORE `add-gameplay-navigation` since it provides the expandable container those items will live in.
