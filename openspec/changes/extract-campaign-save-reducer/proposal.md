## Why

Campaign persistence currently writes correlated save status, dirty tracking,
version metadata, and recovery evidence in separate lifecycle branches. A
single reducer makes those transitions reviewable without changing their
ordering or the existing save/load contract.

## What Changes

- Characterize the current store transitions before extracting them.
- Give internal persistence transitions one pure reducer and exhaustive events.
- Document supported stale-event no-ops and preserve the public store facade.

External writer routing follows in a separate change after this one merges.
Launch-only recovery, stale diagnostic cleanup, and save-scheduling changes
remain held for coordination with D-11.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-persistence`: characterize the existing ordering at the reducer boundary.

## Impact

Only campaign persistence internals and new tests change. No campaign envelope,
SQLite, journal, replay, browser cache, or network schema changes. Existing race
tests and their fixtures remain byte-unchanged.
