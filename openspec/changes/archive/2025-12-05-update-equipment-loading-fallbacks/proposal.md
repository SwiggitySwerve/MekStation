# Change: Update Equipment Loading with Fallback Architecture

## Why

The equipment loading system has transitioned from hardcoded TypeScript constants to runtime JSON-based loading. However, certain critical equipment types (heat sinks, jump jets, targeting computers, and movement enhancements like MASC/TSM) require immediate availability during unit construction—before the async JSON loader completes.

Without fallback definitions, these essential components fail to load when:

1. The JSON loader hasn't initialized yet
2. The server-side environment attempts to load before data is available
3. Unit construction utilities need equipment definitions synchronously

## What Changes

- **data-loading-architecture**: Add requirements for fallback patterns and cross-environment loading
- **equipment-services**: Add requirements for equipment lookup fallbacks and initialization states

### Key Additions

1. **Cross-Environment Loading**: The EquipmentLoaderService now handles both server-side (Node.js using `fs`) and client-side (browser using `fetch`) environments with dynamic imports

2. **Fallback Definitions**: Critical equipment types have local fallback definitions in `equipmentListUtils.ts`:
   - Heat sinks (single, double IS, double Clan, compact, laser)
   - Jump jets (standard and improved for light/medium/heavy)
   - Targeting computers (IS and Clan)
   - Movement enhancements (MASC IS, MASC Clan, TSM, Supercharger)

3. **Initialization State Tracking**: `EquipmentLookupService` tracks initialization state and reports data source (json vs fallback)

4. **Graceful Degradation**: Equipment utilities attempt JSON loader first, then fall back to hardcoded definitions

## Impact

- **Affected specs**:
  - `data-loading-architecture` - Add cross-environment and fallback patterns
  - `equipment-services` - Add initialization and fallback behavior

- **Affected code**:
  - `src/services/equipment/EquipmentLoaderService.ts` - Cross-environment JSON loading
  - `src/services/equipment/EquipmentLookupService.ts` - Initialization and fallback source tracking
  - `src/utils/equipment/equipmentListUtils.ts` - Fallback definitions for critical equipment
  - `src/types/equipment/weapons/utilities.ts` - JSON-based weapon lookup
  - `src/services/conversion/EquipmentNameResolver.ts` - JSON-based resolution

## Non-Breaking

This change is non-breaking. Existing equipment continues to work with improved reliability through fallbacks.
