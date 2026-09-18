# Lane A review: U15a (rebuild)

reviewedHead: 3a7a649f0ddcdc097aa6db576a714a6d2b63ff2b
baseline: 6fe884dd5740da6628ff10e3e4b7075124b4b63f
reviewerModel: claude-sonnet (Agent model: sonnet)

Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (no new output — already current).
- Verified both SHAs resolve: `3a7a649f0ddcdc097aa6db576a714a6d2b63ff2b` and `6fe884dd5740da6628ff10e3e4b7075124b4b63f` both `git rev-parse --verify` clean.
- Created detached worktree at `.sisyphus/roadmap-completion-20260912/worktrees/u15a-review` on `3a7a649f0` (17120 files checked out).
- Junctioned `node_modules` from the root checkout via PowerShell `New-Item -ItemType Junction` (confirmed `d----l` mode entry).
- Node 22.22.0 confirmed (`node --version`) via the prepended nvm PATH; `npm_config_dry_run=true` exported before any npm-family command; no install/build/Playwright/commit run at any point.
- All git commands in this review ran with an explicit path into the review worktree or `-C E:/Projects/MekStation` for the root-repo-only checks (blob lookups, PR body). The root checkout's files were never touched.

## Files on the range

`git diff --stat 6fe884dd57..3a7a649f0` lists exactly four files, matching the task brief:

- `src/lib/multiplayer/server/ServerMatchHost.ts` (+13/-5, net +9 as summarized: 19 changed lines)
- `src/lib/multiplayer/server/__tests__/combatJournalAuthorityEnabled.test.ts` (new, 143 lines)
- `src/lib/multiplayer/server/combatJournalAuthorityEnabled.ts` (new, 59 lines)
- `src/lib/multiplayer/server/matchJournalAuthority.ts` (+9/-2, net 11 changed lines)

Total: 227 insertions, 5 deletions, 4 files — nothing else on the range.

## Findings

### F1 — Byte identity confirmed for all four files [severity: info, verification]

Compared each file's blob at the reviewed head against PR #1818's original head `46de0b2f137d5c6f32f4637caad4c49c0aeaa276`:

```
ServerMatchHost.ts                              head=c6437564d old=c6437564d MATCH
combatJournalAuthorityEnabled.ts                head=bdcd0076d old=bdcd0076d MATCH
matchJournalAuthority.ts                         head=c93641e89 old=c93641e89 MATCH
__tests__/combatJournalAuthorityEnabled.test.ts head=1769ac5e7 old=1769ac5e7 MATCH
```

All four `git rev-parse <sha>:<path>` blob hashes are identical between the two heads. This branch is a pure rebase/rebuild carrying no content changes relative to the previously-evidenced lane. `git cat-file -t 46de0b2f137d5c6f32f4637caad4c49c0aeaa276` confirms that commit still exists locally (type `commit`) for the comparison.

### F2 — Fail-closed two-key law holds, verified independently of the shipped pin [severity: info, verification]

Ran the shipped pin (`combatJournalAuthorityEnabled.test.ts`, 10/10 pass — see Gates) and additionally wrote an out-of-band probe script (`tsx`, no jest, run from inside the worktree so relative TS imports resolved) exercising combinations the pin's `for` loop doesn't spell out verbatim (wrong-case `'TRUE'`, an unrelated bogus mode string, both-unset). Output:

```
PRODUCTION_CONSTANT= off
1) both unset                  -> e2eResolved=null resolved=off getter=off
2) e2e=true, arm unset         -> e2eResolved=null resolved=off getter=off
3) e2e unset, arm=enabled      -> e2eResolved=null resolved=off getter=off
4) e2e=true, arm=bogus-mode    -> e2eResolved=null resolved=off getter=off
5) e2e=true, arm=shadow        -> e2eResolved=shadow resolved=shadow getter=shadow
6) e2e=true, arm=enabled       -> e2eResolved=enabled resolved=enabled getter=enabled
7) e2e=TRUE (wrong case), arm=enabled -> e2eResolved=null resolved=off getter=off
```

Only the case where both `NEXT_PUBLIC_E2E_MODE === 'true'` (exact-string, case-sensitive) AND the mode key names exactly `'shadow'`/`'enabled'` arms the resolver; every other combination, including a wrong-case env value and an unrecognized mode string, resolves to `'off'`. This matches the two-key law claimed in the commit message and unit brief.

### F3 — Every real consumer reads through the getter; the raw constant/flag is not used as a bypass [severity: info, verification]

`grep -rn "COMBAT_JOURNAL_AUTHORITY_MODE\b" src` (excluding `__tests__`) turns up only: its definition + derivation of `COMBAT_JOURNAL_AUTHORITY_ENABLED` in `matchJournalAuthority.ts`, and the resolver's own read of the raw constant in `combatJournalAuthorityEnabled.ts` (required — the resolver's job is to read the constant first and fall through to the arm only when it's `'off'`). No other file in `src` reads the raw constant.

`grep -rn "getCombatJournalAuthorityMode"` (excluding `__tests__`) shows four real call sites, all through the getter: `DurableMatchStore.ts:1000`, `journalAuthorityAdmission.ts:218`, `matchCommitJournalHead.ts:86`, `ServerMatchHost.ts:389` and the new `resolveBootstrapJournalAuthority` at `ServerMatchHost.ts:1561`. `COMBAT_JOURNAL_AUTHORITY_ENABLED` (the derived boolean) has no consumers left outside its own definition and law-pinning assertions in three test files (`combatJournalAuthorityEnabled.test.ts`, `journalAuthorityPath.test.ts`, `journalAuthorityShadow.test.ts`) that all assert it stays `false` — i.e. it's used only to pin the production default, never to gate live behavior. The diff itself removed the one place that used to read `COMBAT_JOURNAL_AUTHORITY_ENABLED` directly (`ServerMatchHost.ts`'s old `bootstrap.journalAuthority ?? COMBAT_JOURNAL_AUTHORITY_ENABLED`), replacing it with the getter-derived `resolveBootstrapJournalAuthority`.

### F4 — Structural mirror of the campaign arm confirmed [severity: info, verification]

Read `src/lib/campaign/sync/campaignJournalAuthorityEnabled.ts` (the arm this unit is documented to mirror). Same two-key shape: `NEXT_PUBLIC_E2E_MODE === 'true'` gate plus an explicit opt-in env (`MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY`), constant read first. The combat arm extends the pattern correctly for a tri-state mode (`'off'|'shadow'|'enabled'`) instead of the campaign arm's plain boolean, using an allow-list (`ARMABLE_MODES`) rather than a single `'1'` sentinel — a reasonable, minimal generalization, not a divergence in the fail-closed guarantee.

### F5 — No scope, attribution, or path violations [severity: info, verification]

- `git diff --stat` restricted to everything *except* `src/lib/multiplayer/server` over the same range: empty — nothing touched outside the unit's ownership path.
- Diff and commit body grepped for `claude|anthropic|co-authored|generated with`: no matches.
- Diff grepped for absolute machine paths (`C:\`, `E:\`, `/Users/`, `/home/wroll`): no matches.
- `gh pr view 1842` body: describes exactly the four files, the byte-identity rebuild rationale, the baseline (`6fe884dd5`), and the two-key behavior — consistent with what was independently measured above.

## Gates

| Gate | Command | Result | Exit |
|---|---|---|---|
| Focused jest | `npx jest src/lib/multiplayer/server` | `Test Suites: 157 passed, 157 total` / `Tests: 1159 passed, 1159 total` | 0 |
| Typecheck | `npx tsc --noEmit` | no output (clean) | 0 |
| Format | `npx oxfmt --check` (the 4 changed files) | `All matched files use the correct format. Finished in 53ms on 4 files` | 0 |
| Unit-cap lint | `npm run lint:units` | `LINT_UNITS_PATH e2e 50` / `LINT_UNITS_PATH scripts 50` / `LINT_UNITS_PASS 100/100` | 0 |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

Note on the jest count: the admission receipt (`evidence/u15a-local-20260917.json`, written against the original #1818 head/baseline) recorded 157 suites / 1155 tests; this baseline (after U15b/U16/U13/U17/U17b/U4 merged into main) now carries 157 suites / 1159 tests — the same suite set, 4 more tests, consistent with unrelated main-line growth rather than a regression in this unit's scope. All 157 suites still pass.

## Mutant reproduction

Chose the `NEXT_PUBLIC_E2E_MODE !== 'true'` fail-closed guard in `e2eCombatJournalAuthorityMode()` (`combatJournalAuthorityEnabled.ts`) and inverted it to `=== 'true'` (a realistic "logic flipped" mutant — arms on the wrong e2e-mode value instead of the right one).

- Original file sha256: `c18b1a6b2fc2a858b4df258b1ac7d97ea27d8f84a435ec64e41a805e778d4bb7`
- Applied mutation, ran `npx jest src/lib/multiplayer/server/__tests__/combatJournalAuthorityEnabled.test.ts`:
  - `Test Suites: 1 failed, 1 total` / `Tests: 5 failed, 5 passed, 10 total`
  - Failed tests: `arms shadow when both keys agree on shadow`, `arms enabled when both keys agree on enabled`, `refuses an unknown value, including the plausible ones` (loop assertions), `follows the arm through getCombatJournalAuthorityMode when no override is set`, `derives the host bootstrap default from the getter, not the constant`.
- Restored the file from backup; sha256 after restore: `c18b1a6b2fc2a858b4df258b1ac7d97ea27d8f84a435ec64e41a805e778d4bb7` (identical). `git status --porcelain` in the review worktree returned clean after restore.

The pin kills this mutant (5/10 tests fail), consistent with the admission receipt's claim of a real mutation-tested pin rather than a decorative one.

## Verdict rationale

All four review-question areas check out against independent, in-session measurement, not just the shipped pin or the receipt's prose:

1. **Byte identity** — confirmed via blob-hash comparison for all four files against #1818's original head; `git diff --stat` over the range lists exactly those four files and nothing else.
2. **Fail-closed law** — reproduced with an independent `tsx` probe outside jest, covering the pin's cases plus two extra combinations (wrong-case env value, unrelated bogus mode); the two-key law holds in every case.
3. **Production constant** — `COMBAT_JOURNAL_AUTHORITY_MODE` stays the literal `'off'`; every real runtime consumer (`DurableMatchStore`, `journalAuthorityAdmission`, `matchCommitJournalHead`, `ServerMatchHost`) reads through `getCombatJournalAuthorityMode()`; the raw boolean derivative is only ever asserted false in tests, never used to gate behavior.
4. **Rebase safety** — all five requested gates pass clean on the current baseline (post U15b/U16/U13/U17/U17b/U4): jest 157/157 suites (1159/1159 tests), tsc clean, oxfmt clean on the four files, `lint:units` at 100/100, roadmap validator PASSED.
5. **Mutant reproduction** — independently mutated the e2e-mode guard, watched 5/10 pin tests fail for the expected reasons, restored the file, and confirmed sha256 identity with the pre-mutation original.
6. **Scope/attribution/paths** — nothing touched outside `src/lib/multiplayer/server`; no AI attribution anywhere in the diff or commit; no absolute machine paths; the PR #1842 body accurately describes the diff.

No BLOCKER, HIGH, or MEDIUM findings. This is a pure, verified rebuild of an already-evidenced lane with no content drift, and it holds up cleanly against the post-merge baseline. Recommending APPROVE.
