# Explicit combat Omni mechanism allowances

## Why

The ordinary mechanism owner cannot represent assigned Omni charges or unknown required mass. Validation must not certify incomplete mass as valid.

## What Changes

- Add independent explicit Omni mechanism charges and raw allowance overload checks, including charges without installed turrets.
- Add mechanism diagnostics and nullable validation inputs with completeness, retaining independent known errors.
- Preserve current eligibility, tonnage, armor, sponson and support-total owners. Nullable mounted composition and UI integration follow separately.

## Impact

- Affected specs: vehicle-unit-system (new explicit Omni and dependent-mass requirements).
- Affected code: turret and vehicle validation owners; no canonical spec or catalog edits.
