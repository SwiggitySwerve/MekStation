# Customizer CI gate final notes (scratch)

The reconciled PR gate selects exactly three files and ten Chromium cases:

- `e2e/customizer-equipment-catalog.spec.ts`: 3 cases
- `e2e/customizer-record-sheet-rendering.spec.ts`: 5 cases
- `e2e/customizer-edit-recovery.spec.ts`: 2 cases

Its exact browser command is:

```text
node scripts/playwright/run-playwright.mjs test e2e/customizer-equipment-catalog.spec.ts e2e/customizer-record-sheet-rendering.spec.ts e2e/customizer-edit-recovery.spec.ts --project=chromium --retries=0 --trace=retain-on-failure
```

The `customizer-regressions` job is bounded to 20 minutes, requires `detect-changes` and `install-deps`, has no job-level `if`, leaves `continue-on-error` absent or literal `false`, and is required by the `lint-and-test` aggregator. Its working steps use the exact code/e2e conditions and the validator checks parsed YAML executable `run`, `env`, and `with` fields plus step order and artifact upload. The production build uses `NEXT_PUBLIC_E2E_MODE=true` and `NEXT_PUBLIC_E2E_TEST=true`; the standalone browser server uses `MEKSTATION_E2E_SERVER_COMMAND='node .next/standalone/server.js'` and `HOSTNAME='127.0.0.1'`.

The nightly `e2e-full` lane performs strict asset validation and the same production build environment while retaining its `timeout-minutes: 180` bound.

Local production evidence: all 10 cases passed in about 69 seconds with one worker against the hydrated standalone server on port 3636. The run is recorded in `../../2026-09-16-evidence-distilled/spec-reconciliation-20260912.md` (formerly `.sisyphus/spec-reconciliation-20260912/browser-production-ip.log`). Strict asset validation reported config/manifest `v0.3.1`, 554 expected, 554 present, and 0 missing. That proves configured asset presence for the checkout; it does not prove cache freshness or asset provenance.

Remote pull-request execution and aggregator observation remain unchecked (OpenSpec task 5.4).
