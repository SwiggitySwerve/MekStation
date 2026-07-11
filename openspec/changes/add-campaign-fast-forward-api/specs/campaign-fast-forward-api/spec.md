# campaign-fast-forward-api Specification (Delta)

## Purpose

Defines the headless campaign fast-forward driver: `fastForwardCampaign()` advances a campaign through the production day pipeline at jest speed, fights bridged AtB scenarios through the real API handlers and the real `GameEngine`, and holds economy, XP-progression, and maintenance invariants over the result. It is the coverage layer for the seam-free subsystems and the pack-minting substrate for scenario packs, and it complements — never replaces — the route-mounted seam trust anchor journeys. (This Purpose is authored in the delta so the archive-time capability spec does not ship a TBD placeholder.)

## ADDED Requirements

### Requirement: Headless Campaign Fast-Forward Driver

The system SHALL provide `fastForwardCampaign()` under `src/lib/campaign/fastForward/` that advances a loaded campaign a caller-specified number of in-fiction days inside a plain Node test process — no browser, no live Next.js server — by driving the campaign store's `advanceDay` path (the registered day-pipeline processors), never the legacy registry-free day-advancement fallback. The driver SHALL establish the campaign store's combat-outcome-bus subscription before any battle is fought, SHALL continue advancing drain day(s) after the final scheduled day until every outcome it published has been applied by the day pipeline, and SHALL return a machine-readable run report covering days advanced (including drain days), per-day reports, scenarios generated and bridged, battles fought (scenario, contract, encounter, and match ids plus the seed used), and outcome-application status.

#### Scenario: Fast-forward runs headless at jest speed

- **WHEN** `fastForwardCampaign()` is invoked from a jest test with a campaign fixture and a day count
- **THEN** it SHALL advance the campaign that many in-fiction days without launching a browser or a live server
- **AND** return a run report enumerating the days, scenarios, and battles processed

#### Scenario: The production pipeline runs, not the fallback

- **WHEN** a fast-forwarded day generates scenarios
- **THEN** the bridged encounters on the campaign SHALL have been produced by the registered scenario-encounter bridge processor through the day pipeline
- **AND** the fast-forward module tree SHALL NOT import the legacy registry-free day-advancement fallback

#### Scenario: Published outcomes are drained before the driver returns

- **GIVEN** a battle fought after the final scheduled day's advance
- **WHEN** the driver completes
- **THEN** it SHALL have advanced additional drain day(s) until the campaign's pending battle outcomes are empty
- **AND** the run report SHALL record those drain days and an outcome-application count equal to the battles fought

### Requirement: Fixture Expectations Fail Loud

`fastForwardCampaign()` SHALL accept declared run expectations — at minimum a minimum count of scenarios bridged and a minimum count of battles fought — and SHALL throw, never return a green report, when an expectation is unmet. AtB scenario generation is triple-gated: Monday-only; `useAtBScenarios` (defaults to false and is absent from default campaign options); and a per-team d100 battle-chance roll against the team role's base battle chance (force-derived teams all roll FRONTLINE's 20%). A mis-built fixture silently generates nothing, and even a correctly built fixture can roll zero battles; expectations exist so both failure modes are loud. Acceptance fixtures SHALL therefore declare explicit combat teams and Monday coverage whose combined roll budget (team count × covered Mondays × per-roll chance) makes zero battles across the run practically impossible for any seed (except where the Single-fight isolation fixtures scenario below applies): the pinned campaign seed serves determinism, never battle occurrence. After an upstream change perturbs the scenario-generation roll stream, the seed MAY be re-pinned freely, and an expectation miss SHALL be read as the battle-chance gate — named in the thrown error — not as a defect in the covered subsystems.

#### Scenario: Zero bridged scenarios with a bridged-scenario expectation fails loud

- **GIVEN** a fast-forward run declared with a minimum of one bridged scenario
- **WHEN** the run completes its day loop with zero scenarios bridged
- **THEN** the driver SHALL throw an error naming the unmet expectation
- **AND** SHALL NOT return a run report as if the run were satisfactory

#### Scenario: The AtB acceptance fixture reaches all three generation gates

- **GIVEN** a campaign fixture with `useAtBScenarios` explicitly enabled, an active contract with resolvable combat teams, and explicit teams plus Monday coverage sized so the probability of zero battle-chance successes across the run is negligible for any seed
- **WHEN** a fast-forward run declares a minimum of one bridged scenario
- **THEN** the run SHALL complete with at least one entry in the campaign's bridged encounters

#### Scenario: The bridged-scenario expectation survives a seed re-pin

- **GIVEN** the acceptance fixture re-pinned to a different campaign seed after an upstream roll-stream change
- **WHEN** the fast-forward run executes
- **THEN** the fixture's declared roll budget SHALL keep the minimum-bridged-scenario expectation satisfiable without seed cherry-picking
- **AND** an expectation miss SHALL throw naming the battle-chance gate rather than returning a green empty run

#### Scenario: Single-fight isolation fixtures may declare a reduced roll budget

- **GIVEN** a fast-forward suite whose invariant assertions require bracketing exactly one battle's isolated outcome application, and whose fixture's default roll budget would let more than one combat team target the fixture's single active contract on the same generation Monday — a real double-payout under `getCombatTeamsForContract`'s all-teams-vs-every-active-contract behavior and `applyContractDelta`'s terminal-to-terminal flip gap (a documented production gap, the same-day sibling of the Economy Ledger Invariants requirement's recorded gap, out of this capability's scope)
- **WHEN** that suite's fixture is constructed
- **THEN** the fixture MAY declare a reduced combat-team count, as low as one, so at most one battle can ever target the contract
- **AND** the suite SHALL still declare `minScenariosBridged`/`minBattles` fail-loud expectations so a zero-battle roll fails loud rather than passing vacuously
- **AND** the reduced budget's residual zero-battle probability for the suite's specific pinned seed SHALL be documented adjacent to the fixture construction

### Requirement: Battles Run Through the Real Handlers and the Real Engine

For each bridged scenario a fast-forward run elects to fight, the runner SHALL: (a) materialize the player force, opponent force, and encounter through the same `/api/forces` and `/api/encounters` Pages Router handler modules production serves, invoked in-process through an injected fetch implementation that imports the real handler modules — never mocks or parallel re-implementations — against the real SQLite service; (b) build combat units through the same catalog-adapted construction path the live single-player launch uses; (c) resolve combat via `GameEngine.runToCompletion` with campaign linkage; and (d) publish the derived outcome through the production combat-outcome bus so the next day's post-battle processing applies it. The in-process fetch implementation SHALL fail loud (naming the method and path) on any route it does not map, so handler drift breaks the fast-forward suite rather than rotting silently.

**Catalog-lookup bound (explicit, honest coverage)**: clause (b)'s catalog-adapted construction path SHALL be real and unmocked end-to-end with one narrow, explicitly bounded exception: the underlying catalog data lookup itself (`adaptUnit`'s call into `CanonicalUnitService.getById()`, which fetches bundled unit data and has no filesystem fallback) cannot resolve in a plain jest/Node process, so the fast-forward test battery MAY mock that lookup call — and that call only, never combat mechanics or the surrounding construction path — with hand-built canonical armor/structure sheets. A regression strictly inside the mocked lookup boundary (for example, a mapping change that yields empty armor/structure maps) is therefore NOT caught by this capability's battery; that boundary's correctness remains the responsibility of the catalog service's own suite and the browser-mounted seam trust anchor journeys (per the Fast-Forward Complements, Never Replaces requirement below), which exercise the real fetch-based lookup unmocked.

#### Scenario: Real handler modules serve materialization

- **WHEN** a fast-forward battle materializes its forces and encounter
- **THEN** the created force and encounter rows SHALL exist in the SQLite database, written by the imported production handler modules
- **AND** a breaking change to a handler's route or payload contract SHALL fail the fast-forward run rather than being absorbed by a mock

#### Scenario: Outcome application rides the production pipeline

- **WHEN** a fast-forward battle completes and its outcome is published on the combat-outcome bus
- **THEN** the campaign store's subscription SHALL enqueue it onto the campaign's pending battle outcomes
- **AND** the next fast-forwarded day's post-battle processing SHALL apply it
- **AND** neither the runner nor its tests SHALL write to the campaign's pending battle outcomes directly

#### Scenario: Campaign linkage round-trips into applied progress

- **GIVEN** a bridged scenario with campaign, contract, and scenario identifiers
- **WHEN** its fast-forward battle's outcome is applied
- **THEN** the outcome SHALL carry those identifiers so contract and scenario progress apply to the originating contract

#### Scenario: The catalog-lookup boundary is the only sanctioned mock

- **GIVEN** the fast-forward jest battery, which cannot resolve real bundled catalog data through `fetch()` in a plain Node process
- **WHEN** a fast-forward battle builds combat units through the catalog-adapted construction path
- **THEN** only the catalog-lookup call SHALL be mocked, with hand-built canonical armor/structure sheets, never combat mechanics or the surrounding construction path
- **AND** a regression strictly inside that mocked lookup boundary SHALL NOT be certified by this capability's battery

### Requirement: Session Damage Invariant Guard

The system SHALL provide `assertSessionInflictedDamage`, and the fast-forward runner SHALL apply it to every completed fast-forward battle unconditionally. The guard SHALL fail loud, with per-unit diagnostics, when any of the following hold: (a) any deployed unit entered battle with zero total armor and structure; (b) a completed battle inflicted zero cumulative damage — every unit's remaining armor and structure equals its starting totals — regardless of what the session event log contains; (c) the session recorded a terminal outcome with no justifying combat, withdrawal, or concession events. When condition (b) trips while damage-bearing events ARE present in the log, the diagnostics SHALL additionally name the phantom-damage signature — damage events emitted against identifiers that never mutated unit state, the dual-id-construction class — so the id-mismatch shape is distinguished from a genuine event-free stalemate; the presence of damage events SHALL never absolve unchanged deltas. Softening or bypassing the guard for any battle class SHALL require a delta to this requirement.

#### Scenario: A zero-armor battle start fails the guard

- **GIVEN** a completed session in which a deployed unit started with zero total armor and structure
- **WHEN** `assertSessionInflictedDamage` runs
- **THEN** it SHALL throw naming the unit and its zero starting totals

#### Scenario: A zero-damage completed battle fails the guard

- **GIVEN** a completed session whose every unit ends with remaining armor and structure equal to its starting totals
- **WHEN** `assertSessionInflictedDamage` runs
- **THEN** it SHALL throw identifying the battle as having inflicted no damage, regardless of the event log's contents

#### Scenario: Phantom damage events are named, never absolving

- **GIVEN** a completed session whose event log contains damage-bearing events but whose every unit's remaining armor and structure equals its starting totals
- **WHEN** `assertSessionInflictedDamage` runs
- **THEN** it SHALL throw
- **AND** the diagnostics SHALL name the phantom-damage signature: damage events referencing identifiers that never mutated unit state

#### Scenario: An unjustified terminal outcome fails the guard

- **GIVEN** a session that recorded a terminal outcome with no preceding combat, withdrawal, or concession events
- **WHEN** `assertSessionInflictedDamage` runs
- **THEN** it SHALL throw identifying the unjustified terminal outcome

#### Scenario: A healthy battle passes the guard

- **GIVEN** a completed session whose units started with canonical armor and structure and where combat events reduced at least one unit's totals
- **WHEN** `assertSessionInflictedDamage` runs
- **THEN** it SHALL pass without error

### Requirement: Economy Ledger Invariants Across a Fast-Forwarded Run

The fast-forward test surface SHALL assert, over every fast-forwarded run's end state: (a) the campaign balance reconciles against the transactions appended during the run, applying each transaction type's sign explicitly (transaction amounts store unsigned magnitudes) and failing on unknown transaction types; (b) contract payout posts exactly once per contract-status flip to terminal, and a re-published duplicate outcome (same match id) posts no additional payout and appends nothing to the processed-fulfilled ledger; (c) exactly one salary path posts personnel costs on any given day, per the campaign's role-based-salaries option, with the other path a verified no-op. Production's closure guard is keyed on match-id dedup and status flips, NOT on the contract: scenario generation does not filter contract status, so a later battle that flips an already-terminal contract to a different terminal status re-pays the contract and re-appends the processed-fulfilled ledger — a documented production gap outside this change's scope. Fast-forward fixtures SHALL therefore bound each contract's scenario-generation window so no battle can be generated for a contract after it first reaches terminal status (for example: a single covered Monday per contract, or a contract end date before the next Monday), and under that bound SHALL additionally assert that each fulfilled contract appears exactly once in the processed-fulfilled ledger.

#### Scenario: Balance reconciles per-type-signed

- **WHEN** a fast-forwarded run completes
- **THEN** the ending balance SHALL equal the starting balance adjusted by every appended transaction with its type's sign applied

#### Scenario: Contract payout posts exactly once under a same-match-id duplicate outcome

- **GIVEN** a fast-forwarded run in which a completed contract's outcome is re-published with the same match id
- **WHEN** subsequent days are processed
- **THEN** exactly one contract-closure income transaction SHALL exist for that contract
- **AND** the contract SHALL appear exactly once in the processed-fulfilled contract ledger

#### Scenario: Fixtures forbid post-terminal battle generation

- **GIVEN** a fast-forward fixture with an active contract
- **WHEN** the fixture is constructed
- **THEN** the contract's scenario-generation window SHALL be bounded so no scenario can be generated for it after it first reaches terminal status

#### Scenario: Exactly one salary path posts

- **GIVEN** a fast-forwarded run with the role-based-salaries option explicitly set
- **WHEN** daily costs are processed
- **THEN** only the path selected by the option SHALL post personnel-cost transactions and the other SHALL leave the campaign unchanged

### Requirement: XP Progression Invariants Through Engine-Driven Combat

The fast-forward test surface SHALL assert XP-progression invariants over outcomes produced by real `GameEngine` combat — never hand-built outcome fixtures — applied through production pilot attribution: engine-derived unit deltas SHALL reach roster entries via the outcome's pilot linkage (the Engine-Derived Outcome Pilot Attribution requirement this change adds to `campaign-combat-loop`), and no fast-forward fixture or test SHALL rig roster pilot ids to session-unit-id-shaped strings to force resolution — that rig is the dual-id masking this capability exists to catch. The asserted invariants: (a) each roster entry's XP and lifetime campaign XP are non-decreasing across the run (the fast-forward loop drives no XP spend); (b) XP application is apply-once per outcome, keyed on match id, so a re-published duplicate outcome leaves XP unchanged; (c) per applied outcome, campaign-mission counts increment by exactly one per participating pilot, kill counts match the outcome's per-unit kill attribution, and scenario XP is awarded to pilot-crewed roster entries per the post-battle award rules.

#### Scenario: XP lands without id rigging

- **GIVEN** an engine-driven outcome whose session unit ids differ from every roster pilot id, as production constructs them
- **WHEN** the outcome is applied through the production post-battle pipeline
- **THEN** the assigned pilots' roster entries SHALL receive scenario XP and mission-count increments via the outcome's pilot linkage

#### Scenario: XP is monotonic across the run

- **WHEN** a fast-forwarded run completes
- **THEN** no roster entry's XP or lifetime campaign XP SHALL be lower than at any earlier day of the run

#### Scenario: Duplicate outcomes award no duplicate XP

- **GIVEN** an applied engine-driven outcome for match id M
- **WHEN** the same outcome is re-published and a further day is processed
- **THEN** every roster entry's XP counters SHALL be unchanged by the duplicate

#### Scenario: Awards match participation

- **WHEN** an engine-driven outcome is applied
- **THEN** each participating pilot's mission count SHALL increment by exactly one
- **AND** kill increments SHALL match the outcome's kill attribution

### Requirement: Maintenance and Repair Invariants Across a Fast-Forwarded Run

The fast-forward test surface SHALL assert, across every fast-forwarded run: (a) repair hours applied on any single day never exceed the daily repair-hours budget and never carry over between days; (b) repaired armor, structure, and ammo values never exceed the corresponding unit maximum-state caps; (c) re-processing a day against the same repair queue creates no duplicate repair tickets and consumes no parts twice for an already-completed ticket.

**Run-level engagement bound (explicit, honest coverage)**: clauses (a) and (c) are established as pure-function guarantees over synthetic before/after ticket and parts-inventory snapshots — a passing case and a deliberately-violated case each — owned by the dedicated invariant-module test suite. No fast-forward fixture or production writer populates `campaign.unitMaxStates` from combat-derived state today, and `repairQueueBuilderProcessor` requires both `unitMaxStates` and `unitCombatStates` before building any ticket, so a real fast-forwarded run's repair queue stays empty. The fast-forward test surface SHALL still call clauses (a), (b), and (c)'s assertion functions against that real (possibly-empty) end-state data, honestly, rather than skip them — but until a production change populates `unitMaxStates` from fast-forward combat (out of this capability's scope), those run-level calls do not additionally certify daily-budget bounding or re-run idempotency against combat-derived repair tickets; that guarantee remains the dedicated invariant-module suite's synthetic-fixture coverage alone.

#### Scenario: Run-level assertions run against real, possibly-empty repair state

- **GIVEN** a fast-forwarded run whose combat produced damage but whose campaign carries no `unitMaxStates` entries (no production writer populates it from fast-forward combat today)
- **WHEN** the fast-forward test surface asserts the maintenance invariants over that run's end state
- **THEN** it SHALL call the same assertion functions the dedicated invariant-module suite exercises against real (not hand-built) end-state data, rather than skipping them
- **AND** clauses (a) and (c)'s guarantee that they actually fire against combat-derived repair tickets SHALL remain proven only by the dedicated invariant-module suite's synthetic before/after fixtures until a production change populates `unitMaxStates` from fast-forward combat

#### Scenario: Daily repair hours stay bounded

- **WHEN** any fast-forwarded day processes repairs
- **THEN** the total hours applied that day SHALL NOT exceed the daily repair-hours budget

#### Scenario: Repairs never exceed unit caps

- **WHEN** repair progress restores armor, structure, or ammo
- **THEN** no restored value SHALL exceed that unit's maximum-state cap

#### Scenario: Ticket processing is idempotent across re-runs

- **GIVEN** a day whose repair queue has already been built and processed
- **WHEN** the same outcome and queue state are processed again
- **THEN** no duplicate repair ticket SHALL be created and no completed ticket's parts SHALL be consumed again

### Requirement: Deterministic Reproducibility From the Campaign Seed

Every fast-forward battle's engine seed SHALL derive deterministically from the campaign's persisted RNG seed and the bridged scenario's stable identity — which embeds the scenario's generation date, contract, and force — never from the day the battle happens to be fought and never from wall-clock time, so a battle deferred to a later day resolves with the same seed; each battle SHALL be resolved by its own engine instance constructed from that seed. Two fast-forward runs of an identical fixture (same persisted seed, start date, options, and roster) for the same day count SHALL produce equal invariant-level end states: unit survival sets, per-unit armor and structure deltas, balance delta, transaction types and amounts, XP counters, scenario and contract statuses, and repair-ticket counts and kinds. Fields embedding wall-clock time (transaction identifiers, created/updated timestamps) are excluded from equality. No test SHALL pin a seed-to-outcome golden value: reproducibility is asserted as run-to-run equality within one build, never as expected literal outcomes for specific seeds.

#### Scenario: Run-twice equality on invariant-level state

- **GIVEN** an identical campaign fixture and day count
- **WHEN** two independent fast-forward runs complete (with full state resets between them)
- **THEN** their end states SHALL be equal on the enumerated invariant-level field set, with wall-clock-bearing fields excluded

#### Scenario: No wall-clock seed derivation

- **WHEN** the fast-forward module tree is inspected
- **THEN** no battle-seed derivation SHALL read wall-clock time
- **AND** absent-seed engine-construction fallbacks SHALL be unreachable from the fast-forward path

#### Scenario: Golden traces are banned

- **WHEN** any fast-forward determinism test is reviewed
- **THEN** it SHALL contain no expected literal roll sequence, winner, or outcome table for any specific seed

### Requirement: Live-Parity Acceptance on Seam Invariants

The fast-forward test surface SHALL include a live-parity acceptance suite that runs the identical fixture and derived seeds through both `fastForwardCampaign()` and a discrete-step live-equivalent loop — the same production primitives driven one player-paced step at a time (advance one day; materialize and fight each newly bridged scenario; advance to apply; repeat). The live-equivalent SHALL NOT import or reuse the fast-forward driver or the fast-forward combat runner: its day stepping, battle election, and fight-then-apply sequencing SHALL be independently hand-inlined against the production primitives, and its shared surface SHALL be limited to the campaign fixture builder, the in-process API router, the battle-seed derivation helper (seed identity is a precondition of the comparison), and the session damage invariant guard (`assertSessionInflictedDamage` — an independently unit-tested standing tripwire, not fast-forward orchestration; reusing it holds the live-equivalent's battles to the same guarantee a real player session gets, and a defect inside it fails both sides of the comparison identically, exactly like the other three shared items). This bounds what a green acceptance certifies: it proves the fast-forward orchestration — day batching, subscription liveness, drain timing, battle ordering — reproduces player-paced progression; a defect inside a shared primitive passes both sides identically and is covered by that primitive's own suites, never by this acceptance. Both sides SHALL advance exactly the same total number of in-fiction days, drain days included, and SHALL end on the same in-fiction date — daily cost transactions post per day, so any day-count mismatch is a guaranteed spurious balance divergence. The suite SHALL include at least one player-realistic ordering variation — at minimum a live-equivalent run that defers fighting a bridged scenario by one or more days within the same total day window — asserted equal on the seam invariant set; where a variation is proven non-equivalent for a documented production-semantics reason, the parity claim SHALL be narrowed to identical-ordering-only by an explicit delta to this requirement before implementation completes, never silently. Equality is asserted on the seam invariant set: unit survival set, per-unit armor and structure deltas, balance delta, transaction types and amounts, XP counters, scenario and contract statuses, and repair-ticket counts and kinds. The comparison SHALL be invariant-based, never golden traces or byte-identical state dumps. A divergence on any seam invariant SHALL fail the acceptance, and — per the 2026-07-09 council decision's recorded consequence (open risk 1) — while the acceptance is failing or unproven, scenario packs minted from fast-forward runs SHALL remain triage-only and SHALL NOT be promoted to CI gating.

#### Scenario: Parity holds between fast-forward and the discrete-step equivalent

- **GIVEN** an identical fixture and derived seeds
- **WHEN** the fast-forward run and the independently hand-inlined discrete-step live-equivalent run both complete after the same total in-fiction days, ending on the same in-fiction date
- **THEN** their end states SHALL be equal on the seam invariant set

#### Scenario: The live-equivalent does not reuse the code under test

- **WHEN** the live-parity suite is reviewed
- **THEN** the live-equivalent loop SHALL contain no import of the fast-forward driver or the fast-forward combat runner
- **AND** its shared surface SHALL be limited to the fixture builder, the in-process API router, the battle-seed derivation helper, and the session damage invariant guard

#### Scenario: A deferred-fight ordering variation stays on the invariant set

- **GIVEN** a live-equivalent run that fights a bridged scenario one or more days later than the fast-forward run, within the same total day window
- **WHEN** both runs complete
- **THEN** their end states SHALL be equal on the seam invariant set, or the identical-ordering-only narrowing SHALL exist as an explicit documented delta to this requirement

#### Scenario: Divergence carries the recorded consequence

- **WHEN** the parity acceptance fails on any seam invariant
- **THEN** the failure SHALL name the diverging field
- **AND** scenario packs minted from fast-forward runs SHALL remain triage-only until the acceptance is green again

### Requirement: Fast-Forward Complements, Never Replaces, the Seam Trust Anchors

Fast-forward coverage SHALL NOT be represented as covering the route-mount, recovery-rehydration, client-side materialization-handoff, or fresh-construction seams. The seam trust anchor journeys retain permanent authority over those seams, and no anchor, live journey, or CI check SHALL be removed, softened, or descoped on the basis of fast-forward coverage. Wiring fast-forward invariant suites into PR gates is out of this capability's scope.

#### Scenario: Anchors retain authority over the seams

- **WHEN** fast-forward coverage overlaps surface guarded by a seam trust anchor journey
- **THEN** the anchor SHALL remain in the suite with its assertions intact
- **AND** any proposal to substitute fast-forward coverage for an anchor SHALL be expressed as a delta to the anchors' owning requirement, never as a silent removal

## Notes

- Codifies the headless half of the 2026-07-09 council decision (`openspec/council-decisions/2026-07-09-ui-audit-testability-architecture.md`, Seam-First Ladder W3, Phase 3 update 4): headless coverage is dominant only for the seam-free subsystems (economy ledger, XP/skill math, maintenance progression); live route-mounted journeys keep seam authority.
- This capability owns the fast-forward orchestration and its invariants only. The scenario bridge, encounter materialization, launch, outcome-enqueue, and engine-derived outcome pilot attribution mechanics are owned by `campaign-combat-loop` (the attribution requirement is ADDED there by this change); engine determinism and headless batch execution are owned by `simulation-system`; XP/skill and finance math contracts are owned by their existing capabilities. This spec references those contracts and never restates them.
- Fast-forward runs are the minting substrate for scenario packs (council wave W4); the pack registry, loaders, and manifests are W4 scope.
