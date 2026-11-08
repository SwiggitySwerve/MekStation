## 1. Consolidation

- [x] 1.1 Record full pilot-service/store characterization before and after consolidating healing eligibility; preserve errors and outputs in a separate first commit.

## 2. Enforcement

- [ ] 2.1 Record failing tests for exact enums, no-mutation API/persistence failures, KIA transitions, and unknown-status assignment.
- [ ] 2.2 Implement the approved API and repository boundaries and refuse unknown assignment status.
- [ ] 2.3 Kill and restore all three mutants; record the killing tests.

## 3. Validation and delivery

- [ ] 3.1 Run full API, vault, pilot, force, store, and integration test directories.
- [ ] 3.2 Run both tsc configs, lint, lint:units and its suite, oxfmt, OpenSpec validation, and the budget check.
- [ ] 3.3 Inspect final diff, document data cleanup and upstream/follow-up decisions, and open one draft PR; never merge.

## Evidence

Full pilot-service/store characterization passed before and after consolidation: 42 suites, 802 tests in each run. Cases cover every existing pilot status, unchanged errors, refusal without mutation/fetch for KIA, and unchanged healing requests for other statuses. Local logs: `.review/s4-s6/healing-before.log` and `healing-after.log`.

Consolidation lint: 63 warnings, zero errors. Further gates and mutant evidence pending.
