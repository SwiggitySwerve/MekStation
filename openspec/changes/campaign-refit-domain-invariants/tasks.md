## A: Predicate extraction
- [x] Extract status owner and switch client/processor imports; preserve facade.
- [x] Verify existing refit and processor tests unchanged; commit locally.

## B: Authoritative seam
- [x] Add pure ratchet registry and transaction gate after CAS.
- [x] Map 422, tolerate adoption and monitor journal writes.
- [x] Parse 422 and preserve dirty error state with server reason.
- [x] Run focused tests, six restored mutants and permitted static gates.
- [x] Commit locally and report evidence and PR C scope to C4.

## Evidence and held scope

A: unchanged refit, processor and integration suites passed (29 tests); typecheck,
focused format/lint, strict OpenSpec and the real pre-commit hook passed.
B: 55 focused suites / 534 tests passed with maxWorkers=2. Six required mutants
were killed by behavioral assertions and restored byte for byte. The frozen base
client source also passed a separate generic-422 dirty-error compatibility case.
Detailed logs and the local branch heads are in the requested C4 implementation
report under campaign-save-loss. No build, server, browser, push or merge ran.
PR C owns the full card, discard, pre-flight and adoption-marker integration.

The added gate crossed the persistence service size guardrail. Its existing
source identity preparation was moved unchanged into
campaignRecordWritePreparation.ts. The public service and transaction seam stay
in place; this extraction keeps identity preparation separate from row IO.
