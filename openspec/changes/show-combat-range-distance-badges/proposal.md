# Show Combat Range Distance Badges

## Why

Combat target badges already expose exact hex distance in metadata and
tooltips, but the visible badge only shows the range band. A short-range target
at one hex and a short-range target at two hexes both appear as `S`, which makes
the map less useful as the primary tactical explanation layer.

## What Changes

- Include projected hex distance in the compact combat range badge text.
- Expose the rendered badge label as stable metadata.
- Keep the label sourced from `ICombatRangeHex.rangeBracket` and
  `ICombatRangeHex.distance`.

## Impact

Players can read range band and exact target distance directly from the map
without relying on hover text or color alone.
