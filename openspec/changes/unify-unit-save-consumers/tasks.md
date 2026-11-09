## Implementation

- [x] Record failing deferred-completion and family-reader regression tests.
- [x] Route consumers and confirmed completions through the existing owner/adapters.
- [x] Preserve family draft failure/Retry and serializer/facade compatibility.
- [x] Kill a reference-equality or mech-only-reader mutant and restore exact source.

## Verification

- [x] Run full affected directories plus integration, both tsc configs, lint/unit-lint and its suite, formatting, strict OpenSpec, and cache budget.
- [x] Record unchanged fingerprints and untouched D-11 files in w4-u3/pr3/.
- [x] Prepare the verified draft PR for coordinator review.

Evidence: `w4-u3/pr3/` records the red run, both killed mutants, 479 passing
suites (7,848 passing tests; 36 skipped), both TypeScript configs, 62 root-lint
warnings, passing unit-lint/format/OpenSpec gates, and the unchanged 57 unkeyable
tests. The full run's worker teardown warning also appears in PR2's gate log;
the focused consumer run completed without it. Protected D-11 files and stored
fingerprint fixtures remain unchanged.
