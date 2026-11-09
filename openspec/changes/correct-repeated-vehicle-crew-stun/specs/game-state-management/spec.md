## ADDED Requirements

### Requirement: Repeated vehicle crew stun increment

The system SHALL implement MegaMek 48fcb2f64 Tank.stunCrew: set a zero crewStunnedPhases counter to two and add one to an already positive counter. Direct critical resolution and critical-event reduction SHALL use one shared rule, including existing commander/copilot effects that stun the crew. The update SHALL preserve unrelated state and SHALL NOT mutate its input. The existing once-per-round Initiative countdown SHALL remain unchanged.

#### Scenario: First stun and repeated stuns

- **GIVEN** a vehicle with zero crew stun rounds
- **WHEN** it receives successive stun effects without a new round
- **THEN** its counter SHALL become two, three, then four
- **AND** crew-stunned, commander-hit, and copilot-hit effects SHALL use the same increment rule

#### Scenario: Stun after countdown or expiry

- **GIVEN** a stunned vehicle whose counter has counted down to one or zero
- **WHEN** it is stunned again
- **THEN** its counter SHALL become two in either case
- **AND** subsequent countdown SHALL occur only at the existing round boundary

#### Scenario: Live and replay parity

- **GIVEN** a valid vehicle critical-event history containing repeated stun effects
- **WHEN** the history is applied live or hydrated from events
- **THEN** both paths SHALL derive identical crew stun state
- **AND** the standalone runner's round reset SHALL agree with the replay round boundary
- **AND** interactive and autonomous engine phase loops SHALL expire repeated stun at that boundary

#### Scenario: Preserve crew and persistence contracts

- **GIVEN** a vehicle receiving a stun-producing critical effect
- **WHEN** its stun counter is updated
- **THEN** unrelated state and the input object SHALL remain unchanged
- **AND** existing commander wound and destruction behavior SHALL remain unchanged
- **AND** persisted field names and event payload shapes SHALL remain unchanged
