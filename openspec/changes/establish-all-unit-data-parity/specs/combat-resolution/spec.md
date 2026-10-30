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

### Requirement: Catalog missile launcher total damage

Hydrating a catalog LRM, SRM, MRM or ATM launcher (including Streak, Improved, Enhanced, Extended, Advanced, Primitive, battle-armor, one-shot and Improved ATM variants) SHALL give a launcher total equal to the family's damage per missile times the rack in the catalog id, whether the catalog states the damage as an `N/missile` descriptor or as the numeric placeholder `0`.

#### Scenario: Placeholder damage derives from family and rack

- **GIVEN** a catalog LRM, SRM, MRM or ATM launcher whose `damage` is the number 0
- **WHEN** the runner or the adapter hydrates it
- **THEN** the total SHALL be rack x pinned MegaMek damage per missile: LRM 1, MRM 1, SRM 2, Streak SRM 2, Streak LRM 1, ATM and iATM with standard ammunition 2
- **AND** Enhanced, Improved and Extended LRM SHALL NOT differ from standard LRM damage
- **AND** a numeric zero on an id outside those families (AMS, NARC, cruise missiles, LRT/SRT torpedoes) SHALL remain zero
- **AND** explicit `N/missile` descriptors and non-zero numbers SHALL hydrate as before

#### Scenario: Unresolved variants stay explicit

- **GIVEN** MML descriptors `1-2/missile`, iATM alternative ammunition (IMP 1, ER 1, HE 3) and launchers with zero catalog range or no catalog ammunition
- **WHEN** the correction runs
- **THEN** MML SHALL keep its SRM figure per missile and mode selection SHALL remain unclaimed
- **AND** launchers lacking range or ammunition data SHALL NOT be claimed as firing
