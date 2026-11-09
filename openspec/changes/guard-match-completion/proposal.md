## Why

Single-player terminal events leave local match metadata active, preventing retention cleanup. Quick-game endGame also allows setup games to complete and completed results to be overwritten.

## What Changes

- Share the existing P2P append-then-complete operation through the match-log owner.
- Mark single-player metadata completed only after its terminal event persists.
- Accept quick-game endGame only while active and playing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `auto-save-persistence`: terminal match metadata follows successful event persistence.
- `quick-session`: completion is guarded by the active playing state.

## Impact

Interactive persistence and P2P share one operation. No persisted formats, gameplay events, replay schemas or combat calculations change. The session.id persistence maps introduced by U13 and encounter completion linking are preserved.
