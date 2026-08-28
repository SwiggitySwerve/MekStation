# e2e-testing Delta — add-subsystem-lanes-and-ci

## ADDED Requirements

### Requirement: Subsystem Tag Taxonomy

E2E specs that exercise a gameplay subsystem SHALL be selectable by subsystem through Playwright's native tag mechanism: `test.describe(title, { tag: [...] })` with namespaced tag literals of the form `@subsystem:<tag>`, where `<tag>` is drawn from the closed six-tag gameplay-subsystem vocabulary shared with the flow-audit registry (`navigation`, `combat`, `economy`, `maintenance`, `personnel`, `experience`). The namespace prefix is mandatory so subsystem selection never collides with the legacy categorization title tags (`@smoke`, `@campaign`, `@combat`, …) documented in the Playwright configuration. Documentation-comment "tags" — tag-like strings appearing only in a spec's JSDoc or comments — are not a selection mechanism (Playwright's grep matches titles and native tags only) and SHALL NOT be introduced as one: a spec claiming a subsystem SHALL carry the native tag. Subsystem tags are invocation-scoped selection only: no Playwright project SHALL select by a `@subsystem:` tag, so carrying one never changes a spec's project scheduling. The seam trust anchor journeys SHALL NOT carry subsystem tags (they have their own pull-request gate and a chromium-only scheduling contract that bans double-scheduling tags). Scenario-pack parity specs, once the pack registry exists, SHALL carry exactly the subsystem tags their manifest entry declares, with a guard test asserting the equality.

#### Scenario: A subsystem slice is selectable by grep

- **WHEN** an operator runs `npx playwright test --grep "@subsystem:economy" --project=chromium`
- **THEN** exactly the specs whose native tags include `@subsystem:economy` SHALL be scheduled
- **AND** legacy title tags such as `@combat` SHALL NOT match a `@subsystem:` selection

#### Scenario: A docblock tag is not coverage

- **GIVEN** a spec whose JSDoc comment claims a tag that appears in no test title and no native tag option
- **WHEN** the suite is filtered by that tag
- **THEN** the spec SHALL NOT be selected
- **AND** the subsystem coverage ledger SHALL NOT count that spec as tagged for lane purposes

#### Scenario: No project selects by subsystem tag

- **WHEN** the Playwright project configuration is inspected
- **THEN** no project's grep SHALL match any `@subsystem:` literal
- **AND** a tagged spec's scheduled project set SHALL be identical to the same spec untagged

#### Scenario: Pack parity spec tags mirror the manifest

- **GIVEN** the scenario-pack registry exists with parity specs
- **WHEN** the tag guard runs
- **THEN** each parity spec's `@subsystem:` tags SHALL equal its manifest entry's declared subsystems
- **AND** a mismatch SHALL fail the guard naming the pack

### Requirement: Nightly Subsystem Audit Lanes

The nightly validation workflow SHALL include per-subsystem sliced audit lanes: a matrixed job producing one named check run per tenant subsystem tag, each leg executing the tagged slice via a subsystem-tag grep under the desktop chromium project, with fail-fast disabled so one red lane never cancels the others. The lane list SHALL equal exactly the set of subsystem tags that have at least one tagged covering spec (an empty grep is a hard Playwright error, so a lane for an untenanted tag is forbidden until a tenant exists), and a validator running in the pull-request unit lane SHALL cross-check the workflow's lane list against the subsystem coverage ledger's tag tenancy in both directions. Lane failures SHALL surface through the nightly workflow's existing failure-notification job. Lanes are triage granularity, never gates: no lane SHALL be wired into pull-request checks, the full chromium suite remains the nightly run's authoritative sweep, and the lanes' duplicate execution of tagged specs already covered by the full sweep is an accepted, bounded cost of per-subsystem signal.

#### Scenario: A red lane localizes a subsystem regression

- **GIVEN** a nightly run where an economy-tagged spec fails
- **WHEN** the lanes complete
- **THEN** the economy lane's check run SHALL be red while unaffected lanes report green
- **AND** the existing failure-notification job SHALL fire for the run

#### Scenario: Lane list and ledger tenancy stay locked

- **GIVEN** a subsystem tag gaining its first tagged covering spec, or a lane whose tag no longer has any tagged spec
- **WHEN** the lane-tenancy validator runs in the pull-request unit lane
- **THEN** it SHALL fail naming the tag whose lane is missing or orphaned

#### Scenario: Lanes never gate pull requests

- **WHEN** pull-request CI configuration is reviewed
- **THEN** no subsystem lane SHALL appear in any pull-request workflow or required aggregator's `needs` set
- **AND** promoting a lane into pull-request gating SHALL require a delta to this requirement

## MODIFIED Requirements

### Requirement: Subsystem Validation Coverage

The system SHALL ensure that every shipped MekHQ-equivalent campaign subsystem has end-to-end test coverage validating its primary user-observable behavior — not merely that its page mounts without console errors — or an explicit, machine-visible deferral. Coverage accounting SHALL live in a checked-in subsystem coverage ledger (`docs/qc/mekstation-subsystem-coverage.json`) with one row per fine-grained subsystem across the full 19-subsystem set shipped in Wave 4 + Wave 6.1 (hiring, XP/leveling, medical, salvage, repair, refit, loans, contract market, contract negotiation, faction reputation, random events, morale, force hierarchy, turnover, aging, awards, rank+pay, unit market, maintenance). Each row SHALL declare the subsystem id, its facet tag from the closed six-tag gameplay-subsystem vocabulary, its covering spec paths, and its coverage status — `asserting` (the spec drives the primary action or seeded output and asserts observable state change), `render-only` (the spec proves the surface mounts and renders its primary output testids), or `deferred` (no spec yet, with a mandatory follow-up reference naming the deferral's provenance). A ledger validator SHALL run in the pull-request unit-test lane and SHALL fail on: a missing or unknown subsystem row against the 19-id set, an invalid facet tag or status, a covering-spec path that does not exist, a non-deferred row whose named spec lacks the row's `@subsystem:` tag, or a `deferred` row without a follow-up reference. Demoting a row's status SHALL require the change to name the regression it grandfathers.

The write-capable subsystems' assertion bar is unchanged: a validation spec for a write-capable subsystem SHALL drive the primary action via testid-targeted interaction and assert at minimum (a) the action's UI feedback, (b) the action's store-state mutation read through the development-mode exposed store surface (`window.__ZUSTAND_STORES__` via the shared `e2e/helpers/store.ts` readers), and (c) any cross-subsystem propagation (for example hiring debits the ledger). The hiring, loans, contract market, and XP/ability-purchase subsystems SHALL each have an `asserting`-status validation spec meeting this bar. A validation spec SHALL NOT use a conditional `test.skip`-on-missing-data guard in place of seeding: any spec that depends on fixture data MUST seed that data (through the shared seeding helpers or another front-door mechanism) so its assertions execute unconditionally in a clean CI database, rather than vacuously passing when the data is absent. Read-only subsystems' specs SHALL seed the relevant state and assert the surface renders the seeded values, testids, and counts. Each covered subsystem's UI surface SHALL expose `data-testid` attributes on its primary action element, primary output element, and a root element identifying the surface, following the `{subsystem-noun}-{role}` naming convention, and validation specs SHALL select against these testids rather than text content. The historical markdown audit matrix (`playtest/phase-6/SUBSYSTEM_UI_AUDIT.md`) is a dated snapshot, not the living coverage source: it SHALL carry a header note naming the ledger as canonical, and coverage claims SHALL be answered from the ledger.

**Priority**: High

#### Scenario: The ledger accounts for every shipped subsystem

- **WHEN** the subsystem coverage ledger validator runs
- **THEN** it SHALL confirm exactly one row per subsystem across the full 19-id set, each with a valid facet tag, status, and — where non-deferred — existing, tagged covering specs
- **AND** a missing row, dangling spec path, untagged covering spec, invalid status, or reference-less deferral SHALL fail the validator naming the row

#### Scenario: The ledger validator runs in the blocking PR lane

- **GIVEN** a pull request that breaks a ledger invariant
- **WHEN** the pull-request unit-test lane runs
- **THEN** the ledger validator's jest wrapper SHALL fail the lane
- **AND** coverage-accounting drift SHALL therefore be caught per-PR, not discovered stale months later

#### Scenario: Write-capable subsystems exercise the primary action

- **GIVEN** a write-capable subsystem with an `asserting`-status row (hiring, loans, contract market, XP/ability purchase)
- **WHEN** its validation spec runs
- **THEN** the spec SHALL drive the primary action via testid-targeted interaction
- **AND** assert the action's UI feedback, its store-state mutation read through the exposed store surface, and its cross-subsystem propagation (for example: a hire adds exactly one roster entry and debits the ledger by the hire cost; a loan renders its row, credits the balance by exactly the principal, and posts a loan-disbursement transaction; an ability purchase renders the owned ability and decrements the pilot's XP by exactly the ability's cost)

#### Scenario: Deferral is visible, never fictional

- **GIVEN** a shipped subsystem with no covering spec
- **WHEN** its ledger row is inspected
- **THEN** the row SHALL carry `deferred` status with a follow-up reference naming the deferral's provenance
- **AND** the ledger SHALL NOT claim a spec count or CI gate that does not exist

#### Scenario: Conditional skip-on-missing-data is forbidden in place of seeding

- **GIVEN** a validation spec whose assertions require fixture data
- **WHEN** the spec runs in a clean CI database with no pre-existing data
- **THEN** the spec SHALL seed the required fixture before navigating, so the data-dependent assertions always execute
- **AND** the spec SHALL NOT contain a `test.skip(<dataCount> === 0, ...)` guard that lets it pass without exercising the behavior it names

#### Scenario: Status demotion names what it grandfathers

- **GIVEN** a change that demotes a ledger row from `asserting` to `render-only` or `deferred`
- **WHEN** the change is reviewed
- **THEN** it SHALL name the regression or removal the demotion grandfathers
- **AND** a silent demotion SHALL be treated as a coverage regression
