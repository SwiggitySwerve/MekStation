# Change: Fix Tab ID Resilience for Customizer Navigation

## Why

When a unit tab exists but lacks a valid UUID (due to stale cache, migration issues, or edge cases), the customizer's tab navigation breaks completely. The `navigateToTab` function requires a unit ID from the URL, but when on `/customizer` (index page) with tabs present, or when cached data has invalid IDs, navigation fails with "navigateToTab: No current unit" error.

## What Changes

1. **Tab Manager Store** - Validate and repair tab IDs on hydration
   - On rehydration, validate all tabs have valid UUIDs
   - Generate new UUIDs for tabs with missing/invalid IDs
   - Log warnings for tracking these edge cases

2. **Customizer Router** - Fall back to active tab ID from store
   - If URL has no unit ID but store has an active tab, use that tab's ID
   - Enables tab switching even when on `/customizer` index page

3. **Unit Store Registry** - Ensure ID integrity on store creation
   - Validate ID exists and is valid UUID when hydrating
   - Generate new ID if missing/invalid

4. **Tests** - Add coverage for ID resilience scenarios
   - Tab with missing ID gets assigned one
   - Tab with invalid ID gets repaired
   - Navigation works from index page with active tab

## Impact

- **Affected specs**: `unit-store-architecture`, `multi-unit-tabs`
- **Affected code**:
  - `src/stores/useTabManagerStore.ts` - Add ID validation on rehydration
  - `src/hooks/useCustomizerRouter.ts` - Add fallback to activeTabId from store
  - `src/stores/unitStoreRegistry.ts` - Add ID validation on hydration
  - `src/components/customizer/CustomizerWithRouter.tsx` - Pass activeTabId to router

