## Why

Combat already has typed events and pure projection, but the live host can advance in-memory state before durable persistence and stores events one at a time. The first production adoption should make one match stream the durable authority without changing combat rules.

## What Changes

- Adapt existing `IGameEvent` payloads into the shared journal envelope.
- Change accepted combat commands to decide an event batch, atomically append it at the expected match revision, then apply and publish the committed batch.
- Enforce contiguous revisions, global event identity, command idempotency, and restart-safe recovery.
- Keep IndexedDB as a browser recovery mirror only; server journal rows remain multiplayer authority.
- Migrate retained match history without inventing missing events and preserve legacy completed-match reads during cutover.

## Non-goals

- Changing combat reducers, command legality, RNG rules, initiative, fog rules, or UI presentation.
- Adding campaign authority, cross-stream outcome effects, branching, or rewind.
- Using a client-submitted event as server authority.

## Dependencies

- This change is the combat-authority implementation slice of `harden-gm-two-player-campaign-sessions`.
- It depends on `establish-entity-event-journal-contract`, `add-replay-schema-and-checkpoint-safety`, and the membership/projection/private-audit gates in `add-authority-audit-and-privacy-proof`.
- Cross-stream effects and replacement branches remain later changes; before archive/sync, overlapping umbrella deltas SHALL be reconciled through the program wave map.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `event-store`: Adopt the shared journal for match-owned streams and require durable match import/cutover behavior.
- `game-event-system`: Preserve existing combat event semantics while binding every committed event to the journal envelope.
- `multiplayer-server`: Require decide-append-apply-publish ordering and close or quarantine a match on durable-commit failure.
- `multiplayer-sync`: Resume combat delivery from durable committed positions without replay/live gaps.

## Impact

- `InteractiveSession`, `ServerMatchHost`, `IMatchStore`/`DurableMatchStore`, recovery, and multiplayer replay/fan-out.
- Additive schema migration and match adapter tests.
- Focused crash-window, atomic-batch, retry, restart, and browser recovery evidence.
- No new runtime dependency.
