## Context

Wave 4 builds on existing intervention primitives in `src/lib/interventions`. The repo already has an `InterventionLedger`, `ActionLedger`, authority/redaction helpers, and a cascade preview pipeline. The remaining risk is not missing surface area; it is that edge paths can weaken the append-only contract before later GM combat/economy/time workflows rely on it.

Current approval flow builds and appends an intervention record before confirming that the domain implementer can apply it. Current ledger read APIs also return shallow-copied arrays that still contain live record objects. Downstream UI and service code will read these projections frequently, so the core should make accidental mutation hard.

## Goals / Non-Goals

**Goals:**
- Ensure approval is atomic: no intervention or action-ledger record is appended unless the approved preview applies successfully.
- Return immutable record snapshots from ledger reads/projections.
- Add focused tests that capture the blocked-approval and snapshot immutability behavior.

**Non-Goals:**
- No new GM UI.
- No new combat, post-combat, economy, repair, salvage, or time implementer behavior.
- No persistence-store migration.
- No public API route changes.

## Decisions

- Validate application before appending approved intervention records.
  - Rationale: blocked or unsupported approval paths must leave the ledger unchanged. Applying first preserves the existing pure-state derivation model while preventing orphaned intervention records.
  - Alternative considered: append first and add a compensating rollback marker. Rejected because it would create confusing canonical history for a command that never became approved state.

- Freeze shallow record snapshots at ledger boundaries.
  - Rationale: ledger record payloads are structured domain data, but the immediate append-only risk is callers replacing top-level fields on returned records. Shallow freezing is a small, dependency-free hardening step that preserves existing payload identity and avoids deep-clone surprises.
  - Alternative considered: deep clone every payload. Rejected for this slice because domain payloads can include richer objects and future persistence boundaries should define deeper serialization rules explicitly.

- Keep the public TypeScript API shape stable.
  - Rationale: later waves already depend on these types and helpers. This wave should improve invariants without broad integration churn.

## Risks / Trade-offs

- Shallow freeze does not make nested domain payloads immutable. -> Add tests for top-level record mutation now; leave deep serialization/normalization to persistence or domain implementer waves.
- Applying before appending assumes implementer `apply` is pure and returns derived state. -> Existing implementers/tests already follow this pattern; the approval pipeline will only append after `apply` reports success.
- Existing consumers could rely on mutating returned record objects. -> That would violate the append-only contract; tests will lock the intended behavior.
