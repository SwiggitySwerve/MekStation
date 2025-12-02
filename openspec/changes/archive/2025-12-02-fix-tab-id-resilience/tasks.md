## 1. Tab ID Validation on Hydration

- [x] 1.1 Add `isValidUUID` import to `useTabManagerStore.ts`
- [x] 1.2 Create `sanitizeTabsOnHydration` function that:
  - Iterates through tabs array
  - Validates each tab has valid UUID using `isValidUUID`
  - Generates new UUID for tabs with missing/invalid IDs
  - Logs warning when repairing IDs
  - Returns sanitized tabs array
- [x] 1.3 Call `sanitizeTabsOnHydration` in `onRehydrateStorage` callback
- [x] 1.4 Add unit test for tab ID repair during hydration

## 2. Router Fallback to Active Tab

- [x] 2.1 Update `useCustomizerRouter` to accept optional `activeTabId` from store
- [x] 2.2 Modify `navigateToTab` to use `activeTabId` when `params.unitId` is null
- [x] 2.3 Update `CustomizerWithRouter` to pass `activeTabId` to router hook
- [x] 2.4 Add unit test for navigation from index page with active tab

## 3. Unit Store Registry ID Validation

- [x] 3.1 Add ID validation in `hydrateOrCreateUnit`:
  - Check if ID from localStorage is valid UUID
  - Generate new ID if invalid
  - Log warning when repairing
- [x] 3.2 Ensure `createUnitStore` always has valid ID
- [x] 3.3 Add unit test for store hydration with invalid ID

## 4. Integration Testing

- [x] 4.1 Unit tests cover tab ID repair scenarios
- [x] 4.2 Verified navigation works from `/customizer` with existing tabs (via browser testing)
- [x] 4.3 Unit tests cover corrupted localStorage data repair
- [x] 4.4 Verified no console errors during normal tab switching (via browser testing)
