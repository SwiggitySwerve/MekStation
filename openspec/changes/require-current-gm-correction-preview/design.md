# Design

The correction producer owns the request and approval eligibility. A successful preview pins the exact request and current match/token/mirror context. Starting another preview clears eligibility synchronously; a generation guard discards late completions. Context identity prevents an old callback from authorizing a new match or mirror. Approval consumes the binding before dispatch, including transport failures.

The surface receives a boolean readiness prop, defaults to disabled, and blocks both controls while either operation runs. It clears old preview status on a new request. The deterministic proof harness supplies successful preview readiness without changing its public-result fixture.

No server rule, schema, persisted format, rewind dialog, or campaign arbiter change belongs to this PR. See openspec/specs/e2e-testing/spec.md for the canonical capability.

## Local evidence (2026-11-08)

- Base: eba8969f3. Node 22.22.0. Initial red run: 14 failed / 18 passed across producer and controls suites. Focused green: 58 passed.
- Five deliberate mutants failed assertions: accepting failed previews (3 failures), accepting old generations (1), accepting old contexts (4), reusing consumed previews (2), and enabling approval without readiness (1). Original sources were restored after each run.
- Whole-directory gate: 272 suites passed; 2,879 tests passed and 35 skipped. Includes src/components/multiplayer, src/pages-modules/multiplayer, src/lib/multiplayer, src/__tests__/integration, src/__tests__/pages/multiplayer, and scripts/__tests__/lint-units.test.ts. Final component rerun: 15 suites / 155 tests passed.
- Both TypeScript configs passed; lint: 63 warnings / 0 errors; lint:units: 17,075 / 17,085; budget-check: 57 unkeyable / 92 repo-wide; change validation passed.
- e2e/networked-command-proof.spec.ts passed. e2e/playable-command-feature-screens.spec.ts failed before reaching this harness: mission-readiness-status was Launch blocked, expected Ready with warnings (1). A comparison with all five runtime sources restored to eba8969f3 also failed before the harness, at campaign fixture persistence (PUT 404); this does not establish identical failure causes. No unrelated campaign/fixture changes were made.
- Browser QA observed Approve disabled initially, enabled after preview, disabled after approval, and the public result published. Screenshots and recording accompany the PR.
- Full logs and mutant results: E:/Projects/Personal/_scratch/sm-audit-reports/m-m11-evidence/.
