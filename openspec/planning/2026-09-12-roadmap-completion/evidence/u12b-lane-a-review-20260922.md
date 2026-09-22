# Lane A review: U12b
reviewedHead: 61d38f85850c56b7ec3186e4560d285396243b64
baseline: 6fa24e96753bea9f723948d1373452a6ba0ef05e
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (clean; origin/main measured at 37cb9ee8f40e1e18b8276987bcc13c468c0021cc).
- `git worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u12b-review 61d38f85850c56b7ec3186e4560d285396243b64` — succeeded, HEAD confirmed at 61d38f858.
- `node_modules` junctioned via PowerShell `New-Item -ItemType Junction` from the review worktree to `E:\Projects\MekStation\node_modules` — succeeded (`Mode: d----l`).
- `npm_config_dry_run=true` set in every shell before any npm/node invocation. Node 22 selected via `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` — `node --version` measured `v22.22.0`.
- No npm install/ci/prune, no build, no Playwright, no commit were run. All git commands used explicit `-C`/cwd inside the review worktree; the root checkout was never touched (confirmed no edits made there).
- Teardown performed at the end of the session (see Findings/Gates close): junction deleted via `[System.IO.Directory]::Delete(...)` (non-recursive-through-link) and `git worktree remove --force` run — both reported below in Gates.

## Files on the range

`git diff 6fa24e96753bea9f723948d1373452a6ba0ef05e..61d38f85850c56b7ec3186e4560d285396243b64 --stat` measured exactly 6 files, matching the charter's expectation:

- `scripts/qc/guard-node-modules-link.mjs` (+155)
- `scripts/__tests__/guard-node-modules-link.test.ts` (+262)
- `package.json` (+1)
- `openspec/planning/2026-09-12-roadmap-completion/evidence/u12b-admission-20260922.json` (+172)
- `openspec/planning/2026-09-12-roadmap-completion/evidence/u12b-local-20260922.json` (+242)
- `openspec/planning/2026-09-12-roadmap-completion/evidence/u12b-red-20260922.json` (+108)

Total 940 insertions, 0 deletions, 6 files. All paths fall inside the unit's `ownershipPaths` (`scripts/qc`, `scripts/__tests__`, `package.json`) plus the standard roadmap `evidence/` receipts.

## Findings

1. **[Informational, non-blocking] The unit's own `behavior` field in `units.json` overstates reuse; the PR's own admission receipt corrects it.** `units.json` describes the module as "the parked U12 module, reused as it stands." I diffed the parked U12 head's module (`git show 1baa6a96c6f7b186091635dd3e77749f212db090:scripts/qc/guard-node-modules-link.mjs`) against the U12b module and found real behavioral changes: (a) node_modules detection moved from `fs.existsSync` to `fs.lstatSync(..., {throwIfNoEntry:false})` + `isSymbolicLink()`, which now catches a dangling link that `existsSync` would have missed and treated as a fresh checkout; (b) the manifest is now read and `JSON.parse`d (new `manifest-unreadable` reason) rather than only `realpathSync`'d; (c) the reason word `manifest-outside-cwd` was renamed to `manifest-root-mismatch`. This is not "reused as it stands" — it is a deliberate, disclosed rewrite of two real decision rules. However, this is **not a claim-honesty violation in the reviewed diff**: the admission receipt (`u12b-admission-20260922.json`, `parkedHeadReuse.changed`) documents all three changes accurately and explicitly, by name, with correct rationale. The only place the looser phrase appears is the pre-existing ledger `behavior` sentence in `units.json`, which is not part of this diff. No action required on this PR; noting for completeness since the charter asked me to read the parked head for comparison.

2. **[None found] No overclaim about preventing npm pruning.** Grepped the module, the test file, and both new receipts for prevent/protect/stop-npm language. Every instance is correctly hedged: source comment "What it does NOT do is prevent npm from pruning; npm is unchanged." (`guard-node-modules-link.mjs:22-23`); admission receipt: "This CLI does not prevent npm from pruning. It is a check a caller runs BEFORE npm; npm itself is unchanged. FN-u12-root-preinstall-runs-after-reify stands." (line 156); local receipt: "This CLI does NOT prevent npm from pruning the root node_modules through a junction. npm is unchanged." (line 193). No sentence anywhere in the diff claims the CLI stops npm from pruning through a link.

3. **[Informational, non-blocking] One absolute machine-local path appears in the local receipt's live-proof log.** `u12b-local-20260922.json:118` records `"cwd": "C:\\Users\\wroll\\AppData\\Local\\Temp\\u12b-cli-proof-CfmqWP"` as the working directory of the live "fresh temporary checkout" CLI proof. This is a real, disclosed measurement (the receipt states the temp dir was removed after the run), not a stray leftover. I checked for precedent: this pattern (an `AppData\Local\Temp\<name>` absolute path embedded in a receipt) already exists in several other units' receipts in this same evidence corpus (e.g. `u2b-local-20260921.json`, `u2b-red-20260922.json`, `port-binding-flake-diagnosis-20260915.json`, `qc-fixture-port-review-20260915.json`), and the program's own `GOAL.md`-linked standing constraint documents the machine-specific nvm path (`/c/Users/wroll/AppData/Local/nvm/v22.22.0`) verbatim as the required Node-selection command, which itself appears in essentially every receipt in the corpus (confirmed via `grep -rl wroll evidence/*.json`, matches nearly all files, all via that exact nvm-PATH line). Given this is a single-operator machine and the convention is already established program-wide, I am not treating this as a cap/scope violation, but flagging it as observed per the charter's explicit ask.

4. **[None found] Contract law fully verified by independent probe.** See Gates section, item "Contract probes," for the five cases (a)–(f) and their measured output — all matched the unit's contract exactly, including the documented Windows EPERM constraint on real symlinks.

5. **[None found] No `|| true`, no swallowed error.** Read the full 155-line source. The only catch blocks are: the manifest read/parse catch (returns a typed `manifest-unreadable` refusal, does not swallow), and the outer `main()` catch (prints `INSTALL_REFUSED inspection-error <message>` and sets `exitCode = 1`, does not swallow or allow). `main(process.argv.slice(2))` runs only inside the `if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))` guard, i.e. only when executed directly, not on import. `package.json` gained exactly one script line (`qc:guard-node-modules-link`) and no `preinstall` key — confirmed by both the diff and pin case "exposes the guard as a qc script and wires no preinstall."

## Gates

All commands run from the review worktree (`.sisyphus/roadmap-completion-20260912/worktrees/u12b-review`), Node v22.22.0, `npm_config_dry_run=true`.

| Gate | Command | Last line | Exit |
|---|---|---|---|
| Contract probes (a)-(f) | custom node script, temp dirs under system tmp, cleaned up after | See detail below | n/a |
| Jest, scripts/__tests__ | `npx jest scripts/__tests__` | `Test Suites: 78 passed, 78 total` / `Tests: 10 skipped, 1228 passed, 1238 total` | 0 |
| Jest, guard pin alone | `npx jest scripts/__tests__/guard-node-modules-link.test.ts` (via mutant run below) | 12/12 passing on the unmutated file (implied by the full-suite run above, which includes this file) | 0 |
| tsc | `npx tsc --noEmit` | (no output — clean) | 0 |
| oxfmt | `npx oxfmt --check scripts/qc/guard-node-modules-link.mjs scripts/__tests__/guard-node-modules-link.test.ts package.json` | `All matched files use the correct format.` | 0 |
| lint:units | `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| qc:openspec-ci:validate | `npm run qc:openspec-ci:validate` | `packageScripts=3/3 ... errors=0` | 0 |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

**Contract probes, detail** (own fixtures, `os.tmpdir()`-rooted, `fs.symlinkSync`/`lstat`-based, matching the pin's own methodology; all removed after the run):

- (a) fresh dir, own `package.json`, real `node_modules` → `INSTALL_ALLOWED`, exit 0. Matched.
- (b) `node_modules` planted as a junction (`fs.symlinkSync(target, link, 'junction')`, `lstat().isSymbolicLink() === true`) → `INSTALL_REFUSED node-modules-is-link {...}`, exit 1. Matched.
- (c) `node_modules` planted as a symlink: attempted `fs.symlinkSync(target, link, 'dir')` first; it threw `EPERM: operation not permitted, symlink ...` on this machine, exactly the elevation constraint the charter and the implementer's own pin-header comment describe. Fell back to a junction (which is what the pin itself does on win32) → `INSTALL_REFUSED node-modules-is-link {...}`, exit 1. Matched, with the same platform caveat the implementer measured — I am not claiming a true directory-symlink case was exercised on this machine, only the junction fallback, consistent with the charter's guidance.
- (d) manifest naming a different root → `INSTALL_REFUSED manifest-root-mismatch {...}`, exit 1. Matched.
- (e) missing manifest → `INSTALL_REFUSED manifest-unreadable {...}`, exit 1 (not a crash, not exit 0). Unparseable-JSON manifest → same `manifest-unreadable`, exit 1. Both matched.
- (f) ran the CLI directly from the review worktree itself (junctioned `node_modules`): `node scripts/qc/guard-node-modules-link.mjs` printed `INSTALL_REFUSED node-modules-is-link {"expectedPath":".../u12b-review/node_modules","actualPath":"E:\\Projects\\MekStation\\node_modules"}`, exit 1. Matched — the guard correctly refuses in its own reviewing environment.

**Mutant reproduction** (independent, not copied from the receipt's table): mutated all three `process.exitCode = 1;` call sites in `main()` to `process.exitCode = 0;` (fail-open on refusal, across both REFUSE branches and the outer catch). Pre-mutant sha256 `d4417f8050eeb7d87211bff07b838b199947a7d86bfb4e8a7421b8c5616c5d1b`. Running `npx jest scripts/__tests__/guard-node-modules-link.test.ts` against the mutant: `Tests: 7 failed, 5 passed, 12 total` — every test that asserts `status === 1` failed (junction refusal, symlink refusal, manifest-root-mismatch, both manifest-unreadable cases, default-manifest refusal, unknown-argument refusal); the two `INSTALL_ALLOWED` cases and the exported-function cases stayed green since they don't assert the CLI's exit code on a refusal path. Restored the file from a pre-mutation copy; sha256 after restore: `d4417f8050eeb7d87211bff07b838b199947a7d86bfb4e8a7421b8c5616c5d1b` — matches, and `git status --porcelain` in the review worktree showed no diff. This is broader than the receipt's own table entry ("exit 0 on refusal: 6 failed") because I mutated all three exit-code assignment sites (both REFUSE branches plus the fail-closed catch) rather than the two REFUSE-branch sites alone; the receipt's narrower mutant is consistent with mine (same fail-open class, one fewer site touched, 6 vs my 7 failures — the delta is exactly the unknown-argument case that only exercises the catch-block assignment).

**AI attribution / cap check:**
- `git log -1 --format=%B` on the reviewed head: no "Claude"/"Anthropic"/"Co-Authored-By"/"Generated with" text found.
- `git diff --numstat`: 6 files, 940 insertions, 0 deletions — well under the unit's 15-file / 500-non-generated-line cap (module 155 + pin 262 + package.json 1 = 418 non-receipt lines; the three evidence JSON files, 522 lines, are receipts, not implementation).
- No files outside `scripts/qc`, `scripts/__tests__`, `package.json`, and the roadmap `evidence/` receipts.

**Teardown:**
- PowerShell: `[System.IO.Directory]::Delete('E:\Projects\MekStation\.sisyphus\roadmap-completion-20260912\worktrees\u12b-review\node_modules')` — junction removed without touching the shared target.
- `git -C E:/Projects/MekStation worktree remove --force .../worktrees/u12b-review` — worktree removed.
- Confirmed via `git -C E:/Projects/MekStation worktree list` (not shown above but run as part of cleanup) that the review worktree entry is gone and the root checkout is unaffected.

## Cap

- 6 files changed (cap 15). Non-generated/implementation lines: 155 (module) + 262 (pin) + 1 (package.json) = 418 (cap 500). Evidence receipts (522 lines across 3 files) are receipts, consistent with how the unit's own local receipt reports the cap accounting ("module 155 lines, pin 262, package.json +1").
- Scope: every changed path is inside `scripts/qc`, `scripts/__tests__`, `package.json`, or the roadmap `evidence/` directory — nothing outside the unit's `ownershipPaths` plus the standard receipt location.
- No AI attribution in the commit message.
- One absolute machine-local path found in a receipt (`u12b-local-20260922.json:118`, a disclosed and cleaned-up temp-dir proof) — see Finding 3; treated as informational, consistent with established precedent elsewhere in this evidence corpus, not a blocker.
- The red receipt (`u12b-red-20260922.json`) shows the module absent before the change: real `ERR_MODULE_NOT_FOUND`-class failures (`received: ""`, "the CLI module does not exist, so node exits before printing"), 12/12 failing, matching the claimed red evidence.

## Verdict rationale

Every claim I could independently verify held up: the CLI's five decision rules and its fail-closed default were reproduced from scratch with my own fixtures and matched the documented contract exactly, including the platform-specific EPERM constraint on real Windows symlinks (which I hit myself, not just took on faith). All six required gates ran green with output matching the receipts' own numbers (78/78 suites, 1228/10, tsc clean, oxfmt clean, lint:units at its 100/100 ceiling, qc:openspec-ci unchanged at 3/3, roadmap validator PASSED). No claim in the module, the pin, or the two receipts overstates what the CLI does — the "does not prevent npm from pruning" disclaimer is present and correctly worded everywhere it needs to be. My own independently-chosen mutant (broader than the receipt's own table) was caught by the pin and cleanly restored (sha256-verified). The diff stays inside its ownership paths and caps, with no AI attribution. The two informational findings (the ledger's looser "reused as it stands" phrasing, which the PR's own receipt corrects; and one disclosed, precedented absolute temp-path in a receipt) do not affect the correctness or honesty of the shipped code or its claims, so they do not block. Verdict: APPROVE.
