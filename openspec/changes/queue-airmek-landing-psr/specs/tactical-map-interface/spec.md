# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

Movement projection state controls SHALL queue a canonical AirMek landing PSR
when a represented LAM AirMek altitude-control descent reaches ground level and
the runtime landing-control metadata marks the check as required. Clean
landings SHALL remain explanation-only runtime state and MUST NOT add a pending
PSR.

#### Scenario: Required AirMek landing-control descent queues a PSR

- **GIVEN** a selected movement-phase Land-Air 'Mech is in AirMek conversion
  mode with represented WiGE movement at altitude 1
- **AND** the AirMek Descend command emits runtime movement-state metadata with
  `lamAirMekLandingControlRequired: true`
- **WHEN** the runtime movement-state event is appended
- **THEN** the session SHALL append a following `PSRTriggered` event
- **AND** the event SHALL use `reasonCode: PSRTrigger.AirMekLanding`
- **AND** the current unit state SHALL contain a matching pending AirMek
  landing PSR with the runtime landing-control modifier.

#### Scenario: Clean AirMek landing-control descent does not queue a PSR

- **GIVEN** a selected movement-phase Land-Air 'Mech is in AirMek conversion
  mode with represented WiGE movement at altitude 1
- **AND** the AirMek Descend command emits runtime movement-state metadata with
  `lamAirMekLandingControlRequired: false`
- **WHEN** the runtime movement-state event is appended
- **THEN** the session SHALL NOT append `PSRTriggered`
- **AND** the unit SHALL have no AirMek landing pending PSR.
