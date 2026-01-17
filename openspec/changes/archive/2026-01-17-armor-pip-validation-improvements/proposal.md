# Armor Pip Rendering & Validation Improvements

## Problem Statement

The PDF record sheet armor pip rendering was not working correctly for biped mechs. The code was configured to use dynamic pip generation but the `PREMADE_PIP_TYPES` constant was empty, preventing the pre-made MegaMekLab SVG pip files from being loaded.

Additionally, mechs with zero armor on any location did not trigger a validation warning, making it easy to miss configuration errors. The armor auto-allocation also wasn't distributing armor to side torso rear locations like MegaMekLab does.

## Solution

### 1. Enable Pre-made SVG Pip Files for Biped Mechs

Add `'biped'` to the `PREMADE_PIP_TYPES` constant so biped mechs correctly load the pre-made pip SVG files from MegaMekLab's mm-data repository.

**Files:**
- `src/services/printing/svgRecordSheetRenderer/constants.ts`

**Pip file location:** `/record-sheets/biped_pips/`
- Armor pips: `Armor_{Location}_{Count}_Humanoid.svg`
- Rear armor: `Armor_{Location}_R_{Count}_Humanoid.svg`  
- Structure pips: `BipedIS{tonnage}_{location}.svg`

### 2. Per-Location Armor Validation

Add per-location armor validation that checks each body part individually:
- **ERROR** when any location has 0 armor (destroyed on first hit)
- **WARNING** when any location has armor below 50% of maximum

**Files:**
- `src/services/validation/rules/universal/UniversalValidationRules.ts`
- `src/types/validation/UnitValidationInterfaces.ts`
- `src/hooks/useUnitValidation.ts`

**Behavior:**
- Validates all locations: head, arms, legs, torsos (front and rear)
- Supports all mech configurations: Biped, Quad, Tripod, LAM, QuadVee
- Per-location `armorByLocation` data passed to validation context

### 3. Add Dynamic Validation Panel to Customizer

Create a new `ValidationSummary` component that displays validation errors and warnings in real-time.

**Files:**
- `src/components/customizer/shared/ValidationSummary.tsx`
- `src/components/customizer/shared/UnitInfoBanner.tsx`

**Features:**
- Collapsible dropdown showing all validation issues
- Color-coded severity levels (error/warning/info)
- Shows warning badge when warnings exist (even if valid)
- Clickable navigation from validation errors to relevant tabs

### 4. MegaMekLab-Style Armor Auto-Allocation

Update armor auto-allocation to match MegaMekLab's distribution pattern:
- All torsos (CT, LT, RT) use 75% front / 25% rear ratio
- Previously side torsos got 0% rear at low armor levels

**Files:**
- `src/utils/construction/armorCalculations.ts`

### 5. Updated Armor Status Thresholds

Adjust armor status color thresholds for more useful feedback:
- Healthy: 60%+ (was 75%)
- Moderate: 40%+ (was 50%)
- Low: 20%+ (was 25%)
- Critical: <20% (was <25%)

**Files:**
- `src/components/customizer/armor/shared/ArmorFills.tsx`
- `src/components/customizer/armor/shared/VariantStyles.tsx`
- `src/components/armor/shared/ArmorStatusLegend.tsx`
- All armor diagram variants

### 6. Add ArmorLevelRule to Standard Validation

Add armor level validation to the standard rules registry so it runs with other validation checks.

**Files:**
- `src/utils/validation/rules/StandardValidationRules.ts`

### 7. Clickable Validation Navigation

Add ability to click on validation errors to navigate to the relevant tab.

**Files:**
- `src/hooks/useValidationNavigation.ts`

### 8. Cleanup Experimental Code

Remove the experimental Poisson pip distribution service that was explored but not needed since the pre-made SVG approach works better.

**Removed:**
- `src/services/printing/pipDistribution/` folder (7 files)
- Pip style toggle from Preview toolbar
- `usePoissonPipDistribution` setting from app settings store
- Related tests and openspec documentation

## Success Criteria

- [x] Biped mechs display armor pips correctly positioned within the mech silhouette
- [x] Validation ERROR for locations with 0 armor
- [x] Validation WARNING for locations with <50% max armor
- [x] Validation summary shows warnings even when unit is valid
- [x] Armor auto-allocation gives side torsos 25% rear (matching MegaMekLab)
- [x] Armor status thresholds updated to 60/40/20%
- [x] Clicking validation errors navigates to relevant tab
- [x] All tests pass
- [x] Build succeeds
