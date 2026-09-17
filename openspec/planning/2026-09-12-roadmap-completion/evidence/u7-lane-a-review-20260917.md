# Lane A review: U7
reviewedHead: 89de87394b21b2f70ae05075713e07df875d016b
baseline: 1d31dc8dcccde8f17b74596db8b2e9d7e6a68388
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## A. Row 2 authorization correctness

**Seating / caller identity** — `e2e/gm-two-player-conflict.pack.spec.ts:360-369` calls `launchOneVersusOne` with distinct `hostName`/`guestName`/`hostPassword`/`guestPassword`, which (per `e2e/helpers/gmTwoPlayerMatchFlow.ts:184-264`) seeds two real identities, drives the production login form for each, joins the guest by room code, readies both, and launches the match — the guest is a genuinely seated non-host, not a fabricated actor.

**Guest's own credentials, not the host's** — `guestTokenResponse` (:352-358) waits specifically on the guest page's own `POST /api/multiplayer/auth/token` 200 response; `guestToken` (:371-374) is parsed from that response. The route call at :388-401 sends `Authorization: Bearer ${guestToken.token}` — the guest's token, never `live.hostToken`. Two independent cross-checks confirm this is really the guest: `expect(guestToken.playerId).toBe(identity.playerId)` (:378, `identity` is the socket-observed identity from the guest's own routed WebSocket, `installConflictHarness` at :231-260) and `expect(guestToken.playerId).not.toBe(live.hostToken.playerId)` (:379).

**403 / `gm-role-required` / body shape** — `expect(response.status()).toBe(403)` (:402), `expect(answer.kind).toBe('refused')` (:405), `expect(answer.reason).toBe('gm-role-required')` (:406), and a full deep-equal on the exact refusal body `{kind:'refused', reason:'gm-role-required', detail:'Only the owning GM can request GM intervention previews.'}` (:434-438). This is not a tautology: I read the route (`src/pages/api/matches/[id]/rewind-commit.ts:74-85, 146-160, 176-190`) and the authority check it calls (`src/lib/interventions/GmInterventionAuthority.ts:55-80`). A caller failing for an unrelated reason would diverge from this exact assertion set: an invalid/expired guest token yields 401 (`rewind-commit.ts:132`, checked before role), a body-shape defect yields 400, a different authority code (`actor-mismatch` at 68-71, `state-not-owned` at 75-79) also maps to 403 via `statusForRefusal` (:74-85) but would fail the `answer.reason`/`toEqual` checks. So the row cannot pass on a same-status/wrong-reason failure.

**Leak-safety scan uses live values, not placeholders** — the `secrets` array (:416-424) is built from: `live.hostToken.playerId`/`live.hostToken.token` (host's real REST auth response, from `launchOneVersusOne`), `requiredIdentity(hostHarness).token` (host's real wire token, observed off the host's own routed socket), `guestToken.playerId`/`guestToken.token` (guest's real REST tokens), `identity.token` (guest's real wire token), and every cookie value from both browser contexts (:412-415). All are runtime-captured, not string literals. The scan checks both the raw response body and the rendered guest page text (:425-433) for substring inclusion of every secret plus a generic `/playerId|wireToken|sessionToken|leaseId|lease_id/i` field-name regex.

No tautology found in row 2. UI-absence checks (`networked-gm-rewind-controls` `toHaveCount(0)` at :384-386, `gm-rewind-preview-dialog`/`gm-rewind-refusal` `toHaveCount(0)` at :407-410) target real `data-testid`s that exist in shipped product code and are asserted present-for-host in the same test (:381-383), so an absent-dialog check is not vacuous against a nonexistent id.

## B. Row 1 unchanged; pin suite records only the new row

`git diff 1d31dc8dc..89de87394 -- e2e/gm-two-player-conflict.pack.spec.ts` shows a pure append after the existing file end (line 323 onward is 100% `+` lines; no `-` lines anywhere in this file's diff), so row 1 is byte-identical. This is corroborated by the receipts: `u7-local-20260917.json.row1` records `"byteIdentical": true` with `"baselineSha256": "f0fe8187...c88e3"`, and `u7-red-20260917.json.row1BaselineSha256` records the identical hash.

The pin-suite diff (`scripts/__tests__/gm-two-player-campaign-qc.test.ts`) changes only the test name (`'pins the conflict-pack spec at one row'` → `'...at two rows'`) and appends the new row's exact title to the expected `titles` array — no other pin assertion in the file is touched.

## C. Non-claims and route-ordering

**GM_ONLY UI clause explicitly not claimed** — the row's own doc comment (added at the top of the new test, `e2e/gm-two-player-conflict.pack.spec.ts` lines ~334-337 of the diff) states the non-claim and cites the exact mount conditions. I verified both cited files directly:
- `src/components/multiplayer/NetworkedGameSurface.tsx:409` — `{authorityProjection.viewerRole === 'host-gm' && !spectator && ( ... )}` gates the GM controls block that contains the rewind trigger.
- `src/components/multiplayer/NetworkedGameSurface.gmRewind.tsx:113` — `{open && (<GmRewindPreviewDialog .../>)}` mounts the dialog only when opened (which only the gated controls can do).

The `tasks.md` PROGRESS line (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md:595`) states the identical non-claim: "The GM_ONLY UI clause is not claimed: the rewind dialog mounts only for the host GM; no wire GM_ONLY or other conflict class is claimed by this row." Consistent with the spec header and with `units.json:726` (U7's behavior sentence carries the same caveat) and `units.json:1354-1361` (`FN-u1d-authorization-class-has-no-wire-lever`, which this unit addresses via the HTTP boundary, not the wire — a legitimate, disclosed substitution, not a silent narrowing).

**Route refusal code is genuinely `gm-role-required`, checked before any journal access** — `src/pages/api/matches/[id]/rewind-commit.ts:182` derives `role: viewer.principalId === meta.hostPlayerId ? 'gm' : 'player'` and passes it into `commitGmCombatRewind`. In `src/lib/multiplayer/server/history/GmCombatRewindCommit.ts:71-78`, `evaluateGmInterventionAuthority(authority, ...)` is the *first* statement in `commitGmCombatRewind` — it runs before `readOutcomeId`, `campaignHasTakenDelivery`, `branches.readEffectiveHead`, or any other journal/history read (lines 89-114 of that file, all downstream of the authority check). `src/lib/interventions/GmInterventionAuthority.ts:68-74` returns `{status:'rejected', code:'gm-role-required', reason:'Only the owning GM can request GM intervention previews.'}` for `authority.role !== 'gm'` — exact string match to the body asserted in the test. I grepped both files (and the route) for any combat-journal-mode flag (`combat.journal`, `COMBAT_JOURNAL`, `journalMode`, `JOURNAL_ENABLED`) and found none — the role gate is unconditional, so the row's independence from journal mode is accurate, not an unverified assumption.

## D. Mutants

Three mutants recorded in `u7-local-20260917.json.mutants`, all `KILLED`, each against a distinct assertion:

| Mutant | Change | Killed at | Failing assertion (from receipt) |
|---|---|---|---|
| M1 | `rewind-commit.ts` `statusForRefusal` returns 200 for `gm-role-required` | `e2e/gm-two-player-conflict.pack.spec.ts:402` `expect(response.status()).toBe(403)` | `Expected: 403, Received: 200` |
| M2 | refused-body reason swapped `gm-role-required` → `actor-mismatch` | `:406` `expect(answer.reason).toBe('gm-role-required')` | `Expected: "gm-role-required", Received: "actor-mismatch"` |
| M3 | refusal detail leaks `meta.hostPlayerId` | `:428` `expect(text.includes(secret)).toBe(false)` (secret-leak loop, `secrets` built at :416-424) | `Expected: false, Received: true` |

The three target independent failure surfaces — HTTP status, refusal reason code, and credential-leak safety — and each mutant's build+run log (`build-M{1,2,3}.log`, `conflict-M{1,2,3}.log`) shows exactly one of the two conflict-pack rows failing, with `git checkout -- <file>` reverting between mutants (`revertCommand` in each mutant entry). This matches the task description's three named mutants (route answers 200; actor changed to actor-mismatch; peer id disclosed).

## E. Caps, review class, hygiene, and gate output

**Caps** — `git diff 1d31dc8dc..89de87394 --stat` touches 6 files total: `e2e/gm-two-player-conflict.pack.spec.ts` (+120/-0), `openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md` (+1/-0), `scripts/__tests__/gm-two-player-campaign-qc.test.ts` (+2/-1), plus 3 new evidence JSON receipts. Under the unit's own cap (`units.json:736-739`, `maxFiles: 15`, `maxNonGeneratedLines: 500`): 6 files ≤ 15; non-generated product lines (e2e + tasks.md + qc test) = 123 added / 1 removed ≤ 500.

**Review class** — `units.json:733-735` lists `reviewClasses: ["routine"]` for U7. No owner-gate, no privacy/authority/migration/replay/idempotency/concurrency class attached (this class list would otherwise require a Lane B owner ruling per `DELIVERY.md` step 5/`GOAL.md` stage 4) — routine is correct for a test-only addition against an already-shipped authorization code path.

**No `src/` change** — confirmed by the diffstat above; only test/evidence/doc files are touched. `src/` files were read during this review for verification only, never modified.

**No checkbox change** — `git diff` on `tasks.md` shows one new PROGRESS line under the existing 22.3 item; no `- [ ]`/`- [x]` line is touched. The new PROGRESS line itself says "No checkbox changed."

**No AI attribution / no secrets / no absolute machine paths in product files** — `git diff 1d31dc8dc..89de87394 -- e2e/... tasks.md scripts/...` grepped case-insensitively for `co-authored|generated with|claude|anthropic|gpt-|E:\\|E:/Projects|C:\\Users|/home/|/Users/` returned no matches. (The three evidence JSON receipts do contain worktree-local absolute paths, e.g. `E:\Projects\MekStation\.sisyphus\...` — this is the established receipt convention used by every prior unit's evidence files in this planning directory, not a product-file violation.)

**Gate commands run in the review worktree** (`E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u7-review`, junctioned `node_modules`, no install/build/Playwright run):

- `npx tsc --noEmit -p tsconfig.json` → exit 0, no output.
- `npx oxfmt --check e2e/gm-two-player-conflict.pack.spec.ts scripts/__tests__/gm-two-player-campaign-qc.test.ts openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md` → exit 0, last lines: `All matched files use the correct format.` / `Finished in 43ms on 2 files using 16 threads.`
- `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts` → exit 0, last lines: `Test Suites: 1 passed, 1 total` / `Tests: 12 passed, 12 total` (includes `pins the conflict-pack spec at two rows`, passing).
- `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` → exit 0, last line: `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` — identical node/package/task/triage counts to the counts recorded in the unit's own `u7-local-20260917.json.gates.roadmap`.

All four gates match or exceed what the implementer's own `local` receipt claims.

## Non-blocking observations

1. `evaluateGmInterventionAuthority` checks `actor-mismatch` before `gm-role-required` (`GmInterventionAuthority.ts:60-66`), but that first branch is structurally unreachable from this HTTP route because the route always sets `authority.actorId = request.actor = viewer.principalId` (`rewind-commit.ts:180-196`). The row correctly targets the reachable `gm-role-required` branch rather than the unreachable one; not a defect in this change.
2. The build gate (`npm run build`) continues to exit 1 in every junction-`node_modules` worktree build due to a pre-existing "Unsafe hydration destination... contains a symlink or junction" condition, unrelated to this diff. The receipts disclose this honestly in every build entry and in `findingsReportedNotFixed` (`FN-u1c-build-exit-hidden-by-tail`) rather than hiding it behind a `| tail` pipeline — consistent with prior units' handling of the same known limitation.
3. `FN-u1d-authorization-class-has-no-wire-lever` specifically named the *wire* (socket) authorization class as unreachable; this unit closes coverage of the authorization concern through the pre-existing HTTP `rewind-commit` boundary instead, which is a distinct, legitimate route to the same refusal code and is disclosed as such rather than claimed as closing the wire-level gap.
