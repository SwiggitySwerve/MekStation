## Context

MekStation already has major-capability QC material in `docs/qc/` and `scripts/qc/`, plus domain-specific evidence surfaces such as simulation event logs, match logs, replay records, and OpenSpec validation commands. The missing layer is a repeatable journey runner that turns the most important player flows into parameterized command runs, records what happened, and makes failures searchable without depending on a human to inspect scattered console output.

The change touches three contract areas:

- `journey-qc`: new command and artifact contract for player journey validation.
- `logging-system`: additive structured diagnostics and coverage-map requirements over the existing logger API.
- `e2e-testing`: additive journey-level automation requirements over the current page/subsystem test contract.

This design intentionally keeps diagnostics separate from durable domain events. Event store records, simulation NDJSON, replay records, and match logs remain authoritative domain artifacts. Structured diagnostics are an operational lens over those flows.

## Goals / Non-Goals

**Goals:**

- Provide one repeatable command surface for character build, Mek build, 1v1 combat, 4v4 combat, contract campaign scenario, short campaign, and long campaign validation.
- Make every run produce a stable evidence bundle with a run plan, machine-readable result, structured diagnostic log, bug candidates, and human-readable report.
- Preserve deterministic reruns through explicit seeds, selected journey IDs, scenario parameters, run IDs, and evidence directories.
- Add structured diagnostic logging without breaking existing `logger.debug/info/warn/error` varargs callers.
- Create a logging coverage map that names important runtime paths and verifies that each path emits useful diagnostics.
- Keep standard-tier runs useful for local and PR validation while allowing extended tiers for longer campaigns.

**Non-Goals:**

- No external telemetry dependency, remote ingest service, hosted dashboard, or OpenTelemetry migration.
- No replacement for domain event storage, replay persistence, match logs, or simulation event logs.
- No assertion that unsupported gameplay mechanics are implemented; unsupported mechanics must remain explicit gap output.
- No browser-only requirement for campaign-length validation when a headless runner can prove the same state transitions.
- No new Zustand store unless implementation discovers a UI-specific state need; the runner should primarily orchestrate existing services, stores, and test helpers.

## Decisions

### Decision: Add a versioned journey catalog

The implementation will add `docs/qc/mekstation-journey-scenarios.json` as the source of truth for required journey definitions. Each scenario will declare its journey ID, tier, default mode, parameters, execution steps, expected terminal state, and evidence assertions.

Alternative considered: hard-code journey definitions in the runner. Rejected because future QC changes would be less reviewable and harder to diff against requirements.

Proposed core shape:

```ts
interface IJourneyScenarioCatalog {
  version: 1;
  journeys: IJourneyScenarioDefinition[];
}

interface IJourneyScenarioDefinition {
  id:
    | 'character-build'
    | 'mek-build'
    | 'combat-1v1'
    | 'combat-4v4'
    | 'contract-campaign'
    | 'campaign-short'
    | 'campaign-long';
  displayName: string;
  module: 'roster' | 'construction' | 'combat' | 'campaign';
  tiers: Array<'smoke' | 'standard' | 'extended'>;
  defaultMode: 'headless' | 'browser' | 'hybrid';
  parameters: Record<string, IJourneyParameterDefinition>;
  steps: IJourneyStepDefinition[];
  expectedTerminalState: string;
  evidenceAssertions: string[];
  knownLimitations?: string[];
}
```

### Decision: Add a QC validation graph beside the journey catalog

The implementation will add `docs/qc/mekstation-qc-validation-graph.json` as the on-demand mapping layer. The graph will connect top-level capabilities, main modules, submodules, journey scenarios, validation commands, evidence artifacts, structured diagnostic events, and known gaps.

Alternative considered: infer coverage only from package scripts and test names. Rejected because the user needs a durable map that can answer which command proves a section of the product.

```ts
interface IQcValidationGraph {
  version: 1;
  nodes: IQcValidationNode[];
  edges: IQcValidationEdge[];
}

interface IQcValidationNode {
  id: string;
  kind:
    | 'capability'
    | 'module'
    | 'submodule'
    | 'journey'
    | 'command'
    | 'evidence'
    | 'log-event'
    | 'known-gap';
  label: string;
  ownerPath?: string;
}

interface IQcValidationEdge {
  from: string;
  to: string;
  relation:
    | 'contains'
    | 'validated-by'
    | 'produces'
    | 'logs'
    | 'blocked-by'
    | 'documents-gap';
}
```

### Decision: Materialize a run plan before execution

The runner will resolve CLI flags, catalog defaults, generated inputs, seeds, and output paths into `run-plan.json` before executing steps. `--dry-run` will write the same run plan and skip execution.

Alternative considered: execute directly from CLI options. Rejected because it makes bug reports and reruns depend on transient command history.

```ts
interface IJourneyRunPlan {
  runId: string;
  createdAt: string;
  journeyIds: string[];
  tier: 'smoke' | 'standard' | 'extended';
  mode: 'headless' | 'browser' | 'hybrid';
  seed: number;
  runs: number;
  evidenceDir: string;
  resolvedParameters: Record<string, unknown>;
  steps: IJourneyRunStep[];
}
```

### Decision: Use local evidence bundles as the diagnostics contract

Each run will write to `.sisyphus/evidence/qc-journeys/<runId>/` and update `.sisyphus/evidence/qc-journeys/latest.json`. The bundle will contain:

- `run-plan.json`
- `result.json`
- `system.ndjson`
- `bugs.json`
- `report.md`
- `stdout/`
- `stderr/`
- `artifacts/`
- `generated/`

Alternative considered: only print a command summary. Rejected because the user asked for repeatable automated validation and bug lookup; durable local evidence is the practical handoff surface.

### Decision: Extend logger compatibility instead of replacing it

The existing logger remains valid for arbitrary varargs calls. Structured diagnostics will be additive through a typed helper and a test sink. The implementation can expose this as methods on the existing logger object or a small sibling helper, as long as legacy calls keep their current behavior.

```ts
interface IDiagnosticLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  event: string;
  message?: string;
  runId?: string;
  journeyId?: string;
  stepId?: string;
  requestId?: string;
  entityIds?: Record<string, string>;
  metadata?: Record<string, unknown>;
}
```

Alternative considered: replace all logger calls with structured-only calls. Rejected because the blast radius is too high for this slice and would obscure the journey QC implementation.

### Decision: Verify logging coverage from a map

The implementation will add `docs/qc/mekstation-logging-map.json`, with entries for important runtime paths and expected diagnostic events. A validator will fail when a required path is not mapped, when expected events are missing, or when tests do not exercise required logging behavior.

Initial required paths:

- character and pilot creation
- Mek construction and export
- encounter launch
- tactical action rejection
- combat simulation start and terminal state
- match log and replay persistence
- campaign contract resolution
- repair, salvage, and finance updates
- API payload rejection
- store and persistence recovery
- journey runner failure and bug extraction

Alternative considered: rely on code review to spot missing logs. Rejected because the user explicitly wants coverage that can be rerun on demand.

### Decision: Keep journey automation headless-first with browser hooks

The runner will support `headless`, `browser`, and `hybrid` modes. Standard validation should prefer headless service-level orchestration where it proves the same terminal state. Browser and hybrid runs are reserved for UI, UX, and interaction surfaces such as page errors, console errors, visible workflow completion, and screenshots/traces when applicable.

Alternative considered: force all journeys through Playwright. Rejected because long campaign runs can become slow and flaky without adding proportional confidence.

## QC Data Flow

```text
CLI flags
  -> journey catalog
  -> validation graph
  -> run-plan materializer
  -> journey executor
  -> services/stores/API routes/browser hooks
  -> structured diagnostics + domain artifacts
  -> bug extractor + log search
  -> result.json + report.md
```

The implementation should reuse existing services and Zustand stores rather than duplicating domain logic. UI-oriented journeys can drive existing routes through Playwright, while headless journeys can call established simulation, campaign, and construction APIs directly.

## Validation and Error Handling

- Catalog validation MUST fail fast on missing required journeys, unknown modes, malformed parameter definitions, or missing evidence assertions.
- Runner execution MUST keep per-step stdout/stderr and structured diagnostics even when a step fails.
- `--continue-on-error` MAY allow later journeys to run, but `result.json` MUST preserve each failed step and the final process exit code MUST reflect the configured severity gate.
- Known limitations MUST be attached to journey output as explicit gaps and MUST NOT hide failed assertions unless the specific assertion is declared non-gating in the catalog.
- Logs MUST avoid secrets, raw database dumps, or unbounded unit payloads.

## Migration Plan

1. Add the journey and logging-map catalogs with validators.
2. Add structured diagnostics while preserving current logger behavior and tests.
3. Add runner/report/search scripts and package scripts.
4. Add journey definitions and targeted unit tests for run-plan, catalog validation, bug extraction, and log filtering.
5. Add smoke-level execution tests for representative journeys, then expand to the seven standard journey commands.
6. Update docs and QC reports to point at the new command surface.

Rollback is straightforward because artifacts are additive. Remove the package scripts and generated catalogs, then revert logger additions if compatibility tests fail.

## Risks / Trade-offs

- [Risk] Journey runs become too slow for normal local validation -> Mitigation: keep `smoke`, `standard`, and `extended` tiers with explicit defaults.
- [Risk] Structured logs duplicate domain events -> Mitigation: logs reference domain artifact IDs and summary fields, while domain event stores remain authoritative.
- [Risk] Existing logger callers break -> Mitigation: preserve varargs passthrough tests before adding structured APIs.
- [Risk] Known limitations mask real regressions -> Mitigation: require gap IDs in catalog output and keep severity gates independent from limitation notes.
- [Risk] Browser mode introduces flakiness -> Mitigation: use headless service execution for state-heavy campaign runs and browser mode for UI assertions.

## Open Questions

- Which standard journey tier should become part of the default PR gate once runtime cost is measured?
- Should long campaign validation default to 6, 8, or 10 contracts in standard mode?
- Which current UI flows already have stable selectors suitable for browser-mode journey assertions?
