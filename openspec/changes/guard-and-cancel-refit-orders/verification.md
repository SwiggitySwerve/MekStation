# K8 verification

Root approved one K8 PR on 2026-11-08. No merge is authorized.

## Scope and compatibility

- The refit owner defines active as `in-progress` and open as `proposed` or active.
- The only readiness change substitutes `isActiveRefitOrder` for the identical inline condition. K6 readiness tests are unchanged.
- Cancellation changes status only. No money, parts, configuration, repair or salvage mutation is introduced.
- Both persistence paths retain every old duplicate order. Conflicting units pause until cancellation by order ID leaves one open order.
- Co-op guests refuse before mutation. Hosts use the existing versioned campaign save and rollback paths, without a new journal intent or protocol field.
- The command bar retries the existing order after a failed save. The bay panel remains mounted when the page displays a save error, preserving cancellation retry.
- No schema, persisted format, committed fixture, replay digest or schema pack changes.
- Follow-up: refit purchasing/part reservations through finance and inventory.

## Test-first evidence

Evidence logs are local at `E:/Projects/Personal/_scratch/sm-audit-reports/k8-proof/`.

| Run | Result |
| --- | --- |
| `red-domain-node22.log` | 16 failures and 21 passes before production changes: missing predicates/cancellation, duplicate admission, guest refusal and legacy progress. |
| `red-ui.log` | Missing panel and duplicate creation on save retry fail before implementation. |
| `red-host-rollback.log` | Host creation incorrectly acknowledges an order rolled back after a save failure; one regression fails before awaiting the existing save path. |
| `red-page-retry.log` | Restoring the old page placement unmounts Retry Save when the save-error screen replaces the bay; the new route regression fails. |
| `green-focused.log` | Seven suites, 65 tests pass after the lifecycle and persistence fixes. |

The first baseline attempt used Node 24 against a Node 22 `better-sqlite3` binary and failed due to ABI mismatch. All substantive runs use installed Node 22.22.0; the shared native dependency was not rebuilt.

## Deliberate mutants

Both were executed and restored before final gates; neither mutation is committed.

| Mutation | Killed by | Result |
| --- | --- | --- |
| Disable the store's open-order guard | `coopMutationPersistence.test.ts`: `rejects a second refit beside a proposed order before any save`; the in-progress variant and simultaneous-admission test also fail. | Exit 1; three failures (`mutant-admission.log`). |
| Remove conflict checking from processor progress | `refitProcessor.test.ts`: `pauses a legacy duplicate proposed order without dropping data` and the in-progress variant. | Exit 1; two failures (`mutant-progress.log`). |

## Validation

Initial baseline: `3e6f6cdc292c76d1e3190a3d84cf5a2ddf1e071c`.
Updated bases: `0217646cc6d4b938937df6caf31ec452ae935ce7` (C10), then `447803027ede2f9067bda0f252e60a08dde1f209` (P2P retry). Both were brought in with `git merge origin/main`, without conflicts. The `publication-*` logs rerun every lane gate on the final updated tree.

| Gate | Evidence |
| --- | --- |
| All touched domain/store/UI directories, campaign page tests and `src/__tests__/integration` | 139 suites pass; 1,687 tests pass and 32 are skipped (`publication-directories.log`). |
| Bay, customizer and campaign page directories after route retry regression | 17 suites, 110 tests pass (`final-ui.log`). |
| Entire `src/simulation/runner/__tests__` | 152 suites, 1,511 tests pass (`publication-runner.log`). |
| Replay/digest/golden baseline | 68 suites, 1,030 tests pass (`replay-before-node22.log`). |
| Same replay/digest/golden suites after updated main | 68 suites, 1,030 tests pass (`publication-replay.log`); no fixture/digest changes. |
| `npm run validate:combat` | Both initial and updated-base runs pass 79 suites / 2,107 tests plus gap and strict-spec checks (`publication-combat.log`). |
| Both TypeScript configurations | `npm run typecheck`; final tree recorded in `publication-typecheck.log`. |
| Root lint | 63 warnings, zero errors; final tree recorded in `publication-lint.log`. |
| Unit lint and its Jest suite | Within the unchanged `17085` ceiling, 33 tests pass (`publication-unit-lint.log / publication-unit-lint-tests.log`). No ceilings changed. |
| Formatting | Changed files formatted with oxfmt; whole-repository final check in `publication-format.log`. |
| OpenSpec | New delta and all 262 specs/changes validate strictly; purpose and CI quality checks pass. Final evidence in `publication-openspec-all.log`. |
| Unkeyable budget | 57/57; no new unkeyable test. Final evidence in `publication-budget.log` / `publication-budget.json`. |
| Runner source citations | No changed K8 production file is cited by `Combat*Source*.ts`; no citation edits needed. |

Extra full strict terminology validation reports 14 pre-existing violations in unchanged parity/customizer/armor specifications. K8's own package passes terminology validation with zero violations. No unrelated terminology files were edited.

## Component browser proof

`capture.cjs` bundles the actual component and repository CSS into a local fixture. Its persistence callback is simulated; host save and guest hydration proof comes from the integration suite, not this fixture.

- Chromium/Edge checks pass at 375, 768 and 1,280 pixels, including a 300-character order ID.
- No horizontal page overflow, button height below 44 pixels, browser errors or axe violations were found.
- Cancellation by ID, disabled guest controls and failed-save retry succeed.
- Screenshots: `refit-orders-375.png`, `refit-orders-768.png`, `refit-orders-1280.png`, `refit-orders-long.png`, `refit-orders-save-failure.png`.
- Recording: `refit-orders-demo.webm` (component fixture, simulated save callback).

## Limits

Refits remain envelope-persisted campaign work rather than dedicated journal commands. Existing ownership/version checks remain the server save boundary. This PR does not add refit procurement, reservations, refunds, repair reconciliation or technician scheduling.

## Pipeline-health evidence

- **CI at merge:** NOT-RUN ? the PR remains a draft; this lane never merges.
- **Post-merge validation:** NOT-RUN ? no merge or deployment was performed.
- **Error-log baseline (component fixture only):** zero browser errors and zero axe violations; operational service-log baseline NOT-RUN. The fixture is not a production health probe.
