# Add Combat Cover Context Rule Reference Context

## Why

Combat hovers already show target cover text, while hex attributes, badges, and
overlays expose the projected cover facts. The hover row should carry the same
shared projection source and rule references so players and tests can inspect
why cover is applied without falling back to aggregate hex metadata.

## What Changes

- Surface combat projection source and rule references on cover rows.
- Expose stable attributes for cover level, modifier, partial-cover flag, and
  cover reason.
- Apply the same cover context row to combat-only and combined movement+combat
  tactical hovers.
- Keep cover classification sourced from `ICombatRangeHex` and the shared
  tactical map projection.

## Out Of Scope

- Changing partial-cover, water-cover, elevation-cover, building-cover, or
  target-number calculations.
- Changing LOS blocker, visibility, indirect-fire, or weapon range logic.
