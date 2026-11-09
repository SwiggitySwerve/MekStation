# Clear tactical drafts at their context boundaries

## Why

Movement and attack drafts survive unit and phase changes. The dock Cancel command dispatches undo, removing a committed event instead of abandoning the draft.

## What Changes

- Remove unused movementPreview, attackPreview, waitingForOpponent and replay fields from gameplay UI state.
- Share the attack cleanup currently owned by finishCommit with a store-level clearComposerState action.
- Clear drafts when phase, selected unit or session identity changes; preserve drafts on same-context refreshes.
- Route movement Cancel to local draft cleanup without changing the session or committed events.
- Correct combat catalog descriptions and affected source anchors without changing combat rules.

## Capabilities

### New Capabilities

- `tactical-composer-lifecycle`: context-scoped drafts and local cancellation.

### Modified Capabilities

- None.

## Impact

Gameplay store, UI state types, movement command adapter and existing regression tests. Two runner catalog files receive metadata corrections only. No event, wire, replay, database or persisted schema changes. Engine and journal authority remain unchanged.
