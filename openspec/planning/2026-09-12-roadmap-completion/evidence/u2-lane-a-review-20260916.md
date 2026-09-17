# Lane A review: U2 (parking)
reviewedHead: 754819f6ac054360d8b80f80b076782cf5c91111
baseline: 2a4a8d4254b0e2563e04ab4082b355b24bcbb0d8
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

```
git -C E:/Projects/MekStation fetch origin
git -C E:/Projects/MekStation worktree add --detach E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u2-review 754819f6ac054360d8b80f80b076782cf5c91111
```
Worktree created at `.sisyphus/roadmap-completion-20260912/worktrees/u2-review`, HEAD confirmed at `754819f6a`. No node_modules installed; no build, no Playwright run. Root checkout was never touched.

## A. Packet shape, holders rule, owner-gate

File: `openspec/planning/2026-09-12-roadmap-completion/units.json`.

Packet `PK-privacy-21-2-tick` (units.json:636-664):
- **Closed question** (units.json:646): "Should 21.2 be ticked on the ten proven rows with E2E-19/25 deferred by name to R4.rewind ... or should the row stay open until 19 and 25 land ...?" — a single yes/no-shaped closed question.
- **>=2 options, each with label/consequence/effort** (units.json:648-658): option "(tick on ten rows, defer 19/25 to R4.rewind)" with `consequence` and `effort: "0.25 day ..."`; option "hold 21.2 until 19 and 25 exist" with `consequence` and `effort: "2-4 days ..."`.
- **agentRecommendation** (units.json:659): present, names the tick-and-defer option and cites precedent ("matching how 14.1/14.5 and 17.x were deferred").
- **revertCost** (units.json:660): present ("low: a deferral entry and a checkbox ...").
- **Holders rule**: `"taskKeys": []` (units.json:644) — the packet itself holds no task key. `"heldRow": "harden-gm-two-player-campaign-sessions#21.2@547 (held by U2; this packet blocks U2)"` (units.json:645) and `"blocks": ["U2"]` (units.json:637-639) — the row is held by unit U2, the packet only blocks U2. This matches GOAL.md's holders-rule description (GOAL.md:31, "let the packet hold the task keys directly" only when *no unit exists yet* — here U2 exists and holds the key, so the packet correctly leaves `taskKeys` empty).
- **decision**: `null` (units.json:662). `ruling`: `null` (units.json:663).

Unit `U2` (units.json:482-533):
- `"state": "owner-gated"` (units.json:501).
- `"ownerGate": { "packetId": "PK-privacy-21-2-tick", "since": ..., "stage": "review", "reason": "privacy review class requires a Lane B owner ruling; the row cannot tick without one" }` (units.json:527-532) — names the packet by id.
- `reviewClasses: ["privacy"]` (units.json:494-496), consistent with DELIVERY.md step 5 and GOAL.md stage 4 ("Lane B is the owner ruling required for the authority, privacy, migration, replay, idempotency and concurrency classes and for any owner-gated unit").

**Verdict on A: satisfied.** Every sub-condition (closed question, >=2 options with label/consequence/effort, recommendation, revert cost, empty packet task keys with the row held by U2, ownerGate naming the packet, null decision) is present and internally consistent with GOAL.md's "How to park" contract (GOAL.md:29-33).

## B. Receipts claim only what discovery measured

Command run:
```
git diff --stat a00b816dcf1d30cb40b08ce9901bcf66ea3cc125 2a4a8d4254b0e2563e04ab4082b355b24bcbb0d8 -- e2e/gm-two-player-privacy.pack.spec.ts e2e/gm-two-player-proposals.pack.spec.ts e2e/helpers scripts/qc/gm-two-player-campaign-core.cjs
```
Last output lines:
```
 scripts/qc/gm-two-player-campaign-core.cjs | 6 +++++-
 1 file changed, 5 insertions(+), 1 deletion(-)
```

- **Discovery receipt** (`evidence/u2u3-discovery-20260916.json`) `runs[]` (lines 390-416): `privacy-pack` → `"resultLine": "6 passed (28.7s)"`, `"exit": 0`, rows E2E-20/21/27/22/26/28 all `"status": "passed"`; `proposal-pack` → `"resultLine": "2 passed (2.2m)"`, `"exit": 0`, rows E2E-30/E2E-29 `"status": "passed"`.
- **Local receipt** (`evidence/u2-local-20260916.json`) `runs[]` (lines 7-70): identical group names, identical `resultLine`s (`6 passed (28.7s)` / `2 passed (2.2m)`), identical exit codes, and the same per-row set (E2E-20/21/27/22/26/28 and E2E-30/29), same commands (`NODE_ENV=production node scripts/qc/run-gm-two-player-campaign.mjs --group=<pack>`). Consistent with the discovery receipt — no rows are claimed in `local` that are absent from `discovery`, and none of the counts were inflated.
- **Log hashes**: I recomputed `sha256sum` on the one committed log-adjacent file that actually exists in the tree, `evidence/u2u3-discovery-20260916.json` itself, and it matches the hash recorded in `u2-local-20260916.json.logHashes[0]` exactly: `49baa827c9efacc8445cf05661f6ddf2f1c98fa3d9433feab57a4decb01c0363`. The six `.log` files named in `logHashes` are not present anywhere in the tree (`ls evidence/*.log` → none of 928 evidence files are `.log`), which is the repo-wide convention (raw Playwright logs are hashed but not committed) and not specific to U2 — confirmed by the same absence across the whole `evidence/` directory, so this is not a fabricated-file concern.
- **`diffStatSinceDiscovery` check — discrepancy found.** `evidence/u2-admission-20260916.json` line 13 reads: `"discovery": "... the specs and helpers it ran are unchanged between that commit and this baseline: \`git diff --stat\` below is empty)"`. The very next field, line 14, `"diffStatSinceDiscovery"`, is **not** empty — it reads exactly `"scripts/qc/gm-two-player-campaign-core.cjs | 6 +++++-\n 1 file changed, 5 insertions(+), 1 deletion(-)"`, which is byte-identical to the `git diff --stat` output I ran independently above. So the `diffStatSinceDiscovery` field itself is accurate and matches reality; the problem is the adjacent narrative sentence in the `discovery` field asserting "is empty" when the field right below it plainly is not.
  - I inspected the actual content diff to check whether this affects U2's claims: `git diff a00b816dc.. 2a4a8d425 -- scripts/qc/gm-two-player-campaign-core.cjs` shows one line added to `GROUP_CATALOG` (`...,lifecycle-pack:22,conflict-pack:22,all:34,...`) and one new `SPEC_BY_GROUP` entry (`'conflict-pack': ['e2e/gm-two-player-conflict.pack.spec.ts']`) — this is U1d's unrelated E2E-77 `conflict-pack` registration. It does not touch the `privacy-pack`/`proposal-pack` catalog entries, `SPEC_BY_GROUP` entries, the two named spec files, or `e2e/helpers`. So the substantive claim ("the specs and helpers it ran are unchanged") is true and independently verified; only the one-sentence gloss ("`git diff --stat` below is empty") is factually wrong about the field beneath it.
  - **This is a non-blocking documentation-accuracy nit, not a false completion claim**: the real diff is shown honestly in the very next field, nothing is hidden, and no state transition, checkbox, or tick receipt depends on the false half-sentence. Recommend fixing the wording in a follow-up commit so `discovery` doesn't contradict `diffStatSinceDiscovery` (e.g., "the privacy-pack/proposal-pack specs and e2e/helpers are unchanged since discovery; core.cjs gained one unrelated line (U1d's conflict-pack registration) — diffStatSinceDiscovery below is not empty").

**Verdict on B: receipts claim only what was measured; the ten-row pass counts are accurate and cross-consistent. One wording defect found (self-contradiction inside a single evidence file) — flagged as non-blocking since the underlying data and the actual risk assessment are correct.**

## C. 21.2 checkbox untouched; no product change in range

```
git diff --numstat 2a4a8d4254b0e2563e04ab4082b355b24bcbb0d8 754819f6ac054360d8b80f80b076782cf5c91111
```
Output:
```
61  0   openspec/planning/2026-09-12-roadmap-completion/evidence/u2-admission-20260916.json
109 0   openspec/planning/2026-09-12-roadmap-completion/evidence/u2-local-20260916.json
25  0   openspec/planning/2026-09-12-roadmap-completion/evidence/u2-red-20260916.json
590 0   openspec/planning/2026-09-12-roadmap-completion/evidence/u2u3-discovery-20260916.json
54  6   openspec/planning/2026-09-12-roadmap-completion/units.json
```
Exactly one commit in the range (`git log --oneline 2a4a8d425..754819f6a` → one line, `754819f6a`). All five touched files sit under `openspec/planning/2026-09-12-roadmap-completion/`; no `src/`, `e2e/`, `scripts/`, or `openspec/changes/**/tasks.md` path appears. `openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md` is untouched in this range (confirmed by its absence from the numstat and directly: `git diff 2a4a8d425 754819f6a -- .../tasks.md` produces no output). Line 547 of `tasks.md` on the head reads `- [ ] 21.2 Implement and pass E2E-19 through E2E-30 ...` — unchecked.

**Verdict on C: satisfied.** The 21.2 checkbox is untouched and the range contains zero product-file changes — only ledger/evidence docs.

## D. Validator

```
node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs
```
Last line: `ROADMAP VALIDATION PASSED: 73 nodes, 13 packages, 376 tasks, 40 triage rows` (exit 0) — matches the expected counts exactly.

```
node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs --next
```
Last line: `U3` (exit 0) — matches expectation.

## E. E2E-19/25 non-claim honesty

```
git grep -n -o -E "@E2E-(19|25)\b" -- e2e
```
Exit 1, no output — confirmed: neither tag exists anywhere under `e2e/` on the reviewed head. This matches `u2-red-20260916.json.R1` ("no match: E2E-19 and E2E-25 have no tagged row on main") and `u2-admission-20260916.json.inventory.missing` (`["E2E-19","E2E-25"]`).

`tasks.md` line numbers: the review range does not touch `tasks.md` at all (section C), and `tasks.md` was also unchanged between the discovery commit and the baseline for the region in question — the only insertion between `a00b816dc` and `2a4a8d425` is a new U1d progress paragraph inserted at (pre-insertion) line ~590, i.e. *after* the 21.2 block, so it does not shift any of the cited line numbers. Confirmed directly by reading the head's `tasks.md`:
- **Line 548**: "PROGRESS (2026-09-03, Wave G2 21.2 E2E-29): ... NOT claimed: no visibility group registered (the runner reserves it for the complete E2E-19..30 pack; E2E-19 and E2E-25 still have no row); spec-only, no product change." — matches the receipts' citation of 548 exactly (`whatBlocks19and25.tasksMd` and the discovery inventory's `blockedByQuotedLines["548"]`).
- **Line 552**: "NOTE (2026-09-02, Wave E7): defect #15's 'lobby passes no GM callbacks' is superseded ... the GM-command letters (E2E-19/25) still wait on the commit half (3b-iv)." — matches.
- **Line 557**: "... DEFECT #15 (defers E2E-19/25): src/pages/multiplayer/lobby/[roomCode].tsx mounts NetworkedGameSurface without onPreviewHostGmCorrection/onApproveHostGmCorrection, so the host's Preview/Approve GM Fix buttons are no-ops in production ..." — matches, and matches the `srcFiles` list in `u2-admission-20260916.json.whatBlocks19and25.srcFiles`.

**Verdict on E: the non-claim is honest.** The grep independently proves no row exists for either scenario, and each cited tasks.md line says exactly what the receipts summarize it as saying — no misquote, no line-number drift.

## F. Attribution and secrets

```
git log -1 --format=%B 754819f6ac054360d8b80f80b076782cf5c91111
```
Commit body is a plain description of the parking decision, ending mid-sentence with "U2 is owner-gated at review and the checkbox is untouched." — no `Co-Authored-By`, no "Generated with", no model name.

```
git show 754819f6ac054360d8b80f80b076782cf5c91111 | grep -inE "claude|anthropic|co-authored-by|generated with|gpt|openai|copilot"
```
No matches (exit 1) across the commit message and full diff.

Secret/token scan over the four new evidence files:
```
git show 754819f6a -- .../evidence/u2-admission-20260916.json .../evidence/u2-red-20260916.json .../evidence/u2-local-20260916.json .../evidence/u2u3-discovery-20260916.json | grep -inE "bearer [a-z0-9._-]{10,}|api[_-]?key|secret|password|token[\"']?\s*:\s*\"[a-z0-9]|AKIA[0-9A-Z]{16}|ghp_[0-9a-zA-Z]{20,}"
```
No matches (exit 1). The word "token" appears only in narrative prose ("bearer token", "wire token") describing test mechanics, never as a literal credential value.

**Verdict on F: clean.** No AI attribution anywhere in the range; no secrets or literal tokens in the evidence files.

## Overall

A, C, D, E, F all pass with no reservations. B passes on substance (the pass counts and row sets are accurate and cross-consistent, and no false "specs/helpers unchanged" claim actually misleads about product risk — the true, non-empty diff is shown honestly one field below the imprecise sentence) but surfaces one real defect: `evidence/u2-admission-20260916.json`'s `discovery` field asserts `git diff --stat` is empty when the adjacent `diffStatSinceDiscovery` field (which I independently reproduced byte-for-byte) shows it is not. The change it hides behind imprecise wording is inert for U2 (an unrelated `conflict-pack` group registration added by U1d, not touching the privacy-pack/proposal-pack specs, catalog entries, or `e2e/helpers`), so nothing false is being claimed about U2's actual proof — but the sentence itself should be corrected for precision in a follow-up.

Non-blocking observations:
- The ledger's `findings` array (units.json:718-779) contains no `FN-u2-*` entries; U2's own `nonClaims` in `u2-local-20260916.json` already documents the E2E-19/25 gap inline, so this is consistent rather than a missing finding.
- `stageReceipts.review` and `.merge`/`.mainProof`/`.tick` are still `null` on U2, as expected — this Lane A review and any eventual Lane B ruling are the next steps, not yet recorded in this commit.

**Verdict: APPROVE.** Nothing here needs to change before merge; the flagged wording nit in B is worth a follow-up fix but does not misstate U2's actual proof, does not touch the checkbox, and does not ship any product change.

## Cleanup

```
git -C E:/Projects/MekStation worktree remove --force E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u2-review
```
