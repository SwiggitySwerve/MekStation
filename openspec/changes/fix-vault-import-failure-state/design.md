# Failed vault import recovery

## Decision

Keep import state transitions in `useVaultImport.helpers.ts`. Pass the existing
`failureStep` from `importVaultContent` to `applyImportResult` using the current
options object. After storing a returned result, branch on `success`: failure
sets the error and recovery step; success proceeds to `complete`. Conflict
results continue to use the existing `conflicts` branch.

`importFile` supplies `preview`, and `resolveConflicts` delegates to it.
`importString` supplies `idle`. Reusing these choices keeps returned failures
consistent with the existing thrown-error recovery behavior without adding a
new state or duplicating entry-path decisions.

## Contracts and Compatibility

The public hook state and action interfaces remain unchanged. A returned
failure remains available as the action return value and the hook's last
result. The existing error message and fallback are preserved. `finally`
continues to clear `importing` for every outcome.

The dialog already renders the error banner and file preview with retry,
different-file, and Cancel controls. Idle already renders file selection and
Cancel. No presentation changes are needed. Schemas, persisted formats, and
import-service decisions are unchanged.

## Verification

Extend the existing hook suites before changing runtime code. Cover file
failure with retained preview, retry success, failed conflict resolution,
string failure without a preview, and an empty error message. Existing suites
cover successful imports, conflicts, and thrown errors. Deliberately restore
the incorrect `complete` transition to verify that the new tests reject it.

Run all hook tests and the full integration directory, both TypeScript
configs, lint and unit-lint gates, formatting, OpenSpec validation, and the CI
budget check. No engine, gameplay reducer, or simulation files are involved.
