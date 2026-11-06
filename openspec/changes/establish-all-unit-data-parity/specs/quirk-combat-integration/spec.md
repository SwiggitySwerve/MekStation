## ADDED Requirements

### Requirement: Native Unit Piloting Quirk Identity

The system SHALL recognize the pinned MegaMek unit design quirk id
`easy_pilot` through the shared unit-quirk membership owner.
Native and legacy spellings SHALL identify the same boolean quirk without
rewriting saved keys, adding duplicate modifiers, or changing the existing
PSR reason, terrain and base-piloting eligibility rules.

#### Scenario: Native Easy Pilot reaches interactive PSR events

- **GIVEN** an ordinary unit with base piloting 5 and a damage PSR
- **WHEN** the unit has the native `easy_pilot` design quirk
- **THEN** the resolved PSR target number SHALL be 4
- **AND** the interactive event SHALL record the -1 quirk modifier

#### Scenario: Native Easy Pilot retains existing eligibility

- **GIVEN** a unit with the native `easy_pilot` design quirk
- **WHEN** its base piloting is greater than 3 and the PSR is terrain or phase damage
- **THEN** the existing Easy Pilot relief SHALL apply
- **WHEN** its base piloting is 3 or the PSR is leg damage or standing up
- **THEN** Easy Pilot SHALL add no relief

#### Scenario: Native and saved spellings are one quirk

- **WHEN** `easy_pilot` is looked up as `easy_to_pilot` or vice versa
- **THEN** the shared membership owner SHALL recognize the same quirk
- **AND** duplicate native and legacy spellings SHALL apply its modifier once
- **AND** unknown ids SHALL retain exact-match behavior without prefix matching

#### Scenario: Native Easy and merged Hard Pilot coexist with inactive DNI

- **GIVEN** native Easy Pilot and Hard Pilot with base piloting 5
- **WHEN** a damage PSR resolves with missing or inactive native DNI context
- **THEN** Easy Pilot's -1 and explicit Hard Pilot's +1 SHALL cancel
- **AND** the replayed PSR event SHALL record target number 5

#### Scenario: Active native DNI preserves Easy Pilot relief

- **GIVEN** both native quirks and a qualifying DNI implant
- **WHEN** the public native activity query grants the benefit from retained session mode and hardware
- **THEN** Hard Pilot SHALL add no penalty and Easy Pilot relief SHALL remain
- **AND** the represented legacy flag SHALL remain independent of native activity

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
