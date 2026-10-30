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
