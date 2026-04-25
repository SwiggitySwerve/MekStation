# post-battle-ui Specification

## ADDED Requirements

### Requirement: Post-Battle Review Route

The post-battle UI SHALL provide a `/gameplay/games/[id]/review` route
accessible once a session has emitted `CombatOutcomeReady` and the
associated `ICombatOutcome` has been persisted.

#### Scenario: Route fetches outcome from persistence

> DEFERRED to Wave 5: the persistent `/api/matches/[id]/outcome` REST
> endpoint is part of the Wave 5 match-log persistence work. The MVP
> ships against the in-memory campaign-store pending queue
> (`useCampaignStore.getPendingOutcomes`), which is hydrated by the same
> bus subscription the day-pipeline uses. Loading and error states are
> handled with explicit UI (`review-loading`, `review-no-outcome`).
> (pickup: `src/pages/gameplay/games/[id]/review.tsx:171`)

- **GIVEN** a session id `G` with a persisted outcome
- **WHEN** the user navigates to `/gameplay/games/G/review`
- **THEN** the page SHALL fetch `/api/matches/G/outcome`
- **AND** the page SHALL render once the fetch resolves
- **AND** loading and error states SHALL be handled with explicit UI

#### Scenario: Route guards against incomplete sessions

> DEFERRED to Wave 5: active redirect-to-active-match requires
> cross-store coordination between the gameplay session store
> (`useGameplayStore.session`) and the campaign-outcome queue. The
> MVP renders a deterministic empty-state (`review-no-outcome`) when
> the queue has no outcome for the requested matchId, which is a
> superset guard — it covers both "session in progress" and "session
> never existed". The Wave 5 session-lifecycle cleanup will swap the
> empty-state for the explicit redirect. (pickup:
> `src/pages/gameplay/games/[id]/review.tsx:190`)

- **GIVEN** a session id `G` that is still `InProgress`
- **WHEN** the user navigates to `/gameplay/games/G/review`
- **THEN** the page SHALL redirect to `/gameplay/games/G` (the active
  match view)

### Requirement: Per-Unit Casualty Panel

The UI SHALL render one `CasualtyPanel` per `IUnitCasualty` in the
outcome, showing armor and structure loss per location, destroyed
components, ammo consumption, maximum heat, shutdown count, and final
status.

> DEFERRED to Wave 5 (partial): the casualty panel ships with the
> campaign-facing `IUnitCombatDelta` slice surfaced — final status badge,
> destroyed components, ammo bins remaining (presented as remaining
> rounds rather than "consumed" deltas because the engine emits the
> end-state, not the per-round delta), final heat reading, and
> destroyed locations. The full per-location armor/structure
> visualization with hover tooltips depends on a record-sheet
> ArmorDiagram that does not exist yet; the customizer ArmorDiagram
> requires a different data shape. Max-heat-reached and shutdown-count
> derivation depends on the Wave 5 pilot/heat event pipeline (current
> `IUnitCombatDelta.heatEnd` is the post-heat-phase reading, not max).
> (pickup: `src/components/gameplay/post-battle/CasualtyPanel.tsx:131`,
> `src/types/combat/CombatOutcome.ts:98`)

#### Scenario: Panel reflects per-location armor loss

> DEFERRED to Wave 5: depends on the record-sheet ArmorDiagram surface;
> see Requirement-level note above. The casualty row currently lists
> destroyed locations textually so the spec's underlying intent
> ("player can identify which locations took damage") is met without
> the diagram. (pickup:
> `src/components/gameplay/post-battle/CasualtyPanel.tsx:101`)

- **GIVEN** a unit casualty with `armorLostPerLocation = { LT: 12, CT: 5 }`
- **WHEN** the casualty panel renders
- **THEN** the armor diagram SHALL visually indicate the LT lost 12
  points and CT lost 5 points
- **AND** hovering over the LT SHALL reveal a tooltip with before/after
  values

#### Scenario: Panel lists destroyed components

> DEFERRED (slot precision): `IUnitCombatDelta.destroyedComponents` is a
> flat string list, not slot-indexed; the row renders the names but
> cannot annotate them with "Right Arm (slot X)" until the engine
> emits component → location/slot pairs. (pickup:
> `src/types/combat/CombatOutcome.ts:96`)

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

> DEFERRED to Wave 5 (partial): XP itemization includes scenario-base
> and per-kill XP (the two values the engine can derive today); tasks
> XP and mission-completion XP land with the Wave 5
> contract/scenario pipeline, which is the source of truth for those
> categories. Consciousness-roll-failure counters are likewise blocked
> on the pilot-event pipeline — `IUnitCombatDelta.pilotState` exposes
> only `wounds`, `conscious`, `killed`, and `finalStatus`, not roll
> history. The 6-slot wound tracker, status badge (including KIA), and
> XP gain estimate are shipped today. (pickup:
> `src/components/gameplay/post-battle/PilotXpPanel.tsx:128`,
> `src/types/combat/CombatOutcome.ts:103`)

#### Scenario: Panel itemizes XP sources

> DEFERRED to Wave 5: tasks and mission XP categories are blocked on
> the contract pipeline; the panel renders the scenario + kills
> heuristic verbatim today. (pickup:
> `src/components/gameplay/post-battle/PilotXpPanel.tsx:70`)

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

> DEFERRED to Wave 5 (partial): the panel renders the per-side totals,
> the candidate list, and the "auction draft required" hint when the
> engine flags the pool as auction-bound. The split-method label
> ("Contract 60/40", "Auction Exchange", "Hostile Withdrawal") cannot
> be surfaced today because `ISalvageReport` (the UI DTO) only carries
> `auctionRequired` and `hostileTerritoryPenalty`; the canonical
> `splitMethod` field lives on `ISalvageAllocation` (the engine struct)
> and isn't piped through to the report wrapper. The salvage-UI polish
> pass either threads the field or swaps the prop type. (pickup:
> `src/types/campaign/Salvage.ts:228`,
> `src/components/gameplay/post-battle/SalvagePanel.tsx:81`)

#### Scenario: Contract split is labeled

> DEFERRED to Wave 5: see Requirement-level note above.

- **GIVEN** a salvage allocation with `splitMethod = "contract"` and
  `salvageRights = 60`
- **WHEN** the salvage panel renders
- **THEN** the split-method label SHALL read "Contract 60/40 Mercenary"
  (or equivalent)

#### Scenario: Hostile withdrawal is labeled

> DEFERRED to Wave 5: same blocker as above. The hostile-territory
> penalty is on the report (`hostileTerritoryPenalty`) but the
> "halved-mercenary" wording is part of the split-method copy that
> requires the threading work.

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

> DEFERRED to Wave 5 (partial): the panel renders contract id/name,
> employer, status (COMPLETED/FAILED/IN PROGRESS, derived from end-
> reason and winner) and the optional payment delta, and is hidden
> entirely for standalone skirmishes. Scenarios-played progress and
> morale-shift indicator depend on contract-pipeline state that lives
> outside `ICombatOutcome` — the orchestrator that lands in Wave 5 is
> the source of truth for both. The mission-result icon is design-
> system work tracked separately. (pickup:
> `src/components/gameplay/post-battle/ContractPanel.tsx:78`,
> `src/types/combat/CombatOutcome.ts:115`)

#### Scenario: Panel hidden on standalone skirmish

- **GIVEN** an outcome with `contractId = null`
- **WHEN** the review page renders
- **THEN** no contract status panel SHALL be rendered

#### Scenario: Panel shows mission result

> DEFERRED to Wave 5 (partial): the result label renders "COMPLETED" /
> "FAILED" / "IN PROGRESS" today. The green/red icon and the
> scenarios-played increment depend on the design-system status icon
> set + the contract orchestrator respectively. (pickup:
> `src/components/gameplay/post-battle/ContractPanel.tsx:58`)

- **GIVEN** an outcome with `contractId` set and the processor recorded a
  SUCCESS mission result
- **WHEN** the panel renders
- **THEN** the result label SHALL read "SUCCESS" with a green icon
- **AND** the scenarios-played progress SHALL increment to reflect this
  mission

### Requirement: Repair Preview Panel

The UI SHALL render a `RepairPreviewPanel` summarizing tickets created
by the repair queue builder for this battle.

> DEFERRED to Wave 5 (partial): the panel renders ticket count, total
> tech-hours, ticket grouping, and the unmatched-parts count. Two
> sub-pieces are deferred: `IRepairTicket` carries no `priority` field
> today (the MVP groups by `kind`, which is the only categorical the
> engine emits), and the procurement deep link awaits a query-param
> contract on the acquisition route. (pickup:
> `src/components/gameplay/post-battle/RepairPreviewPanel.tsx:76`,
> `src/types/campaign/RepairTicket.ts`)

#### Scenario: Panel summarizes ticket counts by priority

> DEFERRED to Wave 5: `IRepairTicket.priority` does not exist; the panel
> groups by `kind` (armor/structure/component/ammo/heat-recovery)
> instead, which is the same shape ("count + categorical bucket")
> with the field the engine actually emits. (pickup:
> `src/types/campaign/RepairTicket.ts`)

- **GIVEN** repair tickets generated for this battle: 1 CRITICAL, 2 HIGH,
  5 NORMAL, 3 LOW
- **WHEN** the panel renders
- **THEN** the ticket-count summary SHALL read "1 critical, 2 high, 5
  normal, 3 low"

#### Scenario: Panel shows unmatched parts count

> DEFERRED (deep link only): the unmatched-parts count is rendered today
> (`repair-unmatched-parts` test id); the deep link to a filtered
> acquisition route awaits the route's `?demand=...` query-param
> contract. (pickup:
> `src/components/gameplay/post-battle/RepairPreviewPanel.tsx:137`)

- **GIVEN** tickets that collectively need 4 parts not in inventory
- **WHEN** the panel renders
- **THEN** an "unmatched parts" counter SHALL display 4
- **AND** a link SHALL route the user to the acquisition UI filtered by
  unmet demand
