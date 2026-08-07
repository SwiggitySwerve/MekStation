# campaign-instances Delta

Reconciles this spec to the shipped architecture per the 2026-08-06 council decision (`openspec/council-decisions/2026-08-06-player-vault-vs-campaign-state.md`): instances are references with provenance, never construction-payload snapshots (D1, `openspec/changes/add-saved-custom-unit-campaign-roster/design.md:41-43`).

## MODIFIED Requirements

### Requirement: Campaign Unit Instance

The system SHALL create campaign unit instances when units are assigned to campaign forces. An instance SHALL reference its source by `unitRef` plus a `unitSource` discriminator (`canonical` or `custom`) and SHALL pin the source's published version as `sourceVersion`. The instance SHALL NOT duplicate the source design's serialized construction payload; the vault/custom-unit version history remains authoritative for the design record, and campaign-local state (damage, status, refit divergence) is owned by campaign structures keyed by the instance id.

#### Scenario: Create unit instance on force assignment

- **GIVEN** a vault unit design exists
- **AND** a campaign force exists
- **WHEN** the unit is assigned to the force
- **THEN** a roster unit instance is created with a fresh campaign-local `unitId`
- **AND** the instance records `unitRef`, `unitSource`, and `sourceVersion`
- **AND** the instance initializes with "operational" status
- **AND** the instance initializes with no damage

#### Scenario: Unit instance properties

- **GIVEN** a campaign unit instance
- **WHEN** accessing its properties
- **THEN** instance MUST have: `unitId`, `unitRef`, `unitSource`, `sourceVersion`, status, cached display fields (name, chassis/variant, tonnage)
- **AND** instance MUST NOT embed the serialized construction payload
- **AND** instance MAY have: assigned pilot instance reference

#### Scenario: Instance status values

- **GIVEN** a campaign unit instance
- **WHEN** checking status
- **THEN** status SHALL be one of: 'operational', 'damaged', 'destroyed', 'repairing'

#### Scenario: Membership by id, never by display fields

- **GIVEN** a campaign force containing unit instances
- **WHEN** the system resolves force membership
- **THEN** membership SHALL be determined by instance id
- **AND** name or tonnage matching SHALL NOT be used

### Requirement: Campaign Pilot Instance

The system SHALL create campaign pilot instances when pilots are assigned to campaigns. The shipped roster-entry shape (`ICampaignRosterEntry`) IS the pilot instance: it SHALL carry EITHER a vault `pilotId` reference (player-vault pilots) OR inline `statblockData` (campaign-local NPCs), never both and never neither, plus campaign-scoped progression fields.

#### Scenario: Create pilot instance from vault pilot

- **GIVEN** a vault pilot template exists
- **WHEN** the pilot is assigned to a campaign
- **THEN** a roster entry is created referencing the vault `pilotId`
- **AND** the instance initializes from the pilot's base skills
- **AND** the instance initializes with 0 campaign XP, 0 wounds, 0 kills

#### Scenario: Create statblock pilot instance

- **GIVEN** a campaign needs a quick NPC pilot
- **WHEN** creating a statblock pilot assignment
- **THEN** a roster entry is created with no `pilotId`
- **AND** the pilot data is stored inline in `statblockData`
- **AND** the instance tracks XP/wounds like a full pilot

#### Scenario: Pilot instance properties

- **GIVEN** a campaign pilot instance
- **WHEN** accessing its properties
- **THEN** instance MUST have: id, status, campaign-scoped XP fields, wounds, kill count, missions participated
- **AND** instance MUST have EITHER `pilotId` OR `statblockData` (not both, not neither)
