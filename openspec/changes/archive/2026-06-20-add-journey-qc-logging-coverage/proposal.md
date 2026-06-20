## Why

MekStation has broad quality checks for major capability areas, but the core player journeys are not yet packaged as repeatable, configurable, single-command validation runs. When those runs fail, diagnostics are split across console output, event logs, replay artifacts, and ad hoc test output, which makes bugs harder to reproduce, search, and triage.

## What Changes

- Add journey-level QC orchestration for character build, Mek build, 1v1 combat, 4v4 combat, contract campaign scenario, short campaign, and long campaign flows.
- Add a QC validation graph and query command that map top-level capabilities, main modules, submodules, journey scenarios, validation commands, evidence artifacts, and logging events for on-demand future checks.
- Add a journey scenario catalog, run-plan materialization, repeatable command wrappers, evidence bundles, and latest-run pointers.
- Add bug candidate extraction and log-search commands so failures can be grouped by journey, run id, severity, fingerprint, and affected module.
- Extend the logging system with structured diagnostic entries, run correlation fields, test capture support, and a coverage map for important runtime paths.
- Extend automated testing requirements so journey commands validate that generated sequences are actually carried out and produce actionable evidence.
- Preserve domain event logs, match logs, replay files, and the event store as their own domain records; diagnostic logging complements them instead of replacing them.

## Capabilities

### New Capabilities
- `journey-qc`: Defines the scenario catalog, command surface, evidence bundle, bug reporting, and repeatability rules for end-to-end player journey validation.

### Modified Capabilities
- `logging-system`: Adds structured diagnostics, correlation context, test sinks, and logging coverage requirements while preserving the existing logger API.
- `e2e-testing`: Adds journey-level command coverage requirements that complement page and subsystem E2E tests.

## Non-goals

- No external telemetry provider, hosted observability stack, or OpenTelemetry migration is introduced by this change.
- No Jira, Outline, or Open Brain workflow is added; MekStation evidence remains local to the repo and `.sisyphus` artifacts.
- No gameplay mechanics are silently implemented or reclassified; unsupported mechanics remain explicit gaps in journey output.
- No replacement of durable domain event logs, replay records, or simulation event persistence.
- No requirement that long campaign validation run only through a browser UI path; headless-first validation remains acceptable when evidence is equivalent.

## Impact

- Specs affected: new `journey-qc`; modified `logging-system` and `e2e-testing`.
- Documentation and catalogs: `docs/qc/` journey catalog, validation graph, logging map, and generated evidence conventions.
- Scripts and commands: `scripts/qc/` journey runner, bug reporter, log search, catalog validators, and package scripts such as `qc:journeys`, `qc:journeys:bugs`, and `qc:logs`.
- Runtime integration points: character and pilot creation, Mek construction/export, encounter launch, tactical action rejection, combat simulation, match/replay persistence, campaign contract resolution, repair/salvage/finance updates, API payload rejection, and store recovery paths.
- Test coverage: logger tests, QC catalog validation, journey run-plan validation, bug extraction tests, and smoke/integration tests for representative journey execution.
- Temporal availability and tech base behavior remain part of the generated Mek and combat input space, so scenario definitions must expose era, tech base, chassis, variant, and equipment-selection parameters where applicable.
