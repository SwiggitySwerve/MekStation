# Recover from failed vault bundle imports

## Why

The vault import hook sets `step` to `complete` even when the import service
returns `success: false`. The dialog then displays "Import Complete / Imported:
0" beside the error. File imports should retain their preview and recovery
controls; direct string imports should return to idle.

## What Changes

- Use the existing `failureStep` for unsuccessful results in `applyImportResult`.
- Preserve the failed result and its error message, including the existing
  "Import failed" fallback.
- Extend the existing hook suites for file, string, conflict-resolution, and
  retry behavior.
- Add a vault-sync requirement for failed bundle import recovery.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vault-sync`: define the state and error behavior of unsuccessful bundle
  imports. The current specification covers successful imports and malformed
  previews, but does not describe a returned import failure.

## Impact

Only `src/hooks/useVaultImport.helpers.ts` changes at runtime. The public
`useVaultImport` file and string actions already supply the correct recovery
step; conflict resolution uses the file action. The customizer and Storybook
consume the hook through the vault import dialog. No import-service, schema,
persistence, event, multiplayer, or gameplay changes are needed.

## Non-goals

- The separate blank interval while a selected file's preview is loading.
- Concurrent imports, file-selection races, or stale content after rejection.
- Redesigning the dialog, changing success callbacks, or changing import rules.

## Dependencies and Risks

There are no new dependencies. Always returning to preview would break direct
string failures because no preview exists; tests must enforce the existing
per-entry `failureStep` instead. Successful results and conflict results must
retain their current transitions.
