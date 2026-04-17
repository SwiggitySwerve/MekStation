# movement-system Specification Delta

## MODIFIED Requirements

### Requirement: Movement Event Payload

Movement-related events SHALL carry the full path and MP mode so that
UI layers (animation, replay, indirect-fire tracking) can reconstruct
the traversal without recomputing.

#### Scenario: MovementCommitted embeds full path

- **GIVEN** a player commits a movement
- **WHEN** the `MovementCommitted` event is emitted
- **THEN** the event payload SHALL contain the ordered array of axial
  coordinates visited
- **AND** the payload SHALL contain `mode: 'walk' | 'run' | 'jump'`
- **AND** the payload SHALL contain the final committed facing

#### Scenario: Backfill for legacy events

- **GIVEN** a replay stream with older events that only store
  destination
- **WHEN** the animation layer plays them back
- **THEN** the animation SHALL use an instant-snap fallback
- **AND** no crash SHALL occur from missing path data
