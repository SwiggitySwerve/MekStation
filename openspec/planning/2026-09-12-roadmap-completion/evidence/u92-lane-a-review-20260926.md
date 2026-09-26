# Lane A review: U92
reviewedHead: 53973e939383c40a9c64c91674ded777653b7c2b
baseline: 1f11f4055419c998ff097144480af740efeacfc6 (rebased onto de207e4f19ff535727924844957ef89703f8eef8)
reviewerModel: claude-sonnet (Agent model: sonnet, lean-worker)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — root was at `de207e4f1` (branch `docs/roadmap-u92-fold-20260926`, untouched throughout).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u92-review 53973e939383c40a9c64c91674ded777653b7c2b` — exit 0, `HEAD is now at 53973e939`.
- PowerShell `New-Item -ItemType Junction … node_modules` — junction created (`d----l` entry confirmed).
- `npm_config_dry_run=true` exported for every npm/npx call; no install/build/Playwright/server run performed by this lane.
- `origin/main` already carried the fold at read time: `git log origin/main -3` showed `95f80aa94 docs(roadmap): U92 receipts folded, unit local-verified (#2009)` as HEAD~1 from `de207e4f1`'s child chain — units.json and all three receipts (`u92-admission-20260926.json`, `u92-red-20260926.json`, `u92-local-20260926.json`) were read from `origin/main` via `git show`, not from the implementer's worktree.
- `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` run before both the broad jest gate and the mutant/red reproduction runs — `MACHINE_IDLE` / exit 0 each time.
- Node: `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` — `node --version` = v22.22.0.
- Cleanup performed at the end (below); nothing committed or pushed; no other worktree touched.

## Files on the range

`git diff de207e4f19ff535727924844957ef89703f8eef8..53973e939383c40a9c64c91674ded777653b7c2b --stat`: 12 files, 979 insertions(+), 26 deletions(-):

Product (9, all under the allowed ownership paths):
- `src/lib/campaign/coop/campaignSyncTransport.ts` (+3/-3)
- `src/lib/campaign/coop/coopGmIntervention.ts` (+119/-0, new)
- `src/lib/multiplayer/server/CampaignMatchHost.doors.ts` (+7/-3)
- `src/lib/multiplayer/server/CampaignMatchHost.ts` (+4/-3)
- `src/lib/multiplayer/server/CampaignMatchHostIntent.ts` (+27/-3)
- `src/lib/multiplayer/server/campaignIntentIdentity.ts` (+3/-3)
- `src/pages/gameplay/campaigns/[id]/gm-ledger.tsx` (+45/-5)
- `src/types/campaign/CampaignSync.ts` (+29/-0)
- `src/types/multiplayer/Protocol.ts` (+22/-1)

Test (3):
- `src/__tests__/api/campaigns/coopGmIntervention.test.ts` (new, 393 lines)
- `src/__tests__/pages/gameplay/campaigns/gm-ledger.coop.test.tsx` (new, 326 lines)
- `src/stores/campaign/__tests__/coopBattleReconciliationWiring.test.ts` (+1/-5, parent-fold amendment)

`sha256sum` of all 9 product files on disk == every hash in `u92-local.json.productFileHashes` (verified byte-for-byte before any mutation work began).

## Review questions — answers

**Q1 (Privacy).** Guest receives one `FundsChanged {delta, reason, balance}` and nothing else. `CampaignMatchHostIntent.ts:239-259` builds the event from only `intent.payload.{summary, deltaCBills}`; `IApplyGmInterventionIntentPayload` (`CampaignSync.ts:536-543`) has exactly three fields (`interventionId`, `summary`, `deltaCBills`) — no room for `privateMetadata`. `GmCampaignInterventionControlPlane.helpers.ts:94-101` shows `privateMetadata {reason, defaultOutcome, hiddenNotes}` is a sibling of `publicSummary`, never merged into it. Spec: `openspec/specs/coop-campaign-sync/spec.md` "Co-op player-safe GM result projection" (~line 499-504): "the guest SHALL receive a public command result that explains the net effect and SHALL NOT receive private GM rationale or hidden correction context" — the wire payload satisfies this by construction (no private field exists to leak). `campaignActivityProjection.ts:140-147` confirms the guest's activity feed prints `reason` as free text (`` `${direction} … — ${reason} (balance …)` ``); today `summary` is a hardcoded canned string per correction type (`helpers.ts:103 'Merchant charge corrected by +2,500.00 C-bills.'`), not a GM-authored free-text field, so no live path lets a GM type private text into it — this is a scope-boundary fact (funds family only, canned corrections only), not a defect.

**Q5 (Record history).** Baseline wrote `updates.gmInterventionEvents` via `updateCampaign(updates)`; the new co-op branch (`gm-ledger.tsx:57-71`) calls `sendCoopGmIntervention` instead and never writes `updates` to the campaign record, so `campaign.gmInterventionEvents` is never appended for a co-op approval (confirmed live: `record.gmInterventionEvents: null` at every step of `u92-local.json.liveMeasurements.after`). `GmCampaignInterventionControlPlane.tsx:88-100` derives `persistedRows` from `campaign.gmInterventionEvents` on every mount/change — on reload a fresh mount rebuilds rows from that now-unchanged array, so the co-op approval drops off the GM's own ledger after reload (matches `FN-u92-coop-funds-approval-not-in-record-history`, disclosed and recorded, not a spec SHALL violation).

## Findings

1. **[Confirmed, no severity — matches receipt]** Wire schema isolation. `Protocol.ts:508-538`: `CampaignApplyGmInterventionIntentSchema` is added only to `CampaignHostIntentSchema`'s union, never to `CampaignIntentSchema` (unchanged, confirmed `campaignSyncSchemas.ts` not in the diff's file list). `CoopCampaign.ts:110` (`IGuestProposal.intent: ICampaignIntent`) confirms a guest proposal cannot carry it either. Probe: `grep -rn "ApplyGmIntervention" src/types src/lib/campaign src/lib/multiplayer` shows it appears only in the new type/schema and in `coopGmIntervention.ts`/`gm-ledger.tsx`'s send path.

2. **[Confirmed]** Host-only binder check absorbs the new kind with no special-casing. `bindCampaignSyncConnection.ts:721-734`: `if (envelope.playerId !== entry.hostPlayerId) → AUTH_REJECTED campaign-host-intent-requires-host` runs before any kind dispatch; `:825` (`entry.host.applyHostIntent(envelope.intent)`) is the generic fallthrough `ApplyGmIntervention` rides. Live measurement (`u92-local.json` step S4): guest's own send answered `AUTH_REJECTED campaign-host-intent-requires-host`.

3. **[Confirmed]** Dedupe-by-intentId is generic, not special-cased. `campaignIntentIdentity.ts` and `CampaignMatchHost.doors.ts` were only re-typed (`ICampaignIntent → CampaignHostCommand`), the dedupe logic itself (`intentCommandIdentity`/`replayCommittedIntent`) is untouched, so `ApplyGmIntervention` automatically dedupes by `intentId` through the existing path. Live measurement: a resend answers nothing (`u92-local.json` R1 rows) and the built-in `sendCoopGmIntervention` mints a fresh `interventionId` *and* `intentId` per call (`coopGmIntervention.ts:53-58`, `` `gm-intervention-${interventionId}` ``, `interventionId` includes `Date.now().toString(36)` + random chars).

4. **[Confirmed]** Debit-below-zero refused before commit, using the host's authoritative balance. `CampaignMatchHostIntent.ts:239-259`: `newBalance = state.balance + deltaCBills; if (newBalance < 0) return reject('insufficient-funds')` — `state` is `ICampaignAuthoritativeState` passed by the host, never a client-supplied figure.

5. **[Confirmed]** Page writes nothing locally for a co-op funds approval and re-reads only after commit. `gm-ledger.tsx:57-83`: on `intent !== null` (co-op + funds effect present), the `updateCampaign`/`markDirty` branch is entirely skipped; on success it calls `refreshAfterCommittedCommand` (the same re-read `sendAdvanceDay` uses, `useCampaignStore.dayActions.ts:371`); on refusal it only calls `toast(...)`. The `else` branch (solo campaigns and co-op non-funds families) is the untouched original three lines, now just inside an `else {}` — byte-identical to pre-change code (confirmed via the diff hunk, no other line changed inside that branch).

6. **[Confirmed, recorded, not a defect of this unit]** `FN-u92-approve-not-gated-in-flight`: `GmCampaignInterventionActions.tsx:134` — `disabled={!canApprove}`, where `canApprove` depends only on `preview?.status === 'ready' && !approvedApplied`, not on an in-flight flag. A double click during the round trip sends two intents with distinct `interventionId`s (by design) and commits twice. Idempotency hazard is real but is the documented consequence of the "each approval gets a unique id" default, and the button lives outside U92's ownership paths (`src/components/campaign/gm`).

7. **[Confirmed, recorded, not a defect of this unit]** `FN-u92-control-plane-reports-applied-after-refusal`: `GmCampaignInterventionControlPlane.tsx:318-321` — `await onApplyCampaignUpdate(result.state); … setApprovalStatus('Approved and applied to campaign state.')` runs unconditionally after the callback returns, regardless of whether the co-op host refused it (the page's own toast is the only place the refusal surfaces). Outside U92's ownership paths.

8. **[New, my own probe — not M1-M5]** Independently reproduced an additional mutant: disabled dedupe specifically for `ApplyGmIntervention` in `campaignIntentIdentity.ts::intentCommandIdentity` by adding `if (intent.kind === 'ApplyGmIntervention') return undefined;`. `npx jest src/__tests__/api/campaigns/coopGmIntervention.test.ts -t "R1"` → exit 1, `Tests: 1 failed, 1 skipped, 1 passed, 3 total` — the resend assertion (`resend.guestFrames` expected `[]`, got a third `FundsChanged` at `balance 387500`) caught it. File restored via `git checkout --`; `sha256sum` after restore == `d932d9c855f184fb5c151b34cca3700071901fe4826391e3efa4576abb174242` (the head blob's hash, matching `u92-local.json.productFileHashes`).

9. **[Reproduced]** Red reproduction. Restored the 8 pre-existing product files to their `1f11f4055` (baseline) blobs and deleted the new file `coopGmIntervention.ts` (does not exist at baseline), then ran the two new test files: `npx jest src/__tests__/api/campaigns/coopGmIntervention.test.ts src/__tests__/pages/gameplay/campaigns/gm-ledger.coop.test.tsx` → `Test Suites: 2 failed, 2 total`, `Tests: 6 failed, 2 passed, 8 total` — the same 6 failing rows named in `u92-red-20260926.json` (R1, R1 debit, R2 in the api file; R3, R4, refusal in the page file). Restored all 9 files via `git checkout --`; `sha256sum` of all 9 == head blobs (rechecked, all match).

10. **[Nitpick, informational only]** `coopGmIntervention.ts:36` docstring says the minted id carries "six random base-36 characters" — `Math.random().toString(36).slice(2, 8)` normally yields 6 characters but can yield fewer for certain random values (e.g. `(0.5).toString(36) = "0.i"`, slicing from index 2 gives `"i"`, one character). This does not affect uniqueness-in-practice (still combined with `Date.now()` and the canned id) and is not a functional defect — flagged only because the comment states a property ("six … characters") the code does not strictly guarantee.

## Gates (reviewedHead, worktree u92-review)

| Gate | Command | Exit | Last line |
|---|---|---|---|
| jest (broad) | `npx jest src/__tests__/api src/__tests__/pages src/lib/multiplayer/server src/lib/campaign src/types src/stores/campaign src/pages` | 0 | `Test Suites: 817 passed, 817 total` / `Tests: 7927 passed, 7927 total` |
| tsc | `npx tsc --noEmit` | 0 | (no output) |
| oxlint | `npx oxlint` | 0 | `Found 84 warnings and 0 errors.` (matches the 84-warning baseline the receipt names) |
| oxfmt --check | `npx oxfmt --check` on the 9 product + 3 test files | 0 | `All matched files use the correct format.` (12 files) |
| lint:units | `npm run lint:units` | 0 | `LINT_UNITS_PATH src-tests files=3207 findings=17783 ceiling=17783 PASS` / `LINT_UNITS_PASS 17899/17899` — at the ceiling, not over it |
| qc:openspec-ci:validate | `npm run qc:openspec-ci:validate` | 0 | `[qc:openspec-ci] … errors=0` |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | 0 | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` |
| Q6: amended test file alone | `npx jest src/stores/campaign/__tests__/coopBattleReconciliationWiring.test.ts` | 0 | `Tests: 4 passed, 4 total` |
| Q6: diff scope | `git diff de207e4f1..53973e939 -- .../coopBattleReconciliationWiring.test.ts` | — | exactly 2 hunks: removes the 2 now-unused type imports, changes line 163 to `type HostIntent = Parameters<ICampaignSyncTransport['sendHostIntent']>[0];` — nothing else. `npx oxlint --config scripts/qc/oxlint-units.json --no-ignore` on that file after the fold → `Found 0 warnings and 1 error` (the pre-existing `rules-of-hooks` finding only — the fold's import removal resolved the residual 2 `no-unused-vars` findings the lane's own receipt had left open) |
| Q7: red reproduction | see Finding 9 | 1 | `Tests: 6 failed, 2 passed, 8 total` (matches `u92-red-20260926.json`) |
| Q8: independent mutant | see Finding 8 | 1 | `Tests: 1 failed, 1 skipped, 1 passed, 3 total` |

## Cap

- Ownership scope: all 9 product files fall under `src/lib/campaign`, `src/lib/multiplayer/server`, or one of the three named exact files (`CampaignSync.ts`, `Protocol.ts`, `gm-ledger.tsx`) — confirmed by listing every changed path.
- Product lines: `git diff … --numstat` on product paths = 259 added / 21 removed (matches the receipt's "259 added"), under the 500-line cap.
- File count: 12 files total in the diff (9 product + 3 test), well under `maxFiles: 15`.
- AI attribution: `git log de207e4f1..53973e939 --format="%H %an %ae %s%n%b" | grep -i "claude\|co-authored\|generated with\|anthropic"` → no match (exit 1).
- Absolute machine paths: `git diff … | grep -inE "E:[\\/]Projects|C:\\\\Users|/home/|/Users/wroll"` → no match (exit 1).
- Function/module comments read on every touched function (`coopGmIntervention.ts`, `CampaignMatchHostIntent.ts`'s `validateCampaignIntent`, `CampaignMatchHost.applyHostIntent`, `applyHostIntentLocked`, `gm-ledger.tsx`'s page comment, the new Protocol.ts schema comment, the new CampaignSync.ts interface comments) all state what the code does and match the code beneath them, with the one informational nitpick at Finding 10.

## Verdict rationale

Every review-question claim in the receipts was independently reproduced from the code and/or a fresh command run in a clean detached worktree: the wire schema stays off the guest union, the host-only binder check and generic dedupe absorb the new intent kind without special-casing, the debit-below-zero refusal runs before any commit against the host's own authoritative state, the page writes nothing locally for a co-op funds approval and preserves the exact baseline branch for solo/non-funds paths, and the privacy contract (delta/reason/balance only, no private metadata) holds by construction of the payload type. Red reproduced exactly (6/8 failing, matching the red receipt's rows). An independently-chosen mutant (disabling dedupe for this one intent kind) was killed by the existing test suite. All ten gates pass on the exact reviewed head, `lint:units`' src-tests ratchet lands exactly at the ceiling (not over), scope and line-count caps are respected, and no AI attribution or absolute paths were introduced. The five findings recorded as out-of-scope UI/persistence gaps (approve-not-gated-in-flight, control-plane-reports-applied-after-refusal, duplicate-key warning, record-history gap, guest-ledger-route-unmirrored) are genuine and already disclosed in units.json with correct successors — none of them touch this unit's own review classes (authority, privacy, idempotency) as violations; the idempotency hazard is the documented, owner-approved consequence of the "unique id per approval" default, not an oversight. No blocking defect found. **APPROVE**.
