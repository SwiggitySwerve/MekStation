# damage-system Specification Delta

## MODIFIED Requirements

### Requirement: Destruction Events Carry UI Metadata

Damage-related events SHALL carry enough metadata for the UI to render
presentation-layer effects without recomputing state.

#### Scenario: LocationDestroyed carries anchor location

- **GIVEN** a location is destroyed
- **WHEN** the `LocationDestroyed` event is emitted
- **THEN** the payload SHALL contain the location identifier (RA, LT,
  etc.)
- **AND** the payload SHALL indicate whether destruction was direct or
  via transfer from an adjacent location

#### Scenario: CriticalHit carries slot identity

- **GIVEN** a critical hit lands on an engine slot
- **WHEN** the `CriticalHit` event is emitted
- **THEN** the payload SHALL contain the slot identifier (e.g.,
  `ENGINE`, `GYRO`, `COCKPIT`)
- **AND** the payload SHALL contain which location the slot was in
- **AND** engine crits SHALL be distinguishable from other crits by
  slot value

#### Scenario: UnitDestroyed carries cause

- **GIVEN** a unit is destroyed
- **WHEN** the `UnitDestroyed` event is emitted
- **THEN** the payload SHALL contain `cause: 'ct-destroyed' |
'pilot-killed' | 'ammo-explosion' | 'engine-destroyed' | 'crew-kia'`
- **AND** the UI SHALL use `cause` to choose the appropriate debris
  variant

### Requirement: Persistent Effect State Derivable From Snapshot

The current unit state projection SHALL expose enough information for
the UI to derive persistent effects (smoke, fire) without replaying
the event log.

#### Scenario: Projection exposes destroyed locations

- **GIVEN** a unit with multiple destroyed locations
- **WHEN** the UI queries the unit projection
- **THEN** the projection SHALL list destroyed locations explicitly
- **AND** the UI SHALL render smoke for each without scanning events

#### Scenario: Projection exposes engine crit count

- **GIVEN** a unit with engine crits
- **WHEN** the UI queries the unit projection
- **THEN** the projection SHALL expose `engineCrits: 0 | 1 | 2 | 3`
- **AND** the UI SHALL pick flame intensity from that count
