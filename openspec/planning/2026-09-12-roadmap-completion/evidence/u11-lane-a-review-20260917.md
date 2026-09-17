# Lane A review: U11 (pass 2)

reviewedHead: 0cf7471735f9a2a551be7e42b6e25732751de799
baseline: b6e845f333aa80c24bb37607cc4b4ecc867d3f9f
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

This is a fresh review of a new head, per the charter ("a new head voids the prior review per DELIVERY.md; pass 1 is context, not a checklist to tick"). Pass 1 (`u11-lane-a-review-pass1-20260917.md`, head `9ae345ef0`) returned APPROVE-WITH-REQUIRED-EDITS for exactly one defect: a free-text `if (/cursor-agent|codex|grok/i.test(command)) return {};` guard that made a busy `server.js` running from a path containing "codex" (this repo's own worktree/branch convention) read as idle. This pass independently re-derives that finding was fixed and re-examines the whole file from scratch.

## Setup

- `git -C E:/Projects/MekStation fetch origin` — no new refs (already up to date).
- `git worktree add --detach .../worktrees/u11-review 0cf7471735f9a2a551be7e42b6e25732751de799` — succeeded; `HEAD is now at 0cf747173`.
- `node_modules` junctioned into the worktree via `cmd /c mklink /J`.
- Node 22.22.0 selected via PATH prepend; verified `node --version` → `v22.22.0`.
- No `npm install`/`ci`/`prune`, no build, no Playwright run, no commit, no edits to the root checkout. One scratch mutation was made and fully reverted inside the review worktree only (see Findings/Q2 probe below); `git status --short` and `git diff --exit-code` both confirmed clean afterward.

## Files on the range (`git diff --numstat b6e845f33..0cf7471735`)

```
219  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u11-admission-20260917.json
253  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u11-local-20260917.json
 67  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u11-red-20260917.json
 62  0  scripts/__tests__/machine-idle.fixture.mjs
345  0  scripts/__tests__/machine-idle.test.ts
272  0  scripts/qc/machine-idle.mjs
```

One commit, `0cf7471735`, author Wes Rollings <wrollings@gmail.com>, on top of `9ae345ef0` (also Wes Rollings), both on branch `codex/roadmap-u11-machine-idle-20260917`. No `src/` or `package.json` change (`git diff --name-only` confirms exactly the six files above). No AI attribution in either commit message (`git log --format=%B b6e845f33..0cf747173 | grep -iE "claude|anthropic|co-authored|generated with|gpt"` → no match).

The diff between the two commits (`git diff 9ae345ef0..0cf747173 -- scripts/qc/machine-idle.mjs`) is exactly the required edit: it deletes the one-line free-text guard and replaces it with `if (image === 'grok') return {};` (executable-image check) plus a directory-segment check on the resolved first script argument (`codex.js`/`codex.mjs`/`codex-cli` basenames, a `codex-cli` directory segment, `cursor-agent` immediately followed by `versions`, or `@openai` immediately followed by `codex`).

## Findings

### 1. (Informational, not blocking) The pass-1 required edit is fixed and independently reproduced

Severity: none (positive verification). File: `scripts/qc/machine-idle.mjs:55-92`.

Probe: I reproduced the exact regression pass 1 found, as its own mutant, inside my worktree only:
- Saved the file, then re-inserted `if (/cursor-agent|codex|grok/i.test(command)) return {};` right after `const command = row.CommandLine ?? '';` (the old, pre-fix line).
- `sha256sum` before mutation: `436d862ec366e83be844e2219ea09998eb09f234bcc193c633e4899d4c390f60`.
- Ran `npx jest scripts/__tests__/machine-idle.test.ts`: **9 failed, 53 passed, 62 total** — failing exactly the 7 `keeps %s busy` cases (agent-directory/free-text false-idle regressions) plus `CLI reports busy for the reviewer codex-path server probe`. This is an exact match for mutant `M4` recorded in the unit's own `u11-local-20260917.json` receipt (same 9 named failures, same counts).
- Restored via `git checkout -- scripts/qc/machine-idle.mjs`; `sha256sum` after restore: `436d862ec366e83be844e2219ea09998eb09f234bcc193c633e4899d4c390f60` (matches pre-mutation exactly). `git status --short` and `git diff --exit-code` both clean.

I also ran my own additional probes (not in the shipped fixture set) against `listBuildProcesses` via a scratch script importing the module directly:
- `node E:/Projects/MekStation/codex-clique/server.js` (a near-miss directory name, not an exact `codex-cli`/`cursor-agent`/`@openai/codex` segment) → stays busy `[1]`. Correct — exact-segment matching, not substring.
- `node node_modules/next/dist/bin/next build --config E:/cursor-agent/versions/v/next.config.js` (agent-looking path only in a *later* argument, not the first script arg) → stays busy `[2]`. Correct — only the first script argument is resolved/checked.
- `node C:/unrelated/vendor/mekstation/server.js` (a third-party path that happens to contain a bare "mekstation" segment) → busy `[4]`. This mirrors the existing, already-accepted "linked worktree server" design (any path segment literally named `mekstation[-_]*` is conservatively treated as this project's own server) — a known, disclosed trade-off from pass 1, not a new defect.
- `node -e "require('./server.js').listen(3000)"` → **idle `[]`** (see Finding 2 below).

I was not able to construct a false-busy for an "MCP server outside the checkouts" or an "own pid" case beyond what the shipped fixtures already exercise: `E:\Projects\mcp-astrabit-jira\server.js` correctly resolves to not-busy because the `server.js` positive-match requires one of (bare `server.js`, `standalone/server.js`, `startsWith(repoRoot)`, or a `mekstation[-_]*` path segment) — none of which a foreign project name satisfies. This is an allow-list on the *positive* match, not a denylist on agent names, so a hypothetical agent-vendored `server.js` living outside any MekStation-shaped path (e.g. under `~/.codex/plugins/...`, which is a real directory this development machine actually has) is already excluded by that same allow-list, independent of the agent-specific rule.

### 2. (Low, pre-existing, not introduced by this diff) `node -e`/`-p` blanket-excludes any invocation, including a hypothetical persistent listener

Severity: LOW. File: `scripts/qc/machine-idle.mjs:66-70`. Not part of this revision's diff — confirmed identical at baseline commit `9ae345ef0` (`git show 9ae345ef0:scripts/qc/machine-idle.mjs | grep -n eval` shows the same lines), so pass 1 implicitly passed over it and this specific unit's required edit did not touch it.

The eval/print short-circuit (`if (['-e','--eval','-p','--print'].includes(option) || ...) return {};`) unconditionally treats any `node -e "..."`/`node -p "..."` invocation as not-busy, regardless of what the inline script actually does. Probe: `node -e "require('./server.js').listen(3000)"` classifies as idle. In practice this repo always starts servers via `node server.js`/`next start`/`next build`, never via inline `-e` eval, so the realistic exploitation surface is effectively nil — I did not find any real caller in the reviewed range that uses this pattern for a long-lived process. Flagging for awareness, not as a blocking defect on this unit.

### 3. (Low, theoretical) The agent directory-segment exclusion is unconditional on the resolved script's own name

Severity: LOW. File: `scripts/qc/machine-idle.mjs:82-91`. By design (matches the commit's stated intent — "an agent is now recognised ... by the segments of its first script path"), any node process whose first script argument resolves under a `cursor-agent/versions/*`, `@openai/codex/*`, or `codex-cli` path segment is excluded outright, even if that script happens to be literally named `server.js`/`relaunching-server.mjs`/`next`/`playwright`. My probe `node E:/tools/cursor-agent/versions/2026.09.15/relaunching-server.mjs` classifies idle. This only matters if the agent tool's own installed tree ever ships a file with one of those four exact names as a genuinely competing, persistent process — which none of the real, observed processes on this machine's own admission snapshot (`u11-admission-20260917.json`) do. Noting as a theoretical residual, not a defect to require an edit over.

## Gates

| Gate | Command | Result |
|---|---|---|
| Jest | `npx jest scripts/__tests__/machine-idle.test.ts` | **62/62 passed**, exit 0 |
| Typecheck | `npx tsc --noEmit -p tsconfig.json` | exit 0, no output |
| Format | `npx oxfmt --check scripts/qc/machine-idle.mjs scripts/__tests__/machine-idle.test.ts scripts/__tests__/machine-idle.fixture.mjs` | "All matched files use the correct format." exit 0 |
| Live CLI | `node scripts/qc/machine-idle.mjs` | `MACHINE_IDLE`, exit 0 (this review machine happened to be idle at the time; a busy parent would also be fine per the charter) |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows`, exit 0 |

## Cap

`wc -l` on the three non-generated files, run directly against the worktree copies:

```
  272 scripts/qc/machine-idle.mjs
  345 scripts/__tests__/machine-idle.test.ts
   62 scripts/__tests__/machine-idle.fixture.mjs
  679 total
```

This matches the commit message's arithmetic exactly ("679 non-generated lines: 272 module, 345 pin, 62 fixture") and the `u11-local-20260917.json` receipt's `lineCounts`/`totals` block, cross-checked against the same sha256 I independently computed for `machine-idle.mjs` (`436d862e...`, matches the receipt's recorded value). Against the unit's `caps.maxNonGeneratedLines: 500` (`units.json`), this is a 179-line overage; product code alone (272) is under cap. The three `evidence/*.json` receipt files (219+253+67=539 lines) are generated receipts and are correctly excluded from the cap count, consistent with prior units' convention.

On padding: I read the full 345-line test file. The +20 tests added since pass 1 (42→62) are all directly load-bearing for the required edit: 8 "keeps X busy" cases each exercise a structurally distinct false-idle vector (near-miss directory names, agent path in a later argument, free-text-only mentions, non-adjacent `cursor-agent`/`versions`, near-match scoped package name), 9 "ignores the first script identifying X" cases each exercise a distinct real agent-binary shape (cursor-agent index.js, cursor-agent's own server.js, scoped `@openai/codex` CLI and runtime, a bare `codex-cli` directory, the three codex basenames, and node options preceding the script), plus 2 grok-image cases and the exact CLI-level regression from the pass-1 finding. I did not find a pure duplicate assertion (the closest near-duplicates — "keeps server under codex and cursor-agent directories busy" vs "keeps Next under agent-named directories busy" — exercise different resolved-entry branches: `server.js` positive-match vs `next build` positive-match, both under an agent-shaped directory). The overage is real but transparently disclosed and not inflated by throwaway assertions.

## Verdict rationale

The one defect pass 1 required be fixed — a free-text command-line match that made a busy, codex-path-named `server.js` read as idle — is fixed by replacing it with an executable-image check (`grok`) and a first-script-argument directory/basename check (`cursor-agent/versions`, `@openai/codex`, `codex-cli`, `codex.js`/`codex.mjs`). I independently reproduced the exact old defect as a mutant inside my own worktree, confirmed it fails 9 of the 62 pinned tests identically to the unit's own recorded `M4` mutant, and confirmed the file restores to its original sha256 with a clean `git diff`. I additionally ran several of my own false-idle/false-busy probes beyond the shipped fixture set and did not find a new, realistic misclassification; the two residual gaps I did find (an inline `node -e` exclusion, and an unconditional agent-directory exclusion regardless of the excluded script's own filename) both predate this specific revision or are deliberate, disclosed design trade-offs with no realistic exploitation path on this codebase's actual process shapes (cross-checked against this machine's own live admission snapshot). All required gates pass (jest 62/62, tsc exit 0, oxfmt clean, live CLI ran, roadmap validator PASSED). Scope is limited to the six files on `scripts/qc`/`scripts/__tests__` plus generated evidence receipts, no `src/`/`package.json` changes, no AI attribution, no absolute machine paths in product/test files, and the cap overage arithmetic is independently verified and honestly disclosed rather than padded. APPROVE.
