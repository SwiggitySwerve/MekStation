# flow-audit-routines Specification

## Purpose
Defines user-facing, agent-invocable audit routines that drive one named flow at a time through the real browser UI to a chosen checkpoint, capturing local evidence for iteration review. This is deliberately distinct from CI authority: flow-audit routines never gate a PR — that job stays with assertion-based unit/integration/e2e suites and the future headless invariant nets — flow audits exist so a human or agent can say "get me to this exact point in this flow" and inspect what's there.
## Requirements
### Requirement: Flow Registry
The system SHALL provide a typed flow registry enumerating named audit flows, where each flow declares a unique kebab-case id, a human-readable description, an ordered list of named checkpoints, the subsystem tag(s) it exercises (combat, navigation, economy, maintenance, personnel, experience), and the viewport presets it supports.

#### Scenario: Registry enumerates flows and checkpoints
- **WHEN** a user or agent runs the flow-audit runner with `--list`
- **THEN** the runner prints every registered flow id with its description, subsystem tags, and ordered checkpoint names, and exits 0 without launching a browser

#### Scenario: Duplicate or malformed flow ids are rejected
- **WHEN** the flow registry contains two flows with the same id or a flow with zero checkpoints
- **THEN** the runner fails loud at startup naming the offending flow id, rather than running a partial registry

### Requirement: Flow-Audit Runner Invocation
The system SHALL provide a single-command runner (`npm run qc:flow -- <flow-id>`) that drives the named flow through the real browser UI against the application server and records evidence at each checkpoint. The runner MUST reuse the existing walkthrough recorder and per-run catalog machinery rather than introducing a parallel evidence format.

#### Scenario: Named flow runs end to end
- **WHEN** an agent invokes `npm run qc:flow -- economy-contract-to-ledger`
- **THEN** the runner drives that flow's checkpoints in order in a real browser and writes a per-run evidence catalog for exactly that flow

#### Scenario: Unknown flow id fails loud
- **WHEN** the runner is invoked with a flow id not present in the registry
- **THEN** it exits non-zero, names the unknown id, and prints the list of valid flow ids

### Requirement: Checkpoint Evidence Capture
The runner SHALL capture, at every checkpoint reached: a full-page screenshot, the current route, buffered console errors and page errors attributed to that checkpoint, and wall-clock timing. Evidence SHALL land in a per-run directory containing a machine-readable manifest and a self-contained index.html contact sheet. Capture MUST be tolerant: a failing checkpoint is recorded as failed (with a failure screenshot) and the catalog for the partial run is still written.

#### Scenario: Checkpoint evidence recorded
- **WHEN** a flow run reaches a checkpoint
- **THEN** the per-run catalog contains that checkpoint's screenshot, route, console/page error buffer, and duration

#### Scenario: Partial catalog survives a mid-flow failure
- **WHEN** a checkpoint action throws mid-flow
- **THEN** the runner records the failure evidence for that checkpoint and still writes the manifest and index.html covering all checkpoints attempted

### Requirement: Until Semantics
The runner SHALL accept `--until <checkpoint>` to stop the flow immediately after the named checkpoint completes, leaving the application state as-is at that point and recording evidence only for the checkpoints executed.

#### Scenario: Flow stops at the requested checkpoint
- **WHEN** an agent invokes a flow with `--until contract-accepted`
- **THEN** the runner executes checkpoints up to and including `contract-accepted`, skips all later checkpoints, and the catalog marks the later checkpoints as not-run rather than failed

#### Scenario: Unknown checkpoint fails loud
- **WHEN** `--until` names a checkpoint not present in the selected flow
- **THEN** the runner exits non-zero before launching a browser and prints the flow's valid checkpoint names

### Requirement: Hold Mode for Local Inspection
The runner SHALL accept `--hold`, which targets an already-running development server, drives the flow to the stop point (the final checkpoint, or the `--until` checkpoint), and then leaves the created application state in place and prints the live URL(s) and created entity ids so a human or agent can open the application locally in exactly that state. In hold mode the runner MUST NOT tear down or delete the state it created.

#### Scenario: Hold leaves inspectable state
- **WHEN** an agent invokes a campaign flow with `--hold --until pre-battle-roster`
- **THEN** after the run completes, the campaign and encounter created by the flow still exist on the running dev server, and the runner has printed the direct URL to the pre-battle screen plus the campaign id

#### Scenario: Hold without a running server fails loud
- **WHEN** `--hold` is used and no development server is reachable on the expected port
- **THEN** the runner exits non-zero with a message telling the user to start the dev server first, rather than silently booting a throwaway server whose state would vanish

### Requirement: Viewport Selection
The runner SHALL accept `--viewport <preset|WxH>` selecting the browser viewport for the run, with named presets derived from the canonical layout breakpoints (mobile, tablet, desktop) and support for explicit `WxH` values. The default is the desktop preset. The selected viewport MUST be recorded in the run manifest and per-checkpoint metadata.

#### Scenario: Preset viewport applied
- **WHEN** a flow is invoked with `--viewport mobile`
- **THEN** the browser runs at the mobile preset dimensions with touch enabled and the manifest records that viewport

#### Scenario: Same flow at two viewports produces two catalogs
- **WHEN** the same flow id is run once with `--viewport desktop` and once with `--viewport mobile`
- **THEN** each run produces its own per-run catalog whose manifests record the respective viewports, enabling side-by-side local review

### Requirement: Machine-Readable Run Summary
The runner SHALL end every invocation by emitting a machine-readable summary (JSON to stdout or a well-known file path printed on stdout) containing: the catalog directory path, the flow id, per-checkpoint status (ok/failed/not-run), console/page error counts, the viewport used, and — in hold mode — the live URL(s) and created entity ids.

#### Scenario: Agent consumes the run summary
- **WHEN** an agent invokes a flow-audit routine programmatically
- **THEN** it can parse the emitted summary to locate the catalog, decide which checkpoint screenshots to review, and (in hold mode) navigate to the printed URL without scraping human-oriented log text

### Requirement: Subsystem Flow Coverage
The initial flow registry SHALL include at least one flow per gameplay subsystem: campaign creation→mission launch (campaign/navigation), battle turn loop (combat), contract acceptance→ledger posting (economy), repair cycle (maintenance), hiring (personnel), and pilot XP progression (experience).

#### Scenario: Every subsystem is reachable by a named flow
- **WHEN** the registry is enumerated with `--list`
- **THEN** each of the six subsystem tags appears on at least one registered flow

### Requirement: Flow Audits Are Evidence, Never CI Gates
Flow-audit routines SHALL NOT be wired as PR-blocking CI checks. Their output is review evidence for humans and agents iterating locally. Assertion-based suites (unit/integration/e2e assertions and, when they land, headless invariant nets) remain the source of permanent authority for CI. Flow audits MAY be scheduled into non-blocking nightly evidence lanes.

#### Scenario: PR gate unaffected by flow-audit outcomes
- **WHEN** a flow-audit run records failed checkpoints or console errors
- **THEN** no PR-blocking CI check changes state as a result; the evidence is surfaced for review only

