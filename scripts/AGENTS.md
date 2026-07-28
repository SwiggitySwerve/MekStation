# Script Surface Guide

## OVERVIEW

- Mixed TypeScript, JavaScript, MJS, Python, and shell tooling.
- Keep executable contracts deterministic and compatible with package scripts and CI callers.

## STRUCTURE

- `qc/` owns registry, journey, scenario, command-slice, lifecycle, and release-proof validators.
- QC evidence must be domain-backed where required; synthetic projections are not release proof.
- Flow audits and UX walkthroughs produce review evidence only; they are never merge authority or PR gates.
- Target flow-audit runs to one project/flow; do not run every flow unfiltered.
- Scenario-pack recapture is generator-mined only; do not hand-author packs or broaden comparators.
- `next/run-next.mjs` is the Next CLI wrapper; preserve its build memory and known-output filtering.
- `playwright/run-playwright.mjs` is the Playwright wrapper; `--prod-evidence` builds/serves the standalone app on port 3600.
- Do not kill unrelated browser sessions or treat production-evidence output as ordinary dev output.
- `maintenance/scan-maintenance.mjs` owns the maintenance baseline/regression gate; update baselines only with audit evidence.
- `mm-data/` owns record-sheet asset checks and fetches; `check-assets.js` is postinstall and intentionally non-blocking.
- `mm-data/validate-assets.ts --strict` is the failing asset gate; fetching assets mutates `public/record-sheets`.
- `megameklab-conversion/` owns MTF/BLK conversion and schema-bridge validation for canonical equipment data.
- Conversion writes validate against `public/data/equipment/_schema/` by default; do not disable validation casually.

## WHERE TO LOOK

- Invocation contracts: `../package.json`; CI consumers: `../.github/workflows/`.
- Executable gate tests: `__tests__/`; QC registries/baselines: `../docs/qc/`.
- Asset manifest: `../config/mm-data-assets.json`; generated contracts: `../src/types/contracts/generated/`.

## CONVENTIONS

- `src/types/contracts/generated/*.zod.ts` is generated; never hand-edit it. Use `npm run schema:gen`.
- Use `npm run schema:gen-check` to detect generated-schema drift without rewriting files.
- Large JSON reports in this tree and `validation-output/` are evidence/artifacts, not source-of-truth.
- Do not commit fresh run output or screenshots merely to make a validator green.
- Preserve manifests, baselines, and report schemas; consumers depend on their exact shape and version fields.

## Validation modes

- Prefer focused validator commands before `npm run verify:qc` or `npm run verify:full`.
- Strict validators fail loudly and belong in CI; warnings-only reports do not establish release readiness.
- `check-assets.js` must remain fast and return success when optional assets are absent.
- Flow-audit, UX-walkthrough, and recapture commands are evidence tools, not CI gates unless an explicit workflow says otherwise.
- Never replace a real API/engine proof with a synthetic projection or a parallel mock implementation.
- When a command emits a report, record the command and inspect the report before claiming success.

## ANTI-PATTERNS

- `megameklab-conversion/README.md` contains historical `mekstation-app/data`, PostgreSQL, and default-weapon wording; verify paths against current code.
- Current schema roots are repository-relative `public/data/equipment/_schema/` and generated Zod contracts under `src/types/contracts/generated/`.
- Do not resurrect removed `mekstation-app/` paths or treat tracked historical reports as live datasets.
- `monitor-file-sizes.sh` still searches a removed `mekstation-app` tree; do not use it as authoritative modularity evidence.
- Do not replace real API/engine proof with synthetic projection, run all flow audits unfiltered, or regenerate reports to hide a failure.

## COMMANDS

- Read and validate first: `npm run qc:validate`, focused `scripts/qc/* --validate`, and `npm run maintain:scan:gate`.
- Run `npm run validate:assets:strict` only when asset completeness is in scope.
- Run `npm run fetch:assets` only with explicit intent; prefer
  `npm run fetch:assets:local` when local archives may satisfy the request.
- Run conversion scripts only against an intentional input/output set; inspect diffs and reports afterward.
- Do not use broad cleanup, report regeneration, or asset fetching to resolve unrelated failures.
