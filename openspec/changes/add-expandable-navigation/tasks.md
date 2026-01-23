# Tasks: Add Expandable Navigation Sections

## 1. Icons

- [ ] 1.1 Add `ChevronDownIcon` to `NavigationIcons.tsx` (w-4 h-4, rotates on expand)

## 2. Expandable Section Component

- [ ] 2.1 Create `ExpandableNavSection` component in `Sidebar.tsx`
- [ ] 2.2 Implement click-to-expand/collapse behavior
- [ ] 2.3 Add smooth height animation (max-height transition)
- [ ] 2.4 Add chevron rotation animation on expand/collapse
- [ ] 2.5 Highlight section header when any child route is active

## 3. Collapsed Sidebar Behavior

- [ ] 3.1 Show section icon only when sidebar is collapsed
- [ ] 3.2 Implement tooltip-with-links on hover (shows all child items as clickable links)
- [ ] 3.3 Ensure tooltip links navigate correctly and close mobile drawer

## 4. State Management

- [ ] 4.1 Add expansion state (useState initially, can move to store later)
- [ ] 4.2 Default to collapsed state
- [ ] 4.3 (Optional) Persist expansion preference to localStorage

## 5. Integration

- [ ] 5.1 Convert Gameplay `NavSection` to `ExpandableNavSection`
- [ ] 5.2 Verify mobile drawer behavior (expanded mode always shows full labels)
- [ ] 5.3 Test keyboard navigation and accessibility

## 6. Testing

- [ ] 6.1 Add Storybook story for ExpandableNavSection
- [ ] 6.2 Test expand/collapse animations
- [ ] 6.3 Test collapsed sidebar tooltip behavior
- [ ] 6.4 Test active state highlighting
