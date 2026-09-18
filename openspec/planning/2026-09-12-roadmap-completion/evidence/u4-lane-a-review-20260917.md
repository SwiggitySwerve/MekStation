# Lane A review: U4
reviewedHead: bf066c7c55bd2c26567cb55e00c2c99f2e1e41a5
baseline: 9913f06e775b90cff8633ce3798b942f0536a2eb
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Scope

Range reviewed: `c0d621e88..bf066c7c5` (branch cut from `c0d621e88`, two docs
commits after the recorded ledger baseline `9913f06e7`). Single commit on the
head: `bf066c7c5 fix(multiplayer): lobby answers settle the pending intent
they answer`.

Setup: detached worktree at `bf066c7c5` under
`.sisyphus/roadmap-completion-20260912/worktrees/u4-review`, `node_modules`
junctioned from the root checkout (no install/ci/prune run). All commands
below were run from inside that worktree; the root checkout was never
touched. Worktree was clean at the end and has been removed (see Cleanup).

## A. Wire compatibility

`src/types/multiplayer/Protocol.ts:868` —

```ts
export const LobbyUpdatedSchema = z.object({
  kind: z.literal('LobbyUpdated'),
  matchId: matchIdSchema,
  ts: tsSchema,
  intentId: z.string().min(1).optional(),   // <- new, line 868
  seats: z.array(MatchSeatSchema),
  status: z.enum(['lobby', 'active', 'completed']),
  hostPlayerId: z.string().min(1),
});
```

`intentId` is `.optional()` (not `.nullable()`, no default), so a server
frame that omits it entirely still parses — Zod treats a missing optional
key as absent, not a validation failure. `ErrorMessageSchema` already had an
optional `intentId` at `Protocol.ts:803` before this change (verified via
`git diff`, this field is untouched by the range); only the `LobbyUpdated`
schema gained the field.

`grep -rn "LobbyUpdated" src` (excluding `__tests__`) turns up every
consumer:

- `src/lib/multiplayer/client.ts:413-418` — the new settle call, reviewed in D.
- `src/hooks/useMultiplayerSession.helpers.ts:168-201` — `handleLobbyUpdated`
  stores the *entire* parsed object (`context.lobbyStateRef.current = lobby;
  context.setLobbyState(lobby);`, line 199-200) rather than destructuring
  named fields, so it neither breaks nor silently drops `intentId` — it just
  doesn't read it (nothing there needs to).
- `src/lib/multiplayer/server/ServerMatchHost.ts` — three comment-only
  mentions (`:712`, `:868`, `:1388/1390`), no code touching the field.
- `src/lib/multiplayer/server/authorization/MatchSeatMembershipSource.ts:174`
  — comment only.
- `src/lib/multiplayer/mirrorMatchSession.ts:54` — comment only.
- `src/lib/multiplayer/server/ServerMatchHostLobbyIntents.ts:211-219` — the
  stamped success frame, reviewed in C.
- `src/lib/multiplayer/server/ServerMatchHostReplay.ts:330-337` — see below.

`ServerMatchHostReplay.ts:330-337` builds a `LobbyUpdated` on join-time
replay:

```ts
const update: ILobbyUpdated = {
  kind: 'LobbyUpdated',
  matchId: ctx.matchId,
  ts: nowIso(),
  seats: [...seats],
  status: meta.status,
  hostPlayerId: meta.hostPlayerId,
};
```

No `intentId` stamped here. This is an **honest gap, not a miss**: this
frame is sent to a socket that just finished `sendReplay` for a *new*
connection (`ServerMatchHostReplay.ts:311-329`, `resolveJoinViewer` /
`sendJoinClose` guard the path) — it is a lobby snapshot pushed on join, not
an answer to any intent the connecting socket sent. There is no
`envelope.intentId` in scope at that call site to stamp. The optional field
lets this frame parse identically before and after the change.

**Verdict on A: no break, no silent drop, and the one un-stamped build site
is correctly un-stamped.**

## B. Red-first honesty

The new client assertion (`client.test.ts` line ~166 on) drives the socket's
real `onmessage` handler:

```ts
inject(message: unknown) {
  socket.onmessage?.({ data: JSON.stringify(message) });
},
```

and `client.ts:791` wires that handler to
`parsed = ServerMessageSchema.safeParse(JSON.parse(raw));` — confirmed by
`grep -n "onmessage\s*=\|ServerMessageSchema.safeParse" src/lib/multiplayer/client.ts`
(hits at lines 724 and 791). So the test enters through the schema-parse
path, not the handler map directly — it cannot pass by only exercising
`SERVER_MESSAGE_HANDLERS.LobbyUpdated` in isolation.

I verified the "would it go red if the field were removed" claim
empirically rather than taking it on faith: I deleted line 868
(`intentId: z.string().min(1).optional(),`) from `LobbyUpdatedSchema` in the
worktree and re-ran the two affected suites.

Command: `npx jest --selectProjects unit --runInBand --runTestsByPath
src/lib/multiplayer/__tests__/client.test.ts
src/types/multiplayer/__tests__/Protocol.test.ts --testNamePattern=U4`

Result: both suites failed —

```
FAIL unit src/lib/multiplayer/__tests__/client.test.ts
  ● multiplayer client › U4 settles only the answered lobby intent before notifying listeners
    expect(received).toEqual(expected)
    Expected: Any<String>
    Received: undefined
      at Object.toEqual (src/lib/multiplayer/__tests__/client.test.ts:176:22)

FAIL unit src/types/multiplayer/__tests__/Protocol.test.ts
  ● Protocol envelope schemas › U4 preserves optional lobby correlation and accepts legacy frames
    expect(received).toEqual(expected)
    - Expected  - 1
    + Received  + 0
      @@ -1,8 +1,7 @@
        Object {
          "hostPlayerId": "p1",
    -     "intentId": "ready-origin",
          ...
      at Object.toEqual (src/types/multiplayer/__tests__/Protocol.test.ts:44:51)
Test Suites: 2 failed, 2 total
Tests:       2 failed, 61 skipped, 63 total
```

I then reverted with `git checkout -- src/types/multiplayer/Protocol.ts` and
confirmed `git status` clean and all 93 tests green again (see Section G).
`Protocol.test.ts` directly asserts the parsed frame keeps `intentId`
(`expect(ServerMessageSchema.parse(correlated)).toEqual(correlated)` at
`Protocol.test.ts:44`), and `client.test.ts` transitively depends on the
same schema behavior. **Verdict on B: confirmed, both empirically and by
reading the injection path — this is a genuine red-first client test.**

## C. Server stamping

`src/lib/multiplayer/server/ServerMatchHostLobbyIntents.ts`, all four frames
built inside `handleLobbyIntent` now carry `intentId: envelope.intentId`:

- `:153` `AUTH_REJECTED` refusal (host-only intent from non-host).
- `:180` `INVALID_INTENT` refusal (handler throw, e.g. unknown slotId).
- `:204` `STORE_FAILURE` refusal (`store.updateMatchMeta` rejects).
- `:213` the success `LobbyUpdated` — stamped exactly once, on the one
  update this function ever builds and broadcasts per invocation
  (`:220-221`, single `ctx.broadcast(update); out.push(update);`).

One path is **not** stamped: `handleForfeitMatch` (`:226-278`), reached via
the early `if (intent.kind === 'ForfeitMatch') return
handleForfeitMatch(ctx, meta);` at `:160-162`. Its two `Error` frames
(`:242-251` engine-refusal, `:258-267` store-append-failure) carry no
`intentId`, and this function is untouched by the diff (confirmed — `git
diff` for this file shows only the four `+intentId` lines listed above).

This gap **is** recorded as a non-claim in the local receipt: `u4-local-
20260917.json` → `findingsReportedNotFixed[0]` (id `U4-F1`): *"handleForfeit-
Match engine refusal/store failure Error frames and its event correlation
are outside the three scoped lobby refusal constructions; left
unchanged."*, and independently flagged pre-implementation in
`u4-admission-20260917.json` → `risksForTheParent[2]`. This matches the
charter's stated scope (three lobby refusal codes + the one success frame),
not a missed requirement. Non-blocking observation below.

**Verdict on C: confirmed for all three scoped refusal codes and the single
success frame; the one unstamped path is honestly disclosed, not hidden.**

## D. Settlement ordering

`client.ts:413-418`:

```ts
LobbyUpdated: ({ message, state, emit }) => {
  settlePendingIntent(
    state,
    (message as Extract<IServerMessage, { kind: 'LobbyUpdated' }>).intentId,
  );
  emit('event', message);
},
```

Settle happens before `emit`, matching the client test's
`pendingAtNotification` capture inside the `'event'` listener (asserted
`[0]`, i.e. already-settled by the time the listener fires).

`settlePendingIntent` (`client.ts:1381-1384`):

```ts
function settlePendingIntent(state: IClientState, intentId: unknown): void {
  if (typeof intentId !== 'string') return;
  state.pendingIntents.delete(intentId);
}
```

`Map.delete` on an absent key is a documented no-op, and the guard means an
`undefined`/non-string `intentId` (e.g. the join-time replay snapshot from
A, or a legacy frame) never touches the map. The `Error` handler
(`client.ts:389-394`) calls the same function with `error.intentId`.
Because the server only ever answers one envelope with exactly one terminal
frame — either the success `LobbyUpdated` or one `Error` (`return [err]`
short-circuits before reaching the update, `ServerMatchHostLobbyIntents.ts:
156-158,183-185,207-209`) — the two call sites can never both fire for the
same `intentId`, so there is no double-settle race to construct here; the
idempotent `delete` is defense-in-depth, not something the design relies on
for correctness.

The `client.test.ts` sequence (lines ~186-190) injects an id-less
`LobbyUpdated`, then one carrying `intentId: 'another-player-intent'` (never
minted by this client, so never in `pendingIntents`), and asserts
`pendingIntentCount` stays `1` throughout — confirmed by reading the map:
`delete` on a key that was never `set` is a no-op, count unaffected.

**Verdict on D: confirmed — no double-settle path exists by construction,
and the "another player's intent" case is a correct no-op via the existing
Map semantics.**

## E. Caps and paths

`git diff --numstat c0d621e88..bf066c7c5`:

```
51  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u4-admission-20260917.json
201 0  openspec/planning/2026-09-12-roadmap-completion/evidence/u4-local-20260917.json
18  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u4-red-20260917.json
49  0  src/lib/multiplayer/__tests__/client.test.ts                (test)
7   3  src/lib/multiplayer/client.ts                                (product)
4   0  src/lib/multiplayer/server/ServerMatchHostLobbyIntents.ts    (product)
72  0  src/lib/multiplayer/server/__tests__/lobbyIntents.test.ts    (test)
1   0  src/types/multiplayer/Protocol.ts                            (product)
21  0  src/types/multiplayer/__tests__/Protocol.test.ts             (test)
```

Product under `src` excluding `__tests__`: 12 added / 3 deleted = 15 lines
across 3 files. Test under `src/**/__tests__`: 142 added / 0 deleted across
3 files. Both figures match `u4-local-20260917.json`'s own `totals`
(`productAdded: 12, productDeleted: 3, testAdded: 142, testDeleted: 0`) —
the receipt's self-reported counts are accurate. Total changed files: 9
(6 src + 3 evidence), total changed lines: 157 src + 270 evidence = 427,
both under the unit's caps (`maxFiles: 15, maxNonGeneratedLines: 500`, from
`units.json` → U4 → `caps`).

Path ownership: `roadmap.json`'s `R2.combat` node lists
`ownershipPaths: ["src/lib", "src/services", "src/engine", "e2e",
"openspec/changes/enable-saved-custom-unit-combat"]`. `src/types/multiplayer/
Protocol.ts` and its test do not fall under any of those literal prefixes —
confirmed, `src/types` is not `src/lib`. Separately, `units.json`'s own `U4`
entry lists `"ownershipPaths": ["src/lib"]` and carries a
`"reownedNote": "R2.combat owns the exact string src/lib, which covers
src/lib/multiplayer/client.ts, src/lib/multiplayer/server/
ServerMatchHostLobbyIntents.ts and src/types/multiplayer/Protocol.ts
(council B)"` — that note's claim that the string `"src/lib"` "covers"
`src/types/multiplayer/Protocol.ts` does not hold as a literal path-prefix
reading; it reads as a fold/re-scoping decision (attributed to "council B")
rather than a description of what `"src/lib"` textually matches. I am not
asked to approve the fold, per the brief, so I'm not blocking on it, but the
mismatch between the literal ownership string and the note's claim about it
is worth the parent's attention when reconciling the ledger.

**Verdict on E: confirmed — the range touches `src/types/multiplayer`,
which is outside `R2.combat`'s listed `ownershipPaths`; the fold is on
record but its own justification text overstates what the literal path
string covers.**

## F. Mutants

Three mutants in `u4-local-20260917.json`, each targeting a distinct
behavior and each killed by a test present on this head:

1. **M1** — "Server success stamps `crypto.randomUUID()` instead of
   `envelope.intentId`". Killed by `lobbyIntents.test.ts` → `'U4 broadcasts
   the originating SetReady intentId'`, assertion `expect(frames).
   toContainEqual(expect.objectContaining({ kind: 'LobbyUpdated', intentId:
   envelope.intentId }))`. This is a distinct behavior from M3 (it tests
   that the *value* stamped is the originating id, not merely that *some*
   id is present).
2. **M2** — "Client emits `LobbyUpdated` before settling" (an ordering
   swap). Killed by `client.test.ts` → `'U4 settles only the answered lobby
   intent before notifying listeners'`, assertion
   `expect(pendingAtNotification).toEqual([0])` — this specifically catches
   ordering, independent of whether settlement eventually happens at all.
3. **M3** — "Lobby `INVALID_INTENT` Error omits `intentId`". Killed by the
   parametrized `lobbyIntents.test.ts` → `'U4 correlates the lobby
   %s refusal'` (`it.each(['AUTH_REJECTED', 'INVALID_INTENT',
   'STORE_FAILURE'])`), assertion `expect(frames).toEqual([expect.
   objectContaining({ kind: 'Error', code, intentId: envelope.intentId
   })])`. Distinct from M1: this is the refusal path, not the success path.

All three mutant `output` blocks in the receipt show the actual failing
jest output with file:line pointing at the real assertions in the committed
test files (cross-checked against the diffs in sections B–D above — the
line numbers and expected/received shapes match). I re-ran the full
red→green cycle for the schema mutation independently in section B rather
than trusting the receipt alone.

AI attribution: `git log -1 --format=%B bf066c7c5` and `git diff` scanned
for `co-authored|claude|anthropic|gpt|codex|openai|generated by`. The
commit message trailer has no attribution line. The only hits are inside
the evidence JSON's own metadata fields (`"branch":
"codex/roadmap-u4-pending-intent-20260917"`, `"implementerModel": "codex
gpt-6 (...)"`) — these are provenance/audit fields on a receipt document,
not commit or PR attribution lines, and are consistent with every other
unit's evidence file in this program.

Secrets / absolute machine paths: `git diff` on the three product files
grepped for `C:\\|/home/|/Users/|api[_-]?key|secret|password|token\s*=` —
no matches.

**Verdict on F: confirmed — three distinct, genuinely-killed mutants; no
attribution lines, no secrets, no absolute machine paths in product code.**

## G. Commands run and last output lines

All from `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/
worktrees/u4-review`, Node v22.22.0.

```
npx tsc --noEmit -p tsconfig.json
  (no output — exit 0)

npx oxfmt --check src/lib/multiplayer/client.ts src/lib/multiplayer/server/ServerMatchHostLobbyIntents.ts src/types/multiplayer/Protocol.ts src/lib/multiplayer/__tests__/client.test.ts src/lib/multiplayer/server/__tests__/lobbyIntents.test.ts src/types/multiplayer/__tests__/Protocol.test.ts
  All matched files use the correct format.
  Finished in 46ms on 6 files using 16 threads.

npx oxlint src/lib/multiplayer/client.ts src/lib/multiplayer/server/ServerMatchHostLobbyIntents.ts src/types/multiplayer/Protocol.ts src/lib/multiplayer/__tests__/client.test.ts src/lib/multiplayer/server/__tests__/lobbyIntents.test.ts src/types/multiplayer/__tests__/Protocol.test.ts
  Found 2 warnings and 0 errors. (pre-existing max-lines on Protocol.ts and client.ts, both present before this change)
  Finished in 23ms on 3 files using 16 threads.

npx jest --selectProjects unit --runInBand --runTestsByPath src/lib/multiplayer/__tests__/client.test.ts src/lib/multiplayer/server/__tests__/lobbyIntents.test.ts src/types/multiplayer/__tests__/Protocol.test.ts src/lib/multiplayer/__tests__/clientDeliveryGap.test.ts
  Test Suites: 4 passed, 4 total
  Tests:       93 passed, 93 total
  Ran all test suites within paths [...]

node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs
  ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows

--- mutation check (section B), then reverted ---
(deleted Protocol.ts:868, re-ran the two affected suites)
  Test Suites: 2 failed, 2 total
  Tests:       2 failed, 61 skipped, 63 total
git checkout -- src/types/multiplayer/Protocol.ts
git status
  nothing to commit, working tree clean

--- re-verify after revert ---
npx jest --selectProjects unit --runInBand --runTestsByPath src/lib/multiplayer/__tests__/client.test.ts src/lib/multiplayer/server/__tests__/lobbyIntents.test.ts src/types/multiplayer/__tests__/Protocol.test.ts src/lib/multiplayer/__tests__/clientDeliveryGap.test.ts
  Test Suites: 4 passed, 4 total
  Tests:       93 passed, 93 total
```

All results match the committed `u4-local-20260917.json` receipt exactly
(same pass counts, same lint warnings, same roadmap validator line).

## Non-blocking observations

1. `handleForfeitMatch`'s two `Error` frames (`ServerMatchHostLobbyIntents.
   ts:242-251, 258-267`) still don't carry `intentId`. Already logged as
   `U4-F1` in the local receipt's `findingsReportedNotFixed` and as a risk
   in the admission receipt — not a silent gap, just flagging it's still
   open for whoever picks up the client-side "forfeit never settles either"
   case, if that's ever reported.
2. The `units.json` U4 `reownedNote`'s claim that the ownership string
   `"src/lib"` "covers" `src/types/multiplayer/Protocol.ts` is not literally
   true as a path-prefix statement (see section E) — worth tightening the
   wording when the ledger fold is recorded, even though the fold itself is
   out of scope for this review.
3. Pre-existing `eslint(max-lines)` warnings on `Protocol.ts` (605 lines,
   limit 400) and `client.ts` (957 lines, limit 400) are untouched by this
   diff (both files were already over the limit before `bf066c7c5`) and are
   logged as `U4-F2` in the local receipt — not introduced by this change,
   not a reason to block it.

## Cleanup

```
cmd //c "rmdir E:\Projects\MekStation\.sisyphus\roadmap-completion-20260912\worktrees\u4-review\node_modules"
git -C E:/Projects/MekStation worktree remove --force E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u4-review
```

Both completed without error; worktree removed.
