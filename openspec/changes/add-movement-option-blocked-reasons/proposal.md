# Add Movement Option Blocked Reasons

## Why

Same-destination movement projections can be legal for one mode and illegal for
another, such as walk/run reaching a hex while jump is blocked by elevation. The
map already preserves the option list, but the shared projection still reads as
purely legal when the primary option is reachable.

## What Changes

- Treat same-hex movement options with both reachable and blocked alternatives
  as a mixed tactical projection.
- Preserve the blocked option's engine reason/details in projection blocked
  reasons and explanation text.
- Surface blocked option reasons as stable rendered hex and movement badge
  metadata for tests, tooltips, and future inspection UI.

## Impact

This keeps the tactical map aligned with engine movement validation when a hex
has multiple movement-mode outcomes.
