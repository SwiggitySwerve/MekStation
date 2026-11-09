# Keep customizer previews and reset dialogs scoped to their opening

## Why

Selecting an already-selected unit version clears its loaded preview and leaves
loading active indefinitely. Reset failures leak progress intervals, and reset
auto-close timeouts can close a later opening. A pending reset can also finish
after its dialog has closed or unmounted.

## What Changes

- Preserve the preview when its selected version is selected again.
- Clear preview loading when the history dialog is closed or has no selection.
- Own reset interval and timeout handles in refs and dispose them on close and
  unmount; stop progress in `finally` on success and failure.
- Ignore completion from a disposed reset-dialog opening.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `unit-versioning`: preserve selected previews and clear inactive loading.
- `confirmation-dialogs`: dispose reset timers and reject stale completion.

## Impact

Both targets are mounted by `src/pages/customizer/[[...slug]].tsx` through
`CustomizerWithRouter`. Saved history reaches `VersionHistoryDialog` through
`MultiUnitTabs` and `SavedHistoryDialog`; the production action restores a saved
version into the bound draft. The BattleMech editor reaches
`ResetConfirmationDialog` through `CriticalSlotsTab` and `CriticalSlotsToolbar`.
Stories and tests also mount both dialogs, including history's direct-revert
mode. Engine phases, auto-resolve, AI, multiplayer dispatch and journal
authority, P2P translation, and the standalone simulation runner do not enter
these components. API contracts, persisted data, and schemas are unchanged.

## Non-goals

U9's vault history/diff/rollback guards remain unchanged. Pilot creation,
session completion, other UI guards, ProtoMech editor parity, construction,
catalogs, and gameplay are outside this change.
