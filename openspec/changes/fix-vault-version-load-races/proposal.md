# Prevent stale vault history loads and distinguish rollback failures

## Why

VersionHistoryPanel and VersionDiffView accept out-of-order fetch results,
errors, and loading completion. A rollback failure replaces history with a load
error, while a successful rollback followed by a failed refresh can lose the
refresh failure or imply that rollback failed.

## What Changes

- Invalidate obsolete history, refresh, and diff runs before committing state.
- Clear diff loading and error state for invalid version selections.
- Keep rollback errors in the confirmation dialog and preserve loaded history.
- Report a successful rollback and failed history refresh separately.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vault-sync`: isolate version-view requests and report operation-specific errors.

## Impact

Changes are limited to the vault history/diff components, rollback dialog props,
and the existing component test suite. The owning capability is
`openspec/specs/vault-sync/spec.md`. Both components remain publicly exported;
only stories and tests mount them in the current tree. No production route
mounts these components. API routes, server authority, payloads, schemas, and
persistence remain unchanged.

## Non-goals

Version re-selection and reset-dialog timers belong to U11. Customizer save
dialogs, desktop settings, construction, battle value, catalogs, and gameplay
are outside this change.
