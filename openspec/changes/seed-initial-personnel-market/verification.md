# D-5 verification

Base: fetched origin/main c85f2912c11c06e2eeb3afabdb2543128f56d6e2.
Before final gates, fast-forwarded to fetched main
32b8d580288c9ca5c510893b28af153e2fd3bc10, including D-4, without conflicts.
Root approved creation seeding, deterministic IDs and local legacy fallback;
Root explicitly declined a preset change. Dependencies installed with npm ci.

## Regression and mutation evidence

- Before production edits, creation and identity tests failed: 2 suites,
  7 failed / 4 passed. Local and host creation both lacked recruits; repeated
  seeded generation differed in offer IDs. Four initializer cases additionally
  failed because the new initializer did not yet exist. Attribute-roll coverage
  passed unchanged.
- Before production edits, all 69 replay/digest/golden suites passed:
  1,062 tests, zero snapshot updates.
- Before the compatibility refinement, all six targeted suites passed: 62 tests. They cover
  local/host creation before save, both serializer round trips, disabled Standard,
  guest mirrors, saved and empty pools, legacy seed fallback, unchanged attribute
  draws, first-day carry-over, local first-open recovery, host projection and
  durable HireOffer derivation, consumption and duplicate retry.
- Creation mutant: removed the store action's initializer call. The local and
  host cases failed; disabled Standard and guest cases passed (2 failed / 2 passed).
- Identity mutant: restored Date.now/Math.random offer IDs. Complete-offer
  determinism, initial/daily stream equivalence and legacy seed fallback failed
  (3 failed / 4 passed).
- Both production files were restored byte-for-byte to the targeted-green tree
  after mutation testing. No mutant remains.
- Final review found that marking a disabled market as an empty pool would block
  local first-open generation after enabling it. The compatibility red run failed
  the disabled identity, default absence and enable-later cases (3 failed / 1
  passed, with 20 unselected tests skipped). The market owner now shares its
  disabled-style predicate and leaves disabled campaigns unchanged.

The initial setup attempts could not load partially installed Next modules and
are not counted as test evidence. The early broad replay attempts were stopped;
the completed 69-suite baseline above ran after installation, using every
matching test file enumerated from src, scripts and openspec.

## Required gates

On the initial base, the post-change replay set also passed 69 suites / 1,062
tests. Both TypeScript configs, root lint (63 warnings / zero errors), lint-units
and CI budgets (57 unkeyable / 92 repo-wide) passed. Unfinished directory and
combat runs were stopped before updating main; those partial runs are not
completion evidence. Final gates below apply to the combined tree.

- Final combined tests: all 324 affected-directory suites (including integration,
  simulation runner and the lint-units suite) and all 69 replay/digest/golden
  suites passed. All 390 unique suites passed: 4,818 tests passed / 32 skipped,
  zero failures and zero snapshot updates. The final manifest comparison found
  zero missing expected suites; the overlapping groups share three suites.
- Final replay/digest/golden subset: 69 unique suites / 1,077 passed tests. The
  additional 15 tests relative to the initial baseline came from merged main.
  No committed fixture or digest changed and no snapshot was regenerated.
- Both TypeScript configs passed through npm run typecheck.
- Root lint passed with 63 warnings and zero errors.
- Lint-units passed at 17,079 / 17,085 with no ceiling changes; its full Jest suite
  also passed in the directory gate.
- CI budgets passed: 57 unkeyable tests and 92 repo-wide keys. No budget changed.
- Strict OpenSpec passed all 290 items. OpenSpec QC accounted for 69 / 69 active
  changes with zero errors.
- Full formatting check passed across 9,210 files in the repository's configured
  scope. OpenSpec is excluded by .oxfmtignore and has its own strict validators.
- The final npm run validate:combat run passed 79 suites / 2,107 tests, all gap
  inventory and out-of-scope checks, and strict OpenSpec validation.

The complete combined test set and static gates above passed after the final
disabled-market compatibility refinement. No local gate remains pending.

## Compatibility and boundaries

- A stock co-op campaign on the Standard preset has no personnel market by
  design; co-op hiring needs a market-enabled preset. No preset was changed.
- No save migration, schema version, event payload, wire format, committed replay
  fixture or digest file changed. Existing IDs and exhausted pools remain intact.
- Guest market delivery remains deferred. No co-op mission launch or participation
  work is included.
- CampaignCoopEntryPanel.tsx and campaignAcceptContractCommand.ts are untouched.
