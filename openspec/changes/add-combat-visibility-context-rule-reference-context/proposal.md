# Add Combat Visibility Context Rule Reference Context

## Why

Combat hovers already tell players whether targets are visible, hidden, mixed,
or only last-known contacts. The row still lacks the source/rule evidence that
the surrounding combat explanation rows expose, which makes visibility look like
tooltip-only text instead of a shared rules-backed combat projection fact.

## What Changes

- Surface combat projection source and rule references on visibility rows.
- Expose stable attributes for target visibility state, visible target IDs, and
  obscured target IDs.
- Apply the same visibility context row to combat-only and combined
  movement+combat tactical hovers.
- Keep visibility classification sourced from `ICombatRangeHex` and the shared
  tactical map projection.

## Out Of Scope

- Changing fog-of-war visibility classification or attack legality.
- Changing LOS blocker, cover, indirect-fire, or weapon range calculations.
