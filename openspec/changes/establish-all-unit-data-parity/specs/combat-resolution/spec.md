## ADDED Requirements

### Requirement: Native cluster hits for represented integer racks

The existing cluster-table owner SHALL provide pinned MegaMek cluster hit
counts for every integer rack from 1 through 20 and every integer roll from
2 through 12. Its resolution, missile, expected-damage and simulation consumers
SHALL use that owner. This repairs consumers exposed by source equipment data;
it does not establish complete ProtoMech combat support.

#### Scenario: Native rack counts without upward substitution

- **GIVEN** an integer rack from 1 through 20 and an integer roll from 2 through 12
- **WHEN** the shared lookup or an existing missile consumer resolves hits
- **THEN** its count SHALL equal pinned MegaMek `Compute.calculateClusterHitTableAmount`
- **AND** the count SHALL NOT exceed the rack size
- **AND** rack 1 SHALL always yield one hit
- **AND** rack 11 or 16 SHALL NOT substitute rack 12 or 20

#### Scenario: Existing contracts remain separate

- **GIVEN** a previously supported rack or an unsupported rack value
- **WHEN** the lookup runs after the correction
- **THEN** columns 2, 4, 5, 6, 10, 12, 15 and 20 SHALL retain their exact values
- **AND** eleven incorrect cells in columns 3, 7, 8 and 9 SHALL match native counts
- **AND** gameplay SHALL preserve its selection for fractional, nonpositive and greater-than-20 values
- **AND** validation SHALL retain its floor-selection policy over the expanded table and return zero for invalid rolls
- **AND** integer rolls outside 2 through 12 SHALL retain their existing clamping
- **AND** native parity for unsupported racks, ammunition and complete combat SHALL remain unclaimed

#### Scenario: One lookup owner before numerical correction

- **WHEN** the duplicate resolution lookup is replaced with the existing owner's export
- **THEN** a separately verified refactor SHALL preserve outputs before table values change
- **AND** all existing public lookup exports SHALL remain available

### Requirement: Committed missile attacks resolve through the cluster table

The interactive session and multiplayer host SHALL roll the existing
cluster-table owner once for a committed attack with a represented missile
launcher and no selected AMS, and apply the damage of the missiles that land,
using the existing total-to-projectile conversion, rather than the whole
launcher total. This does not add grouped location rolls.

#### Scenario: Landed missiles set the damage

- **GIVEN** a hydrated LRM 20, SRM 6, MRM 20 or ATM 12 hit with no selected AMS
- **WHEN** the cluster roll is any integer from 2 through 12
- **THEN** the applied damage SHALL equal the pinned MegaMek hit count for that roll times the damage per missile
- **AND** the cluster roll SHALL be drawn after the to-hit roll and before the hit-location roll

#### Scenario: Streak and non-missile weapons keep their damage

- **GIVEN** a Streak launcher that hits, or a non-missile weapon
- **WHEN** the attack resolves
- **THEN** no cluster roll SHALL be drawn and the full hydrated damage SHALL apply

#### Scenario: Remaining gaps stay open

- **WHEN** the figures are used as parity evidence
- **THEN** grouped location rolls, cluster modifiers, LB-X cluster mode and UAC/RAC rates SHALL remain unclaimed

### Requirement: Streak family support wording after catalog damage repair

The special weapon family support description SHALL reflect the repaired
catalog: official Streak SRM and LRM launchers, including one-shot and prototype
variants, resolve through the runner's existing Streak path. This documents
existing behavior after #2430 and does not establish complete Streak parity.
Pinned MegaMek `StreakLRMHandler.java:56` extends `StreakHandler` at commit
`48fcb2f64a1b3f2d575707ce5653dad64927b587`.

#### Scenario: Replace the obsolete Streak data-gap description

- **GIVEN** the repaired official catalog has 61 damage-capable Streak launchers and no zero-damage Streak launcher rows
- **WHEN** the special weapon family support description is read
- **THEN** it SHALL describe Streak LRM, one-shot and prototype launchers as resolving through the existing Streak path
- **AND** it SHALL NOT describe those variants as current zero-damage catalog data gaps
- **AND** the contract SHALL retain its empty data-gap bucket to detect regressions

On canonical synchronization, this wording replaces the two obsolete Streak
bullets in `Diff-Area Outcome Traceability` / `Special weapon family rows stay
source-backed` in `openspec/specs/combat-resolution/spec.md`. The canonical spec
remains unchanged in this text-only follow-up pending that synchronization.
