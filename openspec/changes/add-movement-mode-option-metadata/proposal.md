# Change: Add Movement Mode Option Metadata

## Why

The tactical map can receive movement projections for walk, run, and jump, but
the per-hex lookup keeps only one projection for a coordinate. That makes a
hex reachable by multiple modes look like a single-mode answer, even though the
player needs to understand all legal movement choices during planning.

## What Changes

- Preserve same-hex movement options when building the map movement lookup.
- Keep the primary displayed movement deterministic: stationary, walk, run,
  then jump, with reachable projections preferred over blocked ones.
- Expose walk/run/jump option types, MP costs, heat, and blocked state through
  badge/title metadata and the shared tactical projection explanation.

## Non-Goals

- Recalculate movement ranges in `HexMapDisplay`.
- Change movement engine legality, MP math, terrain cost, or jump pathing.
- Add new movement controls; this only makes already-provided projections
  visible and testable.
