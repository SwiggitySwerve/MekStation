# Import Represented Unit Height

## Why

MegaMek uses each entity's represented `height()` when checking whether units
fit under bridges and other elevation-sensitive movement constraints. MekStation
already has a movement capability field for that value, but the compendium
adapter was not populating it from represented unit data or unit class.

## What

- Preserve explicit unit-height fields from canonical unit or movement data.
- Derive the represented Mek height for standard and super-heavy Meks from
  unit type/tonnage when no explicit height is supplied.
- Propagate the adapted height through shared movement capability.
- Add preview-to-commit bridge-clearance coverage for a naval unit whose height
  now matters.

## Impact

Movement highlights and committed movement validation can use the same imported
unit-height value for bridge-clearance decisions, reducing another adapter gap
between compendium data and rules-backed map projection.
