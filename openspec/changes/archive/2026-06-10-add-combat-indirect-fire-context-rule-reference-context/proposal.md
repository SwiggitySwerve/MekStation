# Add Combat Indirect Fire Context Rule Reference Context

## Why

Combat hovers already show indirect-fire reasons, and map hex metadata exposes
spotter, basis, penalty, and Forward Observer cancellation facts. The hover row
should expose the same shared projection source and rule references so players
and tests can inspect why indirect fire is allowed without relying on aggregate
hex metadata.

## What Changes

- Surface combat projection source and rule references on indirect-fire rows.
- Expose stable attributes for indirect-fire availability, spotter, basis,
  to-hit penalty, spotter gunnery, spotter skill modifier, Forward Observer
  cancellation, cancelled penalty, and reason.
- Apply the same indirect-fire context row to combat-only and combined
  movement+combat tactical hovers.
- Keep indirect-fire classification sourced from `ICombatRangeHex` and the
  shared tactical map projection.

## Out Of Scope

- Changing indirect-fire eligibility, spotter election, penalty arithmetic, LOS
  rules, target legality, attack validation, or attack resolution.
