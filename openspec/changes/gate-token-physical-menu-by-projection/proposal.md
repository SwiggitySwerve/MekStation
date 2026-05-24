# Gate Token Physical Menu By Projection

## Why

Enemy token context menus are another command surface. They should not offer a
right-clicked physical attack as commit-ready when the map and physical attack
projection already know that target/attack row is blocked.

## What Changes

- Add target-keyed physical attack option projections to tactical command
  context.
- Let enemy token context menus bind the clicked target's physical projection
  rows into command availability.
- Keep multi-limb attacks available when at least one projected limb row is
  legal.

## Impact

- UI command availability and disabled reasons only.
- No physical attack eligibility, to-hit, damage, self-risk, or commit
  validation changes.
