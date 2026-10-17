## Why

TypeScript 7.0, the native Go compiler, is the current npm `latest`. On this repository it type-checks the root project in about 4 seconds; TypeScript 5.8 takes about 34 seconds. That is the slowest step in the pre-commit hook and in the CI `Type Check` job.

TypeScript 7.0 ships no JavaScript compiler API: `require('typescript')` returns only `{ version }`. The replacement API is planned for 7.1, which has no date yet. Upstream's supported setup is to run TypeScript 7 for `tsc` and keep the TypeScript 6 compatibility package installed under the `typescript` name for tools that still load the API.

Waiting for 7.1 is unnecessary. Most of what loads the API here can be replaced now with tools the repository already uses. That leaves three files that only parse source, and they can stay on TypeScript 6 until 7.1 ships. The measurements behind this change are in `design.md`.

## What Changes

- Prepare on the current compiler first, with no version change:
  - Fix the 11 type errors TypeScript 7 reports.
  - Remove the tsconfig options that TypeScript 6 and 7 removed or deprecated: `target: es5`, `baseUrl`, `moduleResolution: node`.
  - Move `terminology:*` from `ts-node` to `tsx`.
  - Move desktop Jest from `ts-jest` to `@swc/jest`.
- Pass through TypeScript 6.0 as a checked bridge with no `ignoreDeprecations`.
- Root package:
  - Run every type-check gate on TypeScript 7 through an explicit entry point: `npm run typecheck`, the lint-staged pre-commit type check, the CI `Type Check` job, and `scripts/qc/roadmap-main-proof.mjs`.
  - Keep `typescript` aliased to the TypeScript 6 compatibility package, used only by tools that load the API.
- Move the desktop package to plain TypeScript 7. It has no API consumer left once `ts-jest` is gone.
- Add a guard that fails if any type-check gate resolves a compiler whose major version is not 7.
- Update the CI contract token, the pre-commit and roadmap test pins, and the docs that name the old command or version.
- Later: remove the TypeScript 6 alias once TypeScript 7.1 ships its API (`tasks.md` section 6, which is deferred).

## Capabilities

### New Capabilities

- `typescript-toolchain`:
  - which compiler each type-check gate runs;
  - how API consumers are isolated from it;
  - that tsconfig files carry no removed or deprecated options;
  - that desktop emit stays equivalent.

### Modified Capabilities

- `bv-validation-tooling`: name `npm run typecheck` as the compiler gate that checks the BV harness and its index schema, implementing OD-scripts-tsconfig option (a).

## Non-goals

- Upgrading Next.js. That is owner decision OD-next-upgrade; `next build` keeps type-checking through the TypeScript 6 alias unless the owner rules otherwise.
- Adopting `ts-rust` / `tsc-rs`, which is experimental.
- Changing type-level strictness, or fixing anything beyond what the compiler migration requires.
- Rewriting the parser-only scripts against a different parser.

## Impact

- Root and `desktop/` `package.json` and lockfiles; root, `scripts/`, `desktop/` and `desktop/tsconfig.test.json` configs.
- About 3 source files for the 11 type errors.
- `.github/workflows/pr-checks.yml`, `.husky/pre-commit` comment, `scripts/qc/openspec-ci-contracts.mjs`, `scripts/qc/roadmap-main-proof.mjs`, and two tests that pin the old command.
- README and three `docs/development/` pages.
- Expected speedup:
  - pre-commit type check: about 34s → about 4s;
  - CI `Type Check` step: about 50s → under 10s;
  - desktop type check: near zero.
