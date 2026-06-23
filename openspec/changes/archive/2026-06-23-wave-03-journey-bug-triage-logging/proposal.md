## Why

Wave 2 made journey inputs trustworthy, but failed journey runs can still be noisy to triage: a single step failure can appear as duplicate bug candidates, and the text reporter omits state and rule-decision context that already exists in structured logs. Wave 3 should make failure evidence useful without manual digging through `system.ndjson`.

## What Changes

- Deduplicate bug extraction so one failed step produces one canonical actionable bug packet, enriched by matching structured diagnostics.
- Add structured triage context to the journey bug-extraction diagnostic so log search can explain what was extracted, what was gated, and where the bug packet lives.
- Expand the text bug reporter to show actor, state before/after, rule decision, warnings, failure cause, and log fingerprints when triage data exists.
- Add regression coverage proving failed journey evidence is deduped, searchable, and readable from the reporter.

Non-goals:
- This change does not add browser-backed journey adapters.
- This change does not replace domain event, replay, or match-log persistence.
- This change does not implement the GM ledger or tactical-map parity waves.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `journey-qc`: Bug extraction and reporting requirements for failed journey runs become stricter about deduplication and readable triage output.
- `logging-system`: Journey bug-extraction diagnostics must carry standardized triage context and references to generated bug packets.

## Impact

- Affected scripts: `scripts/qc/journey-qc-core.mjs`, `scripts/qc/report-journey-bugs.mjs`, `scripts/qc/search-journey-logs.mjs`.
- Affected tests: `scripts/__tests__/journey-qc.test.ts`.
- Affected docs/specs: `docs/qc/mekstation-journey-qc.md`, `openspec/specs/journey-qc`, and `openspec/specs/logging-system` after archive.
- No new runtime dependency is required.
