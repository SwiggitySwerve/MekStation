## Context

`scripts/qc/journey-qc-core.mjs` materializes run plans for all seven required journeys and is also used by the long-campaign stability wrapper. It currently coerces override values into primitive types but does not reject malformed integers, unsupported enum values, out-of-range numbers, or ambiguous booleans before writing passing evidence.

## Goals / Non-Goals

**Goals:**

- Validate catalog-defined parameter overrides during run-plan materialization.
- Fail fast with journey ID, parameter name, offending value, and expected constraint.
- Preserve existing successful command behavior and evidence layout for valid inputs.
- Cover failures with focused journey QC tests so bad inputs cannot become trusted evidence again.

**Non-Goals:**

- Replace synthetic journey execution backing with domain or browser adapters.
- Change journey catalog structure beyond using existing `type`, `values`, `minimum`, and optional `maximum` constraints.
- Change long-campaign stability digest behavior except through shared validation.

## Decisions

- Validate in `materializeRunPlan` through `resolveParameters`.
  - Rationale: every journey command, dry run, and stability wrapper passes through the same run-plan materialization path.
  - Alternative rejected: validate only in CLI wrappers; that would let future callers bypass the contract.

- Keep validation catalog-driven.
  - Rationale: parameter requirements already live beside each journey definition and remain the single source for defaults, enum values, and numeric bounds.
  - Alternative rejected: hard-code journey-specific validation tables in the runner; that would duplicate the catalog and drift quickly.

- Fail before evidence bundle execution.
  - Rationale: malformed input should not produce `result.json`, `system.ndjson`, or `bugs.json` that look like a completed run.
  - Alternative rejected: emit a failed evidence bundle for malformed CLI input; that is useful for execution failures, but malformed run-plan inputs are not a journey execution result.

## Risks / Trade-offs

- [Risk] Existing local scripts may rely on permissive coercion.
  - Mitigation: defaults and valid overrides remain unchanged; failures name the exact parameter and allowed range/value set.

- [Risk] String-list values cannot express an empty list after filtering.
  - Mitigation: keep existing non-empty filtering behavior and only reject empty explicit string-list overrides where the catalog default is non-empty.

- [Risk] Boolean parsing can surprise users who pass `yes` or `1`.
  - Mitigation: accept only explicit `true` or `false` so run evidence is unambiguous.
