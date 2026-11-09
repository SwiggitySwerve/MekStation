# Clear attack relationships when a participant exits combat

## Why

A surviving unit retains grapple, swarm or displacement links to a destroyed,
retreated or ejected participant. These links can continue to restrict actions
after the opposing participant has left the field.

## What Changes

- Consolidate existing grapple release and squad swarm detachment without
  changing their results, then add one `clearAttackLinks` owner.
- Call that owner at existing reducer exit transitions and runner unit commits,
  including destruction before a later `UnitDestroyed` event.
- Preserve existing exit latches, replay envelopes, persisted formats and dice.
- Document pinned MegaMek behavior and separate missing lifecycle writers.

## Capabilities

### Modified Capabilities

- `combat-resolution`: attack relationships end when either participant exits.

## Impact

Pure gameplay rules, event reducers, runner commits, tests and content-anchored
combat validation citations. No schema or persistence migration. Historical
folds with these links gain cleanup; any committed replay, digest or golden
fixture change is a stop condition, never a reason to regenerate fixtures.

## Approval

Root approved one draft PR on 2026-11-08. Refactor commit first, fix second.
Do not edit C10 heat lifecycle/catalog overlap before #3039 merges. Never merge.
