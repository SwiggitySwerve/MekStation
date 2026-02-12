## ADDED Requirements

### Requirement: Guardian ECM Suite

The Guardian ECM Suite SHALL create a 6-hex radius bubble that nullifies enemy electronic systems within the bubble.

#### Scenario: Guardian ECM nullifies enemy Artemis IV

- **WHEN** a friendly unit has an active Guardian ECM Suite
- **THEN** enemy units within 6 hexes SHALL have their Artemis IV bonuses nullified
- **AND** the +2 cluster roll bonus from Artemis IV SHALL NOT apply to attacks against units in the ECM bubble

#### Scenario: Guardian ECM nullifies enemy Narc

- **WHEN** a friendly unit has an active Guardian ECM Suite
- **THEN** enemy Narc beacon bonuses SHALL be nullified for targets within 6 hexes of the ECM source
- **AND** the +2 missile attack bonus from Narc SHALL NOT apply

#### Scenario: Guardian ECM nullifies enemy TAG

- **WHEN** a friendly unit has an active Guardian ECM Suite
- **THEN** enemy TAG designations SHALL be nullified within the ECM bubble

#### Scenario: Guardian ECM nullifies enemy C3

- **WHEN** a friendly unit has an active Guardian ECM Suite
- **THEN** enemy C3 network sharing SHALL be disrupted for units within 6 hexes

#### Scenario: Guardian ECM nullifies enemy active probes

- **WHEN** a friendly unit has an active Guardian ECM Suite
- **THEN** enemy active probe benefits SHALL be nullified within the ECM bubble

### Requirement: Angel ECM Suite

The Angel ECM Suite SHALL function as an improved Guardian ECM with the same 6-hex radius.

#### Scenario: Angel ECM provides enhanced protection

- **WHEN** a friendly unit has an active Angel ECM Suite
- **THEN** it SHALL provide all Guardian ECM effects
- **AND** it SHALL be harder to counter with ECCM (requires Angel ECCM to fully counter)

### Requirement: Clan ECM Suite

The Clan ECM Suite SHALL be equivalent to the Angel ECM Suite in capability.

#### Scenario: Clan ECM equivalence

- **WHEN** a Clan unit has an active Clan ECM Suite
- **THEN** it SHALL provide the same protection as an Angel ECM Suite
- **AND** it SHALL affect the same 6-hex radius

### Requirement: ECCM Counter

An ECM-equipped unit MAY operate in ECCM mode to counter one enemy ECM suite.

#### Scenario: ECCM counters enemy ECM

- **WHEN** a unit with Guardian ECM activates ECCM mode
- **THEN** it SHALL counter one enemy ECM suite within its 6-hex radius
- **AND** the countered ECM SHALL cease to provide protection
- **AND** the ECCM unit SHALL NOT simultaneously provide ECM protection

### Requirement: Stealth Armor ECM Dependency

Stealth armor SHALL require an active Guardian ECM Suite and SHALL add variable to-hit modifiers by range.

#### Scenario: Stealth armor with active ECM at medium range

- **WHEN** attacking a unit with stealth armor and active Guardian ECM at medium range
- **THEN** the attack SHALL receive a +1 to-hit modifier from stealth

#### Scenario: Stealth armor with active ECM at long range

- **WHEN** attacking a unit with stealth armor and active Guardian ECM at long range
- **THEN** the attack SHALL receive a +2 to-hit modifier from stealth

#### Scenario: Stealth armor without active ECM

- **WHEN** the Guardian ECM Suite on a stealth-armored unit is destroyed or deactivated
- **THEN** the stealth armor to-hit bonuses SHALL NOT apply

### Requirement: Beagle Active Probe / BAP Counter

The Beagle Active Probe (BAP) SHALL counter ECM at shorter range.

#### Scenario: BAP counters ECM within probe range

- **WHEN** a unit with BAP is within the probe's effective range of an enemy ECM source
- **THEN** the ECM effects SHALL be countered for that unit only
- **AND** the unit SHALL be able to use Artemis, Narc, and TAG normally

### Requirement: ECM Effects on Combat Pipeline

ECM effects SHALL be integrated into the to-hit calculation pipeline.

#### Scenario: ECM status checked during to-hit calculation

- **WHEN** calculating to-hit modifiers for an attack
- **THEN** the system SHALL check if the attacker or target is within any ECM/ECCM bubbles
- **AND** electronic bonuses (Artemis, Narc, TAG, C3) SHALL be enabled or disabled accordingly
