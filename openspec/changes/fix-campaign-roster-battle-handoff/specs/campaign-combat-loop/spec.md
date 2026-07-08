## MODIFIED Requirements

### Requirement: Campaign-Linked Encounter Launch

The system SHALL launch a campaign-generated encounter into a `GameSession`
stamped with campaign linkage. The launched encounter's player force SHALL contain every roster unit selected at mission launch — each with its canonical `unitRef` and its assigned pilot's `pilotRef` — and an opponent force sized to the player deployment. Roster units that cannot resolve to a canonical `unitRef` SHALL block launch with a per-unit reason; the system SHALL NOT substitute fallback units.

#### Scenario: Launching a generated encounter creates a linked session

- **GIVEN** a persisted campaign-generated encounter for campaign C, contract K, scenario S
- **WHEN** the player launches the encounter from the campaign
- **THEN** a `GameSession` SHALL be created from the encounter launch snapshot
- **AND** the session SHALL carry `campaignId` C, `contractId` K, and `scenarioId` S

#### Scenario: Full mission selection reaches the player force

- **GIVEN** a mission launch with four ready roster units, each with a canonical `unitRef` and an assigned pilot
- **WHEN** the encounter is materialized
- **THEN** the player force SHALL contain four assignments, one per selected unit, each carrying that unit's `unitRef` and its pilot's `pilotRef`
- **AND** the created session SHALL contain four player units whose pilots resolve to the assigned vault pilots (no "Unknown Pilot" for assigned crews)

#### Scenario: Opponent force is sized to the player deployment

- **WHEN** an encounter is materialized for a mission launch with N selected player units
- **THEN** the opponent force SHALL contain N units with canonical `unitRef`s selected deterministically for the encounter (repeat materializations of the same encounter yield the same opponent force)

#### Scenario: Unresolvable roster unit blocks launch

- **GIVEN** a selected roster unit with no resolvable canonical `unitRef`
- **WHEN** the player attempts to launch the mission
- **THEN** the launch SHALL be blocked and the readiness surface SHALL name the unit and the reason
- **AND** no encounter, force, or session SHALL be created with a substituted unit
