# Lane A review: U62
reviewedHead: 92a5b9cba3eb9c030e67b067480141e4a1b63993
baseline: d2336477d14e588ee44aedd3db0c9857a36abf7c
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (no new refs printed).
- `git -C E:/Projects/MekStation worktree add --detach E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u62-review 92a5b9cba3eb9c030e67b067480141e4a1b63993` — succeeded, HEAD confirmed at `92a5b9cba3eb9c030e67b067480141e4a1b63993`.
- Junctioned `node_modules` via PowerShell `New-Item -ItemType Junction` — succeeded (`d----l` mode entry created).
- Node: `node --version` → `v22.22.0` (via `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH`). `npm_config_dry_run=true` set for the whole review; never unset (I never ran the hook itself or any npm install/build).
- I never ran `sh .husky/pre-commit`, never ran `npm install/ci/prune`, never ran a build, never ran Playwright, never committed or pushed, and never touched the root checkout or the implementer's worktree (`.../worktrees/u62`).
- All file mutations were confined to `.husky/pre-commit` inside my own `u62-review` worktree, each one restored and sha256-verified (see Finding/Gate 3 below). Final `git status --short` in the review worktree: empty (clean, at `92a5b9cba3eb9c030e67b067480141e4a1b63993`).

## Files on the range

`git diff --numstat d2336477d..92a5b9cba3e`:

| file | + | - |
|---|---|---|
| `.husky/pre-commit` | 5 | 15 |
| `openspec/planning/2026-09-12-roadmap-completion/evidence/u62-admission-20260923.json` | 133 | 0 |
| `openspec/planning/2026-09-12-roadmap-completion/evidence/u62-local-20260923.json` | 446 | 0 |
| `openspec/planning/2026-09-12-roadmap-completion/evidence/u62-red-20260923.json` | 64 | 0 |
| `scripts/__tests__/precommit-no-build.test.ts` | 42 | 0 |

5 files total, exactly one commit on the range: `92a5b9cba3e chore(hooks): the pre-commit hook runs lint-staged and its type check, not a production build (U62)` (no body). No AI attribution in the subject/body.

## Findings

1. **[Info] Hook trace confirmed; nothing CI doesn't already catch is lost.** (`.husky/pre-commit` head, `package.json:332-345`)
   Head hook (10 lines) runs only `npx lint-staged` (line 10). Traced `package.json`'s `lint-staged` block: the `*.{ts,tsx}` entry is `["oxlint --fix", "oxfmt --write --no-error-on-unmatched-pattern", "bash -c 'npx tsc --noEmit --skipLibCheck'"]` — the tsc invocation takes no file args, so it type-checks the whole program, not just staged files, whenever a `.ts`/`.tsx` file is staged. This is unchanged by the diff (package.json not touched). CI's `npm run build` (pr-checks.yml:609, :769) still runs the same TypeScript compiler pass on every PR that touches `code` paths (see Finding 2), so no *correctness coverage* is lost — the old hook's build step was a redundant second type-check of the same program per the OD's own framing ("A commit that stages TypeScript type-checks the whole program twice"). What does change: local feedback moves from per-commit (old hook ran a full `next build` on every commit with a staged .ts file) to per-PR/per-push (CI). That is the intended trade-off of OD-precommit-drop-full-build, not an unnoticed loss.

2. **[Verified] CI build lines cited, paths filter traced, workflow unchanged on the range.**
   - `pr-checks.yml:604-609` "Build production app" (job needs `[detect-changes, install-deps]`), gated `if: needs.detect-changes.outputs.code == 'true' || needs.detect-changes.outputs.e2e == 'true'`.
   - `pr-checks.yml:767-769` "Build Next.js application" in the `prepare-build` job, gated `if: needs.detect-changes.outputs.code == 'true'`.
   - `pr-checks.yml:791-798` `build-test` job (`Build Test / ${{ matrix.platform }}`, 3-OS matrix) `needs: [detect-changes, prepare-build]`; it does not invoke `npm run build` itself — its steps (read past :798 through ~850) download the artifact `prepare-build` produced and run Electron packaging (`electron-builder --dir`), gated on the same `detect-changes.outputs.code` flag.
   - `detect-changes` job (`pr-checks.yml:23-49`) triggers on `pull_request` to `main`; its `code` filter (`dorny/paths-filter@v3`) matches `src/**, public/**, desktop/**, scripts/**, config/**, package.json, package-lock.json, next.config.*, tsconfig.json, jest.config.*, jest.setup.*, .babelrc*, .github/workflows/**, .github/actions/**`; `e2e` matches `e2e/**, playwright.config.*`.
   - Noteworthy for this PR specifically: `.husky/**` is **not** in the `code` filter list. A hook-only edit would not by itself flip `code=true`. On PR #1916, `code=true` is triggered by the co-located pin at `scripts/__tests__/precommit-no-build.test.ts` (covered by `scripts/**`), so the full build gate does run and check this head. This is an observation, not a defect — the unit's own admission receipt lists all three CI steps as unedited and I confirmed that.
   - Confirmed via `git diff --numstat`: `.github/workflows/pr-checks.yml` does not appear in the file list on the range — byte-identical between baseline and head.

3. **[Verified] Pin reproduces red/green exactly as receipted; restore confirmed byte-identical.**
   - Head: `npx jest scripts/__tests__/precommit-no-build.test.ts` → exit 0, "Tests: 2 passed, 2 total" (matches `evidence/u62-local-20260923.json.gates.jestPin`).
   - `.husky/pre-commit` sha256 at head, measured: `eb2ff9415e9b404d3eeea872f78d9d6153c6d92c6013824d820ab436096730a2` — matches `u62-local-20260923.json.changedFiles[".husky/pre-commit"]` exactly.
   - `git checkout d2336477d -- .husky/pre-commit` in the review worktree → sha256 `e69afc50012b56535dbccd3e19d963820d66d72b6bfe86572341857c7c3ff2c6`, matches `u62-red-20260923.json.inputs[0].sha256`.
   - Pin against the baseline hook: exit 1, `Tests: 1 failed, 1 passed, 2 total`; failing assertion is `runs neither \`npm run build\` nor \`next build\` on any command line`, received `["17: npm run build"]` at `precommit-no-build.test.ts:30:7` — matches `u62-red-20260923.json.failingAssertion` verbatim (test name, matcher, received array, line).
   - Restored head's hook (`git checkout 92a5b9cba3e -- .husky/pre-commit`); sha256 measured again: `eb2ff9415e9b404d3eeea872f78d9d6153c6d92c6013824d820ab436096730a2` — matches the head value exactly. `git status --short` empty afterward.
   - Also verified `package.json` (`651fe50e8bfecb692d408c34bf831aa3d4d337d208e874d5fa6359ad6fad0f19`) and the pin file (`c08f07ed1d3e5dc14992444972ed0d55988df0d67ca48d03148c84092bb2bffb`) sha256 at head against `u62-red-20260923.json.inputs[1..2]` — both match.

4. **[Low/Informational] My own mutant (variable-indirected `npm run build`) is not caught by the pin — a real but non-blocking gap.**
   Mutant applied to `.husky/pre-commit` at head (not one of the receipts' M1-M4, which cover: build line put back, `next build --webpack` invoked directly, tsc entry stripped from `package.json`, `npx lint-staged` line removed):
   ```
   npx lint-staged

   BUILD_SCRIPT=build
   npm run "$BUILD_SCRIPT"
   ```
   Ran `npx jest scripts/__tests__/precommit-no-build.test.ts` against this mutant: exit 0, "Tests: 2 passed, 2 total" — **the pin does not catch it**, even though the hook now runs a full production build again. Root cause: the pin's regex (`\bnpm(?:\.cmd)?\s+run(?:-script)?\s+build(?![\w:-])|\bnext\s+build\b`, `precommit-no-build.test.ts:26-27`) requires the literal token `build` to appear on the same source line immediately after `run`; assigning the script name to a shell variable moves the literal string off that line entirely, so line-based text matching cannot see it.
   Restored the head hook from a pre-mutation byte copy immediately after; sha256 re-verified as `eb2ff9415e9b404d3eeea872f78d9d6153c6d92c6013824d820ab436096730a2` (matches Finding 3's head value; restore confirmed identical both times).
   **Does this matter for this unit's sentence?** No, for two reasons: (a) the unit's behavior sentence and its receipts only claim the pin catches literal/naive reintroduction of the build line (the admission and local receipts' own `nonClaims`/mutant list are explicit that the pin is a textual guard over the two named files, not an adversarial-proof enforcement mechanism — e.g. the local receipt separately discloses the pin does not understand lint-staged's chunking or shell semantics); (b) even a silently-reintroduced build via indirection would still be caught by CI's independent `npm run build` (Finding 2), so merged-code correctness is unaffected — only the "commits get faster" intent of the unit would silently regress for a future contributor who wrote or accepted such an edit, which is a documentation/awareness risk rather than a correctness one. I am not blocking on this for a routine-class unit; flagging as informational for the docs-class follow-up or a future pin hardening pass.

5. **[Verified] Comments state what the code actually does.**
   Hook header (`.husky/pre-commit:1-8`) quoted in full:
   ```
   #!/usr/bin/env sh
   # Pre-commit gate.
   #
   # Runs lint-staged (package.json "lint-staged") on the staged files: oxfmt
   # --write on each matching file, oxlint --fix on staged *.ts/tsx/js/jsx and,
   # when a *.ts or *.tsx file is staged, a whole-project
   # `tsc --noEmit --skipLibCheck`. The hook runs no production build; the
   # pr-checks workflow runs `npm run build` for code changes.
   ```
   Checked every task named against `package.json`'s `lint-staged` block:
   - "oxfmt --write on each matching file" — true for all three globs (`*.{ts,tsx}`, `*.{js,jsx}`, `*.{json,md,css}`), each ends or includes `oxfmt --write --no-error-on-unmatched-pattern`.
   - "oxlint --fix on staged *.ts/tsx/js/jsx" — true, both the `*.{ts,tsx}` and `*.{js,jsx}` entries start with `oxlint --fix`; `*.{json,md,css}` correctly has no oxlint entry and the header doesn't claim one.
   - "when a *.ts or *.tsx file is staged, a whole-project tsc --noEmit --skipLibCheck" — true, only the `*.{ts,tsx}` list ends with `bash -c 'npx tsc --noEmit --skipLibCheck'`.
   - "The hook runs no production build" — true, verified no `npm run build`/`next build` line remains (also the pin's own passing assertion).
   - "the pr-checks workflow runs npm run build for code changes" — true, per Finding 2.
   All five claims verified accurate; nothing overclaimed.

   Pin comments (`scripts/__tests__/precommit-no-build.test.ts:4-6, 12-13, 25`) quoted:
   ```
   // Pins owner decision OD-precommit-drop-full-build: .husky/pre-commit runs no
   // production build, and the lint-staged run it keeps still ends its
   // *.{ts,tsx} list with the whole-project `tsc --noEmit` type check.
   ...
   // Returns the hook's non-blank lines that do not start with `#`, trimmed and
   // prefixed with their 1-based line number ("17: npm run build").
   ...
   // `build` must end the script name, so `npm run build:x` does not match.
   ```
   All three match the implementation exactly: the top comment describes exactly the two assertions the `describe` block makes; `hookCommandLines()` (lines 14-21) does filter blank and `#`-prefixed lines and does prefix `${number}: ${line}`, matching its own doc-comment's example; the regex's `(?![\w:-])` negative lookahead does exactly what the inline comment says (excludes `build:x`-style script names). No comment overclaims behavior the code doesn't implement (per the Coding Doctrine's comment-accuracy bar).

6. **[Verified] Scope and cap.**
   - Only 5 files touched on the range: `.husky/pre-commit`, the new pin (`scripts/__tests__/precommit-no-build.test.ts`), and the three U62 receipts (`evidence/u62-{admission,red,local}-20260923.json`). No other product path touched — matches `ownershipPaths: [".husky", "scripts/__tests__"]`.
   - Product lines (`.husky/pre-commit` only): 5 added + 15 deleted = 20, under the unit's 80-line cap (`caps.maxNonGeneratedLines`); receipt's `lineCounts.product` (`added:5, deleted:15, changed:20`) matches `git diff --numstat` exactly.
   - Test lines (the pin): 42 added, 0 deleted — matches `lineCounts.test` exactly; correctly excluded from the 80-line product cap per OD-line-cap-product-lines.
   - File count: 5, at the `maxFiles: 5` cap exactly (not over).
   - No AI attribution in the one commit's subject or body.
   - No absolute machine paths in `.husky/pre-commit` or the pin (`grep -niE "wroll|C:\\Users|E:\\Projects|/c/Users|/e/Projects"` — no matches, exit 1).
   - `package.json`, `docs/development/git-hooks.md`, `.github/workflows/pr-checks.yml`, `units.json`, `roadmap.json` are all absent from the diff — matches the receipts' `notEdited` list.

## Gates (measured on 92a5b9cba3e in the review worktree)

| Gate | Command | Exit | Last line |
|---|---|---|---|
| Hook shell syntax | `sh -n .husky/pre-commit` | 0 | (no output) |
| Whole-project typecheck | `npx tsc --noEmit` | 0 | (no output) |
| Lint | `npx oxlint` | 0 | `Found 84 warnings and 0 errors.` / `Finished in 341ms on 3816 files using 16 threads.` (matches receipt's 84 warnings / 0 errors exactly) |
| Format check (pin) | `npx oxfmt --check scripts/__tests__/precommit-no-build.test.ts` | 0 | `All matched files use the correct format.` |
| Unit-size lint | `npm run lint:units` | 0 | `LINT_UNITS_PASS 100/100` |
| OpenSpec/CI quality | `npm run qc:openspec-ci:validate` | 0 | `[qc:openspec-ci] workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0` |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | 0 | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` |
| Pin (head) | `npx jest scripts/__tests__/precommit-no-build.test.ts` | 0 | `Tests: 2 passed, 2 total` |
| Pin (baseline hook, red repro) | same, hook swapped to `d2336477d` | 1 | `Tests: 1 failed, 1 passed, 2 total`; failing assertion at `precommit-no-build.test.ts:30:7`, received `["17: npm run build"]` |
| Pin (my mutant) | same, hook = variable-indirected `npm run "$BUILD_SCRIPT"` | 0 | `Tests: 2 passed, 2 total` — **not caught** (Finding 4) |

Every gate's exit code and headline numbers (84 warnings/0 errors, `LINT_UNITS_PASS 100/100`, the `qc:openspec-ci` summary line, and the roadmap validator's node/package/task/triage counts) match `evidence/u62-local-20260923.json.gates` exactly.

## Cap

Confirmed via `git diff --numstat` and the file list above: 5 files (cap 5, at the limit, not over), 20 product lines in `.husky/pre-commit` (cap 80), 1 test file (42 lines, uncapped per OD-line-cap-product-lines), 3 receipt files. No file outside `.husky` and `scripts/__tests__` touched. The receipts' reported numbers (`lineCounts.product`, `lineCounts.test`, `filesTotalWithReceipts: 5`, `withinCaps: true`) all match what the diff shows.

## Verdict rationale

All six review questions check out against directly-measured evidence: the hook trace and CI-loss question (none, modulo a timing-not-coverage trade-off, Finding 1); the CI build lines and unchanged-workflow claim (Finding 2); the pin's red/green reproduction byte-for-byte against the receipts (Finding 3); all named local gates passing with numbers matching the local receipt exactly (Gates table); the header and pin comments both verified accurate against `package.json` and the implementation (Finding 5); and scope/cap both within bounds with the receipts' numbers matching the diff (Finding 6). The one new finding from my own mutant (Finding 4 — a variable-indirected `npm run build` evades the pin's line-based regex) is real and worth surfacing, but it doesn't touch what this unit actually claims or ships: the diff itself is verified to remove the literal build line, CI's independent build gate is unchanged and still catches any resulting regression at merge time, and the receipts already disclose the pin's textual (non-semantic) nature. Routine review class, no owner-gated or sensitive review class applies. Recommending APPROVE; Finding 4 is worth a follow-up note (e.g., in the docs-class PR or a future hardening pass) but is not a blocking defect for this unit's sentence.
