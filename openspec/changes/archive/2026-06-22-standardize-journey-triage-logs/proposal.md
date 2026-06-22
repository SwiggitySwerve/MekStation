## Why

Journey QC runs already produce evidence, logs, and bug candidates, but the failure packet is still too thin for the next waves. A failed run should explain who acted, what changed, which rule or validation decision was involved, and where to start debugging without manually correlating `result.json`, `system.ndjson`, artifacts, and runner output.

## What Changes

- Add a required journey triage context shape to structured diagnostics: actor, action, state before/after summaries, rule decision, validation result, warnings, failure cause, and evidence references.
- Enrich bug candidates with the same context plus log fingerprints so `qc:journeys:bugs` can point directly at the diagnostic entries that caused or explain the bug.
- Extend the bug reporter output to show concise triage context for medium-or-higher failures while preserving JSON output for tooling.
- Tighten validation so journey logging paths continue to map to tested diagnostic coverage and bug extraction remains queryable.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `journey-qc`: bug candidate extraction and evidence bundles must carry enough triage context to locate failure causes without manual digging.
- `logging-system`: structured journey diagnostics must include standardized journey triage fields for action, actor, state change, rule decision, validation result, warnings, and failure cause.

## Impact

- Affected code: `scripts/qc/journey-qc-core.mjs`, `scripts/qc/report-journey-bugs.mjs`, `scripts/qc/search-journey-logs.mjs`, and `scripts/__tests__/journey-qc.test.ts`.
- Affected docs/specs: `docs/qc/mekstation-journey-qc.md`, `docs/qc/mekstation-logging-map.json`, `openspec/specs/journey-qc/spec.md`, and `openspec/specs/logging-system/spec.md`.
- No new runtime dependency is planned.

## Non-goals

- This change does not replace synthetic journey execution with real domain or browser adapters.
- This change does not introduce the GM ledger or durable domain event store.
- This change does not redesign the application logger used by React, Next.js, or Electron surfaces outside journey QC.
