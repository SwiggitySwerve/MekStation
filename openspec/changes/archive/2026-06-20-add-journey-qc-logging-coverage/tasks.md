## 1. Catalogs and Validation Graph

- [x] 1.1 Add `docs/qc/mekstation-journey-scenarios.json` with the seven required journey definitions, tiers, modes, configurable parameters, steps, terminal states, evidence assertions, and known limitation references.
- [x] 1.2 Add `docs/qc/mekstation-qc-validation-graph.json` mapping top-level capabilities, modules, submodules, journeys, commands, evidence artifacts, logging events, and known gaps.
- [x] 1.3 Add catalog and graph validators under `scripts/qc/` that fail on missing required journeys, malformed parameters, orphaned graph nodes, and missing evidence assertions.
- [x] 1.4 Add package scripts for catalog and graph validation, including `qc:journeys:validate` and `qc:graph`.

## 2. Journey Runner and Evidence Bundles

- [x] 2.1 Implement the `qc:journeys` CLI parser for `--journey`, `--tier`, `--mode`, `--seed`, `--runs`, `--run-id`, `--evidence-dir`, `--dry-run`, `--continue-on-error`, and `--fail-on-bug-severity`.
- [x] 2.2 Implement run-plan materialization that writes `run-plan.json` before execution and produces equivalent generated inputs for the same catalog version, seed, and parameters.
- [x] 2.3 Implement journey execution orchestration for headless, browser, and hybrid modes while reusing existing services, stores, APIs, and Playwright helpers.
- [x] 2.4 Implement evidence bundle writing under `.sisyphus/evidence/qc-journeys/<runId>/` with `result.json`, `system.ndjson`, `bugs.json`, `report.md`, stdout/stderr directories, generated inputs, and collected artifacts.
- [x] 2.5 Update `.sisyphus/evidence/qc-journeys/latest.json` after each run and make `latest` usable by bug and log commands.

## 3. Journey Implementations

- [x] 3.1 Implement the `character-build` journey with pilot or character generation, validation, persistence or export evidence, and structured diagnostics.
- [x] 3.2 Implement the `mek-build` journey with BattleMech construction inputs, unitTechBase and era parameters, validation evidence, export evidence, and bounded diagnostics.
- [x] 3.3 Implement `combat-1v1` and `combat-4v4` journeys with generated forces, map inputs, movement or attack activity, terminal combat state, and engine agreement assertions where available.
- [x] 3.4 Implement the `contract-campaign` journey with contract selection, encounter or outcome resolution, campaign state update, objective or payment processing, and gap accounting.
- [x] 3.5 Implement `campaign-short` and `campaign-long` journeys with configurable contract counts, repair policy, salvage policy, finance updates, day advancement, terminal campaign state, and standard versus extended tier behavior.

## 4. Structured Logging Coverage

- [x] 4.1 Extend `src/utils/logger.ts` with additive structured diagnostic support while preserving existing `debug`, `info`, `warn`, and `error` varargs behavior.
- [x] 4.2 Add logger test-sink support and tests proving structured capture works without console noise in test mode.
- [x] 4.3 Add `docs/qc/mekstation-logging-map.json` with required runtime paths, diagnostic events, severity expectations, and test references.
- [x] 4.4 Add a logging-map validator that fails on missing required paths, missing events, malformed severity expectations, and missing test references.
- [x] 4.5 Instrument required runtime paths for character and pilot creation, Mek construction/export, encounter launch, tactical action rejection, combat terminal states, match/replay persistence, campaign outcome processing, repair, salvage, finance updates, API payload rejection, store recovery, runner failure, and bug extraction.

## 5. Bug Reporting, Log Search, and Graph Query

- [x] 5.1 Implement bug candidate extraction from failed steps, critical console/page errors, invariant violations, missing terminal states, catalog misses, failed persistence, fallback warnings, and unprocessed campaign outcomes.
- [x] 5.2 Implement `qc:journeys:bugs` with filters for latest run, run ID, journey ID, severity, module, fingerprint, and time window.
- [x] 5.3 Implement `qc:logs` with filters for latest run, run ID, journey ID, step ID, level, service, event, fingerprint, and time window.
- [x] 5.4 Implement `qc:graph` query output for capability, module, submodule, journey, command, evidence artifact, logging event, and known gap lookups.

## 6. Tests and Verification

- [x] 6.1 Add unit tests for journey catalog validation, graph validation, run-plan materialization, evidence bundle paths, bug extraction, log search filtering, and graph query results.
- [x] 6.2 Add logger tests proving legacy varargs compatibility, structured diagnostic entries, correlation context isolation, diagnostic test sink behavior, and bounded payload expectations.
- [x] 6.3 Add representative smoke or integration tests for `character-build`, `mek-build`, `combat-1v1`, `contract-campaign`, and one campaign-length journey.
- [x] 6.4 Add verification scripts such as `verify:qc:journeys` and `qc:logging:validate` that compose catalog, graph, logging-map, and representative journey checks.
- [x] 6.5 Run `npm.cmd test -- --runInBand` or narrower affected Jest suites, `npm.cmd run validate:combat:gaps`, OpenSpec validation for this change, and TypeScript or LSP diagnostics before marking implementation complete.

## 7. Documentation and Handoff

- [x] 7.1 Document the journey command examples, parameters, evidence bundle layout, bug-report workflow, log-search workflow, and QC graph lookup workflow in `docs/qc/`.
- [x] 7.2 Update existing QC documentation to reference the journey catalog, validation graph, and logging map instead of duplicating command lists.
- [x] 7.3 Record remaining known gaps explicitly in journey output, specs, or QC docs so limitations cannot silently suppress failures.
