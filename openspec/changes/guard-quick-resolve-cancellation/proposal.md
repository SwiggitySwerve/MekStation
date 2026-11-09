# Guard Quick Resolve cancellation and replacement

## Why

`useQuickResolve` currently publishes a cancelled batch as a successful result.
Late progress and settlement can also overwrite state after reset or replacement.
The current UI Abort Signal Binding requirement in
`openspec/specs/simulation-system/spec.md` explicitly puts cancellation output in
`result`; this delta replaces that behavior with an explicit cancellation state.

## What Changes

- Expose `wasCancelled` from the hook, clear it on reset or a new mutation, and
  place cancelled output in `partialResult` while leaving `result` null.
- Permit only the current mounted batch to publish progress or settlement, and
  suppress progress after its signal aborts.
- Preserve ordinary success and error behavior, including systemic-failure output.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `simulation-system`: UI Abort Signal Binding and batch ownership.

## Impact

Only the hook and its existing tests change at runtime. The encounter launcher
already checks `result` before forwarding completion or showing a summary. The
encounter `/sim` page already detects cancellation when `result` is null, then
shows `partialResult` with a cancellation banner. Both accept null results.

The additive hook flag is in-memory state. No event, replay, wire, database, or
persisted-format changes are needed. Tech base and temporal availability do not
affect this UI lifecycle rule.

## Non-goals

Engine behavior (including the runToCompletion PSR drain), batch-service
aggregation, caller rendering, other stores, and multiplayer authority remain
outside this change.
