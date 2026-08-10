# PROOF-6B0 solo-provenance implementation report

## Outcome

Implemented the spec-declared `solo-maintainer|<owner>` provenance reduction. Sentinel citations now require an exact one-collaborator repository, owner authorship, owner merger identity for merged citations, and exact `ADMIN` permission. Non-sentinel citations retain the existing strict approval path byte-for-byte.

All declared rows are reachable; no mutant or shadowing-guard disposition was required.

## Scope

- `scripts/qc/camp01-github-provenance.mjs`
- `scripts/__tests__/camp01-github-provenance.test.ts`
- `openspec/changes/add-camp01-authority-receipts/design.md`
- This report

Non-report diff: 121 insertions, 4 deletions across 3 implementation files. The 90-160 code-line band is satisfied.

## Verification tails

### Focused provenance Jest

```text
    √ rejects writer boundary preflight / writer-registry-drift exactly (905 ms)
    √ rejects writer boundary preflight / malformed-writer-facts exactly (1447 ms)
Test Suites: 1 passed, 1 total
Tests:       63 passed, 63 total
Snapshots:   0 total
Time:        67.428 s, estimated 69 s
Ran all test suites within paths "scripts/__tests__/camp01-github-provenance.test.ts".
```

### CAMP-01 authority receipt umbrella Jest

```text
PASS unit scripts/__tests__/camp01-authority-receipt-validator.test.ts
PASS unit scripts/__tests__/camp01-anchor-authority.test.ts (25.543 s)
PASS unit scripts/__tests__/ux-walkthrough-recorder-privacy.test.ts
PASS unit scripts/__tests__/camp01-github-provenance.test.ts (68.966 s)
Test Suites: 22 passed, 22 total
Tests:       9 skipped, 671 passed, 680 total
Snapshots:   0 total
Time:        474.947 s
```

### Strict OpenSpec validation

```text
✓ spec/unit-validation-framework
✓ spec/unit-versioning
✓ spec/user-identity
✓ spec/utility-patterns
✓ spec/validation-patterns
✓ spec/validation-rules-master
✓ spec/vault-sync
✓ spec/vehicle-unit-system
✓ spec/weapon-resolution-system
✓ spec/weapon-system
✓ spec/weight-class-system
Totals: 238 passed, 0 failed (238 items)
```

### OpenSpec CI quality

```text
> mekstation-app@0.1.1 qc:openspec-ci:validate
> node scripts/qc/validate-openspec-ci-quality.mjs

[qc:openspec-ci] workflowContracts=8/8 aggregatorNeeds=17/17 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=21 accountedActiveOpenSpecChanges=21 errors=0
```

### Format check

```text
> mekstation-app@0.1.1 format:check
> oxfmt --check .

Checking formatting...

All matched files use the correct format.
Finished in 7406ms on 6963 files using 16 threads.
```

### Lint

```text
  help: Maximum allowed is 400.

  ! eslint(max-lines): File has too many lines (528).
     ,-[src/stores/useGameplayStore.ts:775:4]
 774 |   previousPhaseForAttackPlan = nextPhase;
 775 | });
     :    ^
     `----
  help: Maximum allowed is 400.

Found 73 warnings and 0 errors.
Finished in 995ms on 3398 files with 65 rules using 16 threads.
```

## Non-report numstat

```text
2	0	openspec/changes/add-camp01-authority-receipts/design.md
116	3	scripts/__tests__/camp01-github-provenance.test.ts
3	1	scripts/qc/camp01-github-provenance.mjs
```
