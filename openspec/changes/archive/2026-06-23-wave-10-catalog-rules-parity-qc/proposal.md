## Why

The catalog/rules parity implementation is already archived, but the QC layer still relied on separate commands and stale human-readable evidence. Wave 10 needs a single on-demand gate that proves the current BattleMech combat catalog claims are wired to live validators, current gap counts, and source anchors without archived OpenSpec refs or old out-of-scope totals hiding drift.

## What Changes

- Add a `qc:combat:catalog-rules:validate` command that validates combat catalog QC surfaces, source anchors, stale active-change refs, and the current out-of-scope expectation contract.
- Wire the combat catalog QC gate into top-level `verify:qc`, `verify:rules`, and a focused `verify:qc:combat:catalog-rules` command.
- Refresh combat QC registry/map evidence from the stale 140 out-of-scope row wording to the live 147-row split.
- Add regression tests proving the validator rejects stale OpenSpec refs, stale gap expectations, missing anchors, and missing required combat surfaces.

## Non-goals

- Do not rewrite the combat runner or catalog support maps.
- Do not broaden BattleMech catalog parity into non-BattleMech support claims.
- Do not replace `validate:combat`; the new QC gate orchestrates and guards evidence discoverability before the deeper suite runs.

## Impact

- Affected scripts: `scripts/qc/validate-combat-catalog-rules-parity.mjs`, `package.json`.
- Affected tests: `scripts/__tests__/combat-catalog-rules-parity-qc.test.ts`.
- Affected docs: `docs/qc/mekstation-qc-registry.json`, `docs/qc/mekstation-qc-map.md`.
- Affected specs: `combat-catalog-rules-parity`.
