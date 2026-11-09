# Keep cleared equipment selection explicitly null

## Why

Calling `selectEquipment(null)` writes an undefined location despite the store's declared location-or-null contract.

## What Changes

- Clear the location to explicit null whenever equipment selection changes.
- Test clearing from a selected location, an already-null location, and repeated null selection.

## Impact

- Affected spec: `critical-slots-display`.
- Affected code: `useCustomizerStore` and its existing store tests.
- The action and `useSelection`/`useUnitEditor` facades retain their existing public types.

## Non-goals

No customizer component, construction-rule, persisted-format, technology-availability, or tech-base changes.
