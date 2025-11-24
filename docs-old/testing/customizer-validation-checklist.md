# Customizer Validation Checklist

These scenarios should be exercised whenever we make UX or rule changes to the Mech Customizer. The sequence is ordered from basic smoke tests to rule-heavy validation so the run can stop early if something fundamental fails.

## 1. Load & Navigation
- Load `/customizer` and verify the Overview tab renders with populated stats and the equipment tray toggle works.
- Click through every tab (Structure, Armor, Equipment, Criticals, Fluff) and confirm URL hash/localStorage persists the active tab when reloading the page.
- Toggle the debug panel to ensure state snapshots update while interacting with the UI.

## 2. Core Configuration
- Change tonnage, tech base, engine type, and gyro type; confirm the top banner updates structure/engine weights and validations.
- Adjust heat sink type and armor type (Armor tab) and verify metrics + warnings refresh without errors.
- Edit armor allocation (front/rear values) to exceed the maximum; ensure the Armor tab shows remaining/overage status while still allowing corrections.

## 3. Equipment & Slots
- Add at least two weapons plus a heat sink, verify they appear in the Equipment tab list and reflected in the equipment tray.
- Assign equipment to locations via the Criticals tab and confirm the slot counts decrease accordingly; removing equipment should free slots.
- Export the mech and spot-check the JSON includes the latest configuration plus fluff notes.

## 4. Reset & Persistence
- Trigger each reset mode:
  - Equipment Only: clears added gear, preserves structure/armor settings.
  - Configuration: reverts structure/armor/heat sink selections but leaves equipment untouched.
  - Full: restores defaults, clears armor allocation, and zeros fluff notes.
- Reload the page to make sure tonnage, allocation, and fluff edits survive a refresh (Zustand state should re-initialize from the default).

## 5. Rule Enforcement
- Push the unit overweight and confirm banner + Validation tab report the issue.
- Flip tech bases/engine combos that should be illegal (e.g., Clan + Light Engine) and ensure the MechValidator emits the proper errors.
- Manually adjust armor allocation to match the tonnage cap and ensure no warnings remain.

Document results in the PR description for any release candidate. Capturing screenshots of the banner, armor tab, and validation panel is recommended for regressions.

