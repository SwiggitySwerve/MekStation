## 1. Implementation
- [x] 1.1 Add category filter configuration (CATEGORY_FILTERS, OTHER_CATEGORIES arrays)
- [x] 1.2 Create CategoryFilterBar component with icon-based buttons
- [x] 1.3 Add activeCategory state to GlobalLoadoutTray
- [x] 1.4 Implement filteredEquipment useMemo with category filtering logic
- [x] 1.5 Update empty state to distinguish "no equipment" vs "no items in filter"
- [x] 1.6 Fix context menu min-width (160px -> 200px) and add whitespace-nowrap
- [x] 1.7 Add flex-shrink-0 and gap-3 to context menu rows

## 2. Testing
- [x] 2.1 Add tests for category filter button rendering
- [x] 2.2 Add tests for showing all equipment by default
- [x] 2.3 Add tests for filtering by specific categories
- [x] 2.4 Add tests for empty filter state message
- [x] 2.5 Add tests for returning to "All" filter
- [x] 2.6 Verify all existing GlobalLoadoutTray tests still pass
