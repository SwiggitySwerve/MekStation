# Change: Preserve Jump Overlay Movement Options

## Why

Jump overlays rendered only the jump projection for each destination. When the
same hex also had walk or run projection facts, the map could not expose those
alternate costs and blocked states even though the shared movement-option UI
already supports same-hex options.

## What Changes

- Attach same-hex walk/run option metadata to live jump overlay destinations.
- Keep jump as the primary projection for jump-mode click planning, including
  blocked jump destinations.
- Prevent ground-only alternatives from widening the jump overlay.

## Non-Goals

- Change jump MP, heat, landing, terrain, or elevation rules.
- Make clicking a blocked jump destination commit a walk/run fallback.
- Add new movement mode controls or map-local movement calculations.
