# campaign-combat-loop Delta — add-campaign-fast-forward-api

## ADDED Requirements

### Requirement: Engine-Derived Outcome Pilot Attribution

Unit combat deltas derived from a completed session SHALL carry the unit's pilot linkage — the session unit's `pilotRef` — alongside the session-scoped unit id, and post-battle outcome application SHALL resolve campaign roster entries and vault pilots by that pilot linkage when present, falling back to the legacy unit-id key only when the linkage is absent (previously persisted outcomes and hand-built fixtures). Kill attribution SHALL continue to be looked up by the session unit id against the after-action report's per-unit rows. A delta whose pilot linkage resolves to no roster entry (opponent units, NPC or inline-statblock crews) SHALL skip pilot updates without failing the outcome application, exactly as an unresolvable unit id does today. Session unit ids are session-scoped composites (side–slot–unitRef) and SHALL NOT be treated as roster pilot ids; no test SHALL rig roster pilot ids to session-unit-id-shaped strings to force resolution.

#### Scenario: An engine-derived outcome grants XP to the assigned pilot

- **GIVEN** a completed campaign-linked session whose player units carry vault pilot ids in `pilotRef` and session-scoped composite unit ids
- **WHEN** the derived outcome is applied by post-battle processing
- **THEN** each assigned pilot's roster entry SHALL be resolved via the delta's pilot linkage
- **AND** SHALL receive its XP, mission-count, and kill updates

#### Scenario: Outcomes without pilot linkage keep the legacy resolution

- **GIVEN** a persisted or hand-built outcome whose unit deltas carry no pilot linkage
- **WHEN** the outcome is applied
- **THEN** roster resolution SHALL fall back to the delta's unit id, preserving pre-existing behavior

#### Scenario: Unresolvable pilot linkage skips without failing

- **GIVEN** an outcome delta whose pilot linkage matches no campaign roster entry
- **WHEN** the outcome is applied
- **THEN** pilot updates for that delta SHALL be skipped with a logged warning
- **AND** the remainder of the outcome SHALL apply normally

## MODIFIED Requirements

### Requirement: Campaign-Linked Encounter Launch

The system SHALL launch a campaign-generated encounter into a `GameSession`
stamped with campaign linkage. The launched encounter's player force SHALL contain every roster unit selected at mission launch — each with its canonical `unitRef` and its assigned pilot's `pilotRef` — and an opponent force sized to the player deployment. Roster units that cannot resolve to a canonical `unitRef` SHALL block launch with a per-unit reason; the system SHALL NOT substitute fallback units. The materialization contract is transport-agnostic: the roster-parity, opponent-sizing, and unresolvable-unit-blocking guarantees SHALL hold identically whether the `/api/forces` and `/api/encounters` handlers are reached through a live browser fetch or through an in-process fetch implementation that invokes the same handler modules directly (the headless campaign fast-forward path).

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

#### Scenario: Materialization contract holds under an in-process fetch implementation

- **GIVEN** a headless fast-forward run materializing an encounter for N selected roster units through an injected in-process fetch implementation backed by the real `/api/forces` and `/api/encounters` handler modules
- **WHEN** the encounter is materialized
- **THEN** the player force SHALL carry N assignments with each unit's `unitRef` and its pilot's `pilotRef` preserved
- **AND** the opponent force SHALL be sized to N
- **AND** a roster unit with no resolvable canonical `unitRef` SHALL block materialization with a per-unit reason, identically to the live browser transport
