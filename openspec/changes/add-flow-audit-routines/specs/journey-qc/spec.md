# journey-qc Specification (Delta)

## ADDED Requirements

### Requirement: Flow-Scoped Walkthrough Invocation
The walkthrough evidence machinery (step recorder, per-run catalog, manifest, index.html contact sheet, REVIEW skeleton) SHALL be invocable for a single named flow with checkpoint granularity via the flow-audit runner, in addition to the all-journeys `qc:ux-audit` umbrella. A flow-scoped run SHALL produce the same per-run catalog contract as the umbrella run, scoped to the selected flow, so downstream review tooling works unchanged.

#### Scenario: Single-flow run produces a standard catalog
- **WHEN** an agent invokes the flow-audit runner for one named flow
- **THEN** the per-run output directory contains the same manifest, per-checkpoint JSON, screenshot, and index.html structures the umbrella `qc:ux-audit` run produces, restricted to that flow

#### Scenario: Umbrella run remains intact
- **WHEN** `qc:ux-audit` is invoked without flow selection
- **THEN** all registered walkthrough journeys still run and aggregate into one catalog, unchanged by the existence of flow-scoped invocation

### Requirement: Interactive Evidence and CI Authority Split
The journey-qc documentation and harness output SHALL state the authority split explicitly: interactive walkthrough and flow-audit catalogs are review evidence for humans and agents, and are never PR-blocking CI gates; assertion-based suites (unit/integration/e2e assertions and headless invariant nets) are the source of permanent authority for CI.

#### Scenario: Authority split is discoverable in run output
- **WHEN** a walkthrough or flow-audit run completes
- **THEN** the generated REVIEW/manifest output identifies itself as review evidence (not a CI gate), so a green evidence run is never mistaken for merge authority

#### Scenario: Graded findings do not block merges
- **WHEN** a walkthrough or flow-audit catalog contains severity-graded findings
- **THEN** those findings inform review and backlog triage but do not flip any PR-blocking check
