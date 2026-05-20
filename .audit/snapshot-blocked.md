# Snapshot baseline status — partial (no Playwright)

**Reason:** MekStation uses Jest + React Testing Library, not Playwright. The `ui-audit` skill's default snapshot capture (`npx playwright test --list`) is not applicable.

**Commit at audit start:** see `.audit/snapshot-commit.txt`
**Date:** 2026-05-14
**Captured partial baseline:**

- `snapshot-tests-count.txt`: total Jest test-file count at audit start (966)
- All 23857 unit tests pass on this commit (verified during PR2 verification pass)
- BV parity preserved at 4187/4196 within 1% / 4196/4196 within 5%

**Phase 5.5 Check 1 downgrade:** runs in degraded mode against the Jest baseline if a fix is later applied. For this audit's scope (categorized findings only, no auto-fix per Output Mode), Check 1 is not the binding constraint.
