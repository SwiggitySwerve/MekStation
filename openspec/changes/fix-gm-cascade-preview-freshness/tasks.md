## 1. Preserve existing behavior

- [x] 1.1 Extract and regression-test the time freshness check without changing outcomes.
- [x] 1.2 Record the baseline replay/digest/golden results before behavior changes.

## 2. Reject stale previews

- [x] 2.1 Record failing campaign-family, tactical/unit-reload and caller-path tests.
- [x] 2.2 Capture and validate transient pipeline freshness before application.
- [x] 2.3 Narrow ledger statuses while preserving runtime rejection of invalid external records.
- [x] 2.4 Prove freshness is absent from records, serialized campaign state and host intents.
- [x] 2.5 Kill a deliberately bypassed freshness guard with the new tests, then restore it.

## 3. Verify delivery

- [x] 3.1 Run complete touched test directories, integration, runner, replay/digest/golden, and combat validation.
- [x] 3.2 Run both TypeScript configs, lint ceilings, formatting, OpenSpec/QC and unkeyable budget checks.
- [x] 3.3 Run the full GM ledger E2E spec on port 3617 with an explicit server command.
- [ ] 3.4 Open a draft PR and mark ready only when hosted CI is green.
