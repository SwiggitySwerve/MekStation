Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

## 1. Schema Registry and Upcasters — PR 1

- [ ] 1.1 Inventory persisted combat/campaign event types and lock their current payloads as explicit baseline schema versions.
- [ ] 1.2 Implement the event-schema registry, pure one-version-at-a-time upcaster chain, typed unsupported-history failures, and tests that stored payload bytes remain unchanged.
- [ ] 1.3 Add deterministic-input validation for RNG, clock, catalog/rules, and external inputs; prove replay code has no network, clock, random, or effect access.
- [ ] 1.4 Run focused tests, TypeScript/LSP, lint, format, strict OpenSpec validation, and independent replay-safety review.
- [ ] 1.5 After merge, rerun the supported/unsupported replay receipt on exact main and prune the merged branch/worktree.

## 2. Projector Registry and Checkpoints — PR 2

- [ ] 2.1 Add projector ID/version registration and immutable checkpoint metadata keyed by stream, branch, revision, source digest, and state digest.
- [ ] 2.2 Implement checkpoint compatibility checks with full replay as the reference path and no publication from an incompatible cache.
- [ ] 2.3 Add equivalence fixtures proving full replay equals checkpoint-plus-tail for authoritative and viewer-projection digests.
- [ ] 2.4 Run focused tests and applicable typecheck/lint/format gates; independently review checkpoint trust boundaries.
- [ ] 2.5 After merge, rerun equivalence on exact main and prune the merged branch/worktree.

## 3. Quarantine and Replay Library Integration — PR 3

- [ ] 3.1 Add per-authority-scope quarantine for unknown type/version, invalid payload, broken fixed-root continuity, canonicalizer mismatch, or digest mismatch; keep a healthy control scope available and defer parent/supersession lineage checks until branch records exist.
- [ ] 3.2 Route Replay Library, cold recovery, snapshot hydration, and catch-up through the same validation/upcast/projector registrations.
- [ ] 3.3 Add truthful blocked/recovery UI state with persistent text and accessible announcement; do not present partial replay as complete.
- [ ] 3.4 Run focused replay/recovery/browser checks, `verify:qc:replay-recovery`, viewport/accessibility checks for the blocked state, and independent review.
- [ ] 3.5 After merge, rerun exact-main replay/recovery and corruption-isolation receipts, then prune the merged branch/worktree.
