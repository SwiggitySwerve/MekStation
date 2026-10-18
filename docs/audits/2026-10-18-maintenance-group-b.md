# Maintenance group (b): bounded cleanup, 2026-10-18

Baseline: origin/main at cf42ab567b21b6226baed67b165fcb924a282a98. Branch: codex/maintenance-group-b-20261018. Scope follows docs/audits/2026-10-18-maintenance-gate-triage.md; no group (a)/(c) implementation, scanner/baseline/ledger changes, generated-file edits, or unrelated product behavior changes.

## Ownership census before editing

Compared all 27 group-(b) entries against the 23 L1 units in units.json:layerRegistration20261017L1, all B14/B15 units, and the corresponding literal roadmap.json restrictions. Directory aliases are excluded conservatively even where a later literal manifest narrows source admission. No FOG unit is registered at this baseline; the existing B14 and L1 fog/history paths remain excluded. The explicit G2 exclusions in the task are also untouched.

Ten entries in eight eligible files are addressed. Eleven entries in five protected files are skipped. Six duplicate-cluster entries in five eligible BV investigation scripts are deferred together: changing just the scanner's representative file would leave the 28-38-file shared patterns largely intact; a later bounded tooling PR should census the common loaders and equipment reporting before extracting them. No claim is made that these duplicate clusters are fixed.

| Finding(s)                   | File                                                                                | Disposition / owning unit(s)                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| S01                          | `src/__tests__/unit/encoding/mojibakeGuard.test.ts`                                 | Mechanical cleanup                                                                                                           |
| S06, L01                     | `src/lib/events/journal/__tests__/SQLiteEventJournalTestHarness.ts`                 | Mechanical cleanup                                                                                                           |
| S08, S59, S60, L03, L18, L19 | `src/lib/multiplayer/server/history/__tests__/ViewerHistoryService.test.ts`         | SKIPPED: P2CG1B, P2CG1C, P2CG1D, P2CG1E, P2CG1R, P2CG1S, B14-0, P2CG1HP, P2CG1H, P2CG1I2, P2CG1I3, P2CG1I4, P2CG2, P2CH, U38 |
| S14                          | `src/lib/multiplayer/server/__tests__/viewerFrameRawNegativeSweep.test.ts`          | SKIPPED: P2CG1B, P2CG1C, P2CG1D, P2CG1E, P2CG1R, P2CG1S, B14-0, P2CG1HP, P2CG1H, P2CG1I2, P2CG1I3, P2CG1I4, P2CG2, P2CH, U38 |
| S15                          | `src/pages-modules/api/__tests__/matchHistoryFog.test.ts`                           | SKIPPED: P2CG1E, B14-0, B14-HEAD, P2CG1H, P2CG1I1                                                                            |
| S47                          | `src/utils/appearanceBootstrap.ts`                                                  | Mechanical cleanup                                                                                                           |
| S61, L20                     | `src/lib/multiplayer/server/projection/__tests__/ViewerProjectionService.test.ts`   | SKIPPED: P2CG1B, P2CG1C, P2CG1D, P2CG1E, P2CG1R, P2CG1S, B14-0, P2CG1HP, P2CG1H, P2CG1I2, P2CG1I3, P2CG1I4, P2CG2, P2CH, U38 |
| S74, S75                     | `src/services/printing/RecordSheetService.ts`                                       | Mechanical cleanup                                                                                                           |
| S76                          | `src/services/printing/svgRecordSheetRenderer/svgGeometry.ts`                       | Mechanical cleanup                                                                                                           |
| L06                          | `scripts/__tests__/roadmap-codex-review-identity.test.ts`                           | Mechanical cleanup                                                                                                           |
| L30                          | `src/lib/multiplayer/server/__tests__/matchMarkerRetirementRecovery.sqlite.test.ts` | SKIPPED: P2CG1B, P2CG1C, P2CG1D, P2CG1E, P2CG1R, P2CG1S, B14-0, P2CG1HP, P2CG1H, P2CG1I2, P2CG1I3, P2CG1I4, P2CG2, P2CH, U38 |
| L31                          | `src/lib/testing/__tests__/faultControlsStartup.test.ts`                            | Mechanical cleanup                                                                                                           |
| L32                          | `src/lib/testing/faultControls.ts`                                                  | Mechanical cleanup                                                                                                           |
| L42                          | `scripts/accurate-gap-analysis.ts`                                                  | LATER PR: shared BV tooling; no protected owner                                                                              |
| L43                          | `scripts/analyze-2to5-band.ts`                                                      | LATER PR: shared BV tooling; no protected owner                                                                              |
| L44                          | `scripts/analyze-def-pattern.ts`                                                    | LATER PR: shared BV tooling; no protected owner                                                                              |
| L45, L46                     | `scripts/analyze-underc-clusters.ts`                                                | LATER PR: shared BV tooling; no protected owner                                                                              |
| L47                          | `scripts/check-defensive-assembly.ts`                                               | LATER PR: shared BV tooling; no protected owner                                                                              |

## Changes and semantic limits

- Extract JSON inspection from the encoding test's traversal, preserving every assertion and the same eight legacy-ID exceptions.
- Replace the SQLite conformance fixture's class with a factory and closed-over state, preserving the existing exported create/current/database/restart/failure/dispose interfaces, commit-failure trigger, adapter bindings, and cleanup. Only test support changes.
- Replace the eight-case test fixture mutation switch with typed callbacks; unhandled fault variants remain no-ops.
- Explain the appearance bootstrap's intentionally ignored storage failure in its empty catch.
- Use Element / Pick<Element, 'getAttribute'> for parsed SVG roots and the geometry helper; model the popup as shared close/print operations with optional browser document/event capabilities, and narrow event support before registering afterprint. The return from window.open needs no assertion. Parsing, sizing, popup arguments, and successful browser printing stay unchanged. The review correction below gives unsupported popup event capabilities an explicit error through the existing cleanup path.
- Correct the two historical 'plan todo 28' references to 'plan item 28', retaining the task numbers and explanatory comments. They refer to implemented fault controls, not unfinished work.

## Council source evidence

The three supplied reports are copied byte-for-byte into collapsible sections in the PR description, preserving their original UTF-8 and line endings. They are not committed as reformatted Markdown or hidden from formatting checks. Council advice is contextual evidence, not new implementation scope. Their SHA-256 values are:

- A: 260d715aea386b05b7719110212281cf74f70f56902144d430ddda460c99fe9f
- B: c6b260e9810cce9e1070872b05969d32ace0501368bcc525ec34d3aba64e6202
- C: b66e63e933e79327859ebe43316c3739f99c96b64614d8e5dea34f1c9e9d2ecf

## Validation

At the initial PR head 1cf8a0c66, focused Jest passed: 9 suites, 226 tests passed, 2 existing skipped tests; 528.208 seconds. Flags: --selectProjects unit --watchAll=false --runTestsByPath (the nine files listed below) --runInBand --cacheDirectory=.tmp/jest-maintenance-group-b. No test timeout changed.

Selected suites: `src/__tests__/unit/encoding/mojibakeGuard.test.ts`; `src/lib/events/journal/__tests__/SQLiteEventJournalConformance.test.ts`; `src/lib/events/journal/__tests__/SQLiteEventJournalRecovery.test.ts`; `src/__tests__/stores/appearanceAutoSave.test.ts`; `src/__tests__/service/printing/RecordSheetService.test.ts`; `src/__tests__/service/printing/RecordSheetService.pipeline.test.ts`; `src/services/printing/svgRecordSheetRenderer/__tests__/svgGeometry.test.ts`; `src/lib/testing/__tests__/faultControlsStartup.test.ts`; `scripts/__tests__/roadmap-codex-review-identity.test.ts`.

Scanner results (same baseline/scope before and after):

| Check / touched finding                                      | Before | After |
| ------------------------------------------------------------ | -----: | ----: |
| Source gate critical/high                                    |     76 |    70 |
| Source gate baseline regressions                             |     11 |     9 |
| Whole-repository critical/high (broader than source gate)    |    124 |   117 |
| Warning ledger tracked                                       |     54 |    54 |
| Warning ledger untracked / errors                            |     48 |    44 |
| S01: encoding traversal nesting                              |      1 |     0 |
| S06 / L01: SQLite fixture class shape                        |      1 |     0 |
| S47: appearance empty catch                                  |      1 |     0 |
| S74 / S75: print service double assertions                   |      2 |     0 |
| S76: SVG geometry double assertion                           |      1 |     0 |
| L06: identity fixture eight-case switch                      |      1 |     0 |
| L31 / L32: implemented fault-control comment false positives |      2 |     0 |

The source gate still exits 1 against the unchanged zero baseline. The ledger still exits 1 with 44 unrelated/protected/deferred entries; tracked entries remain 54. The full scanner exits 0 in reporting mode. Comparing full finding identities (category, severity, file, message), nine distinct non-info findings were removed and no new non-info finding was added. The ten triage IDs include S06/L01's overlap. The identity fixture's unrelated pre-existing complexity-22 finding is unchanged and outside group (b).

Commands: node scripts/maintenance/scan-maintenance.mjs --scope=src --baseline=docs/qc/maintenance-baseline.json --fail-on-regression --json; node scripts/maintenance/scan-maintenance.mjs --json; node scripts/qc/validate-maintenance-warning-ledger.mjs --scan-json=.tmp/group-b-full-after.json. The ledger consumed the current full scan, not a hand-edited or scoped substitute.

Formatting passes on the changed TypeScript files and this audit. Configured oxlint exits 0 with the existing RecordSheetService.ts line-limit warning (402 LOC initially; 405 LOC after the review-required event capability guard). Test files remain subject to the repository's existing lint exclusions. git diff --check passes. No formatting/scanner exclusions or baselines were changed.

Jest began only after node scripts/qc/machine-idle.mjs --own-pid 47516 reported MACHINE_IDLE. After Jest, the same gate repeatedly reported MACHINE_BUSY for T3 Code's preview browser PID 55164, including two default-duration --wait attempts. No compiler was launched while busy, no extra process exclusion was used, no process was killed, and no timeout was increased. Local typechecking is therefore NOT claimed; the PR's CI compiler/build checks remain required. The commit hook's unconditional typecheck was not run through the busy gate; focused tests and the manual format/lint/whitespace checks above are the local validation, with this limitation disclosed.

Fetched Main advanced to cc98179e4 (G2 PR #2250 merged) during validation. A read-only re-census of its units.json confirms every selected cleanup path remains outside protected ownership. The validation baseline remains cf42ab567; no protected source was rebased into this cleanup. Raw logs and machine-readable scans are local in .tmp/group-b-\*. No raw generated scanner output is committed.

## Review correction: Electron popup typing

CI on 1cf8a0c66 rejected the direct BrowserPrintWindow assertion with TS2352: Electron's BrowserWindowProxy does not supply addEventListener. That removal of the intermediate assertion was invalid. The popup interface now declares document and addEventListener as optional browser capabilities while requiring only the close/print methods shared by both popup types. window.open returns directly with no cast. After document readiness, a typeof-function guard narrows addEventListener before the call. A popup without event support is closed once by the existing catch/closeOwned path and receives an explicit error rather than an implicit TypeError; it is not printed.

A focused regression in src/**tests**/service/printing/RecordSheetService.pipeline.test.ts covers the unsupported event capability, cleanup-once, and no print call. This additional test file was re-censused against fetched Main 21b490fd24c11cf344b72cd62e480e0cb9ffac91 and is outside every registered L1/B14/B15/FOG ownership alias and literal manifest. The PR now contains ten files, within the fifteen-file cap.

Fresh source/full/ledger checks after the correction still report 70 source critical/high, 117 full critical/high, and tracked=54 untracked=44 errors=44. Both RecordSheetService double-assertion findings remain absent, so S74/S75 stay in the fixed set and the before/after totals above are unchanged. Formatting, configured lint (the disclosed 405-LOC warning), and whitespace checks pass.

Before the required npm run typecheck, node scripts/qc/machine-idle.mjs --own-pid 47516 reported MACHINE_BUSY solely for T3 preview browser PID 55164. A subsequent --wait used the unchanged default 60000 ms and ended on the same busy PID. Under Root's explicit 2026-10-18 instruction, compiler/Jest runs were not launched and current-head validation relies on CI. The new regression is therefore added but not claimed as locally passed; the 226-pass result above belongs to the initial head. No process was stopped, extra exclusion added, timeout raised, or shared dependency/root-checkout file changed. Local review logs: .tmp/group-b-review-idle.log, .tmp/group-b-review-scanner.json, .tmp/group-b-review-full.json, .tmp/group-b-review-ledger.log.
