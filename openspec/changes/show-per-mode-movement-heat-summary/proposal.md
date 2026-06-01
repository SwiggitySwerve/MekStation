# Show Per-Mode Movement Heat Summary

## Why

Same-hex movement projections can include walk, run, and jump options with
different heat impact. The tooltip rows expose each option, but the hex and
badge metadata only expose the primary option heat, which can hide run/jump heat
when walking is the primary reachable mode.

## What Changes

- Expose per-mode movement heat summaries on the hex, movement badge, and
  movement-option tooltip group.
- Let the existing heat badge display the maximum legal option heat for mixed
  movement projections.
- Keep all values sourced from the shared movement projection.

## Impact

- UI display and metadata change only.
- No movement legality, MP, terrain, elevation, or heat calculation changes.
