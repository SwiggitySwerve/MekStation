## Why

Desktop settings Save and Apply can submit twice, overwrite unrelated main-process settings, and mark a replacement dialog session clean when an earlier save finishes.

## What Changes

- Admit one Save or Apply per dialog session and ignore obsolete completion.
- Persist only changed keys and preserve newer edits through settings events and save acknowledgements.
- Prevent obsolete settings-hook owners from publishing asynchronous results.
- Keep the existing IPC contract and persistence format.

## Capabilities

### Modified Capabilities

- `desktop-experience`: session-scoped Save and Apply with changed-key writes.

## Impact

Only the desktop settings renderer state, settings hook, and existing dialog test suite change. No production mount of DesktopSettingsProvider was found; wiring the provider is outside this change. Main-process and IPC implementations remain unchanged.
