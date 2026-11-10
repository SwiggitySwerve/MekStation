## ADDED Requirements

### Requirement: Replayable GM correction effects
The system SHALL append a typed `gm_correction_applied` event before reporting a
correction as committed. The intervention owner SHALL apply only explicit
resolved values and typed deletions, without dice, AI draws, cascades or implicit
finalization. Private metadata SHALL remain outside combat history.

#### Scenario: Heat survives the next phase
- **GIVEN** an active Initiative session with heat 0
- **WHEN** a GM commits heat 17 and advances to Movement
- **THEN** live state and the event fold retain heat 17 before ordinary cooling

#### Scenario: Unsupported carrier
- **GIVEN** a correction containing rescued, unit activation/order, an undefined
  pending action or any unit-reload snapshot
- **WHEN** admission validates the correction
- **THEN** it refuses with a named reason and appends no event

#### Scenario: No inferred consequence
- **GIVEN** a correction crossing a heat or structure threshold
- **WHEN** preview, authority, mirror or recovery applies it
- **THEN** the roller and cascade hooks remain untouched

### Requirement: Ordinary carrier disclosure parity
The system SHALL project every supported correction leaf through its ordinary
carrier policy for each viewer and fog mode. Map and list corrections SHALL
preserve prior hidden observations. A received original attack SHALL retain a
typed `{ status: 'superseded', originalVisibleEventId }` fact when its corrected
values are withheld. Unknown leaves SHALL fail admission and leaf coverage.

#### Scenario: Fog off exposes ordinary combat values
- **GIVEN** an opposing player or spectator in a fog-off match
- **WHEN** a supported heat or armor correction is committed
- **THEN** their mirror equals the ordinary projection of the authority frame

#### Scenario: Hidden attack is superseded
- **GIVEN** a viewer previously received an attack that is now hidden
- **WHEN** its correction is withheld
- **THEN** the viewer receives its original-visible-event superseded fact

### Requirement: Correction writer version and transport boundary
The system SHALL enable the new event only at its named producer-rule minimum
in the shared ReplayFidelityVersion owner after R11a. Hosted admission SHALL
require current durable GM authority and commit before publication. Old readers
SHALL receive R11a's named reload-required result. P2P and unit reload SHALL
remain unsupported.

#### Scenario: Failed hosted commit
- **GIVEN** an authorized fresh GM request and a failing store transaction
- **WHEN** the host decides the correction
- **THEN** it publishes no correction or successful private approval

#### Scenario: Historical producer rules remain unchanged
- **GIVEN** a retained log predating the correction rule
- **WHEN** replay or recovery reads it
- **THEN** its original version and behavior remain unchanged
