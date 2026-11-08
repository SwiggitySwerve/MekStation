## Implementation

- [x] 1. Record failing awarded-unit UI, cached-projection and decline tests.
- [x] 2. Implement shared enrollment evidence and acceptance projection.
- [x] 3. Guard decline before mutation and preserve enrollment persistence.
- [x] 4. Verify solo and co-op host acceptance, reload and guest refusal.
- [x] 5. Kill unconditional awarded-to-accepted and missing-decline-guard mutants.
- [x] 6. Run full lane gates and record exact results before the draft PR.

## Recorded evidence

Validation uses Node 22.22.0, matching the installed SQLite binary. No shared
dependencies or machine settings were changed. Logs are retained locally in
`E:/Projects/Personal/_scratch/sm-audit-reports/k5-evidence/`.

- Red: full bay/store directories, 5 expected failures and 442 passes; full
  campaign API directory, 2 expected failures and 183 passes.
- First green: all affected directories, 58 suites and 689 tests passed.
- Final affected directories plus engine, replay/digest/golden suites: 159
  suites and 2,241 tests passed, with no fixture or digest changes.
- Baseline replay/digest suites: 67 suites and 1,015 tests passed; baseline
  engine/golden directory: 34 suites and 535 tests passed.
- Integration, full runner directory and unit-lint Jest suite: 202 suites,
  2,124 tests passed, 32 skipped.
- `npm run validate:combat`: 79 suites and 2,095 tests passed, zero unresolved
  rows, and strict OpenSpec validation passed.
- Both TypeScript configs passed through `npm run typecheck`.
- Root lint: 63 warnings, zero errors. Unit lint: 17,077/17,085, all per-path
  ceilings passed. No ceilings changed.
- Full `npx oxfmt --check .`: 9,084 files passed.
- Strict OpenSpec: 247 items passed. OpenSpec CI quality: zero errors.
- Final budget check: 3,044 files, 57 unkeyable, 91 repo-wide; passed.

## Mutation proof

Mutants ran through isolated Jest module mappings, so concurrent gates always
used the real source tree. Neither mutant was applied to repository files.

1. Restoring unconditional `awarded → accepted` failed
   `SalvageAcceptancePanel.test.tsx`: **allows accepting an awarded unit before
   enrollment**. The test observed disabled Accept. The full bay directory had
   1 failure and 35 passes.
2. Removing the enrolled-decline guard failed `campaignBayActions.test.ts`:
   **refuses decline after enrollment without mutating or saving** and
   **refuses decline for a campaign-bound roster entry without force membership**.
   Both observed `applied: true` instead of refusal. The full store directory
   had 2 failures and 410 passes.

No committed fixture, digest, replay schema, combat source citation, salvage
engine or salvage processor file changed. K3's processed-allocation dedupe stays
in place. Hosted CI and Root merge remain separate from local verification.
