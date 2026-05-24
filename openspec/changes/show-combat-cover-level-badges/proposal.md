# Show Combat Cover Level Badges

## Why

Combat target badges currently expose cover level in metadata and tooltips, but
the visible hex badge only shows the modifier. Players need to distinguish
partial cover from full cover at map-glance while checking valid targets.

## What Changes

- Render the combat cover badge with a compact cover-level shorthand plus the
  to-hit modifier.
- Expose the rendered badge label as data metadata for tests and future UI
  surfaces.
- Keep legality and values sourced from the shared combat projection.

## Impact

- UI-only display change for combat projection badges.
- No combat math or command-gating behavior changes.
