## Why

A persisted custom roster entry is not usable campaign state until Mech Bay can resolve its saved-design identity after a cold reload. CAMP-01G makes that resolution honest without substituting a stock unit or implying custom combat support.

## What Changes

- Resolve `unitSource=custom` roster entries by their exact saved-design `unitRef` through saved-unit authority.
- Preserve roster-instance identity and cached safe name/tonnage across cold reload.
- Report BV availability honestly and retain a visible unresolved row when the saved source is missing.
- Keep unresolved and unsupported custom entries blocked from mission readiness and combat launch.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-bay-ui`: Add source-aware custom roster resolution and an honest unresolved-source state.

## Non-goals

- Adapting saved custom units for combat, recreating deleted designs, or changing campaign creation persistence.

## Impact

- Affected contracts: campaign Mech Bay projection, saved-unit lookup, readiness presentation, and campaign-customizer handoff proof.
- Delivery remains one later product PR capped at 7 files and 350 changed lines; this specification PR changes no runtime behavior.
