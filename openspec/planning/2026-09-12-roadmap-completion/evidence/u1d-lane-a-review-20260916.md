# Lane A review: U1d
reviewedHead: f80d850b0232e2c342f97dc4dbe7e0b8099ccae8
baseline: a00b816dcf1d30cb40b08ce9901bcf66ea3cc125
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## A. Does the new e2e row actually assert what E2E-77 requires?

File: `e2e/gm-two-player-conflict.pack.spec.ts`.

- **Class code + verbatim recovery, both variants.** `captureConflict` (lines 180-202) asserts on the player-visible `intent-error-toast`:
  - `e2e/gm-two-player-conflict.pack.spec.ts:190` — `expect(toast).toContainText(`Action rejected (${code}): ${recovery}`)`, an exact literal composed from the constants `COLLISION_CODE`/`COLLISION_RECOVERY` (`:61-62`) and `DUPLICATE_CODE`/`DUPLICATE_RECOVERY` (`:63-64`).
  - `:192-193` — a second, independent check (`toContain('(${code})')`, `toContain(recovery)`) against the toast's own `innerText()`.
  - This is not a tautology: it is falsifiable and was proven so — mutant M1 (`client.ts` sequence-collision reason swapped to the duplicate reason) failed at `:190` with `Expected sequence-collision Received the duplicate reason`, and mutant M3 (class code dropped from the toast render) failed at `:190` with `Expected (DUPLICATE_INTENT) Received "Action rejected: Intent id already accepted..."`. I independently confirmed the two source strings the test pins are the real server/client strings: `DUPLICATE_INTENT` / `'Intent id already accepted for this match'` is emitted verbatim at `src/lib/multiplayer/server/ServerMatchHostIntent.ts:261-269`; `PROTOCOL_VIOLATION` / `'sequence-collision'` is emitted verbatim at `src/lib/multiplayer/client.ts:379-383`. The literal `IntentErrorToast` render format (`"Action rejected" + (code?" (code)":"") + (reason?": reason":".")`) is at `src/components/multiplayer/NetworkedGameSurface.overlays.tsx:238-241` and matches the expected template exactly.
  - Named "recovery" here is honestly the toast's `reason` text, not the product's distinct `recoveryAction` field (see below) — the test header (`:9-16`) and PROGRESS note say so explicitly rather than silently substituting one for the other.

- **Leak safety uses live secrets, not placeholders.** `secrets` (`:131-136`) is built from `live.hostToken.playerId` / `live.hostToken.token` (the real host identity/token returned by `POST /api/multiplayer/auth/token`, captured in `e2e/helpers/gmTwoPlayerMatchFlow.ts:233`) and `identity.playerId` / `identity.token` (the guest's own id/token, captured live off the wire's `SessionJoin` frame by the harness's `routeWebSocket` interceptor, `:236-255`). `SessionJoin.token` is a required field on the schema (`src/types/multiplayer/Protocol.ts:96`), so the harness is reading the actual per-connection auth token, not a synthesized value. The check itself (`:195-196`, `expect(text.includes(secret)).toBe(false)`) is a real substring safety property, run against all four live values for both captured toasts. Mutant M2 (interpolating `envelope.playerId` into the DUPLICATE_INTENT reason) failed exactly this assertion (`Expected false Received true` at `:196`), which is direct proof the check is live, not vacuous. I did not find a second, distinct "wire token" concept in this codebase separate from the session/auth token used here — `hostToken.token`/`identity.token` are the only per-connection token values that exist on this path, so "wire token" and "session token" in the review brief both resolve to the one value the test already checks; there is no unchecked second secret.

- **Weak/near-tautological assertion found (non-blocking).** `:198-200`, `expect(page.getByTestId('tactical-branch-recovery-action')).toHaveCount(0)`. I traced this: `IntentErrorToast` (`overlays.tsx:230-253`) never renders this testid at all — it lives in a separate component, `NetworkedGameSurface.branchRecovery.tsx`, wired at `NetworkedGameSurface.tsx:395` off `tacticalLifecycle.recoveryAction`, which is only ever non-null when `projectionSignalFromServerError` (`src/lib/multiplayer/tacticalLifecycleState.ts:86-96`) maps a server code to `STALE_BRANCH`. Since `DUPLICATE_INTENT` and `PROTOCOL_VIOLATION` both map to `null` there (the function only recognizes `PROJECTION_REBUILDING` and `STALE_BRANCH`), this locator is structurally guaranteed absent for both of this row's variants regardless of anything the toast-rendering code does — it is not exercised by any of the three named mutants. It is not a true tautology (a future change to `projectionSignalFromServerError` widening its mapping would trip it), but under the current architecture it is a fixed-outcome check, not a live regression guard for this row's own subject matter. This does not misrepresent player-visible behavior and is honestly framed by the header comment (`:9-14`) — flagging as a non-blocking observation, not a defect.

- No assertion reads a value the product does not render to players — all checks operate on `intent-error-toast`'s and `tactical-branch-recovery-action`'s actual DOM text/presence.

## B. src/ untouched; QC registration matches the lifecycle-pack pattern

`git diff --name-only a00b816dc..f80d850b0` touches zero paths under `src/` (verified by `grep -c "^src/"` = 0).

`scripts/qc/gm-two-player-campaign-core.cjs` diff: adds `conflict-pack:22` to `GROUP_CATALOG` (same owner number, `22`, as the adjacent `cleanup-ownership`/`backpressure`/`lifecycle-pack` entries) and one `SPEC_BY_GROUP` line, `'conflict-pack': ['e2e/gm-two-player-conflict.pack.spec.ts']`, placed directly after `'lifecycle-pack'` with a comment citing the same registration shape and "not respawning." This mirrors the existing `lifecycle-pack` registration exactly (same map shape, same non-respawning class).

`scripts/__tests__/gm-two-player-campaign-qc.test.ts` diff records the pin: adds `conflict-pack` to the `groups` list, a `buildRunPlan` assertion for the new group's args/env, adds the spec to the `all`-union args pin, adds `conflict-pack` to the reserved-but-unimplemented-before/UNKNOWN_GROUP-before-registration list, and a dedicated `'pins the conflict-pack spec at one row'` test asserting the file contains exactly one `test(...)` titled `E2E-77 reachable conflict messages are actionable and leak-safe @conflict-pack @E2E-77`. This is the same test-registration idiom used for `lifecycle-pack` in U1e.

## C. Verifying the two narrowing claims against shipped src (read-only)

**Claim 1 — "the socket schema strips targetRevision":** TRUE.
- `AdvancePhaseIntentSchema = z.object({ kind: z.literal('AdvancePhase') })` at `src/types/multiplayer/Protocol.ts:225-227` declares no `targetRevision` field, and no `.passthrough()` is used anywhere in this file (only one `.strict()` at `:528`, unrelated) — confirmed `zod@4.3.6` is installed and the file's own comment at `:382-384` states "Zod z.object variants strip unknown keys." The parse path is `ClientMessageSchema.safeParse(...)` at `src/lib/multiplayer/server/bindMultiplayerSocketConnection.ts:201`, and `envelope = parsedEnvelope.data` (the *parsed*, key-stripped object) is what reaches dispatch. `targetRevision` exists in the whole file only on `RewindRequestIntentSchema` (`:347-349`); `namesRewindCut` (`src/lib/multiplayer/server/ServerMatchHostBranchAdmission.ts:249-254`) explicitly excludes `kind === 'RewindRequest'` and otherwise checks `hasOwnProperty('targetRevision')` — so an `AdvancePhase` envelope can never carry that key by the time it reaches the `GM_ONLY` check (`:143`, `namesRewindCut(envelope.intent) && actorId !== hostPlayerId`). Reachability of `GM_ONLY` from the wire is correctly ruled out.

**Claim 2 — "the campaign command route never forwards expectedRevision":** TRUE.
- `src/pages/api/campaigns/[id]/commands.ts:139-148` builds the `executeCampaignCommand` request as `{ campaignId, intent, authorPlayerId, commandId, ts }` — no `expectedRevision` key, and no schema on this route accepts one from the request body. `ICampaignCommandRequest.expectedRevision` is optional (`src/lib/campaign/authority/campaignCommandPipeline.ts:234`), and `resolveCommandBase` (`:266-268`) treats an `undefined` value as `{ kind: 'at-head' }`, bypassing the revision-conflict branch entirely — so `STALE_REVISION` cannot be produced via this route. I did not independently re-verify the second half of the sentence ("wire CAMPAIGN_STALE_HEAD is a lost race behind runExclusive with no in-paths store interloper") beyond confirming `CampaignMatchHost.runExclusive` and `CAMPAIGN_STALE_HEAD` both exist in `src/lib/multiplayer/server/`; that half was not one of the two claims the review brief asked me to verify.

**Non-claims consistency:** the same wording (stale-branch, GM_ONLY/authorization, rebuild/campaign-stale-head, PROJECTION_REBUILDING) appears in the spec/test-file header (`e2e/gm-two-player-conflict.pack.spec.ts:25-37`), the tasks.md PROGRESS note (line 590), and `units.json`'s `nonClaims20260916` array and `narrowed20260916.reason` for U1d — all three agree. The test's own title carries "reachable" as a qualifier, task 22.3 in tasks.md stays unchecked, and `units.json` state is `local-verified` (not `complete`), all consistent with the narrowed scope; nothing elsewhere in the diff claims beyond it.

## D. Ledger integrity

- State `local-verified`; `admission`/`red`/`local` receipts present with paths `evidence/u1d-admission-20260916.json`, `evidence/u1d-red-20260916.json`, `evidence/u1d-local-20260916.json` — all three exist on the head (`ls` confirmed) and `admission.baseline` = `a00b816dcf1d30cb40b08ce9901bcf66ea3cc125`, matching the assigned baseline exactly.
- Two findings `FN-u1d-authorization-class-has-no-wire-lever` and `FN-u1d-stale-head-class-has-no-in-paths-lever` are present in `units.json` (lines 689, 700), each with `foundBy: "U1d"`, matching the two narrowing claims verified above.
- `git diff` on `tasks.md` in-range adds exactly one line (the PROGRESS note); `grep -E "^[-+]\s*-\s*\[[x ]\]"` over that diff returns nothing — no checkbox line was touched.
- Validator: `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` → `ROADMAP VALIDATION PASSED: 73 nodes, 13 packages, 376 tasks, 40 triage rows` — exact match to the claimed counts.
- Caps: `git diff --numstat a00b816dc..f80d850b0` shows 8 files total (well under 15). Product-line count, summing insertions on the 4 non-ledger/non-evidence files only (per the instruction that ledger JSON under `openspec/planning` is evidence, not product): `e2e/gm-two-player-conflict.pack.spec.ts` +325, `openspec/changes/.../tasks.md` +1, `scripts/__tests__/gm-two-player-campaign-qc.test.ts` +43/-1, `scripts/qc/gm-two-player-campaign-core.cjs` +5/-1 → 325+1+43+5 = **374 lines over 4 files**, matching the commit message's and local receipt's own count exactly and under the 500-line/15-file caps. (`units.json` +51/-8 and the three `evidence/*.json` files are the ledger/evidence, correctly excluded from the product count.)

## E. Jest pin file result; `--next` state

- `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts` → **12 passed, 12 total**, including `pins the conflict-pack spec at one row`. Matches the local receipt's "pin suite 12/12."
- `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs --next` → `NONE-ADMISSIBLE: 0 owner-gated, 3 blocked`, exit code 3. This is the NONE-ADMISSIBLE state, not a printed unit id — expected while U1d sits at `local-verified` (not yet merged), per GOAL.md's admissibility rule.

## F. AI attribution / secrets / absolute paths

- Commit message (`git log -1 --format=%B`) and the full diff (`git diff a00b816dc..f80d850b0 | grep -iE "claude|anthropic|co-authored-by|generated with|openai|gpt|copilot|chatgpt"`) contain no AI-attribution text.
- No secrets, tokens, or absolute machine paths (`C:\Users`, `/home/`, `/Users/`, key/credential patterns) appear in the diff. The two literal strings `ConflictPackHost123!` / `ConflictPackGuest123!` are throwaway local e2e login passwords, not real secrets — the same naming convention is already used by every sibling pack spec (e.g. `AuthorityOrderHost123!` in `gm-two-player-authority-order.pack.spec.ts:36`, `HostPassword123!` in `gm-two-player-exactly-once.pack.spec.ts:31`).

## Commands run (Node 22, inside the review worktree)

```
git diff --numstat a00b816dc..f80d850b0
  -> 325 e2e/gm-two-player-conflict.pack.spec.ts ; 1 tasks.md ; 277/194/72 evidence/*.json ; 51/8 units.json ; 43/1 scripts test ; 5/1 scripts qc core

git diff --name-only a00b816dc..f80d850b0 | grep -c "^src/"
  -> 0

npx oxfmt --check e2e/gm-two-player-conflict.pack.spec.ts scripts/__tests__/gm-two-player-campaign-qc.test.ts scripts/qc/gm-two-player-campaign-core.cjs
  -> All matched files use the correct format. Finished in 60ms on 3 files using 16 threads.

npx oxlint e2e/gm-two-player-conflict.pack.spec.ts scripts/__tests__/gm-two-player-campaign-qc.test.ts scripts/qc/gm-two-player-campaign-core.cjs
  -> Found 0 warnings and 0 errors. Finished in 15ms on 0 files using 16 threads.  (confirms "oxlint vacuous for these paths" — .oxlintrc.json ignores e2e/**, **/scripts/**)

npx tsc --noEmit -p tsconfig.json
  -> exit 0, no diagnostics

npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts
  -> Tests: 12 passed, 12 total

node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs
  -> ROADMAP VALIDATION PASSED: 73 nodes, 13 packages, 376 tasks, 40 triage rows

node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs --next
  -> NONE-ADMISSIBLE: 0 owner-gated, 3 blocked (exit 3)

git log -1 --format=%B f80d850b0 ; git diff a00b816dc..f80d850b0 | grep -iE "claude|anthropic|co-authored-by|generated with|openai|gpt|copilot|chatgpt"
  -> commit message printed; grep produced no matches
```

## Non-blocking observations

1. `tactical-branch-recovery-action` → `toHaveCount(0)` (`e2e/gm-two-player-conflict.pack.spec.ts:198-200`) is structurally guaranteed to pass for both of this row's variants under the current `projectionSignalFromServerError` mapping (see A above) and is not exercised by any of the three named mutants. Not a defect — just weaker than it looks; a future successor widening the reachable-class set should re-derive whether this assertion is still doing work.
2. `FN-u1d-authorization-class-has-no-wire-lever` and `FN-u1d-stale-head-class-has-no-in-paths-lever` both have `"status": "recorded; ... unassigned"` / `"successor not yet planned"` — this is a real, disclosed, owner-level gap in E2E-77's coverage (2 of 5 conflict classes have no live lever at all today), not something this unit could have closed within its caps; correctly parked as findings rather than silently dropped.
3. The PROGRESS note repeats the FN-u1c-pending-intent-never-settles finding (both surfaces stick at `pending` after launch) as a carried-forward, not-yet-fixed defect outside this unit's ownership (`src/` is not an owned path) — consistent with DELIVERY.md's instruction to preserve rather than silently drop cross-unit findings.
