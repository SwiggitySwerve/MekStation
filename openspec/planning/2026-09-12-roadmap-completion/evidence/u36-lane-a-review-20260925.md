# Lane A review: U36

reviewedHead: 053e7c7d28ab6b714e42064d4eac9e9714b2903c
baseline: a2e24c8a80706b6ea5e4f4b4e22c3f52ea83aa18
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (no new output; both SHAs already local).
- Created a detached worktree at `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u36-review` at `053e7c7d2` (`git worktree add --detach ... 053e7c7d28ab6b714e42064d4eac9e9714b2903c`).
- Junctioned `node_modules` from that worktree to the shared `node_modules` via a standalone PowerShell `New-Item -ItemType Junction` call.
- `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` and `export npm_config_dry_run=true` before every node/npm/npx call.
- Never touched the root checkout (`git -C E:/Projects/MekStation status --porcelain` empty throughout) or the implementer's `worktrees/u36` (its only diff from a clean tree is the three pre-existing untracked evidence JSON files it already held; I did not write to it).
- All probe mutations were single-line `sed` edits or byte-for-byte `cp -p` restores of a saved pre-image; every restore was confirmed identical to the head blob by `sha256sum` (or `git hash-object` + `git status --porcelain` showing no diff). No Edit/Write tool touched a tracked product file, so no formatter hook ran against one.
- Cleanup performed at the end of this review (see final section).

## Files on the range

`git diff --stat a2e24c8a80..053e7c7d28` — 6 files, all under U36's three ownership paths (`src/components/multiplayer`, `src/pages-modules/multiplayer`, `src/components/campaign/coop`), one commit (`053e7c7d2`, author Wes Rollings, no AI attribution in the subject or body):

| file | product/test | +/- |
|---|---|---|
| `src/components/campaign/coop/HostGmReviewSurface.tsx` | product | 42/28 |
| `src/components/campaign/coop/__tests__/CoopSurfaceResilience.test.tsx` | test | 4/0 |
| `src/components/campaign/coop/__tests__/HostGmReviewSurface.deadControls.test.tsx` | test (new) | 153/0 |
| `src/components/multiplayer/NetworkedGameSurface.gmCorrection.tsx` | product | 66/5 |
| `src/components/multiplayer/__tests__/NetworkedGameSurface.gmCorrection.test.tsx` | test (new) | 276/0 |
| `src/pages-modules/multiplayer/useGmCorrectionProducers.ts` | product (header comment only) | 9/10 |

Product lines: 117 added / 43 deleted / 160 changed (measured via `git diff --numstat` on the three product files) — matches the local receipt exactly. No evidence/ledger files are part of this PR diff (`git diff --stat a2e24c8a80..053e7c7d28 -- openspec/` is empty); the three `evidence/u36-*.json` files live only on `main`/in the implementer's worktree, outside this range.

## Findings

1. **[info] Once-per-press guard is correct, including the throw/reject/non-promise/unmount paths I probed.** `askForPreview`/`applyCorrection` (`NetworkedGameSurface.gmCorrection.tsx:121-166`) each do `if (xInFlightRef.current) return; xInFlightRef.current = true; setXPending(true);` before the `await`, and clear both the ref and the state in a `finally` block, so the clear runs whether the awaited call resolves, rejects, or (per `try { ... await onApprove() } catch { setStatus(...); return; } finally { ... }`) throws synchronously via rejection. Quoted:
   ```
   const applyCorrection = useCallback((): void => {
     if (approveInFlightRef.current) return;
     approveInFlightRef.current = true;
     setApprovePending(true);
     void (async () => {
       let result: GmCombatRewindCommitResult | void;
       try {
         result = await onApprove();
       } catch {
         setStatus(describePreviewUnavailable());
         return;
       } finally {
         approveInFlightRef.current = false;
         setApprovePending(false);
       }
       if (result === undefined) return;
       setStatus(describeCorrectionCommit(result));
     })();
   }, [onApprove]);
   ```
   I probed the four cases the charter asked about, beyond what the shipped test file covers:
   - **Handler rejects**: `r-approve-reject` (existing test) — button re-enables, `networked-gm-correction-status` is shown (error surfaced), matches the `GmRewindPreviewDialog.tsx:143-151` pattern being copied (`catch { setCommitUnavailable(true); } finally { inFlightRef.current = false; setCommitting(false); }`).
   - **Handler returns a non-promise (`void`)**: `r-approve-void` (existing test) — `jest.fn()` with no return value; `await onApprove()` awaits `undefined`, resolves on the next microtask, `finally` clears the guard, button stays enabled, no status line. I additionally ran a scratch probe (deleted, see Setup) and observed React `act()` console warnings on this path specifically — see finding 6.
   - **Unmount while pending, then the promise settles** (scratch probe, deleted after use): rendering, clicking Approve (pending), unmounting, then resolving the captured promise — none of it throws. React 18 no longer warns on a state update to an unmounted component in this configuration; nothing is "stuck" because the component instance (and its ref/state) is gone with the unmount. Not a defect.
   - **A handler that never settles** (scratch probe, deleted after use): the button stays disabled indefinitely — by design, matching the copied `GmRewindPreviewDialog` pattern, which also has no timeout. This is a pre-existing characteristic of the pattern, not a regression U36 introduces, and not something the unit's behavior sentence asks for.
   Severity: informational — no defect found.

2. **[low, non-blocking] The private-reason field accepts one input the route would refuse (an all-whitespace reason), but two unedited upstream layers already strip it before it reaches the wire.** Probe (scratch test, deleted after use): a 3-space string is `<= maxLength 2000` (the field accepts it) but `isRewindCommitBody` requires `reason.trim().length > 0`, so the route would refuse it (`ROUTE_ACCEPTS_WHITESPACE_ONLY: false`). However `useGmCorrectionProducers.ts:127-130` (`const reason = privateReasonRef.current.trim(); return commitRef.current(reason.length > 0 ? { ...request, reason } : request);`) and `commitGmCombatRewind.ts:47,67` (`const reason = ...trim(); ...(reason ? { reason } : {})`) both trim and omit an empty-after-trim reason before the request is ever built, so this mismatch never reaches the network in the wired-up production path. Neither file is touched by U36; this is pre-existing, unedited behavior. Second probe: padding real content with leading/trailing spaces up to the raw 2000-char cap is always accepted by the route, confirming the admission's claim ("trimming only shortens, so any value this bound lets the GM type passes that check's upper bound") — verified true for real content, and the one case where it isn't (all-whitespace) is neutralized upstream. Severity: low, informational, not a regression.

3. **[very low, non-blocking] An astral character can straddle the `maxLength` boundary and be truncated into a lone surrogate.** Probe: 1999 ASCII chars + one astral character (`U+1F600`, 2 UTF-16 code units) = 2001 raw code units; jsdom's `maxLength` truncation (matching the HTML spec, which counts UTF-16 code units, same as `.length`) cut it to exactly 2000 units, leaving a lone high surrogate (`0xD83D`) as the last unit. `isRewindCommitBody` does not validate UTF-16 well-formedness, only `.length`, so it accepts the truncated (malformed) string (`ROUTE_ACCEPTS_HANDED: true`) — the route does not refuse it (so this is not the asymmetry the charter's question 2 asks about), but a malformed lone-surrogate string is not valid UTF-8 and could be mangled when JSON-serialized over HTTP. This is an inherent property of any UTF-16-code-unit-counting `maxLength` (matches the exact convention the route itself uses), not something U36's chosen bound value introduces, and requires an astral character landing on exactly the 2000th code unit to occur. Severity: very low, pre-existing class of risk, out of scope for this unit.

4. **[disclosed, not a regression] FN-u36-coop-host-command-screen-spec-gap: U36 does not make the spec less true in substance; it makes an existing gap visible.** `openspec/specs/coop-campaign-sync/spec.md:488-493` ("Scenario: Host sees authoritative campaign commands" — "the screen SHALL expose host-authorized preview, approve, veto, manual takeover, and GM correction controls"). Read literally as one screen exposing five working controls, no host screen has ever satisfied this, before or after U36:
   - **Co-op dashboard** (`CampaignCoopRouteSurface.tsx:378-384`, mounts `HostGmReviewSurface`): before U36, rendered all 5 labeled buttons (`preview-`, `approve-`, `veto-`, `manual-takeover-`, `gm-correction-` at `HostGmReviewSurface.tsx:404,413,447,464,474`), but the red evidence proves 3 were dead — pressing `preview-p1`, `manual-takeover-p1`, `gm-correction-p1` "neither called onDecide nor changed the DOM." After U36 it renders only `approve-` and `veto-` (the two live ones); the other three are not rendered at all because `onPreview`/`onManualTakeover`/`onGmCorrection` are no longer defaulted to `() => {}` (`HostGmReviewSurface.tsx:143-153`) and the dashboard mount supplies none of them.
   - **GM Ledger route** (`/gameplay/campaigns/[id]/gm-ledger.tsx` via `GmCampaignInterventionActions.tsx:126,136,149`): preview, approve, manual — 3 of 5, untouched by U36.
   - **Networked (combat rewind) surface** (`NetworkedGameSurface.gmCorrection.tsx:179,188,207`): "Preview GM Fix" and "Approve GM Fix" plus a private-reason field — this is the actual GM-correction/commit flow; it has no veto or manual-takeover concept.
   So functionally, before U36 the spec's "SHALL expose... 5 controls" was already false on every screen (3 of the dashboard's 5 were fakes that did nothing when pressed); U36 makes that honest by not rendering fakes, at the cost of reducing the dashboard's literal DOM button count from 5 to 2. This is exactly U36's own contract ("every control either works once per press... or is not rendered") and is disclosed by the implementer as `FN-u36-coop-host-command-screen-spec-gap`, already routed to the owner for a decision on which screen(s) should carry which controls, or a spec rewrite. I did not find any e2e spec or story that presses the three removed controls on the dashboard (see finding 5), so nothing observable regresses.

5. **[verified, no break] No e2e spec, story, or jest test presses the co-op dashboard's Preview, Manual takeover, or GM Fix buttons.** `grep` of `e2e/` and `.storybook/`/`src/**/*.stories.tsx` for `preview-`, `manual-takeover-`, `gm-correction-` (the proposal-id-suffixed testids `HostGmReviewSurface` renders) found no match against those patterns; the only e2e spec that exercises the co-op dashboard's decision buttons, `e2e/gm-two-player-proposals.pack.spec.ts:119-160`, presses only `veto-${proposalId}` and `approve-${proposalId}`, both untouched by U36. `HostGmReviewSurface.stories.tsx` supplies only `pending`/`onDecide` (no `onPreview`/`onManualTakeover`/`onGmCorrection`, no `play` function), so its three stories now render Approve/Veto only — a visual change, not a broken interaction. The one jest file that does supply all three handlers and click all three buttons, `HostGmReviewSurface.test.tsx:73-107`, always passes explicit `jest.fn()` handlers, so it is unaffected by the removed defaults; the full `src/components/campaign/coop` jest run (158/158) I executed independently confirms nothing regressed across all 16 suites in that directory.

6. **[very low, cleanup-only] React `act()` warnings on the "handler answers nothing" path.** Running `npx jest src/components/multiplayer` on the head prints `Warning: An update to NetworkedHostGmControls inside a test was not wrapped in act(...)` twice, both times pointing at `setPreviewPending(false)`/`setApprovePending(false)` in the `finally` block (`NetworkedGameSurface.gmCorrection.tsx:135,165`). The suite still passes (141/141); this happens because the void/non-promise-answer path resolves one microtask tick after the enclosing `act()` callback's own synchronous body returns. It is a test-harness timing nuance in the "answers nothing" branch, not a production defect (assertions after the warning still hold). Non-blocking; a future test touching this file could wrap the click in an async `act()` to silence it.

7. **[recorded, out of my scope] Review-class mismatch flagged by the implementer.** `evidence/triage-plan-20260922.json:399-401` lists U36's `reviewClasses` as `["routine"]`; I independently confirmed this by reading that file. `units.json`'s current U36 entry lists `["idempotency"]`. Per `DELIVERY.md` step 5, `idempotency` is one of the six classes that additionally requires a Lane B owner ruling before merge (in addition to this Lane A review) — the local receipt already records this as `findingsReportedNotFixed` and defers it to the owner. I did not adjudicate which class is correct; noting it because it means Lane A approval alone does not clear U36 for merge under the roadmap's own rule.

## Gates (all on head `053e7c7d2`, machine-idle-gated before each full-directory jest run, one suite at a time)

| gate | command | last line | exit | result |
|---|---|---|---|---|
| jest multiplayer | `npx jest src/components/multiplayer` | `Ran all test suites matching /src\components\multiplayer/i in 2 projects.` | 0 | 13 suites, 141 tests passed |
| jest pages-modules/multiplayer | `npx jest src/pages-modules/multiplayer` | `Ran all test suites matching /src\pages-modules\multiplayer/i.` | 0 | 3 suites, 23 tests passed |
| jest campaign/coop | `npx jest src/components/campaign/coop` | `Ran all test suites matching /src\components\campaign\coop/i in 2 projects.` | 0 | 16 suites, 158 tests passed |
| jest pages-modules/api | `npx jest src/pages-modules/api` | `Ran all test suites matching /src\pages-modules\api/i.` | 0 | 8 suites, 62 tests passed |
| tsc | `npx tsc --noEmit` | (no output) | 0 | clean |
| oxlint | `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 | 84 warnings (matches the pre-existing baseline count cited in the local receipt), 0 errors |
| oxfmt --check | `npx oxfmt --check` on the 6 changed files | `All matched files use the correct format.` | 0 | clean |
| lint:units | `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 | pass |
| qc:openspec-ci:validate | `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] ... errors=0` | 0 | pass |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 | pass |

Every count matches the local receipt (`evidence/u36-local-20260925.json`) exactly; I reproduced all of them independently on the exact head rather than trusting the receipt's numbers.

### Red reproduction (question 5)

Recorded head blob hashes for the three product files, then `git checkout a2e24c8a80706b6ea5e4f4b4e22c3f52ea83aa18 -- <the three product files>` (test files stayed at head):
- `npx jest src/components/multiplayer/__tests__/NetworkedGameSurface.gmCorrection.test.tsx` on the baseline product code → **6 failed, 3 passed, 9 total** (matches the red receipt's row-for-row claims: double-press sent 2 calls, buttons never disabled while pending, no `maxlength` attribute, a 2001-unit paste reached the producer at 2001).
- `npx jest src/components/campaign/coop/__tests__/HostGmReviewSurface.deadControls.test.tsx` on the baseline product code → **5 failed, 5 total** (matches: dashboard rendered all 5 buttons, 3 did nothing when pressed, each secondary control rendered even with only one of the three handlers supplied).
- Restored the head's three product files via `git checkout 053e7c7d28ab6b714e42064d4eac9e9714b2903c -- <same three files>`; `git status --porcelain` on them was empty and `git hash-object`/`sha256sum` matched the recorded head blob hashes and the local receipt's `finalFileHashes` exactly (`0ddc2077...`, `46f10f2f...`, `acc615e2...`).

### Independent mutant (question 6, distinct from M1-M5)

Mutation: in `askForPreview` (`NetworkedGameSurface.gmCorrection.tsx:122`), changed `if (previewInFlightRef.current) return;` to `if (false) return;` — disables Preview's synchronous in-flight guard while leaving the `disabled` JSX attribute intact (the mirror, for Preview, of what M2 does to Approve; distinct from all five named mutants, none of which touch this line). Saved a byte copy first (`sha256: 0ddc2077...`, matching head). After mutating: `npx jest src/components/multiplayer/__tests__/NetworkedGameSurface.gmCorrection.test.tsx` → **1 failed, 8 passed, 9 total**, the failure being exactly `Preview GM Fix › sends one preview for a double press` (`onPreview` called twice instead of once) — caught. Restored via `cp -p` from the saved pre-image; `sha256sum` afterward was `0ddc2077...`, identical to the head blob, and `git status --porcelain` on the file was empty.

## Cap

- Files touched by the product PR diff: 6 (cap 15) — 3 product, 3 test, all under U36's three ownership paths; no file outside them.
- Product lines changed: 160 (cap 500), verified independently via `git diff --numstat` on the three product files (66+5, 42+28, 9+10 = 71+70+19 = 160).
- `git diff a2e24c8a80..053e7c7d28 | grep -iE "claude|anthropic|co-authored|generated with|E:[\\/]Projects|C:[\\/]Users"` — no match: no AI attribution, no absolute machine paths in the diff. The one commit's author/subject also carries no AI attribution.
- Every added or changed function/constant carries a comment stating what the code does, and I checked each one against the code beneath it:
  - `PRIVATE_REASON_MAX_LENGTH` comment ("refuses a reason whose trimmed length exceeds 2000 UTF-16 code units, the same unit maxLength counts") — verified against `rewindCommitDeps.ts:82-85` (`body.reason.trim().length > 0 && body.reason.trim().length <= 2000`), true.
  - `askForPreview`/`applyCorrection` doc comments ("A press while the previous ... is still pending returns without calling it... cleared when its promise settles (resolved or rejected)") — verified against the ref-guard/`finally` code, true.
  - `NetworkedHostGmControls` doc comment ("each disabled while its own request is pending, the private-reason field (only when onPrivateReasonChange is supplied...)") — verified against `disabled={previewPending}`/`disabled={approvePending}` and the `{onPrivateReasonChange !== undefined && (...)}` guard at `NetworkedGameSurface.gmCorrection.tsx:196`, true.
  - `HostGmReviewSurface`'s prop comment and top-of-function doc comment ("Each renders only when its handler is supplied... The dashboard mount supplies none of them") — verified against the `{onPreview && (...)}` / `{onManualTakeover && (...)}` / `{onGmCorrection && (...)}` JSX and `CampaignCoopRouteSurface.tsx:378-384`, true.
  - `useGmCorrectionProducers.ts:19-28` rewritten header ("`commitGmCombatRewind` posts the five CAS fields... and adds `reason` when the trimmed reason is not empty. The rewind-commit route... answers 400 unless its trimmed length is 1 to 2000 UTF-16 code units, and, when the rewind commits, writes it to the GM private record. The history commit itself still carries the route's `REWIND_COMMIT_REASON` constant as its reason") — verified line-by-line against `src/lib/multiplayer/client/commitGmCombatRewind.ts:47,61-68` (trims, conditionally spreads `reason`), `rewindCommitDeps.ts:82-85` (the 1-2000 bound), and `src/pages/api/matches/[id]/rewind-commit.ts:196-226` (the CAS fields are spread first, then `reason: REWIND_COMMIT_REASON` overrides it for the history commit at line 208, while `body.reason` — the GM's own text — is what's written to the private record at line 225 when defined). All true. Note: the charter's read-only-context path for this file (`src/pages-modules/multiplayer/commitGmCombatRewind.ts`) does not exist at head; the actual file is `src/lib/multiplayer/client/commitGmCombatRewind.ts`, but its content and the cited line numbers (`:47,:61-68`) match exactly, so this looks like a stale path in the charter rather than a discrepancy in the reviewed code.

## Verdict rationale

Every gate the charter named passed on the exact head and every count matched the local receipt when I reproduced it independently rather than trusting the receipt. The red evidence reproduces byte-for-byte against the baseline product files, and files were restored to the head's exact blobs afterward (git-clean, hash-verified). A mutant of my own choosing, distinct from the five named in the receipt, was caught by the shipped tests and the file was restored and hash-verified. The diff is entirely inside U36's three ownership paths, well under both caps, carries no AI attribution or absolute machine paths, and every new/changed function or header comment I checked is true of the code beneath it, including the rewritten `useGmCorrectionProducers.ts` header against the (unedited) transport chain.

I found no defect that requires an edit to this diff. The findings above are: two very-low-severity, pre-existing edge cases in an unedited transport layer that this unit's chosen bound does not create and does not make worse (findings 2-3); a disclosed, already-flagged living-spec gap that this unit makes honest rather than hiding behind dead buttons, with no e2e/story/jest breakage (findings 4-5); a cosmetic test-harness `act()` warning (finding 6); and a review-class/Lane-B process note that is outside Lane A's remit (finding 7). None of these block approval of this diff on its own terms.

**Verdict: APPROVE.** Note for the record: `units.json` lists U36's `reviewClasses` as `["idempotency"]`, which under `DELIVERY.md` step 5 additionally requires a Lane B owner ruling before merge — this Lane A approval does not substitute for that.

## Cleanup performed

- Deleted both scratch probe test files before finishing this review (`src/components/multiplayer/__tests__/_probe.lane-a.test.tsx`, `_probe2.lane-a.test.tsx`); `git status --porcelain` on the review worktree is empty.
- Restored all product files mutated during red-reproduction and mutant-testing to the head's exact bytes; verified by `git status --porcelain` (empty) and `sha256sum`/`git hash-object` matches against the recorded head blob hashes.
