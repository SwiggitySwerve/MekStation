# Lane A review: U2c
reviewedHead: 7c494347686d724bc1dd492f7a2824320177f0c2
baseline: 62391de467fe080f9787e4adc5f28a7a5f774de7
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` run.
- Detached review worktree created: `git -C E:/Projects/MekStation worktree add --detach E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u2c-review 7c494347686d724bc1dd492f7a2824320177f0c2` — landed at `HEAD is now at 7c4943476`.
- `node_modules` junctioned via PowerShell `New-Item -ItemType Junction` (not `mklink`). No npm install/ci/prune run anywhere in this review.
- Node 22.22.0 selected via PATH prepend (`node --version` -> `v22.22.0`).
- All jest/tsc/oxfmt/lint/validator commands below were run inside the review worktree only, with `-C`/cwd scoped to it; the root checkout was never touched.
- Reviewer is a Claude Sonnet Agent lane; the implementer's own receipts record `implementerModel: claude-opus (Agent model: opus)` — different models, satisfies the cross-model constraint.

## Files on the range (`git diff 62391de4..7c494347 --numstat`)

| file | +/- |
|---|---|
| e2e/gm-two-player-privacy.pack.spec.ts | 295 / 22 |
| openspec/planning/2026-09-12-roadmap-completion/evidence/u2c-admission-20260922.json | 181 / 0 |
| openspec/planning/2026-09-12-roadmap-completion/evidence/u2c-local-20260922.json | 367 / 0 |
| openspec/planning/2026-09-12-roadmap-completion/evidence/u2c-red-20260922.json | 93 / 0 |
| scripts/__tests__/gm-two-player-campaign-qc.test.ts | 7 / 2 |
| scripts/qc/gm-two-player-campaign-core.cjs | 5 / 5 |

6 files total, one commit (`7c4943476`, "test(e2e): the privacy pack arms the combat journal fixture, E2E-19 proves the GM preview stays private, E2E-25 is gated until the journal cutover"). No `src/` changes (`git diff ... -- src/` empty), no `e2e/helpers/` changes, no `openspec/changes/**` changes (including no `tasks.md` edit) — matches the unit's "no product change; no tick" claim. Commit author `Wes Rollings <wrollings@gmail.com>`; grep of the diff for `anthropic|claude|co-authored|generated with|absolute-path patterns` returned nothing.

## Findings

1. **[INFO] Row letter fidelity, E2E-19 — matches the letter, walks the whole body.** `e2e/gm-two-player-privacy.pack.spec.ts:255-306`. The test previews a correction, reads the draft back as GM (`privateRecords[0]` has `payload`), then as the seated player via the same ref and asserts `expect(jsonKeys(player)).not.toContain('payload')`. `jsonKeys` (`:874-881`, unchanged by this diff) is a genuine recursive walk over arrays/objects, not a single-path check, so the "no payload key anywhere" requirement is real. `playerViews()` (`:856-872`, unchanged) collects DOM (`guestPage.content()`), wire frames (`guestTap.frames`), the `timeline` leaf and the `export?streamType=match` leaf, and the test searches all four for the draft summary and the ref. This satisfies spec.md:81-83 verbatim and is not weaker than the letter.
2. **[INFO] Row letter fidelity, E2E-25 — every assertion the letter implies is present, unweakened, though unreached today.** `e2e/gm-two-player-privacy.pack.spec.ts:311-397`. Before the gate: the request body's `reason` field is asserted equal to the sent reason (proves "the reason reaches the server"); after that, if the gate were lifted, the test would assert `activatedBranchId` transitions on the player's timeline/export, that no player view contains the reason text, that the GM's private record (`private_record` table, `record_kind='gm-reason'`) holds the reason, and that the same private-preview ref read as a player has neither the reason text nor a `payload` key at any depth (`jsonKeys(player.privateRecords)`). None of this is watered down relative to spec.md:105-107; it is simply unreached because `test.fail` stops the row at the refusal, which is the documented and correct behavior for a gated row.
3. **[INFO] The parked-head diff is exactly the gate, its tag, and the header — no other hunk.** `git diff cbb0e214e5aac4fb1e2b9cad9cb56f93fbdc387b..7c494347686d724bc1dd492f7a2824320177f0c2 -- e2e/gm-two-player-privacy.pack.spec.ts` produces exactly two hunks: (a) the header comment block (`:79-138` roughly) is rewritten from a narrative describing E2E-25 as blocked-but-not-gated to a narrative that states the gate mechanism, the exact refusal body/detail string, and the assertion line (`line 345 of this file as it stands`); (b) the test declaration gains the `@until-journal-cutover` tag (`test('E2E-25 ... @E2E-25 @until-journal-cutover'`) and a `test.fail(true, '...')` call is inserted as the first statement of the test body, naming the finding id, the mechanism, the refused-at assertion, and the owner. I verified the header's claimed line number is accurate: `grep -n "committed.status(), await committed.text()).toBe(200)"` returns line 345 in the reviewed worktree, matching the header's citation exactly. No other hunk exists in this file between the two heads — confirmed by reading the full diff output, which ends after the test-body hunk.
4. **[INFO] Gate honesty confirmed.** The gate is the strict `test.fail(true, '<message>')` form (not `test.skip`/`test.fixme`), identical in shape to the precedent rows `e2e/gm-two-player-rewind.pack.spec.ts:43-46` (E2E-40), `:76` (E2E-41), etc. `grep -n "expect.soft\|\.skip(\|\.fixme(" e2e/gm-two-player-privacy.pack.spec.ts` returns nothing in either the reviewed head or the baseline (`git show 62391de4:...`), so nothing was newly introduced or removed in that class. The tag `@until-journal-cutover` is present in the test title. The header names the finding (`FN-u2b-rewind-commit-verifies-through-the-match-store`), the refusal body (`409 candidate-verification-failed`, `"Branch '<candidate id>' is anchored to a base its parent does not hold at revision 4"`), the exact line the refusal stops at (345), what the row proves before the refusal (reason transport, lease admission), and the cutover owner (`adopt-combat-journal-cutover-and-gm-rewind`). This matches council decision 7's mechanical definition of a named gate (`openspec/council-decisions/2026-09-21-umbrella-failures-review.md`, item 7): "the excluded set is exactly the authored rows carrying a strict `test.fail` with a named gate tag."
5. **[VERIFIED] Arming fidelity — both journal keys, one boolean, quoted.** `scripts/qc/gm-two-player-campaign-core.cjs:204-206`:
   ```js
   const armsJournalAuthorityFixture =
     expandedMembers.includes('authority-recovery') ||
     expandedMembers.includes('privacy-pack');
   ```
   and (unchanged by this diff, confirming both keys ride the same flag) `:234-238`:
   ```js
   ...(armsJournalAuthorityFixture
     ? {
         MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY: '1',
         MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE: 'enabled',
   ```
   No other line in `buildRunPlan`'s group table changed (the only other diff hunk in this file is a comment-only rewrite of the `privacy-pack`/`proposal-pack` description at `:76-82`, no code). I ran the qc pin: `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts` → `Tests: 14 passed, 14 total`, matching the receipt's "qc pin 14/14" claim. I then reproduced a mutant of my own: removed the `|| expandedMembers.includes('privacy-pack')` disjunct (leaving only `authority-recovery`), sha256 of `core.cjs` before mutation `f065b258b59f4cb5cd8e097ec3d4331c85d54c314c2a8144d41c1f27e5d0a1fc`. Re-running the same jest pin: `Tests: 1 failed, 13 passed, 14 total` — the failing test is `registers the approved catalog and deterministic implemented plans`, specifically the new assertion this diff added at `scripts/__tests__/gm-two-player-campaign-qc.test.ts:254-258` (`expect(privacyPlan.environment).toMatchObject({ MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY: '1', MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE: 'enabled', ... })`), which reported both keys missing from the received object. I restored the file with `git checkout -- scripts/qc/gm-two-player-campaign-core.cjs` and confirmed sha256 back to `f065b258b...` (identical), then re-ran the pin clean: `14 passed, 14 total`. This sha256 also matches the value recorded in `evidence/u2c-local-20260922.json`'s `lineCounts` entry for this file, cross-confirming the receipt describes this exact file content. The receipts' mutant table (three live-Playwright mutants: E2E-19 inverted, arming removed, gate removed) is a different mechanism from mine (I stayed at the jest-pin level per this review's static-plus-jest scope) but is consistent with my read: the arming change is load-bearing and the newly added qc pin assertion is precisely what catches its removal at the unit-test layer, corroborating the live-run claim.
6. **[INFO] Non-arming groups gained `proposal-pack` to the negative-arming test.** `scripts/__tests__/gm-two-player-campaign-qc.test.ts:559-566`: the "leaves both journal keys off a group that does not arm the fixture" test's group list grew from `['token-pack', 'smoke']` to `['token-pack', 'smoke', 'proposal-pack']`. This strengthens (does not weaken) the negative-arming assertion by confirming `proposal-pack` — a sibling privacy-adjacent pack — is NOT swept into the new `|| privacy-pack` disjunct. Consistent with the arming-fidelity claim in finding 5.
7. **[INFO — disclosed, not a defect] `FN-u2c-gated-row-absorbs-unrelated-failures` is a real, disclosed limitation of the test.fail pattern, not unique to this diff.** The local receipt records this new finding: a `test.fail`-marked row reports any failure (not just the named one) as the expected one, with no body differentiation. This is inherent to Playwright's `test.fail(true, msg)` mechanism and is the same shape as the precedent rows in `gm-two-player-rewind.pack.spec.ts`. Mitigation as stated (header names the exact refusal; E2E-19 shares the arming and would independently catch an arming regression) is real and sufficient for this unit's scope. Not a blocker.

## Gates

| Gate | Command | Result |
|---|---|---|
| QC pin | `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts` | `Tests: 14 passed, 14 total` — exit 0 |
| Typecheck | `npx tsc --noEmit` | no output — exit 0 |
| Format | `npx oxfmt --check e2e/gm-two-player-privacy.pack.spec.ts scripts/qc/gm-two-player-campaign-core.cjs scripts/__tests__/gm-two-player-campaign-qc.test.ts` | `All matched files use the correct format.` — exit 0 |
| Unit-cap lint | `npm run lint:units` | `LINT_UNITS_PASS 100/100` — exit 0 |
| OpenSpec CI quality | `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] ... errors=0` — exit 0 |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` — exit 0 |

No build and no Playwright were run, per this review's static-plus-jest scope; the implementer's receipts (`evidence/u2c-local-20260922.json`) carry the live Playwright runs (privacy-pack 8 passed twice — 7 ok + 1 expected failure, 0 unexpected passes; proposal-pack 2; authority-recovery 4) which this review did not re-execute but which I cross-checked structurally (finding 5's mutant reproduction corroborates the arming claim those runs depend on).

## Cap

`git diff --numstat` (baseline..head): 6 files total (3 product/test files + 3 generated evidence receipts). Non-generated (product+test) lines: 307 insertions / 29 deletions = 336 total changed lines, under the 500 cap; 3 non-generated files, well under the 15-file cap (6 including receipts, also under 15). Nothing outside `e2e/gm-two-player-privacy.pack.spec.ts`, `scripts/qc/`, `scripts/__tests__/`, and the three `evidence/u2c-*-20260922.json` receipts — confirmed via `--stat` on `src/`, `e2e/helpers/`, and `openspec/changes/` all returning empty. No AI attribution in the commit message or diff content. No absolute machine paths in the product or test files (grepped `E:\\|C:\\|/c/Users` across the diff of the three code files — none found; the admission/red evidence JSONs do carry a machine-local scratchpad log path, but those are receipts, not product or test files, and the charter's scope for this check is explicitly product/test files). The red receipt (`evidence/u2c-red-20260922.json`) records the un-gated 409 measured before the gate was added: `httpStatus: {expected: 200, received: 409}`, `exactBody` containing `candidate-verification-failed`, `runnerSummaryLines: ['1 failed', '7 passed (43.8s)']` — this is the pre-gate red the gate answers, and it precedes the gated 8-passed/1-expected-failure measurement in the same file.

## Verdict rationale

Every row-letter, gate-mechanism, arming, gate, and cap check I could verify statically or via jest passed and matched the claims in `units.json`'s U2c entry and its three receipts. The one file-content diff against the predecessor U2b head (`cbb0e214e`) is exactly what the charter predicted — the gate, its tag, and the header — with no other hunk, confirmed by reading the full diff rather than trusting the summary. The arming change is load-bearing and I reproduced that independently with my own mutant (not merely re-running the implementer's mutant), restoring the file to its original sha256 afterward. No product code changed, no tick was taken, no AI attribution, and all six required gates are green on this exact head. I found no weakening, no narrowing of the row letters, and no soft/skip/fixme regression. Verdict: **APPROVE**.
