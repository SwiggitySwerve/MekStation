# Armor Pip Rendering & Validation Improvements

## Problem Statement

The PDF record sheet armor pip rendering was not working correctly for biped mechs. The code was configured to use dynamic pip generation but the `PREMADE_PIP_TYPES` constant was empty, preventing the pre-made MegaMekLab SVG pip files from being loaded.

Additionally, mechs with zero armor on any location did not trigger a validation warning, making it easy to miss configuration errors.

## Solution

### 1. Enable Pre-made SVG Pip Files for Biped Mechs

Add `'biped'` to the `PREMADE_PIP_TYPES` constant so biped mechs correctly load the pre-made pip SVG files from MegaMekLab's mm-data repository.

**Files:**
- `src/services/printing/svgRecordSheetRenderer/constants.ts`

**Pip file location:** `/record-sheets/biped_pips/`
- Armor pips: `Armor_{Location}_{Count}_Humanoid.svg`
- Rear armor: `Armor_{Location}_R_{Count}_Humanoid.svg`  
- Structure pips: `BipedIS{tonnage}_{location}.svg`

### 2. Add Validation Warning for Unarmored Locations

Add a `NO_ARMOR` validation warning when any mech location has zero armor points assigned.

**Files:**
- `src/services/construction/ValidationService.ts`

**Behavior:**
- Warning severity (not error) since some mechs intentionally have no armor
- Applies to all body parts: Head, Arms, Legs, Torsos
- For torso locations, warns only if BOTH front AND rear armor are zero

### 3. Add Dynamic Validation Panel to Customizer

Create a new `ValidationPanel` component that displays validation errors and warnings in real-time as the user configures their mech.

**Files:**
- `src/components/customizer/shared/ValidationPanel.tsx` (new)
- `src/components/customizer/UnitEditorWithRouting.tsx` (modified)

**Features:**
- Collapsible panel below the unit info banner
- Color-coded severity levels (error/warning/info)
- Automatically hidden when no issues exist
- Scrollable message list

### 4. Cleanup Experimental Code

Remove the experimental Poisson pip distribution service that was explored but not needed since the pre-made SVG approach works better.

**Removed:**
- `src/services/printing/pipDistribution/` folder (7 files)
- Pip style toggle from Preview toolbar
- `usePoissonPipDistribution` setting from app settings store
- Related tests and openspec documentation

## Success Criteria

- [x] Biped mechs display armor pips correctly positioned within the mech silhouette
- [x] Validation warning appears for locations with zero armor
- [x] Validation panel shows errors/warnings dynamically in customizer
- [x] All tests pass
- [x] Build succeeds
