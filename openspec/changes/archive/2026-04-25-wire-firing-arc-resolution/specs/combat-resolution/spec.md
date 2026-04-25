# combat-resolution (delta)

## ADDED Requirements

### Requirement: Attack Event Carries Computed Arc

`AttackResolved` events SHALL include the computed firing arc. Downstream consumers (damage pipeline, event log, UI, replay) SHALL read the arc from the event, not recompute it.

#### Scenario: Event payload includes arc

- **GIVEN** an attack resolves from the right arc
- **WHEN** the `AttackResolved` event is persisted
- **THEN** the event payload SHALL include `attackerArc: FiringArc.Right`

#### Scenario: Replay reconstructs arc from event

- **GIVEN** an event log containing an `AttackResolved` event with `attackerArc: FiringArc.Rear`
- **WHEN** the replay reducer processes the event
- **THEN** the reconstructed game state SHALL show the attack was resolved from the rear arc
- **AND** the damage application during replay SHALL use the rear hit-location table
