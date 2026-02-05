# Consolidate Validation UI for Compact Display

## Why

The customizer currently displays validation information in **two separate locations**:

1. `ValidationSummary` - compact badge in UnitInfoBanner with dropdown popup
2. `ValidationPanel` - full collapsible panel below the banner (32-232px vertical space)

Both components show identical validation errors/warnings, creating redundancy. The `ValidationPanel` consumes significant vertical screen space (up to 232px when expanded) that could be used for the actual mech editing content.

## What Changes

- **Remove** `ValidationPanel` component from `UnitEditorWithRouting.tsx`
- **Enhance** `ValidationSummary` to be the sole validation display
- **Keep** `ValidationTabBadge` on tabs for quick visual feedback
- **BREAKING**: Users who relied on the always-visible ValidationPanel will need to click the badge

## Impact

- Affected specs: `unit-validation-framework`
- Affected code:
  - `src/components/customizer/UnitEditorWithRouting.tsx` - Remove ValidationPanel usage
  - `src/components/customizer/shared/ValidationPanel.tsx` - Mark for deletion or keep for other uses
  - `src/components/customizer/shared/ValidationSummary.tsx` - Primary validation display

## Screen Space Savings

| Before                           | After                           |
| -------------------------------- | ------------------------------- |
| UnitInfoBanner: ~80-100px        | UnitInfoBanner: ~80-100px       |
| ValidationPanel header: 32px     | (removed)                       |
| ValidationPanel content: 0-200px | (removed)                       |
| **Total header area: 112-332px** | **Total header area: 80-100px** |

**Net savings: 32-232px vertical space**

## Alternative Considered

1. **Collapse ValidationPanel by default** - Still takes 32px for header, adds complexity
2. **Merge into single component** - Overcomplicates UnitInfoBanner
3. **Remove ValidationSummary, keep ValidationPanel** - Panel takes more space even when collapsed

Selected approach (remove ValidationPanel) provides cleanest solution with minimal code changes.
