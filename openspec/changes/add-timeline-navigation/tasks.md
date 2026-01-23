# Tasks: Add Timeline Navigation Section

## 1. Icons

- [x] 1.1 Add `TimelineIcon` to NavigationIcons.tsx (clock or timeline icon)

## 2. Navigation Section

- [x] 2.1 Add `historyItems` array to Sidebar.tsx:
  - Timeline (`/audit/timeline`) with TimelineIcon
- [x] 2.2 Add History NavSection between Gameplay and Settings
- [x] 2.3 Use section title "History"

## 3. Verification

- [x] 3.1 Verify Timeline navigation link works
- [x] 3.2 Verify active state highlighting for `/audit/timeline` and nested routes
- [x] 3.3 Test collapsed sidebar tooltip
- [x] 3.4 Test mobile drawer navigation
  - **E2E tests added:** `e2e/mobile-navigation.spec.ts` - History Navigation tests

## 4. Testing

- [x] 4.1 Update Sidebar Storybook stories
  - Added: `OnTimelinePage`, `CollapsedHistoryActive` stories
