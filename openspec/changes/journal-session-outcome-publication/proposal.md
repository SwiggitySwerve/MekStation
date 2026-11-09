## Why

InteractiveSession keeps outcome publication in a separate in-memory boolean. Recovery forgets successful publication and can deliver completed historical battles again. New completed sessions also need a durable retry record when no subscriber consumes the outcome.

## What Changes

- Derive publication status from a journal keyed by match and terminal-event identity.
- Add an IndexedDB sidecar store; new terminal events and pending receipts commit atomically.
- Persist acknowledgement after consumption and restore it during recovery.
- Treat historical completed logs without a receipt as acknowledged, never pending.
- Keep server journal authority, scratch suppression, gameplay payloads, replay packs and goldens unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-session-management`: journal-derived publication status, retry and recovery policy.
- `auto-save-persistence`: additive sidecar migration and atomic terminal receipt persistence.

## Impact

Engine completion/recovery and match-log persistence change. Publication remains at least once if a crash occurs after subscriber consumption but before acknowledgement persistence. Campaign subscribers deduplicate queued matchIds and applied processedBattleIds; co-op campaign consequence receipts provide their own durable deduplication.
