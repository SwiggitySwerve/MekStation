## Context

The journey runner writes `run-plan.json`, `result.json`, `system.ndjson`, `bugs.json`, and `report.md`. The previous evidence-contract slice made synthetic backing visible, but failed runs still require manual joins across step results, log entries, and artifacts to understand the actor, action, state effect, rule decision, validation result, warnings, and failure cause.

## Goals / Non-Goals

**Goals:**
- Define a compact triage context shape shared by journey diagnostics and bug candidates.
- Preserve existing evidence file names, CLI commands, and JSON compatibility while adding fields.
- Make text bug reports useful enough to identify the failing step, relevant log fingerprint, and likely next debugging surface.

**Non-Goals:**
- Replace synthetic journey steps with domain or browser adapters.
- Build the GM ledger or durable domain event stream.
- Redesign application-wide logger APIs outside journey QC.

## Decisions

- Use `metadata.triage` on structured log entries and `triage` on bug candidates.
  - Rationale: existing log entries already preserve metadata, and bug candidates are already the reporter contract. Mirroring the same shape avoids inventing another artifact.
  - Alternative rejected: infer triage context only inside the reporter. That would keep `system.ndjson` too weak for external tooling.
- Use compact state summaries instead of full state snapshots.
  - Rationale: journey evidence must stay bounded and safe to inspect. State before/after should point at entity IDs, counts, terminal states, or deltas, not full BattleMech or campaign payload dumps.
  - Alternative rejected: embed complete artifacts in logs. That duplicates evidence files and violates diagnostic payload hygiene.
- Add log fingerprints to bug candidates.
  - Rationale: fingerprints let `qc:logs --fingerprint=<id>` jump from a bug to the causative diagnostic entry.
  - Alternative rejected: evidence references only. `system.ndjson` is too broad without a stable lookup key.

## Risks / Trade-offs

- Triage fields could become vague if every step uses generic values -> tests will assert representative combat failure fields and reporter output.
- Added fields increase evidence size -> use bounded summaries and artifact references rather than full payload copies.
- Synthetic projections may appear more authoritative than they are -> retain execution backing fields and strict backing bug behavior.

## Migration Plan

Additive JSON fields are safe for existing consumers. Existing commands continue to read older evidence that lacks `triage`; reporter output should fall back gracefully when the field is absent.
