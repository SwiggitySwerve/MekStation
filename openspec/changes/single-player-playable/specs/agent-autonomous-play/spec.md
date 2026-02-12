## ADDED Requirements

### Requirement: Autonomous Agent Player Helper

The system SHALL provide a Playwright helper that can autonomously play through a complete game by reading state from stores and acting through UI clicks.

#### Scenario: Agent plays complete Quick Play game

- **WHEN** the agent player helper's playGame(page) method is called on an active interactive game session
- **THEN** the agent SHALL play through all turns until the game ends
- **AND** the game SHALL complete with a winner (not a timeout or error)
- **AND** the game SHALL complete within 60 seconds

#### Scenario: Agent makes movement decisions

- **WHEN** the agent's makeMovementDecision(gameState) is called during Movement phase
- **THEN** the agent SHALL return a destination hex that is closer to the nearest enemy than the unit's current position
- **AND** the destination SHALL be within the unit's valid movement range

#### Scenario: Agent makes attack decisions

- **WHEN** the agent's makeAttackDecision(gameState) is called during WeaponAttack phase
- **THEN** the agent SHALL select the weapon with the highest expected damage
- **AND** the agent SHALL target the most damaged enemy unit within range

#### Scenario: Agent reads state from store

- **WHEN** the agent needs game information (unit positions, weapons, armor, phase)
- **THEN** the agent SHALL read from window.**ZUSTAND_STORES**.gameplay.getState()
- **AND** the agent SHALL NOT attempt to parse state from rendered UI elements

#### Scenario: Agent acts through UI

- **WHEN** the agent executes an action (move, attack)
- **THEN** the agent SHALL click actual UI elements (hex map hexes, unit tokens, buttons)
- **AND** the agent SHALL NOT call store methods directly to mutate state

### Requirement: Hex-Level Data-TestID Selectors

The system SHALL provide data-testid attributes on hex map elements for agent addressability.

#### Scenario: Each hex has a coordinate-based selector

- **WHEN** the hex map is rendered
- **THEN** every hex group element SHALL have data-testid="hex-{q}-{r}" where {q} and {r} are the axial coordinates

#### Scenario: Unit tokens have ID-based selectors

- **WHEN** unit tokens are rendered on the hex map
- **THEN** each token SHALL have data-testid="unit-token-{unitId}"

#### Scenario: Map container has selector

- **WHEN** the hex map component is rendered
- **THEN** the outermost container SHALL have data-testid="hex-map-container"

### Requirement: E2E Store Helper Correctness

The system SHALL use the correct global name for store access in E2E helpers.

#### Scenario: Store helper uses correct global

- **WHEN** e2e/helpers/store.ts accesses Zustand stores
- **THEN** it SHALL use window.**ZUSTAND_STORES** (not the stale window.**STORES**)

#### Scenario: Store helper retrieves gameplay state

- **WHEN** getStoreState(page, 'gameplay') is called in an E2E test
- **THEN** the current gameplay store state SHALL be returned including session, ui, and unit data

### Requirement: Integration Test Suites

The system SHALL provide E2E test suites covering all major gameplay flows.

#### Scenario: Quick Play flow test

- **WHEN** the quick-play.spec.ts test suite runs
- **THEN** it SHALL verify: navigate to Quick Play, select units, configure scenario, auto-resolve battle, verify results displayed, and verify replay has events
- **AND** tests SHALL be tagged @game @smoke

#### Scenario: Encounter flow test

- **WHEN** the encounter-flow.spec.ts test suite runs
- **THEN** it SHALL verify: create force with units, create encounter, assign forces, launch encounter, verify game session created, auto-resolve, and verify results
- **AND** tests SHALL be tagged @encounter @smoke

#### Scenario: Campaign flow test

- **WHEN** the campaign-flow.spec.ts test suite runs
- **THEN** it SHALL verify: create campaign, assign roster, generate mission, launch and auto-resolve, return to campaign, verify damage carry-forward, run second mission
- **AND** tests SHALL be tagged @campaign @smoke

#### Scenario: Agent autonomy test

- **WHEN** the agent-autonomy.spec.ts test suite runs
- **THEN** it SHALL verify: start interactive game, agent plays through entire game, game reaches completion, at least 10 game events generated
- **AND** tests SHALL be tagged @game @agent
