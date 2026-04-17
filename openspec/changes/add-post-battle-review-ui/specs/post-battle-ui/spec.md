# post-battle-ui Specification

## ADDED Requirements

### Requirement: Post-Battle Review Route

The post-battle UI SHALL provide a `/gameplay/games/[id]/review` route
accessible once a session has emitted `CombatOutcomeReady` and the
associated `ICombatOutcome` has been persisted.

#### Scenario: Route fetches outcome from persistence

- **GIVEN** a session id `G` with a persisted outcome
- **WHEN** the user navigates to `/gameplay/games/G/review`
- **THEN** the page SHALL fetch `/api/matches/G/outcome`
- **AND** the page SHALL render once the fetch resolves
- **AND** loading and error states SHALL be handled with explicit UI

#### Scenario: Route guards against incomplete sessions

- **GIVEN** a session id `G` that is still `InProgress`
- **WHEN** the user navigates to `/gameplay/games/G/review`
- **THEN** the page SHALL redirect to `/gameplay/games/G` (the active
  match view)

### Requirement: Per-Unit Casualty Panel

The UI SHALL render one `CasualtyPanel` per `IUnitCasualty` in the
outcome, showing armor and structure loss per location, destroyed
components, ammo consumption, maximum heat, shutdown count, and final
status.

#### Scenario: Panel reflects per-location armor loss

- **GIVEN** a unit casualty with `armorLostPerLocation = { LT: 12, CT: 5 }`
- **WHEN** the casualty panel renders
- **THEN** the armor diagram SHALL visually indicate the LT lost 12
  points and CT lost 5 points
- **AND** hovering over the LT SHALL reveal a tooltip with before/after
  values

#### Scenario: Panel lists destroyed components

- **GIVEN** a unit casualty with `destroyedComponents` containing a
  Medium Laser in RA
- **WHEN** the panel renders
- **THEN** the destroyed-components section SHALL list
  "Medium Laser — Right Arm (slot X)"
- **AND** the armor diagram's RA SHALL visually indicate the component
  slot as destroyed

#### Scenario: Panel shows final status badge

- **GIVEN** a unit casualty with `finalStatus = CRIPPLED`
- **WHEN** the panel renders
- **THEN** a badge labeled "CRIPPLED" SHALL be visible
- **AND** the badge SHALL use a color consistent with the design system's
  danger/warning palette

### Requirement: Per-Pilot Outcome Panel

The UI SHALL render one `PilotOutcomePanel` per `IPilotOutcome` showing
XP awarded (itemized), wound count, consciousness roll failures, and
final pilot status.

#### Scenario: Panel itemizes XP sources

- **GIVEN** a pilot outcome with 1 scenario XP, 2 kill XP, 1 task XP, 3
  mission XP
- **WHEN** the pilot panel renders
- **THEN** the XP breakdown SHALL display
  "Scenario +1, Kills +2, Tasks +1, Mission +3 = Total +7"
- **AND** the total SHALL match the sum of the itemized values

#### Scenario: Panel displays wound tracker

- **GIVEN** a pilot outcome with 2 wounds taken
- **WHEN** the panel renders
- **THEN** a 6-slot wound tracker SHALL show 2 slots filled, 4 empty

#### Scenario: KIA pilot has terminal status badge

- **GIVEN** a pilot with `finalStatus = KIA`
- **WHEN** the panel renders
- **THEN** a prominent "KIA" badge SHALL be shown
- **AND** no XP breakdown SHALL be displayed (KIA pilots do not receive
  posthumous XP per campaign rules)

### Requirement: Salvage Panel

The UI SHALL render a `SalvagePanel` showing the employer and mercenary
salvage awards side by side, with split-method label.

#### Scenario: Contract split is labeled

- **GIVEN** a salvage allocation with `splitMethod = "contract"` and
  `salvageRights = 60`
- **WHEN** the salvage panel renders
- **THEN** the split-method label SHALL read "Contract 60/40 Mercenary"
  (or equivalent)

#### Scenario: Hostile withdrawal is labeled

- **GIVEN** a salvage allocation with `splitMethod = "hostile_withdrawal"`
- **WHEN** the panel renders
- **THEN** the label SHALL read "Hostile Withdrawal (mercenary salvage
  halved)"
- **AND** the mercenary column's total value SHALL show the halved value

#### Scenario: Empty pool shows empty-state

- **GIVEN** an outcome whose salvage allocation has no candidates
- **WHEN** the panel renders
- **THEN** both columns SHALL show "No salvageable materiel"
- **AND** the split-method label SHALL be suppressed

### Requirement: Contract Status Panel

The UI SHALL render a `ContractStatusPanel` when `outcome.contractId` is
set, showing progress, mission result, morale shift, and earnings.

#### Scenario: Panel hidden on standalone skirmish

- **GIVEN** an outcome with `contractId = null`
- **WHEN** the review page renders
- **THEN** no contract status panel SHALL be rendered

#### Scenario: Panel shows mission result

- **GIVEN** an outcome with `contractId` set and the processor recorded a
  SUCCESS mission result
- **WHEN** the panel renders
- **THEN** the result label SHALL read "SUCCESS" with a green icon
- **AND** the scenarios-played progress SHALL increment to reflect this
  mission

### Requirement: Repair Preview Panel

The UI SHALL render a `RepairPreviewPanel` summarizing tickets created
by the repair queue builder for this battle.

#### Scenario: Panel summarizes ticket counts by priority

- **GIVEN** repair tickets generated for this battle: 1 CRITICAL, 2 HIGH,
  5 NORMAL, 3 LOW
- **WHEN** the panel renders
- **THEN** the ticket-count summary SHALL read "1 critical, 2 high, 5
  normal, 3 low"

#### Scenario: Panel shows unmatched parts count

- **GIVEN** tickets that collectively need 4 parts not in inventory
- **WHEN** the panel renders
- **THEN** an "unmatched parts" counter SHALL display 4
- **AND** a link SHALL route the user to the acquisition UI filtered by
  unmet demand
