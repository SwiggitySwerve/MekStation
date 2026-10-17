## Working rules for the implementer

- **One PR per numbered section.** Branch each one off fresh `origin/main`; sections 1-4 must land in order. Read `design.md` before starting. Its inventory lists every file to touch, and the measurements tell you what to expect.
- **Measuring TypeScript 7 or 6 without touching the repo's `node_modules`.** Install the compiler into a scratch prefix and call it by path:
  - Command: `npm i --prefix <tmp> typescript@7`, then `node <tmp>/node_modules/typescript/bin/tsc -p tsconfig.json --noEmit --skipLibCheck`.
  - **Never** trust `npx tsc` once `@typescript/typescript6` is installed anywhere in the tree (`design.md` D4).
  - Always print `--version` alongside a measurement.
- **Do not edit historical evidence.** That means:
  - test-file comments that say "`npx tsc --noEmit` fails";
  - `docs/qc/*.json`;
  - archived plans, audits and council decisions.
- **Every PR passes:**
  - `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test:stable`;
  - `npx openspec validate --all --strict`, `npm run qc:openspec-ci:validate`;
  - in `desktop/`: `npm run type-check`, `npm test`.
- **Sections 3 and 4 additionally pass** `npm run build` and `npm run storybook:build`.

## 0. Baseline (no PR)

- [x] 0.1 Record baseline numbers on current `main`, with `--version` printed for each:
  - wall-clock time for `npm run typecheck` (cold, after deleting `tsconfig.tsbuildinfo`, and warm);
  - wall-clock time for `desktop/ npm run type-check`;
  - the CI `Type Check` step duration from the latest green `main` run;
  - the desktop Jest test count.
- [x] 0.2 Re-run TypeScript 7 and 6 from a scratch prefix against current `main` with the D2 config edits applied in a scratch copy. Replace the error list in `design.md` Context if it changed. Do not commit anything from this step.

## 1. Code and config prep that is valid on 5.8 (PR 1)

- [x] 1.1 Fix the 9 `Uint8Array<ArrayBufferLike>` → `BufferSource` errors in `src/lib/multiplayer/server/auth.ts` and `src/services/vault/IdentityService.ts`.
  - Type the producing helpers as `Uint8Array<ArrayBuffer>`, for example by allocating from an `ArrayBuffer`. Do not add casts at the call sites.
  - Existing tests for both files must pass unchanged.
  - Outcome: on the D2 scratch config TypeScript 7.0.2 reported the 11 errors in Context; the 9 listed here hid 3 more behind the first bad argument of a call (`IdentityService.ts` `verifySignature` `data`, `encryptWithPassword` `data`, `decryptWithPassword` `ciphertext`), so 12 arguments were fixed. Besides the producing helpers, the exported parameters of `signData`, `verifySignature` and `encryptWithPassword` are typed as the lib `BufferSource`: on 5.8 this also admits `ArrayBuffer` and `DataView`, which Web Crypto accepts. A `Uint8Array<ArrayBuffer>` parameter is impossible on 5.8 without casts. Four callers narrow an existing `Uint8Array` annotation to `Uint8Array<ArrayBuffer>`: `campaignGrantToken.ts`, `redeemCampaignGrant.ts`, `campaignRedeemRoute.test.ts` and `campaignShareAndRedeem.test.ts`. With 1.2, TypeScript 7.0.2 and 6.0.3 then report 0 root errors on that config, and the emitted JavaScript is byte-identical on 5.8.
- [x] 1.2 Fix the 2 `TS2322` errors in `src/lib/events/checkpoints/BranchCheckpointCache.ts`:
  - give the literal `path` its literal type (`as const` or an annotated constant);
  - do not widen the `Readonly<...>` target type.
- [x] 1.3 Apply the root `tsconfig.json` edits from D2:
  - `target: "es2017"`;
  - delete `baseUrl`;
  - `paths: { "@/*": ["./src/*"] }`.
  - **Verify that `@/` still resolves everywhere:**
    - `npm run typecheck`;
    - one Jest suite that imports `@/` (root Jest maps `@/` through `moduleNameMapper`);
    - `npx tsx` on one `src`-importing script;
    - `npm run build`;
    - `npm run storybook:build`.
  - Then run `next dev` once and confirm Next did not rewrite `tsconfig.json`.
- [x] 1.4 Apply the `desktop/tsconfig.json` edit from D2 (`module` / `moduleResolution: "nodenext"`).
  - Prove the emit is unchanged: build `desktop/` before and after into two directories, and diff every `.js` file byte for byte. `.map` and `.d.ts` differences are acceptable; list them in the PR.
  - Run `npm run electron:test`.
- [x] 1.5 Confirm TypeScript 7.0.x (scratch prefix) reports **0 errors** for root, `desktop/tsconfig.json` and `desktop/tsconfig.test.json`.
  - `desktop/tsconfig.test.json` was not measured in the 2026-10-16 trial.
  - Record the compiler versions and times in the PR body.

## 2. Remove replaceable compiler-API consumers (PR 2)

- [x] 2.1 Change `terminology:validate`, `terminology:validate:strict`, `terminology:fix` and `terminology:fix:dry-run` from `npx ts-node` to `npx tsx`.
  - Fix the usage comment in `scripts/compare-pip-distributions.ts`.
  - Prove that `npm run terminology:validate` gives the same output before and after.
- [x] 2.2 Remove `ts-node` from root `devDependencies` (D6).
  - Lockfile check: `npm ls ts-node` shows only optional-peer references, if any.
- [x] 2.3 Desktop: replace `ts-jest` with `@swc/jest` per D5.
  - Add `@swc/core` and `@swc/jest` to `desktop/package.json`; state the reason in the PR body.
  - Configure the decorator and CommonJS options.
  - Add `tsc -p tsconfig.test.json --noEmit` to desktop `type-check`.
  - Prove the test count matches 0.1 and all tests pass.
- [x] 2.4 Storybook: prove it needs no TypeScript API.
  - Run `npm run storybook:build`, then confirm that the autodocs prop tables for one component with typed props are populated.
  - If docs depend on `react-docgen-typescript`, set `typescript: { reactDocgen: 'react-docgen' }` in `.storybook/main.ts`, check that the tables are still useful, and record the outcome here.
  - Outcome: no `reactDocgen` change. Storybook 8.6.18 already defaults `typescript.reactDocgen` to `'react-docgen'` (Babel). `storybook build` never loads `react-docgen-typescript` or its Vite plugin, and the `OverwriteConfirmDialog` autodocs table lists all six typed props with their types and JSDoc descriptions. `.storybook/main.ts` is unchanged.
- [x] 2.5 Implement owner decision OD-scripts-tsconfig (`design.md`), once the owner has ruled.
  - Option (a): narrow the include list, make it clean, add it to the root `typecheck`, and name `npm run typecheck` in the `bv-validation-tooling` scenario.
  - Option (b): delete the file, prove every `validate:*` script still runs under `tsx`, and modify the `bv-validation-tooling` "IndexUnit interface matches the real index schema" scenario through a delta spec in this change.

## 3. TypeScript 6.0 bridge (PR 3)

- [x] 3.1 Set root and `desktop/` to the unaliased `"typescript": "^6.0.3"`, then reinstall both lockfiles.
- [x] 3.2 Prove there are 0 errors and no `ignoreDeprecations` anywhere:
  - `grep -r ignoreDeprecations --include=tsconfig*.json .` excluding `node_modules`, which must find nothing;
  - `npm run typecheck`;
  - `desktop/ npm run type-check`.
- [x] 3.3 Prove every API consumer works on TypeScript 6:
  - `npm run build`, which includes Next's type check;
  - `npm run storybook:build`;
  - `node scripts/maintenance/scan-maintenance.mjs`, run with its normal arguments;
  - `node scripts/qc/validate-flow-audit.mjs`;
  - `scripts/__tests__/ux-walkthrough-recorder-privacy.test.ts`;
  - the full root and desktop Jest runs.

## 4. TypeScript 7 for every type-check gate (PR 4)

- [x] 4.1 Root `devDependencies` per D3:
  - `"typescript": "npm:@typescript/typescript6@^6.0.2"`;
  - `"typescript7": "npm:typescript@^7.0.2"`.
  - Check the current upstream versions first.
  - Then confirm which package owns `node_modules/.bin/tsc`, and record it in the PR body.
- [x] 4.2 Set desktop `devDependencies` to `"typescript": "^7.0.2"`, unaliased.
  - Prove `desktop/node_modules/.bin/tsc --version` prints 7.x.
  - Prove `npm run build` emit is byte-identical in `.js` to the section 1 baseline.
- [x] 4.3 Route every root gate through the explicit entry point (D4):
  - `scripts.typecheck` = `node node_modules/typescript7/bin/tsc --noEmit --skipLibCheck && node node_modules/typescript7/bin/tsc -p scripts/tsconfig.json --noEmit`;
  - lint-staged `*.{ts,tsx}` last entry = `bash -c 'npm run typecheck'`.
    - Keep the `bash -c` wrapper. lint-staged appends the staged filenames to the command, and `tsc` ignores `tsconfig.json` when it is given file arguments.
  - `.github/workflows/pr-checks.yml` `Type Check` step `run: npm run typecheck`;
  - `scripts/qc/roadmap-main-proof.mjs` tsc step argv = `['node', 'node_modules/typescript7/bin/tsc', '--noEmit']`;
  - `scripts/metrics/validate-refactoring-metrics.js:216` = `npm run typecheck`;
  - update the `.husky/pre-commit` comment.
- [x] 4.4 Update the pins:
  - `scripts/qc/openspec-ci-contracts.mjs` contract `typecheck-runs-typescript` token becomes `run: npm run typecheck`;
  - `scripts/__tests__/precommit-no-build.test.ts` `TSC_ENTRY`;
  - `scripts/__tests__/roadmap-loop-closure-proof.test.ts`: the fake binary path at ~1837 and the `tsc --noEmit` expectation at ~2129.
  - Do not loosen those assertions; repoint them.
- [x] 4.5 Add the guard test `scripts/__tests__/typescript-toolchain.test.ts` exactly as specified in D4.
  - Prove it fails when `scripts.typecheck` is temporarily pointed back at `node_modules/typescript/bin/tsc`, then restore it.
- [x] 4.6 Prove TS 6 still serves the API consumers by re-running the 3.3 list.
  - Prove `require('typescript').version` starts with `6.`.
  - Prove `require('typescript7/package.json').version` starts with `7.`.
- [x] 4.7 Record after-numbers against 0.1:
  - `npm run typecheck`, cold and warm (check the `incremental` risk in `design.md`);
  - desktop `type-check`;
  - the CI `Type Check` step on the PR.
  - Acceptance targets: root type check under 10s locally, and the CI step under 15s.
  - Local outcome: TypeScript 7.0.2 checks both root projects in 6.09s cold / 1.52s warm; desktop checks both projects in 0.49s. CI Type Check passed in 13s (PR #2192, run 39013571294, source head c6f2aaee3d499736e134a49233fd7efc7534abf9); S1B recorded 51s.

## 5. Docs and close-out (PR 5, or folded into PR 4)

- [x] 5.1 Update the docs:
  - `README.md` "TypeScript 5.8" becomes TypeScript 7;
  - `docs/development/getting-started.md:142` and `docs/development/troubleshooting.md:11` become `npm run typecheck`;
  - `docs/development/git-hooks.md:21` describes the new pre-commit entry.
  - Add one sentence to the getting-started doc about the optional `TypeScriptTeam.native-preview` VS Code extension.
- [x] 5.2 Note in `docs/development/troubleshooting.md` that `npx tsc` runs TypeScript 6 in the root package, and that `npm run typecheck` is the gate.
- [x] 5.3 Exact-main verification after the last PR merges:
  - rerun the section-0 measurements and the full gate list on the merge commit;
  - record them in this file.
  - Checkpoint `db607a7f` (2026-10-17; Node 22.22.0; TS7 7.0.2 / TS6 API 6.0.3): root two-project typecheck 6.96s cold / 1.89s warm; desktop type-check 0.61s. PR #2194 CI Type Check took 8s (run 39016629176); its head and this merge share tree `e0499dd7`, so this is inherited PR-head timing.
  - The full stable attempt hit the repeated Windows identity-capture child `ETIMEDOUT`. Root-approved split passed: that suite 52/52 alone, remaining stable lane 2796 suites / 37133 passed / 50 skipped. Full PR CI passed all six unit shards; desktop Jest passed 57/57.
  - Lint, format, OpenSpec/QC, unskipped Next build, Storybook (six typed props), flow audit, scripts TS7, BV, parity (4227/4227), terminology and desktop build passed. All 21 desktop JavaScript files match the section-1 baseline; map/declaration differences are listed in the sweep receipt. Scratch TS6/TS7 checks reported zero diagnostics for all four configurations.
  - Bare maintenance API scan passed. The stricter regression gate failed with 72 critical/high findings in 10 categories; Root reproduced identical 72/10 on pre-TS7 `08555b7a1` / TS5.8.3. This pre-existing backlog debt is outside TS7; no baseline or product change was made.
  - TS7S5B syncs the canonical specs and moves `design.md` into `archive/2026-10-17-migrate-to-typescript-7/`; TS7S5C then moves the remaining files, removes the active-ledger entry, and ticks 5.3 after verification.

## Follow-up after archive: TypeScript 7.1 (not tracked as checkboxes here)

This work becomes its own small change once 7.1 is released.

- 6.1 When TypeScript 7.1 ships its API (and Storybook docgen, if it used the TS API, and Next support it):
  - point `typescript` at `^7.1`;
  - delete the `typescript7` alias and set `scripts.typecheck` back to `tsc --noEmit --skipLibCheck`;
  - update the guard test and the CI contract token to match;
  - port the three parser-only files to the 7.1 API.
- 6.2 Re-run 7.1 against the repository before 6.1, and fix any new checker diagnostics in their own PR first.
