# movement-system Specification Delta

## ADDED Requirements

### Requirement: Movement Animation Replay Backfill

The movement event consumers (animation layer, replay) SHALL handle
legacy event streams that lack full path data without crashing, so
older sessions remain replayable after the path-bearing event
contract (`MovementLocked` / `MovementCommitted`) lands.

#### Scenario: Backfill for legacy events

- **GIVEN** a replay stream with older events that only store
  destination
- **WHEN** the animation layer plays them back
- **THEN** the animation SHALL use an instant-snap fallback
- **AND** no crash SHALL occur from missing path data
