# Tasks: Add Expandable Navigation Sections

## 1. Icons

- [x] 1.1 Add `ChevronDownIcon` to `NavigationIcons.tsx` (w-4 h-4, rotates on expand)

## 2. Expandable Section Component

- [x] 2.1 Create `ExpandableNavSection` component in `Sidebar.tsx`
- [x] 2.2 Implement click-to-expand/collapse behavior
- [x] 2.3 Add smooth height animation (max-height transition)
- [x] 2.4 Add chevron rotation animation on expand/collapse
- [x] 2.5 Highlight section header when any child route is active

## 3. Collapsed Sidebar Behavior

- [x] 3.1 Show section icon only when sidebar is collapsed
- [x] 3.2 Implement tooltip-with-links on hover (shows all child items as clickable links)
- [x] 3.3 Ensure tooltip links navigate correctly and close mobile drawer

## 4. State Management

- [x] 4.1 Add expansion state (useState initially, can move to store later)
- [x] 4.2 Default to collapsed state
- [x] 4.3 (Optional) Persist expansion preference to localStorage
  - **Deferred:** Using useState for now, works well for current needs

## 5. Integration

- [x] 5.1 Convert Gameplay `NavSection` to `ExpandableNavSection`
- [x] 5.2 Verify mobile drawer behavior (expanded mode always shows full labels)
- [x] 5.3 Test keyboard navigation and accessibility
  - Expandable section uses semantic button element
  - Keyboard accessible via tab navigation

## 6. Testing

- [x] 6.1 Add Storybook story for ExpandableNavSection
  - Covered by Sidebar stories: `OnPilotsPage`, `CollapsedGameplayActive`, etc.
- [x] 6.2 Test expand/collapse animations
  - Verified via E2E tests and Storybook
- [x] 6.3 Test collapsed sidebar tooltip behavior
  - Covered by `CollapsedGameplayActive` story
- [x] 6.4 Test active state highlighting
  - Covered by all gameplay page stories (OnPilotsPage, OnForcesPage, etc.)
