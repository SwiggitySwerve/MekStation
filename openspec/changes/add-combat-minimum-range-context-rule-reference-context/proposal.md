# Add Combat Minimum Range Context Rule Reference Context

## Why

Combat hovers already show minimum-range penalties, and the hex metadata plus
badge identify the affected weapons. The hover row should expose the same shared
projection source and rule references so players and tests can inspect why the
penalty applies without relying on aggregate hex metadata.

## What Changes

- Surface combat projection source and rule references on minimum-range rows.
- Expose stable attributes for minimum-range penalty, affected weapon IDs, and
  reason.
- Apply the same minimum-range context row to combat-only and combined
  movement+combat tactical hovers.
- Keep minimum-range classification sourced from `ICombatRangeHex` and the
  shared tactical map projection.

## Out Of Scope

- Changing minimum-range penalty calculation, range bands, to-hit modifiers, or
  attack resolution.
- Changing airborne/aerospace minimum-range exemptions.
