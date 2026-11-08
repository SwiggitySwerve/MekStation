## 1. Implement and verify active-change accounting

- [x] 1.1 Record failing format, CI and cited-revision provenance tests.
- [x] 1.2 Implement one shared format owner and integrate both readers.
- [x] 1.3 Fetch main and generate exact colocated copies of the current inventory.
- [x] 1.4 Prove migration equality and kill `skip-colocated-metadata-validation`.
- [x] 1.5 Run the complete scripts and integration directories, typechecks,
  lint gates, formatting, CI budget and strict OpenSpec/CI checks.
- [ ] 1.6 Root: verify hosted CI, merge the draft PR, and update the external
  LANE-BRIEF. This implementation lane does not merge or edit that brief.

## Verification recorded before completion

- The targeted red run failed six accounting/migration tests; the new colocated
  citation test also failed before the reader change. The original two accounting
  suites then passed 94 tests; the provenance subset passed all ten selected cases.
- Fresh main `4d20a248e69e67dfad40f115e4c949d131505684` supplied 28 migrated
  entries. The independent normalized inventories are identical: 21,184 bytes,
  SHA-256 `6bb240f9c6b3374bc7e339fae7e9e89bba3b6ff6b4b5d298d854b061910e1c7b`.
- `skip-colocated-metadata-validation` bypassed the parser's metadata validator.
  Three colocated-only metadata tests failed; the production source was restored.
  Tests with a valid legacy duplicate alone had not discriminated this mutant,
  so the colocated-only cases were added before the successful mutation run.
- The complete `scripts/__tests__` and `src/__tests__/integration` Jest run passed
  199 suites and 3,093 tests (49 existing skips). The scripts Node suites passed
  157 tests; Python discovery passed 337 tests.
- After merging main `060409496864a508cd69c58aa0c510b8459f2dbb`, the integration
  directory rerun passed 51 suites and 622 tests (32 existing skips). Later
  legacy-only additions are accepted: OpenSpec CI accounts for all 31 active changes.
- Root/scripts and desktop TypeScript checks passed. Root lint remains at 63
  warnings; every unit-lint ceiling passed, including its Jest suite. Formatting
  passed, the CI budget stayed at 57 unkeyable tests, and strict OpenSpec validation
  passed all 252 items. The eight metadata tests passed after restoring the mutant.
