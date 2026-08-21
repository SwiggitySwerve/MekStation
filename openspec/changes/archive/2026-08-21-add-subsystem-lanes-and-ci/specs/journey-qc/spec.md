# journey-qc Delta — add-subsystem-lanes-and-ci

## ADDED Requirements

### Requirement: Seam Anchor Pull-Request Gate

Pull-request CI SHALL execute all three seam trust anchor journeys (per the "Seam Trust Anchor Journeys" requirement) on every code-touching pull request, as a dedicated workflow job that runs the three anchor specs in a **single** Playwright invocation under the desktop chromium project — one shared webServer boot, never one invocation per spec — with test retries explicitly disabled in the invocation, overriding any CI-default retry configuration, so an anchor that fails on first attempt can never retry to green inside the gate; and that mirrors the existing smoke job's change-detection guards so documentation-only pull requests no-op with the check reporting success. The job SHALL become pull-request-blocking exclusively through membership in the existing required aggregator check's `needs` set — the same mechanism the e2e-testing "PR-Gated Coverage Floor" requirement contracts — and because a dependent job whose `needs` entry fails is skipped by default while a skipped required check reports as passing, the aggregator SHALL be hardened, without changing its job id, check-run name, or `needs` shape, to run unconditionally and fail explicitly unless every member of its `needs` set concluded success: a failed or skipped fan-out job SHALL produce a failed aggregator check, never a skipped one. The change wiring the gate SHALL NOT rename or repurpose any existing workflow job or check-run name and SHALL NOT modify the branch-protection required-context list: designating any check as independently required is a manual repository-settings action performed by a human administrator, never a repository file change, and any future proposal to so designate this job SHALL name that manual step and its rollback explicitly. The job SHALL land as a non-blocking sibling first and join the aggregator's `needs` set only after recorded burn-in evidence — at least three green runs on real code-touching pull requests with the job's wall-clock recorded against the change's published budget, where green means first-attempt green: a run whose report records a retried or flaky result is a burn-in failure; an anchor that fails or flakes during burn-in SHALL block the gate wiring and be triaged as an anchor stability defect under the anchors' own stability obligations, never retried away or sliced out of the gate. The wired gate's blocking authority SHALL be proven red-path before it is trusted: recorded evidence of a deliberately failed anchor on a never-merged pull request showing the anchor job concluding failure, the aggregator check concluding failure rather than skipped, and the pull request reporting un-mergeable at that commit; if the exercise shows the pull request mergeable, the `needs` wiring SHALL be reverted and the gate treated as undelivered. The headless invariant jest suites guarding the same seams SHALL remain unconditionally scheduled in the pull-request unit-test lane: they SHALL NOT be added to any conditional exclusion pattern, and the gate SHALL NOT duplicate their execution in the anchor job.

#### Scenario: An anchor failure blocks the pull request

- **GIVEN** the seam-anchor job is a member of the hardened required aggregator's `needs` set
- **WHEN** any of the three anchor specs fails on a code-touching pull request
- **THEN** the seam-anchor job SHALL fail on that first attempt, with retries disabled
- **AND** the aggregator's required check SHALL run and conclude failure — never skipped — so the pull request cannot merge

#### Scenario: A failed fan-out job cannot skip the aggregator to green

- **GIVEN** the hardened required aggregator
- **WHEN** any member of its `needs` set fails or is skipped
- **THEN** the aggregator job SHALL still run
- **AND** its check SHALL conclude failure, naming the non-successful dependency

#### Scenario: A flaky anchor cannot retry to green

- **GIVEN** a CI Playwright configuration whose default enables retries on CI runners
- **WHEN** the seam-anchor job invokes the anchor specs
- **THEN** the invocation SHALL explicitly disable retries
- **AND** a burn-in run whose report records a retried or flaky result SHALL be treated as a failed burn-in that blocks the gate wiring

#### Scenario: Blocking authority is proven red-path, never assumed

- **WHEN** the gate wiring is delivered
- **THEN** recorded evidence SHALL exist of a deliberately failed anchor on a never-merged pull request, showing the aggregator check concluded failure and the merge state blocked at that commit
- **AND** if that exercise shows the pull request mergeable, the `needs` wiring SHALL be reverted and the gate reported undelivered

#### Scenario: Existing check names and branch protection are untouched

- **WHEN** the seam-anchor gate change is diffed against the prior workflow
- **THEN** every pre-existing check-run name SHALL be unchanged, with the new job's name appearing as a pure addition
- **AND** the branch-protection required-context list SHALL be identical before and after

#### Scenario: Documentation-only pull requests are not taxed

- **GIVEN** a pull request touching only documentation or OpenSpec files
- **WHEN** the seam-anchor job runs
- **THEN** its work steps SHALL no-op under the change-detection guard within seconds
- **AND** the job SHALL still report success so the aggregator's `needs` chain stays green

#### Scenario: Burn-in precedes blocking

- **WHEN** the seam-anchor job is first added to the pull-request workflow
- **THEN** it SHALL NOT yet be a member of the aggregator's `needs` set
- **AND** the `needs` membership SHALL land only with recorded evidence of at least three green runs on real code-touching pull requests and the measured job wall-clock

#### Scenario: The headless invariants cannot be silently excluded

- **WHEN** the pull-request unit-test lane's configuration is validated
- **THEN** the seam-guarding invariant jest suites SHALL be scheduled unconditionally in that lane
- **AND** adding them to a conditional exclusion pattern SHALL require a delta to this requirement

## MODIFIED Requirements

### Requirement: Required Journey Scenario Catalog

The system SHALL define a versioned journey scenario catalog for the required player journeys: `character-build`, `mek-build`, `combat-1v1`, `combat-4v4`, `contract-campaign`, `campaign-short`, and `campaign-long`. Each scenario entry MUST declare its supported tiers, execution mode, configurable parameters, required steps, expected terminal state, evidence assertions, and explicit known limitation references when applicable. Each scenario entry MUST also declare a `subsystems` facet: an array of gameplay-subsystem tags drawn from the closed six-tag vocabulary shared with the flow-audit registry (`navigation`, `combat`, `economy`, `maintenance`, `personnel`, `experience` — the same literal set; a guard test SHALL assert the catalog validator's allowed set and the flow registry's subsystem vocabulary are identical), with no duplicate members. The facet MAY be an explicitly authored empty array only for a journey whose surface lies outside the gameplay-subsystem taxonomy (construction journeys); the catalog validator SHALL reject a missing `subsystems` field, an unknown tag, or a duplicated tag, naming the journey id and the offending value. The catalog is the facet's single home: downstream surfaces (graph queries, lane tooling) SHALL resolve a journey's subsystems by joining the catalog, never by duplicating the facet into another registry.

#### Scenario: Catalog contains all required journeys
- **WHEN** the journey catalog validator runs
- **THEN** it confirms that all seven required journey IDs are present exactly once

#### Scenario: Catalog exposes BattleMech construction parameters
- **WHEN** the `mek-build` journey is validated
- **THEN** the scenario exposes era, unitTechBase, chassis, variant, weight class, and equipment-selection parameters needed to generate a repeatable BattleMech construction flow

#### Scenario: Subsystem facet is validated against the closed vocabulary
- **WHEN** the journey catalog validator runs against an entry whose `subsystems` field is missing, contains a tag outside the six-tag vocabulary, or contains a duplicate tag
- **THEN** validation fails naming the journey id and the offending value

#### Scenario: Facet vocabulary stays aligned with the flow registry
- **WHEN** the vocabulary guard test runs
- **THEN** it SHALL assert the catalog validator's allowed subsystem set equals the flow-audit registry's subsystem literal set
- **AND** a divergence in either direction SHALL fail the guard

### Requirement: QC Graph Query Command

The system SHALL provide a local command that queries the QC validation graph by capability, module, submodule, journey, command, known gap, or subsystem. Query output MUST include matched graph nodes, related validation commands, evidence artifacts, logging events, and gap references. A subsystem query MUST accept one tag from the closed six-tag gameplay-subsystem vocabulary, MUST resolve the matching journeys by joining the journey catalog's `subsystems` facet at query time (the validation graph data file carries no duplicate subsystem field), and MUST fail naming the six allowed tags when given an unknown tag.

#### Scenario: Query Mek build validation
- **WHEN** the user queries the QC validation graph for `mek-build`
- **THEN** the command returns the Mek build journey, related construction modules, runnable validation command, produced evidence, and logging events

#### Scenario: Query journeys by subsystem
- **WHEN** the user queries the QC validation graph with a subsystem tag (for example `economy`)
- **THEN** the command returns every journey whose catalog `subsystems` facet carries that tag, with each journey's graph nodes, validation commands, and evidence artifacts

#### Scenario: Unknown subsystem tag is rejected
- **WHEN** the user queries with a subsystem value outside the six-tag vocabulary
- **THEN** the command fails before querying
- **AND** the failure message names the six allowed tags
