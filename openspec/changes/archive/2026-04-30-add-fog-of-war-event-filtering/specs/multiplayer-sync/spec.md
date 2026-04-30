# multiplayer-sync Specification Delta

## ADDED Requirements

### Requirement: Redacted Event Shape

The system SHALL support a redacted variant of any event so that
partially-visible events can be transmitted without leaking hidden
fields to the recipient.

#### Scenario: Attack event redacts attacker

- **GIVEN** an `AttackResolved` event whose full payload includes
  `{attackerId, targetId, damage, hitLocation, rolls, weapon}`
- **WHEN** the event is redacted for a target who cannot see the
  attacker
- **THEN** the redacted form SHALL contain `{targetId, damage,
hitLocation, rolls}`
- **AND** the redacted form SHALL omit `attackerId` and `weapon`

#### Scenario: Destruction event redaction

- **GIVEN** a full `UnitDestroyed` event payload with cause, last
  damage event, crit history
- **WHEN** the event is redacted for an observer who cannot see the
  destroyed enemy
- **THEN** the redacted form SHALL contain only `{unitId}`

### Requirement: Client Gracefully Handles Missing Events

Clients SHALL gracefully handle the absence of events they would see
in an open-information match, without crashing or producing
inconsistent UI state.

#### Scenario: Enemy disappears from map

- **GIVEN** a fog-on match and an enemy unit that moves out of LOS
- **WHEN** the observing client stops receiving that enemy's events
- **THEN** the enemy token SHALL be displayed at its last-known
  position with a `"last seen"` indicator
- **AND** the client SHALL NOT crash attempting to animate an event
  it never received

#### Scenario: Enemy reappears with new known position

- **GIVEN** an enemy previously hidden that re-enters LOS
- **WHEN** the first visible event referencing that unit arrives
- **THEN** the enemy token SHALL jump to the newly revealed position
  without intermediate animation frames
- **AND** the UI MAY show a brief `"spotted!"` indicator
