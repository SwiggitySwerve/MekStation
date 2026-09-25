# Lane A review: U22
reviewedHead: 9f778f6b10625bf0f33a59515faa75aee59d46b7
baseline: 0fd24c343d8de2d467bb5b2d3d57c3beeb2d89af
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — no output (already current).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u22-review 9f778f6b10625bf0f33a59515faa75aee59d46b7` — succeeded, "HEAD is now at 9f778f6b1 test(e2e): E2E-25 runs as a plain row now that a committed rewind reaches the live match".
- `git worktree list` beforehand confirmed `worktrees/u22` (the implementer's own checkout, on the same branch) and `worktrees/u35g` / `worktrees/u35g-review` (a different lane) already existed; none was touched. All work below happened only in the new `worktrees/u22-review`.
- node_modules junctioned via PowerShell: `New-Item -ItemType Junction -Path '...\u22-review\node_modules' -Target '...\MekStation\node_modules'` — succeeded.
- Node confirmed 22.22.0 (`export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH; node --version` → `v22.22.0`); `npm_config_dry_run=true` set; no `npm install/ci/prune` was run at any point.
- Every mutant/probe below was applied, run, then restored from a saved copy of the head file (`scratchpad/u22lanea/head.spec.ts`, sha256 `33ff6684a1e213e812686e36101c90b2afd46a70de5a4dc4f629a40b80c5dd15`), with the sha256 re-checked equal after restore each time. Final `git status --short` in the review worktree is clean. No commit, push, or edit to the root checkout or any other worktree.

## Files on the range (`git diff --stat` baseline..head)

```
e2e/gm-two-player-privacy.pack.spec.ts | 53 +++++-----------------------------
e2e/helpers/campaignJournalDrive.ts    | 36 +++++++++++++++++++----
2 files changed, 38 insertions(+), 51 deletions(-)
```
`git diff --numstat`: spec +7/-46, helper +31/-5 — sums to 38 insertions / 51 deletions / 89 changed lines, matching `evidence/u22-local-20260925.json`'s `lineCountTotals` exactly. Both files are under U22's `ownershipPaths` (`e2e`, `openspec/changes/harden-gm-two-player-campaign-sessions`); `openspec/changes/...` is not touched at all (no `tasks.md` edit — matches the receipt's "No tasks.md edit and no checkbox").

## Findings

### Finding 1 — INFO (Q1: body identity)

Probe: extracted the E2E-25 test body (from `test.setTimeout` through the closing `});`) at baseline (`git show 0fd24c343d...:e2e/gm-two-player-privacy.pack.spec.ts`, lines 319-402) and at head (`git show 9f778f6b106...`, lines 280-363), diffed and hashed them independently of the receipts.

Output: `diff body_baseline.txt body_head.txt` → no differences ("BODIES IDENTICAL"); both files 84 lines; both sha256 `32a9e9ee924bc6d9f3acb727d4ac326b6b2626f8a761be308b2fb100954bcefa` (my own hash of the extracted range — differs from the receipt's stated value because the receipt hashed a different byte range/tool, but the two extracted ranges are byte-for-byte identical to each other, which is the load-bearing fact). Full-file hashes match the receipts exactly: baseline `f6508a1d2c331c34086c3531b493aaf60d7182a78f2e469a7ed42726195c3c47`, head `33ff6684a1e213e812686e36101c90b2afd46a70de5a4dc4f629a40b80c5dd15`.

Reading the full diff (`git diff 0fd24c343d...9f778f6b106...`): the spec-file hunk removes exactly three things — (a) the 35-line header paragraph beginning "E2E-25 IS A STRICT EXPECTED FAILURE GATED `@until-journal-cutover`." plus its leading/trailing blank comment lines, (b) the `@until-journal-cutover` tag on the test title, (c) the 4-line `test.fail(...)` call — and it *rewrites* (not merely deletes) the E2E-29/E2E-30 paragraph to state both rows run live in the proposals pack. Nothing else in the spec file changes. No assertion in the byte-identical body is weaker than baseline's.

### Finding 2 — INFO (Q2: E2E-25 row on the head, and what its private-reason checks cover)

Probe: independent build + ladder run (not a re-read of the implementer's receipt) — see Ladder runs below. Row-by-row and summary line recorded from my own run's stdout.

Output: privacy-pack `8 passed (48.9s)`, exit 0; E2E-25 is row 2, `ok ... E2E-25 approved correction keeps its reason private @E2E-25 (2.9s)` — a plain pass, no gate tag, no "Expected to fail" line anywhere in the log.

What the row asserts about the private reason, and whether each check can fail on a leak (line numbers as they stand on the head file, `e2e/gm-two-player-privacy.pack.spec.ts`):

- **Player page + match event stream + export/timeline** (lines 337-339):
  ```
  for (const view of await playerViews(request, fixture)) {
    expect(view).not.toContain(reason);
  }
  ```
  `playerViews` (lines 817-829) returns four strings: `fixture.guestPage.content()` (the player page's rendered HTML), `JSON.stringify(fixture.guestTap.frames)` (the raw wire frames = the match event stream), and the guest's own reads of `timeline` and `export?streamType=match` (each JSON-stringified). Each of the four is checked independently in the loop; `expect(view).not.toContain(reason)` fails the moment the random-UUID-bearing `reason` string appears in any one of them, so all four surfaces named in the charter (player page, event stream, export, and timeline as a bonus) are covered and each can independently fail on a leak.
- **Private-record discovery / presence** (lines 341-346):
  ```
  const records = privateEvidence(
    'SELECT opaque_ref, payload FROM private_record WHERE campaign_session_id = ? AND record_kind = ?',
    [fixture.matchId, 'gm-reason'],
  );
  expect(records).toHaveLength(1);
  expect(records[0].payload).toBe(reason);
  ```
  This is a presence/correctness check on the GM-only store (not itself a leak check) — it fails if the reason was not durably recorded, or recorded under the wrong kind/session, or with the wrong text.
- **GM can read it; player cannot — the "private-record lookup"** (lines 347-359):
  ```
  const gm = await privateView(request, fixture, fixture.hostToken, leaf);
  expect(gm.privateRecords).toEqual([expect.objectContaining({ payload: reason })]);
  const player = await privateView(request, fixture, fixture.guestToken, leaf);
  expect(JSON.stringify(player)).not.toContain(reason);
  expect(jsonKeys(player.privateRecords)).not.toContain('payload');
  ```
  Line 358 fails the moment the reason string appears anywhere in the player's read of the same opaque ref — this is the real content check and it can fail on a leak. Line 359 is discussed under Finding 3: it checks for a literal key named `payload`, which (per my own mutant run) is not the key name the redacted player shape actually uses, so it is a naming guard rather than a content guard; line 358 is what actually protects content here.

### Finding 3 — INFO (Q3: my own mutant, distinct from the receipts' M1-M3)

Chosen mutant: invert the *other* player-side negative assertion in the row — not M1's `expect(view).not.toContain(reason)` at spec:338 (playerViews loop), but the key-absence check at spec:359, `expect(jsonKeys(player.privateRecords)).not.toContain('payload')` → `.toContain('payload')`.

Procedure: confirmed pre-mutant sha256 `33ff6684a1e213e812686e36101c90b2afd46a70de5a4dc4f629a40b80c5dd15` (equal to the file already in the worktree); edited the one line; confirmed mutant sha256 `0b4c60b3db5bf37068e243407aa9215ee557a5a5f1655dfbd9d61ae703eac7a6`; ran `NODE_ENV=production node scripts/qc/run-gm-two-player-campaign.mjs --group=privacy-pack --run-id=lanea-mutant-payload-key-20260925` after a fresh `MACHINE_IDLE`; restored from the saved head copy; re-confirmed sha256 back to `33ff6684a1e2...`; `git status --short` clean afterward.

Result: **KILLED** — exit 1, `1 failed / 7 passed (47.5s)`, only E2E-25 failed:
```
Error: expect(received).toContain(expected) // indexOf
Expected value: "payload"
Received array: ["opaqueRef", "payloadState", "recordKind"]
    > 359 |       expect(jsonKeys(player.privateRecords)).toContain('payload');
```

Reading: this is a genuine, independent kill, and it also surfaces a fact worth recording — the player's redacted `privateRecords` entry is not "the GM shape with `payload` removed"; it is a *differently-keyed* record (`opaqueRef` / `payloadState` / `recordKind`, versus the GM shape's `opaqueRef`/`payload`/... implied by `objectContaining({ payload: reason })`). So the baseline (unmutated) assertion `not.toContain('payload')` at line 359 is trivially satisfied by that key rename regardless of what `payloadState`'s value holds — it would not catch a hypothetical regression that leaked the reason text under a `payloadState` key. It is not a hole in E2E-25 today: line 358's whole-JSON substring check (`not.toContain(reason)`) independently covers content leaking through `payloadState` or anywhere else in the same response. But line 359 by itself is a naming guard, not a content guard, and should not be read as an independent proof that the payload is absent — only that a key literally called `payload` is.

### Finding 4 — INFO (Q4: E2E-29/E2E-30 header paragraph)

Probe: independent build + `proposal-pack` ladder run (see Ladder runs); `grep -n "test\.\(fail\|skip\|fixme\|only\)" e2e/gm-two-player-proposals.pack.spec.ts` (exit 1, no matches).

Output: `2 passed (2.3m)`, exit 0; both rows are plain passes at the cited lines:
```
ok 1 ... e2e\gm-two-player-proposals.pack.spec.ts:49:5 › E2E-30 concurrent proposals stay attributable and independently resolvable @proposal-pack @E2E-30 (5.8s)
ok 2 ... e2e\gm-two-player-proposals.pack.spec.ts:177:5 › E2E-29 veto and timeout commit nothing and clear only own pending UI @proposal-pack @E2E-29 (2.1m)
```
The rewritten paragraph (head file, lines 100-109) reads: "Both rows run live, as plain rows with no expected-failure mark, on the campaign-channel rig in `e2e/gm-two-player-proposals.pack.spec.ts` (runner group `proposal-pack`): E2E-30 at line 49 and E2E-29 at line 177 of that file, both measured passing on 2026-09-25. That file's header states what each row proves." Every clause is true against what I measured independently: correct file, correct group name, correct line numbers (49 and 177 match the actual `test(...)` declarations), no gate marks in the file (grep confirms), and both pass live.

### Finding 5 — INFO (Q5: `readJsonBody`)

`readJsonBody` is a private (unexported) function in `e2e/helpers/campaignJournalDrive.ts:164`; its only callers are `requestActivity` (:185) and `postIntentCommand` (:242), and the only callers of *those* are the two two-process specs (`e2e/campaign-journal-two-process-privacy.spec.ts`, `-convergence.spec.ts`), which per `FN-u22-two-process-specs-cannot-run-in-junctioned-worktree` (units.json, main@a2e24c8a8) cannot start in this junctioned worktree (the standalone hydration guard leaves `.next/standalone/server.js` unhydrated, so the two-process spec's readiness URL never answers and Playwright's `webServer` times out at 120s). I did not attempt to run those specs here (would only reproduce the known timeout).

Since jest is configured to ignore `e2e/` entirely (`sharedTestPathIgnorePatterns` includes `'<rootDir>/e2e/'`, `'/e2e/'`, `'e2e/'` in `jest.config.js`), I could not run a jest test against the file either. Instead I wrote a scratch script (`tsx`, deleted after use) that imports the real, exported `requestActivity`/`postIntentCommand` from the module by relative path and drives them with a fake `APIRequestContext`-shaped object (`{ get, post }` returning `{ status(), text(), url() }`), exercising the real `readJsonBody` indirectly without needing to export it or run the two-process harness:

```
CASE1_JSON_RESULT {"status":403,"body":{"error":"not a participant in this session"}}
CASE2_THREW non-JSON answer from http://localhost:9/api/campaigns/c1/activity-missing: status 404, body "<!DOCTYPE html><html><body>Not Found</body></html>"
CASE3_THREW non-JSON answer from http://localhost:9/api/campaigns/c1/commands: status 500, body "<!DOCTYPE html><html><body>Internal Server Error</body></html>"
CASE4_THREW non-JSON answer from http://localhost:9/api/campaigns/c1/activity-empty: status 204, body ""
```
This confirms: a JSON answer returns the parsed body through `requestActivity` unchanged (case 1); a non-JSON answer (an HTML error page) throws an `Error` naming the URL, the status and the whole body text, through both `requestActivity` (case 2) and `postIntentCommand` (case 3); and an empty body (case 4, e.g. a 204) is also non-JSON and throws the same descriptive shape rather than a bare `SyntaxError`. This matches the new doc comment on `readJsonBody` (":153-162") verbatim, and the one-line additions on `requestActivity`'s and `postIntentCommand`'s existing doc comments ("The body goes through `readJsonBody`...") are both true of the code beneath them.

Caller reliance check: `grep -n "SyntaxError\|\.json()\|catch" e2e/campaign-journal-two-process-{privacy,convergence}.spec.ts e2e/helpers/campaignJournalPrivacyFixture.ts` shows no caller of `requestActivity`/`postIntentCommand` catches a `SyntaxError` or re-reads the response body afterward; every call site destructures `.status`/`.body` once and asserts on those values directly (e.g. `campaign-journal-two-process-privacy.spec.ts:184-193`, `:197-206`). The two `.json()` calls that do appear in that file and in `campaignJournalPrivacyFixture.ts` are on a *different*, unrelated response object (a raw match-creation response), not on anything that flows through `readJsonBody`. No caller relies on the old unconditional-`response.json()` behavior.

### Finding 6 — LOW (Q6: one stale, but historical, mention of E2E-25's gate status)

`grep -rn "E2E-25\|until-journal-cutover" e2e/ scripts/qc/ scripts/__tests__/ openspec/changes/harden-gm-two-player-campaign-sessions/` found no *current-state* claim that E2E-25 is still gated or expected-failed anywhere outside the diffed spec file itself (which is now clean — see Finding 1). The only hit worth flagging is `openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md:551`, inside a dated `PROGRESS (2026-09-03, Wave G2 21.2 E2E-29)` journal entry: "...spec-only, no product change." with an earlier clause in the same entry, "NOT claimed: ... E2E-19 and E2E-25 still have no row" — true when written (2026-09-03) but now stale, since both rows exist and E2E-25 is ungated as of this head. This is a historical progress note, not a live assertion about current state (compare the already-corrected #62/OB-2 stale annotations the local receipt routes through the parent's tick receipt), so it does not need an edit before merge on the same logic; it belongs with the parent's 21.2 tick correction if the parent wants the historical record annotated. `scripts/qc/gm-two-player-campaign-core.cjs` and `scripts/qc/run-gm-two-player-campaign.mjs` (group catalogs, `SPEC_BY_GROUP`, pins) and `scripts/__tests__/gm-two-player-campaign-qc.test.ts` have zero matches for `E2E-25`/`until-journal-cutover` — no stale pin or catalog comment there.

## Ladder runs (independent, this review's own build)

Build: `NEXT_PUBLIC_E2E_MODE=true NEXT_PUBLIC_E2E_TEST=true npm run build` (after `machine-idle.mjs --wait` → `MACHINE_IDLE`) — `✓ Compiled successfully in 80s`; exit 1 at `{"ok":false,"error":"Unsafe hydration destination (runtime loader tsx) contains a symlink or junction: .next\\standalone\\node_modules", ...}` — expected in a junctioned worktree, guard not relaxed. `grep -l "__E2E_MODE__" .next/static/chunks/pages/_app-*.js` → `.next/static/chunks/pages/_app-da9dae42f3e9407a.js` (exit 0), confirming the E2E marker compiled in.

| group | run-id | summary | exit |
|---|---|---|---|
| privacy-pack | lanea-privacy-a-20260925 | 8 passed (48.9s) | 0 |
| proposal-pack | lanea-proposal-20260925 | 2 passed (2.3m) | 0 |
| privacy-pack (my mutant, Finding 3) | lanea-mutant-payload-key-20260925 | 1 failed / 7 passed (47.5s) | 1 |

privacy-pack per-row (lanea-privacy-a-20260925, exit 0, no "Expected to fail" lines):
```
ok 1 E2E-19 unfinalized GM draft has only a private payload @E2E-19 (4.7s)
ok 2 E2E-25 approved correction keeps its reason private @E2E-25 (2.9s)
ok 3 E2E-20 Player 1 sealed choice reaches neither Player 2 wire nor board @E2E-20 @E2E-23 @E2E-24 (5.5s)
ok 4 E2E-21 Player 2 sealed choice reaches neither Player 1 wire nor board @E2E-21 (5.5s)
ok 5 E2E-27 no player surface carries an authority identifier or an inferable gap @E2E-27 (3.1s)
ok 6 E2E-22 finalization reveals the COMMITTED declaration on the opponent delivery stream @E2E-22 (8.0s)
ok 7 E2E-26 a reconnecting player replays exactly what it was delivered live @E2E-26 (5.9s)
ok 8 E2E-28 seated export and timeline agree; strangers fail before fan-out @E2E-28 (2.7s)
```
E2E-23/E2E-24 have no row of their own (title tags on the E2E-20 row, as the header already discloses).

proposal-pack per-row (lanea-proposal-20260925, exit 0):
```
ok 1 E2E-30 concurrent proposals stay attributable and independently resolvable @proposal-pack @E2E-30 (5.8s)
ok 2 E2E-29 veto and timeout commit nothing and clear only own pending UI @proposal-pack @E2E-29 (2.1m)
```

One incidental, out-of-scope observation from the server logs during the privacy-pack run (not attributable to this unit, which changes 0 product lines): four `[ViewerDeliveryCursors] persist failed; a missing row falls back to a full replay, which is safer than a shifted cursor SqliteError: UNIQUE constraint failed: mp_viewer_delivery...` lines. The message describes an intentional fallback ("safer than a shifted cursor"), the run still passed 8/8, and nothing in the diff touches this code path — noted for completeness, not raised as a finding against this PR.

## Gates (independent re-run, clean head — mutant restored before each)

| gate | last line | exit |
|---|---|---|
| `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts` | `Tests: 14 passed, 14 total` | 0 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 |
| `npx oxfmt --check e2e/gm-two-player-privacy.pack.spec.ts e2e/helpers/campaignJournalDrive.ts` | `All matched files use the correct format.` | 0 |
| `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] ... errors=0` | 0 |
| `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

All six match the local receipt's (`evidence/u22-local-20260925.json`) recorded values exactly (84-warning oxlint pin unchanged; jest 14/14 unchanged; validator counts unchanged).

## Cap

- Files: 2 (`e2e/gm-two-player-privacy.pack.spec.ts`, `e2e/helpers/campaignJournalDrive.ts`), both under U22's `e2e` ownership path; cap 15. `openspec/changes/harden-gm-two-player-campaign-sessions` (U22's other ownership path) is untouched.
- Lines: 89 changed (38 insertions + 51 deletions, independently re-summed via `git diff --numstat`), all in e2e spec/helper files; product `src/` lines: 0. Cap 500.
- No product file touched.
- No AI attribution: `git diff ...|grep -iE "claude|anthropic|co-authored|generated by"` and the single commit's message/author both clean (`Wes Rollings <wrollings@gmail.com>`, "test(e2e): E2E-25 runs as a plain row now that a committed rewind reaches the live match").
- No absolute machine paths in the diff: `git diff ...|grep -iE "E:\\\\|E:/Projects|C:\\\\Users|/c/Users"` — no match.

## Verdict rationale

Every claim in the charter's eight questions checked out against my own independent measurements, not a re-read of the implementer's receipts:
- The E2E-25 assertion body is byte-identical baseline-to-head (Finding 1); the diff removes only the gate paragraph, the gate tag and the `test.fail` call, and rewrites (accurately) the E2E-29/E2E-30 paragraph.
- E2E-25 is a plain pass on the head, measured twice today (my run + the receipt's), and every one of its privacy checks (player page, wire-frame stream, timeline, export, and the GM-vs-player private-record read) is a real, leak-sensitive assertion (Finding 2); my own additional mutant, on a line the receipts' M1-M3 did not touch, was independently KILLED (Finding 3), with a useful side-finding about the player record's actual key shape that does not change the row's correctness.
- E2E-29/E2E-30 are plain passes at the cited lines and the rewritten header paragraph is true in every clause (Finding 4).
- `readJsonBody` behaves exactly as its new doc comment claims — verified by executing the real, exported wrapper functions against fake responses, since the only real callers cannot run in a junctioned worktree and jest ignores `e2e/` — and no caller depends on the old `response.json()` failure shape (Finding 5).
- No other surface still describes E2E-25 as gated, aside from one dated historical journal line in `tasks.md` that was already stale when superseded facts accumulate the same way `#62`/`OB-2` did, and does not require an edit before merge (Finding 6).
- All six gates reproduce the receipt's exact values on my own independent runs; the cap, ownership and attribution checks all hold.

No finding here rises above LOW/INFO, and none is a defect in the shipped diff. The unit's own non-claims stand as recorded (fixture-armed privacy pack, not production-mode; the privacy review class still needs the owner's Lane B `OWNER-RULING` bound to this exact head before merge — that gate is outside Lane A's scope and is not weighed in this verdict).
