## MODIFIED Requirements

### Requirement: Piloting Quirk — Hard to Pilot

The explicit Hard to Pilot quirk SHALL impose +1 to PSRs when native DNI is
inactive, following MegaMek `48fcb2f64` `Entity.java:8939-8946`. Native
`hard_pilot` and saved `hard_to_pilot` SHALL identify the same quirk without
double counting. The SPA domain's native activity query SHALL interpret the
supplied game mode, implant identities and verified DNI cockpit hardware;
missing mode means inactive. The represented legacy jack-in flag SHALL NOT
substitute for native activity.

#### Scenario: Hard to Pilot PSR penalty

- **WHEN** a unit with Hard to Pilot makes a PSR with inactive native DNI
- **THEN** the PSR target number SHALL be increased by 1

#### Scenario: Active native DNI suppresses the explicit quirk penalty

- **GIVEN** a pilot with VDNI, Buffered VDNI or Prototype DNI
- **WHEN** the native mode is Pilot Abilities Only, or Full Tracking with verified DNI cockpit hardware
- **THEN** Hard to Pilot SHALL add no penalty independently of represented SPA arithmetic

#### Scenario: Missing or unrecognized native context remains inactive

- **WHEN** native mode is missing, Off or unrecognized, or Full Tracking lacks verified hardware or a DNI implant
- **THEN** the explicit quirk SHALL still add +1
- **AND** EI, BA NIU and the represented flag SHALL NOT establish native activity

#### Scenario: Explicit session context survives replay into the game effect

- **GIVEN** native mode and hardware supplied through GameCreated
- **WHEN** a pending PSR resolves after replay
- **THEN** the explicit Hard Pilot penalty SHALL use those retained inputs
- **AND** higher-level option authoring, AirMek landing PSRs and DNI-induced quirk synthesis remain separate requirements
