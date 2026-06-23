## Context

`docs/qc/maintenance-baseline.json` is a regression gate for `src`, not a full repo-wide debt ledger. The live scoped gate reports 0 critical/high findings and advisory-only `src` file-bloat/near-duplicate entries, while the full-repo scanner still reports tooling and e2e debt in stale TODO, file-bloat, near-duplicate, and design-violation categories. `docs/qc/mekstation-qc-registry.json` already has a `maintenance-code-health` top-level surface, but it has no OpenSpec contract and no machine-checked ledger for accepted or follow-up warning inventory.

## Goals / Non-Goals

**Goals:**

- Make `maintenance-code-health` a first-class OpenSpec capability.
- Store the reviewed repo-wide scanner inventory in `docs/qc/maintenance-warning-ledger.json`.
- Add a validator that re-runs the requested scanner categories and fails when non-`src` actionable findings are not represented in the ledger.
- Keep the existing `maintain:scan:gate` as the `src` regression gate and lower the baseline to the current 0 critical/high state.
- Remove stale explanatory TODO-like e2e comments that are not active work.

**Non-Goals:**

- Refactor `scripts/validate-bv.ts`, MegaMek conversion scripts, e2e page objects, or desktop local service classes.
- Change scanner thresholds or suppress findings by weakening scanner logic.
- Make advisory `src` file-bloat and near-duplicate info entries blocking.

## Decisions

1. Use a ledger artifact instead of embedding decisions in prose.

   The ledger will carry stable finding keys, category, scope, severity, status, rationale, and follow-up references. This lets a validator compare live scanner output against reviewed accounting without scraping markdown. Alternative considered: append more notes to `mekstation-qc-map.md`. Rejected because prose cannot reliably fail a build when new actionable debt appears.

2. Validate only the Wave 12 scanner categories for full-repo accounting.

   The validator will cover stale TODO, file-bloat, near-duplicate, import-health, and design-violation because those are the categories in this wave. Alternative considered: enforce all scanner categories repo-wide. Rejected because the `src` gate already covers critical/high regression and other categories need their own cleanup wave to avoid mixing unrelated debt.

3. Keep `src` advisory info out of the ledger.

   The live `src` gate has no medium/warn/high/critical findings for the requested categories and reports only file-bloat/near-duplicate info. The ledger will focus on repo-wide non-`src` actionable findings plus explicit zero-current categories. Alternative considered: enumerate all 370 info findings. Rejected because it would create noisy churn without improving the pass/fail maintenance question.

4. Treat current e2e `fixme` entries as tracked test-skip debt.

   Recent `fixme` entries in `e2e/audit-capture.spec.ts` link to the remediation tracker and remain visible as skipped tests. Explanatory `WORKAROUND` comments in e2e tests will be rewritten so the stale-TODO scanner stops treating them as active maintenance debt. Alternative considered: remove or unskip the audit-capture tests. Rejected because those are product-scope decisions outside this housekeeping wave.

## Risks / Trade-offs

- Ledger drift -> Mitigated by a validator that recomputes stable keys from live scanner output.
- False-positive scanner findings in e2e page objects or one-off analysis scripts -> Mitigated by requiring an `accepted` or `follow-up` rationale instead of suppressing the scanner.
- Baseline confusion -> Mitigated by lowering `criticalHigh` to 0 and documenting that the baseline is only the `src` regression gate.
- Overfitting to current paths -> Mitigated by keying ledger entries from category, file, severity, and scanner message rather than line number alone.

## Migration Plan

1. Add the maintenance ledger and validator script.
2. Wire `verify:qc:maintenance` to run both the existing `maintain:scan:gate` and the new ledger validator.
3. Update QC docs/registry/graph/scenarios to expose the ledger and command.
4. Run focused validator tests, `verify:qc:maintenance`, `qc:validate`, and OpenSpec strict validation.
5. Archive the change after verification passes.
