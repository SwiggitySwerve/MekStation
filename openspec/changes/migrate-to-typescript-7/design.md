## Context

**Measurements.** These were taken on 2026-10-16 in a scratch install against a checkout of `main` from that day. All probe files were removed afterwards. Line numbers are as of that day; re-run the compiler to get the current list rather than trusting these.

| Project | TS 5.8 today | TS 6.0.3, configs unchanged | TS 7.0.2, after the D2 config changes |
|---|---|---|---|
| Root `tsconfig.json` | 0 errors, ~34s | TS5101/TS5107 deprecation errors (`target: es5`, `baseUrl`); ~31-47s | 11 errors, 4.3s |
| `desktop/tsconfig.json` | 0 errors | deprecation error (`moduleResolution: node`) | 0 errors, 0.1s; JS emit byte-identical to 5.8 (27 `.map` files and 1 `.d.ts` differ) |
| `scripts/tsconfig.json` | 35 errors, gated by nothing | ~1,400 errors | ~1,400 errors |

**The 11 TypeScript 7 errors in the root project:**

- 9 × TS2769/TS2345: `Uint8Array<ArrayBufferLike>` is not assignable to `BufferSource`. Lines as of 2026-10-16:
  - `src/lib/multiplayer/server/auth.ts`: 215, 223.
  - `src/services/vault/IdentityService.ts`: 159, 165, 182, 188, 330, 355, 384.
- 2 × TS2322 in `src/lib/events/checkpoints/BranchCheckpointCache.ts` at 352 and 377: a literal `path` value is widened to `string` inside a `Readonly<...>` object.
  - TypeScript 7 reports these; TypeScript 6 does not.
  - A 7.1 nightly reports the same two.

**Why `scripts/tsconfig.json` explodes:** TypeScript 6 changed the default of `types` to `[]`, and the file sets `lib: ["es2020"]` while including `../src/**`. Nothing runs this config today:

- the root config excludes `scripts/**`;
- no CI job uses it;
- no script imports `@/`.

`tsx` reads it when running scripts, so deleting it changes which tsconfig `tsx` resolves. `tsx` would then find the root config.

**Who loads the TypeScript JavaScript API:**

| Consumer | Uses | Resolution in this change |
|---|---|---|
| `next build` type-check (Next 16.2.11) | full API | Keeps working through the TS 6 alias. OD-next-upgrade covers moving it to TS 7. |
| `ts-node`, used by `terminology:*` (`package.json:85-88`) | full API | Replace with `tsx`, already a dependency. Remove `ts-node`. |
| `ts-jest`, desktop Jest preset | full API | Replace with `@swc/jest`, which the root project already uses. Add `tsc -p tsconfig.test.json --noEmit` to keep test type-checking (D5). |
| `scripts/maintenance/scan-maintenance.mjs` | parser only: `createSourceFile`, `ts.is*`, `forEachChild` | Stays on the TS 6 alias until 7.1. |
| `scripts/qc/validate-flow-audit.mjs` | parser only | Same. |
| `scripts/__tests__/ux-walkthrough-recorder-privacy.test.ts` | parser only | Same. |
| Storybook 8.6 (`@storybook/react-vite`) | probably none | `.storybook/main.ts` sets no `reactDocgen`, so the default Babel-based `react-docgen` should be used. `react-docgen-typescript` is in the lockfile only as an optional peer. Prove it in task 4.5. The `@` alias is set in `viteFinal`, so removing `baseUrl` does not affect Storybook. |
| VS Code / tsserver | full API | Uses the workspace `typescript` (the TS 6 alias). The optional `TypeScriptTeam.native-preview` extension gives TS 7 in the editor. |

**Every place that pins the compiler command or version:**

- `package.json`:
  - `scripts.typecheck` (`tsc --noEmit --skipLibCheck`);
  - lint-staged `*.{ts,tsx}` entry (`bash -c 'npx tsc --noEmit --skipLibCheck'`);
  - `devDependencies.typescript`, `ts-node`.
- `.husky/pre-commit`: comment only.
- `.github/workflows/pr-checks.yml`:
  - the `typecheck` job, `run: npx tsc --noEmit`;
  - `desktop-typecheck` runs `npm run type-check` in `desktop/`.
- `scripts/qc/openspec-ci-contracts.mjs:60`: contract `typecheck-runs-typescript` requires the literal token `run: npx tsc --noEmit`.
- `scripts/qc/roadmap-main-proof.mjs:194-195`: runs `node node_modules/typescript/bin/tsc --noEmit`. **After the alias this silently runs TS 6.**
- `scripts/__tests__/roadmap-loop-closure-proof.test.ts`:
  - line 1837 fakes `node_modules/typescript/bin/tsc`;
  - line 2129 expects `tsc --noEmit` in the output.
- `scripts/__tests__/precommit-no-build.test.ts:10`: `TSC_ENTRY` pins the lint-staged string.
- `scripts/metrics/validate-refactoring-metrics.js:216`: `npx tsc --noEmit`.
- `desktop/package.json`: `build: tsc`, `type-check: tsc --noEmit`, `typescript`, `ts-jest`, `@types/node`.
- `desktop/jest.config.js`: `preset: 'ts-jest'` and transform.
- `openspec/specs/bv-validation-tooling/spec.md:406`: `npx tsc --noEmit` SHALL type-check the harness. **This is not true today**, because the root config excludes `scripts/**`. See OD-scripts-tsconfig.
- Docs:
  - `README.md` "TypeScript 5.8";
  - `docs/development/getting-started.md:142`;
  - `docs/development/git-hooks.md:21`;
  - `docs/development/troubleshooting.md:11`.
- Not to edit, because they are historical evidence:
  - comments in test files that say "`npx tsc --noEmit` fails";
  - `docs/qc/*.json` ledgers;
  - archived plans;
  - audits;
  - council decisions.

## Decisions

### D1. Bridge through TypeScript 6 before introducing 7

TypeScript 6 is the last JavaScript-implemented release. It emits as errors the deprecations that TypeScript 7 removes. If 6 is clean with no `ignoreDeprecations`, the configs are TS 7-ready. Running the existing toolchain on 6 also proves that every API consumer works under the version it will be pinned to.

### D2. Exact tsconfig changes

These all work on TypeScript 5.8, so they land in phase 0.

- **Root `tsconfig.json`:**
  - `target: "es2017"`. Next compiles with SWC, so `target` affects only type checking and downlevel diagnostics.
  - Delete `baseUrl`.
  - `paths: { "@/*": ["./src/*"] }`. Paths without `baseUrl` resolve relative to the tsconfig, which TypeScript has supported since 4.1.
- **`desktop/tsconfig.json`:** `module: "nodenext"`, `moduleResolution: "nodenext"`. Measured: the JS emit is byte-identical to the current `commonjs` + `node` output. `commonjs` + `bundler` also checks clean, but `nodenext` matches what Node actually does.
- **`scripts/tsconfig.json`:** depends on OD-scripts-tsconfig. If it is kept, at minimum delete `baseUrl` and use `paths: { "@/*": ["../src/*"] }`.
- **Next may rewrite the root `tsconfig.json`** on `next dev` or `next build`. After the change, run both and confirm that Next did not reintroduce `baseUrl` or a target that TypeScript 6 rejects.

### D3. Package layout after the migration

Root `package.json` `devDependencies`:

```json
"typescript": "npm:@typescript/typescript6@^6.0.3",
"typescript7": "npm:typescript@^7.0.2"
```

- The alias key `typescript7` is local to this repository. It is deliberately not under the `@typescript/` scope, so it cannot be mistaken for a real upstream package.
- Re-check the current version of `@typescript/typescript6` at implementation time. It must be the 6.0.x line and provide the full API.

`desktop/package.json`:

- `"typescript": "^7.0.2"`, unaliased. Once `ts-jest` is gone, nothing in `desktop/` loads the API, so `desktop/node_modules/.bin/tsc` is TypeScript 7 and `build: tsc` keeps working.

### D4. The `.bin/tsc` collision and the explicit entry point

**The trap:** `@typescript/typescript6` depends on `@typescript/old`, which also declares a `tsc` bin. In the 2026-10-16 trial that bin won `node_modules/.bin/tsc`, so `npx tsc` ran TypeScript **6.0.3** without any warning. Two rounds of "TS 7" measurements were invalid because of it.

**Therefore** no root gate may call `tsc` or `npx tsc` by name. Every root gate calls the TypeScript 7 entry point by path:

```text
node node_modules/typescript7/bin/tsc --noEmit --skipLibCheck
```

- **Scripts:** `npm run typecheck` runs this. lint-staged, CI and the roadmap proof call `npm run typecheck`, or the same path for the proof's argv form. Then there is one string to keep correct.
- **CI contract:** the token becomes `run: npm run typecheck`.
- **Guard test** `scripts/__tests__/typescript-toolchain.test.ts` asserts that:
  - `require('typescript7/package.json').version` has major 7;
  - `scripts.typecheck` invokes `node_modules/typescript7/bin/tsc`;
  - no root gate string (lint-staged, the pr-checks `Type Check` step, `roadmap-main-proof.mjs`) invokes a bare `tsc`, `npx tsc` or `node_modules/typescript/bin/tsc`;
  - `desktop/package.json` declares an unaliased `typescript` with major 7.

### D5. Desktop tests move from ts-jest to @swc/jest

- `ts-jest` 29.4.6 declares peer `typescript >=4.3 <6`. 29.4.15 allows `<7`. Neither works with 7.0, which has no API.
- `@swc/jest` matches the root project, but it does not type-check. To keep that coverage, desktop `type-check` also runs `tsc -p tsconfig.test.json --noEmit`.
- **Desktop `devDependencies`:** add `@swc/core` and `@swc/jest`, pinned to the root's major versions. Remove `ts-jest`. Desktop has its own lockfile, so these are new entries there.
- **SWC config:** desktop uses `experimentalDecorators` and `emitDecoratorMetadata`, so the SWC transform needs `jsc.parser.decorators: true`, `jsc.transform.legacyDecorator: true` and `jsc.transform.decoratorMetadata: true`. It also needs CommonJS module output.
- **Verify** that the test count is the same before and after the switch.

### D6. ts-node is replaced by tsx

- `terminology:*` becomes `npx tsx openspec/scripts/terminology-tool.ts ...`.
- Fix the usage comment in `scripts/compare-pip-distributions.ts`.
- Remove `ts-node` from `devDependencies`, but only after a lockfile check confirms that no package requires it as a non-optional dependency. Jest and Playwright configs do not need it: `jest.config.js` is JavaScript, and Playwright loads TS itself.

### D7. What still waits for TypeScript 7.1

- The three parser-only files.
- Next's built-in type check, unless OD-next-upgrade is taken.
- **When 7.1 ships an API that Storybook, Next and these files support:**
  - drop the TS 6 alias;
  - point `typescript` at 7.x;
  - collapse `typescript7` back into `typescript`;
  - update the three imports.
- This is the post-archive follow-up at the end of `tasks.md`. It does not block archiving this change.

### D8. Rollback

Each phase is one PR. The rollbacks:

- **Phase 2 or 3:** revert the PR. That restores `typescript@^5.8.3` or `^6`, and restores the command strings, the contract token and the tests together.
- **Phases 0 and 1:** these changes are valid on 5.8. They do not need reverting to roll back a later phase.
- **No persisted data, emitted runtime JS (proven byte-identical for desktop) or generated files change.**

## Owner decisions

These are open. Check the cited spec clause before asking.

- **OD-scripts-tsconfig.** `scripts/tsconfig.json` is broken today and nothing gates it.
  - `bv-validation-tooling` (spec line 406) says `npx tsc --noEmit` SHALL type-check the BV harness. That is false today, because the root config excludes `scripts/**`.
  - Options:
    - (a) Narrow the file to the harness files it names (`validate-bv.ts`, `validate-parity.ts`, `data-migration/**`), make them clean, and add it to the root `typecheck` script. This makes the scenario true.
    - (b) Delete the file, confirm that `tsx` still runs every `validate:*` script under the root config, and modify the scenario to name a check that really runs.
  - **Recommendation: (a).** It makes an existing SHALL true instead of deleting it. Scope it to the named harness files only, and re-measure the error count before committing to it.
- **OD-next-upgrade.**
  - Upgrading Next from 16.2 to at least 16.3 makes `next build` type-check through TypeScript 7 (`experimental.useTypeScriptCli`; 16.4.x is current). The alternative is leaving Next on the TS 6 alias.
  - **Recommendation:** do it as a separate change after this one archives. A Next minor upgrade has a much larger blast radius than the compiler swap.
  - **Interim risk:** TS 6 and TS 7 can disagree, as the two `BranchCheckpointCache` errors show. A local `next build` could then fail on something the TS 7 gate accepts, or the reverse. Fixing both compilers' errors in phase 0 removes the known cases.
  - If the CI-optimization change that sets `MEKSTATION_SKIP_NEXT_TYPECHECK` in PR builds has landed, CI's `next build` already skips its own type check.

## Risks

- **`noUncheckedSideEffectImports` is on by default in TS 6 and 7.** The root project passes today. New CSS or side-effect imports without declarations will start failing.
- **7.1 checker drift.** Nightlies so far match 7.0 on this repository; re-run them before deferred section 6.
- **`incremental` / `.tsbuildinfo`.** These were not measured under TypeScript 7. Confirm that a warm second run is not slower than a cold one, and that the tsbuildinfo is not shared with TS 6.

## Sources

- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-rc/
- https://nextjs.org/blog/next-16-3
- https://github.com/vercel/next.js/discussions/95633
- https://github.com/vercel/next.js/pull/95639
- https://github.com/vercel/next.js/pull/95831
- https://github.com/vercel/next.js/issues/95649
