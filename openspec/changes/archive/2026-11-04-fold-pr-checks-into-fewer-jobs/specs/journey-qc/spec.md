## MODIFIED Requirements

### Requirement: Seam Anchor Pull-Request Gate

Pull-request CI SHALL execute all three seam trust anchor journeys (per the "Seam Trust Anchor Journeys" requirement) on every code-touching pull request, in the e2e-testing browser-gate job (`e2e`, per the e2e-testing "PR-Gated Customizer Browser Regressions" requirement): each shard of that job's fixed matrix runs its slice of the three anchor specs, together with the customizer gate specs, in a **single** Playwright invocation under the desktop chromium project against the E2E-mode production build that shard makes — one webServer boot per shard, never one invocation per spec — so the shards together run every anchor exactly once, with test retries explicitly disabled in the invocation, overriding any CI-default retry configuration, so an anchor that fails on first attempt can never retry to green inside the gate; and that job uses the same change-detection guards as the smoke suites so documentation-only pull requests no-op with the check reporting success. The job SHALL become pull-request-blocking exclusively through membership in the existing required aggregator check's `needs` set — the same mechanism the e2e-testing "PR-Gated Coverage Floor" requirement contracts — and because a dependent job whose `needs` entry fails is skipped by default while a skipped required check reports as passing, the aggregator SHALL be hardened, without changing its job id or check-run name, to run unconditionally and fail explicitly unless every member of its `needs` set concluded success or was gated off: a member MAY conclude skipped only when it carries a job-level condition on `detect-changes` gates, the aggregator names those gates for it, and every one of them was off for the run; a failed or cancelled fan-out job, or any other skip, SHALL produce a failed aggregator check, never a skipped one. Every pull-request run SHALL end with a reported aggregator conclusion: if a run finishes without creating the aggregator job, a guard workflow SHALL report the required check as failed on the run's head commit, so a missing report can never look mergeable. A change that wires or relocates the gate SHALL NOT rename or repurpose the required aggregator's job id or check-run name and SHALL NOT modify the branch-protection required-context list: designating any check as independently required is a manual repository-settings action performed by a human administrator, never a repository file change, and any future proposal to so designate this job SHALL name that manual step and its rollback explicitly. The gate SHALL first have landed as a non-blocking sibling and joined the aggregator's `needs` set only after recorded burn-in evidence — at least three green runs on real code-touching pull requests with the job's wall-clock recorded against the change's published budget, where green means first-attempt green: a run whose report records a retried or flaky result is a burn-in failure; an anchor that fails or flakes during burn-in SHALL block the gate wiring and be triaged as an anchor stability defect under the anchors' own stability obligations, never retried away or sliced out of the gate. A change that relocates the already-wired gate into another job SHALL keep it blocking throughout, and SHALL record on the relocating pull request at least three first-attempt-green runs of the new job with its wall-clock, plus the red-path proof below. The wired gate's blocking authority SHALL be proven red-path before it is trusted: recorded evidence of a deliberately failed anchor on a never-merged pull request showing the anchor job concluding failure, the aggregator check concluding failure rather than skipped, and the pull request reporting un-mergeable at that commit; if the exercise shows the pull request mergeable, the `needs` wiring SHALL be reverted and the gate treated as undelivered. The headless invariant jest suites guarding the same seams SHALL remain unconditionally scheduled in the pull-request unit-test lane: they SHALL NOT be added to any conditional exclusion pattern, and the gate SHALL NOT duplicate their execution in the anchor job.

#### Scenario: An anchor failure blocks the pull request

- **GIVEN** the `e2e` job is a member of the hardened required aggregator's `needs` set
- **WHEN** any of the three anchor specs fails on a code-touching pull request
- **THEN** the `e2e` shard that runs it SHALL fail on that first attempt, with retries disabled
- **AND** the aggregator's required check SHALL run and conclude failure — never skipped — so the pull request cannot merge

#### Scenario: A failed fan-out job cannot skip the aggregator to green

- **GIVEN** the hardened required aggregator
- **WHEN** any member of its `needs` set fails, is cancelled, or is skipped while a gate the aggregator names for it was on (or it has no named gates)
- **THEN** the aggregator job SHALL still run
- **AND** its check SHALL conclude failure, naming the non-successful dependency

#### Scenario: A run that never creates the aggregator still reports failure

- **GIVEN** a pull-request checks run that finishes without an aggregator job
- **WHEN** the guard workflow inspects the finished run
- **THEN** it SHALL report the required check as failed on the run's head commit
- **AND** a later run that creates the aggregator SHALL report a newer conclusion over it

#### Scenario: A gated-off job does not block the aggregator

- **GIVEN** a `needs` member whose job-level condition tests `detect-changes` gates, with those gates named for it in the aggregator
- **WHEN** every one of those gates is off for the run and the member concludes skipped
- **THEN** the aggregator SHALL treat that member as passing
- **AND** if `detect-changes` itself did not succeed, no skip SHALL be treated as passing

#### Scenario: A flaky anchor cannot retry to green

- **GIVEN** a CI Playwright configuration whose default enables retries on CI runners
- **WHEN** the `e2e` job invokes the anchor specs
- **THEN** the invocation SHALL explicitly disable retries
- **AND** a burn-in run whose report records a retried or flaky result SHALL be treated as a failed burn-in that blocks the gate wiring

#### Scenario: Blocking authority is proven red-path, never assumed

- **WHEN** the gate wiring is delivered or relocated
- **THEN** recorded evidence SHALL exist of a deliberately failed anchor on a never-merged pull request, showing the aggregator check concluded failure and the merge state blocked at that commit
- **AND** if that exercise shows the pull request mergeable, the `needs` wiring SHALL be reverted and the gate reported undelivered

#### Scenario: Existing check names and branch protection are untouched

- **WHEN** a change that wires or relocates the seam-anchor gate is diffed against the prior workflow
- **THEN** the required aggregator's job id and check-run name SHALL be unchanged
- **AND** the branch-protection required-context list SHALL be identical before and after

#### Scenario: Documentation-only pull requests are not taxed

- **GIVEN** a pull request touching only documentation or OpenSpec files
- **WHEN** the `e2e` job runs
- **THEN** its work steps SHALL no-op under the change-detection guard within seconds
- **AND** the job SHALL still report success so the aggregator's `needs` chain stays green

#### Scenario: Burn-in precedes blocking

- **WHEN** the seam-anchor gate is first added to the pull-request workflow
- **THEN** it SHALL NOT yet be a member of the aggregator's `needs` set
- **AND** the `needs` membership SHALL land only with recorded evidence of at least three green runs on real code-touching pull requests and the measured job wall-clock

#### Scenario: A relocated gate stays blocking with fresh burn-in evidence

- **GIVEN** the seam-anchor gate is already a member of the aggregator's `needs` set
- **WHEN** a change moves its invocation into another job
- **THEN** the new job SHALL be a member of the aggregator's `needs` set in that same change, so the anchors never run non-blocking
- **AND** that change's pull request SHALL record at least three first-attempt-green runs of the new job with its wall-clock, plus the red-path proof

#### Scenario: The headless invariants cannot be silently excluded

- **WHEN** the pull-request unit-test lane's configuration is validated
- **THEN** the seam-guarding invariant jest suites SHALL be scheduled unconditionally in that lane
- **AND** adding them to a conditional exclusion pattern SHALL require a delta to this requirement
