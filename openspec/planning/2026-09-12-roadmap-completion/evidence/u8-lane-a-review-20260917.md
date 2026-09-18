# Lane A review: U8

reviewedHead: 315b61ac4242a5f9a151a3d4e697a5a8946f166c
baseline: dfe766524cc71e665a0f34a5ee07e9585e4c8214
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — completed, no output (already current).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u8-review 315b61ac4242a5f9a151a3d4e697a5a8946f166c` — succeeded; `HEAD is now at 315b61ac4`. A leftover `worktrees/u8` (implementer lane) was present and left untouched.
- node_modules junctioned: `cmd /c mklink /J ...\worktrees\u8-review\node_modules E:\Projects\MekStation\node_modules` — succeeded on the second attempt (first attempt via Bash's `cmd /c` with forward slashes silently no-op'd; redone with backslashes and `cmd //c`, confirmed present before use).
- `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` — `node --version` → `v22.22.0`.
- `export npm_config_dry_run=true` set before every npm/npx call in this session.
- No `npm install`/`ci`/`prune`, no build, no Playwright, no commit, no edits to the root checkout. All reads and the one mutant edit (see Finding 4) were confined to `worktrees/u8-review`, and the mutant was restored and verified before this report was written.
- Cleanup pending (to run after this report is delivered, per the charter): delete the node_modules junction with `[System.IO.Directory]::Delete('<worktree>\node_modules')`, then `git worktree remove --force .sisyphus/roadmap-completion-20260912/worktrees/u8-review`.

## Files on the range

`git diff --numstat dfe766524..315b61ac4`:
```
166  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u8-admission-20260917.json
233  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u8-local-20260917.json
91   0  openspec/planning/2026-09-12-roadmap-completion/evidence/u8-red-20260917.json
384  0  src/__tests__/api/campaigns/campaignCommandsRoute.staleHead.test.ts
52   1  src/pages/api/campaigns/[id]/commands.ts
```
5 files, no others. Nothing under `src/lib`, `src/pages-modules`, or any other unit's ownership path.

## Findings

**1. [PASS] Concurrency enumeration matches the pinned contract, including value classes the pins do not cover.**
Read `resolveCommandBase` (campaignCommandPipeline.ts:262-312) and `decideCampaignConflict` (campaignConflictDecision.ts:148-198) plus the route guard (`isValidExpectedRevision`, commands.ts:88-96). Enumerated and probed every class the charter lists:

| Input | Path | Response | Journal |
|---|---|---|---|
| absent | route passes `undefined` → pipeline `at-head` | 200 committed | appended (intended) |
| at-head (== length) | pipeline `at-head` | 200 committed | appended (intended) |
| stale, overlapping | pipeline `reconstructed`, `declaredFields===null` short-circuits before the overlap check | 409 `undeclared-field-set` / `rebase-onto-active-head` | untouched |
| stale, disjoint | same short-circuit | 409 `undeclared-field-set` / `rebase-onto-active-head` (byte-identical to overlapping) | untouched |
| above-head | pipeline `revision-unknown` | 409 `base-revision-unknown` / `resync-to-active-head` | untouched |
| negative (-1) | route guard `value >= 0` fails | 400, journal untouched | untouched |
| fractional (1.5) | route guard `Number.isSafeInteger` fails | 400 | untouched |
| string ('3', '1') | route guard `typeof === 'number'` fails | 400 | untouched |
| null | route guard fails (typeof null !== 'number') | 400 | untouched |
| huge integer, `Number.MAX_SAFE_INTEGER + 1` (not covered by shipped pins) | route guard `Number.isSafeInteger` fails on 9007199254740992 | probed: `{"status":400,"json":{"error":"expectedRevision must be absent or a non-negative integer"}}`, journal revision unchanged | untouched |
| `-0` (not covered by shipped pins) | route guard passes (`Number.isSafeInteger(-0)` is true, `-0 >= 0` is true); forwarded as `-0`; pipeline treats it as revision 0, which was in-range and stale on the probe fixture | probed: `{"status":409,"json":{"kind":"conflict","reason":"undeclared-field-set","head":{"branchId":"root","revision":1},"recoveryAction":"rebase-onto-active-head","conflictingFields":[]}}` | untouched |
| `1e3` (not covered by shipped pins; a JS numeric literal, not a distinct wire value from 1000) | ordinary above-head integer | probed: `{"status":409,"json":{"kind":"conflict","reason":"base-revision-unknown","head":{"branchId":"root","revision":1},"recoveryAction":"resync-to-active-head","conflictingFields":[]}}`, journal unchanged | untouched |

Ran with `npx jest` a scratch file added at `src/__tests__/api/campaigns/_scratchLaneAProbe.staleHead.test.ts` (not part of the PR; deleted after the run, confirmed via `git status --porcelain` returning clean). All four probed classes behaved exactly as the table above predicts from reading the source, and none of them let a stale command commit or mutate the journal. `-0` is worth naming precisely because it is the one value class where the route's own boolean guard (not the malformed-value 400 path) quietly normalizes an unusual input to a valid revision rather than rejecting it — see Finding 2.

**2. [LOW, informational] `-0` is accepted and silently folded to revision 0; not pinned, not a defect.**
`isValidExpectedRevision` (commands.ts:88-96) is `value === undefined || (Number.isSafeInteger(value) && value >= 0)`. Both sub-conditions are true for `-0` in JS, so `-0` is accepted as "valid," forwarded, and in `resolveCommandBase` (campaignCommandPipeline.ts:267-274) `expected < 0` is false and `expected === priorEvents.length` is false (unless the stream is empty), so it falls to the `reconstructed` arm with `priorEvents.slice(0, -0)` — which slices to `[]`, i.e. behaves identically to an honest `expectedRevision: 0`. Confirmed via probe above: no commit slips through, the journal is untouched, and the client gets the same `undeclared-field-set` refusal an honest `0` would get. This is not a security or correctness defect — the outcome is safe — but it is a value class the shipped `MALFORMED_REVISIONS` table (test file lines 200-205) does not enumerate, unlike `-1`, `1.5`, `'3'`, and `null`. Not required to fix for this unit; noted for a successor's malformed-value table if one is ever revisited.

**3. [PASS] Contract-honesty claims verified from the read-only files themselves, not just the receipts.**
- No `code` field on the wire: `decideCampaignConflict`'s `refuse()` helper freezes `code: 'STALE_REVISION'` (campaignConflictDecision.ts:157-164), but the pipeline's `'conflict'` result type (campaignCommandPipeline.ts:127-149) and its construction (lines 449-456) never copy `decision.code` into the result — only `reason`, `head`, `recoveryAction`, `conflictingFields`, `expectedSequence`, `actualSequence`. The route's 409 body (commands.ts's `case 'conflict'`) forwards exactly that set. `code` genuinely never reaches HTTP. Confirmed independently of the pins by reading the three files.
- Byte-identical overlapping/disjoint stale responses: `decideCampaignConflict` checks `base.declaredFields === null` (line 177) before it ever computes `campaignFieldOverlap` (line 187). Since this route's `ICampaignCommandRequest` is built without a `declaredFields` field (commands.ts's pipeline-call literal has no such key), `request.declaredFields` is always `undefined`, so `resolveCommandBase` always sets `declaredFields: null` (pipeline lines 306-310) for any in-range stale base, regardless of whether the command's touched fields overlap the intervening ones. Both the pin's `stale-same-field` and `stale-disjoint` tests assert the identical body (`reason: 'undeclared-field-set'`, `recoveryAction: 'rebase-onto-active-head'`, `conflictingFields: []`) and both pass (verified in Gates below).
- Both facts are stated plainly in the `u8-local-20260917.json` receipt (`findingsReportedNotFixed`, `FN-u8-conflict-result-drops-stale-revision-code` and `FN-u8-http-boundary-cannot-reach-the-field-level-verdict`) and in the PR #1829 body (fetched via `gh pr view 1829 --json body`; the "Non-claims and findings" paragraph names both by id). Both are correctly scoped as `src/lib/campaign/authority` changes this unit does not own (ownershipPaths is `src/pages/api/campaigns` only) — neither is a defect U8 should have fixed itself.

**4. [PASS] Regression: existing suites green, malformed-400-before-auth ordering unchanged.**
- `npx jest src/__tests__/api/campaigns/campaignCommandsRoute.test.ts src/__tests__/api/campaigns/campaignCommandsRoute.rebuild.test.ts` → `Tests: 14 passed, 14 total` (13 + 1, matching the receipt).
- `npx jest src/__tests__/api/campaigns` → `Test Suites: 12 passed, 12 total`, `Tests: 87 passed, 87 total`.
- Read the route on both trees: baseline `git show dfe766524:.../commands.ts` has `isValidCommandBody(body)` → 400 at line 94-95, then `authenticateRequest` → 401 at line 105-111. Head has the same order: `isValidCommandBody(body)` → 400 at line 135-138 (now naming the field when the revision claim is what failed), then `authenticateRequest` → 401 at line 152-158. The malformed-body 400 still fires strictly before authentication on both trees; unchanged.

**5. [PASS] Independent mutant reproduction (M1, "not forwarded").**
sha256 before mutation: `e34306387f7c3110073740e2148f3995b66b724d74c0251d20fdfbd34f5ad97a` (`sha256sum "src/pages/api/campaigns/[id]/commands.ts"`).
Mutation applied in the review worktree: replaced the line `expectedRevision: body.expectedRevision,` in the `executeCampaignCommand` call with a comment (field dropped from the forwarded request; the input guard was left intact).
Result: `npx jest src/__tests__/api/campaigns/campaignCommandsRoute.staleHead.test.ts --verbose` → `Tests: 3 failed, 6 passed, 9 total`. The three failures were exactly the stale-overlapping, stale-disjoint, and above-head cases (each `Expected: 409, Received: 200`); the four malformed-value cases and the two at-head/absent cases stayed green, matching the receipt's claim for mutant M1 exactly (3 failed).
Restore: `git checkout -- "src/pages/api/campaigns/[id]/commands.ts"`; re-measured sha256 `e34306387f7c3110073740e2148f3995b66b724d74c0251d20fdfbd34f5ad97a` — identical to pre-mutation. `git status --porcelain` empty after restore.

**6. [PASS] Cap and scope.**
`git diff --numstat` (see Files on the range) confirms product +52/−1 in `commands.ts` and 384 lines in the new test file. Manual count of added, non-comment, non-blank lines in the route diff (`grep '^+' | grep -v comment/blank`) = 22, matching the "22 code lines" claim exactly. Files touched: 5 total (2 source/test + 3 receipts), well under the 15-file cap; non-generated changed lines (52 + 384 − 1 removed... i.e. 52 product + 384 test = 436, receipts excluded as generated) under the 500-line cap. Nothing outside `src/pages/api/campaigns`, the paired test file, and the unit's own `openspec/planning/**` evidence — confirmed via `git diff --name-only` above. No `Co-Authored-By`/`Generated with`/🤖 attribution in the commit message or the PR body (`git log -1 --format=%B` and `gh pr view 1829` both grepped clean); the PR body's "Implemented by a Claude Opus Agent lane; Lane A review by a Claude Sonnet lane" line is the process's own required reviewer/implementer bookkeeping (DELIVERY.md step 5), not the prohibited attribution footer.

**7. [LOW, informational, not unit-specific] Receipts embed this machine's absolute local path.**
`u8-local-20260917.json` and `u8-red-20260917.json` both contain the literal string `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH`, and `u8-local-20260917.json` also states "the root checkout at E:/Projects/MekStation was never written to". Checked whether this is unique to U8: `grep -l wroll openspec/planning/2026-09-12-roadmap-completion/evidence/*.json` returns 198 files, and the same PATH string is the standing convention GOAL.md itself prescribes ("Node 22 for every node/npm/npx call: export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH"). This is the whole program's established receipt convention, not a defect introduced by this unit, so it does not affect the verdict — flagged only because the charter's cap-and-scope check explicitly names "no absolute machine paths."

## Gates

| Gate | Command | Last line | Exit |
|---|---|---|---|
| New pin | `npx jest src/__tests__/api/campaigns/campaignCommandsRoute.staleHead.test.ts` | `Tests: 9 passed, 9 total` | 0 |
| Existing route files | `npx jest .../campaignCommandsRoute.test.ts .../campaignCommandsRoute.rebuild.test.ts` | `Tests: 14 passed, 14 total` | 0 |
| Campaigns API dir | `npx jest src/__tests__/api/campaigns` | `Test Suites: 12 passed, 12 total` / `Tests: 87 passed, 87 total` | 0 |
| Typecheck | `npx tsc --noEmit` | (no output) | 0 |
| Lint | `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 |
| Lint, scoped (verification only) | `npx oxlint "src/pages/api/campaigns/[id]/commands.ts" ".../campaignCommandsRoute.staleHead.test.ts"` | `Found 0 warnings and 0 errors. Finished in 7ms on 0 files` | 0 |
| Format | `npx oxfmt --check "src/pages/api/campaigns/[id]/commands.ts" ".../campaignCommandsRoute.staleHead.test.ts"` | `All matched files use the correct format.` (2 files) | 0 |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

Confirmed the `.oxlintrc.json` `ignorePatterns` contains `src/pages/api/**` and `**/__tests__/**` / `**/*.test.ts` (read the file directly, lines 19-56), so the root oxlint run's 84/0 is vacuous for both changed files — matches the receipt's own disclosure (`FN-u8-oxlint-does-not-cover-src-pages-api-or-tests`), confirmed structurally rather than taken on trust.

`qc:openspec-ci:validate` was not independently re-run (not in the charter's gate list); the receipt's claimed `errors=0` line is unverified by me — labeled here rather than asserted.

## Cap

Verified: product +52/−1 (22 code lines) in one file, 384-line new test file, 3 evidence receipts (166/91/233 lines, each confirmed with `wc -l`), 5 files total, all inside `src/pages/api/campaigns`, its paired test directory, and the unit's own planning evidence path. No `src/lib`, no `src/pages-modules`, no other unit's path.

## Verdict rationale

Every claim in the receipts and PR body that I could check against the read-only pipeline files, the diff, and live gate runs held up exactly as stated, including two probed value classes (`Number.MAX_SAFE_INTEGER + 1`, `1e3`) not in the shipped pin table and one (`-0`) whose behavior (silent fold to revision 0) is worth naming even though it is not a defect. The independently reproduced mutant (M1) failed exactly the three tests the receipt claims, and the file was restored to its pre-mutation sha256. Regression is clean (14/14, 87/87), the malformed-400-before-auth ordering is unchanged from baseline, and the two disclosed contract gaps (`code` missing on the wire; disjoint/overlapping stale cases indistinguishable over HTTP) are correctly out of this unit's ownership (`src/lib/campaign/authority`) and are stated plainly in both the receipt and the PR body rather than hidden. Cap and scope hold exactly to the numbers claimed. Nothing here rises to a required edit.

This is engineering evidence only. U8 carries `reviewClasses: ["concurrency", "routine"]` and packet `PK-u8-ruling` is open (`decision: null`, `ruling: null`) — the owner ruling on this exact head is required before merge and is explicitly not Lane A's call, per the charter and DELIVERY.md step 5.
