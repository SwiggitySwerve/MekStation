# journey-qc Delta Specification

## ADDED Requirements

### Requirement: Capture-Tolerant Walkthrough Steps

The UX walkthrough recorder SHALL provide a capture-tolerant step mode that records a step's screenshot, route, timing, and console/page errors even when the step's action or assertion fails, and MUST NOT rethrow the failure. A journey MUST be able to continue to subsequent steps after a capture-tolerant step records a failure, so a single broken screen does not abort the catalog of every screen after it. A capture-tolerant step that fails MUST mark its status as failed in the journey record so the failure remains visible in the run manifest and review artifacts.

#### Scenario: Soft step records failure and continues

- **GIVEN** a deep-play journey with a capture-tolerant step whose action throws
- **WHEN** the recorder executes that step
- **THEN** the step record SHALL capture a failure screenshot when one is obtainable, the failure message, and any console or page errors
- **AND** the recorder SHALL NOT rethrow, and the journey SHALL proceed to the next step

#### Scenario: Strict step still fails the journey

- **GIVEN** a journey step invoked in the existing strict (non-tolerant) mode whose action throws
- **WHEN** the recorder executes that step
- **THEN** the recorder SHALL record the failure evidence and SHALL rethrow so the strict step still fails the journey as before

### Requirement: Structured Journey Findings

The UX walkthrough recorder SHALL let a journey record structured findings, each with a stable finding id, a severity, a summary, and references to the step indices whose screenshots evidence the finding. Recorded findings MUST be written into the journey record and MUST be aggregated into the run manifest so a reviewer can map an observed blocker to the exact captured screenshots without reading the journey source.

#### Scenario: Finding maps a blocker to its evidence

- **WHEN** a deep-play journey observes a current blocker and records a finding referencing the steps that captured it
- **THEN** the journey record SHALL contain the finding with its id, severity, summary, and evidence step references
- **AND** the run manifest SHALL include that finding in an aggregated findings total

#### Scenario: A clean journey records no findings

- **WHEN** a deep-play journey completes without recording any finding
- **THEN** the journey record SHALL contain an empty findings collection
- **AND** the run manifest findings total for that journey SHALL be zero

### Requirement: Multi-Surface Journey Capture

The UX walkthrough recorder SHALL support capturing more than one browser page within a single journey record. The recorder MUST allow a journey to register additional named surfaces (for example a host client and a guest client), MUST buffer console and page errors per surface, and MUST let a step act on and screenshot a chosen surface. A multi-surface journey MUST produce one interleaved journey record whose step screenshots identify which surface each step captured.

#### Scenario: Two-client journey records both surfaces in one journey

- **GIVEN** a co-op journey with a registered host surface and guest surface
- **WHEN** the journey records host steps and guest steps
- **THEN** the single journey record SHALL contain the interleaved steps
- **AND** each step SHALL identify the surface it captured, and per-surface console/page errors SHALL attach to the steps taken on that surface

### Requirement: Per-Run REVIEW.md Skeleton

The UX walkthrough runner SHALL write a `REVIEW.md` skeleton into each per-run evidence directory alongside `manifest.json` and `index.html`. The skeleton MUST list every journey, its status, its steps, and its recorded findings, and MUST provide review placeholders for a human to complete. The skeleton MUST be generated after the journeys run so it reflects the run that just executed, including partial results when a journey did not finish cleanly.

#### Scenario: REVIEW.md skeleton reflects the run

- **WHEN** `npm run qc:ux-audit` completes a run
- **THEN** the per-run directory SHALL contain `REVIEW.md` listing each journey with its status, steps, and recorded findings
- **AND** each recorded finding SHALL appear in the skeleton with its id, severity, summary, and the screenshots that evidence it

#### Scenario: Skeleton is written even when a journey did not finish cleanly

- **WHEN** a deep-play journey records failures through capture-tolerant steps
- **THEN** the run SHALL still write `REVIEW.md` capturing that journey's partial steps and findings

### Requirement: Single-Player Campaign Deep-Play Journey

Journey QC SHALL include a capture-tolerant single-player campaign deep-play journey in the UX walkthrough audit. The journey SHALL create a campaign through the wizard, accept a contract, launch a mission, attempt manual battle control, walk the auto-resolve path, and sweep the campaign surfaces (missions, dashboard, finances, personnel, forces, mech bay, starmap) ending at Advance Day and a ledger check. The journey MUST record the current battle-handoff and manual-play blockers as findings and MUST NOT hard-assert outcomes that are currently broken.

#### Scenario: SP deep-play journey captures the manual-play attempt

- **WHEN** the single-player campaign deep-play journey reaches the battle surface and attempts unit selection and movement
- **THEN** the journey SHALL capture whatever state results, record a finding for any Initiative soft-lock or unhandled error it encounters, and continue to the auto-resolve path
- **AND** the journey SHALL NOT fail the run when the manual-play control is absent or errors

#### Scenario: SP deep-play journey sweeps campaign surfaces

- **WHEN** the single-player campaign deep-play journey runs after the mission attempt
- **THEN** the journey SHALL capture the missions, dashboard, finances, personnel, forces, mech bay, and starmap surfaces, and the Advance Day and ledger result
- **AND** a surface that crashes or errors SHALL be recorded as a finding rather than aborting the remaining sweep

### Requirement: Two-Client Multiplayer Deep-Play Journey

Journey QC SHALL include a capture-tolerant two-client deep-play journey in the UX walkthrough audit that uses two browser contexts as separate clients. The journey SHALL provision two vault identities, drive a co-op campaign create-and-join flow and the `/multiplayer` 1v1 create-and-join lobby flow, and capture the join outcome and lobby state on both clients. The journey MUST record the connection or handshake outcome as a finding and MUST NOT hard-assert a successful networked session, so it captures either the connected flow or a current failure.

#### Scenario: Co-op journey captures host and guest join outcome

- **WHEN** the two-client journey creates a co-op campaign on the host client and joins with the room code on the guest client
- **THEN** the journey SHALL capture the host room code and the guest join outcome on both surfaces
- **AND** the journey SHALL record a finding describing the resulting connection state instead of failing the run

#### Scenario: Connected guest sees a read-only GM ledger

- **GIVEN** the two-client co-op journey where the guest client successfully joined the shared campaign
- **WHEN** the guest navigates directly to the campaign GM ledger route (`/gameplay/campaigns/<id>/gm-ledger`)
- **THEN** the journey SHALL capture the guest's ledger view and record a finding for whether it is read-only: public summaries present, no approve or preview controls, no GM-private fields, surviving a reload
- **AND** this guest-ledger check SHALL be guarded on join success and SHALL be skipped (not failed) when the guest did not connect

#### Scenario: 1v1 lobby journey captures both clients

- **WHEN** the two-client journey mints a token and creates a `/multiplayer` match on the host and joins it on the guest
- **THEN** the journey SHALL capture the lobby state on both clients
- **AND** the journey SHALL record a finding when either client does not reach an occupied-seat lobby state

### Requirement: GM Surfaces Deep-Play Journey

Journey QC SHALL include a capture-tolerant GM surfaces deep-play journey in the UX walkthrough audit. The journey SHALL exercise the campaign GM ledger (generate a correction, approve the cascade, and capture the Player Action Log versus GM Ledger redaction split, including a conflict variant that blocks approval, and including a time-cascade correction whose preview is captured expanded to show the per-projected-day ordered summaries) and the `?gm=1` battle GM dock (Advance Phase preview, approve, and capture whether the engine phase actually changes). The journey SHALL record the engine phase before and after a GM tactical approval, SHALL document that GM mode is entered by the `?gm=1` / `?mode=gm` query param (no UI toggle exists), MUST record whether each GM intervention commits to engine or campaign state as a finding, and MUST NOT hard-assert commit behavior that is currently display-only.

#### Scenario: GM ledger journey captures the redaction split

- **WHEN** the GM surfaces journey generates a ledger correction and approves the cascade
- **THEN** the journey SHALL capture the approved result and the Player Action Log versus GM Ledger redaction split
- **AND** the conflict variant SHALL capture the blocked-approval state as evidence

#### Scenario: Time-cascade preview captures per-day summaries

- **WHEN** the GM surfaces journey generates a time-advance correction
- **THEN** the journey SHALL capture the correction preview expanded so the per-projected-day ordered summaries (one summary per projected day plus changed-state references) are visible in the screenshot

#### Scenario: GM battle dock journey records engine phase before and after

- **WHEN** the GM surfaces journey opens the battle with the `?gm=1` param, records the engine phase, previews Advance Phase, and approves it
- **THEN** the journey SHALL capture the surface state and record the engine phase before and after approval
- **AND** the journey SHALL record a finding stating whether the engine phase actually changed versus only the turn-rail display, and SHALL document the query-param entry it used
- **AND** the journey SHALL NOT fail the run when the GM intervention is display-only

### Requirement: Deep-Play Journey Selection

The UX walkthrough audit SHALL keep `qc:ux-audit` as the umbrella command that runs both the shell journeys and the deep-play journeys, and SHALL provide a way to run only the deep-play journeys and to select a single journey. The umbrella command MUST continue to produce one aggregated per-run catalog covering every journey it ran.

#### Scenario: Umbrella runs shell and deep-play journeys

- **WHEN** the user runs `npm run qc:ux-audit`
- **THEN** the run SHALL execute both the shell walkthrough journeys and the deep-play journeys
- **AND** the aggregated manifest and REVIEW.md SHALL cover every journey that ran

#### Scenario: Deep-play journeys run in isolation

- **WHEN** the user runs the deep-play-only command
- **THEN** the run SHALL execute only the deep-play journeys and still write a complete per-run catalog and REVIEW.md
