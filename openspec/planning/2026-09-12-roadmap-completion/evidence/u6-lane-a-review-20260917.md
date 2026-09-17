# Lane A review: U6
reviewedHead: 72abfd70e251c4d362a3a30bf97159b158b3c9d9
baseline: 9913f06e775b90cff8633ce3798b942f0536a2eb
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Range reviewed

`c0d621e88..72abfd70e` (single commit `72abfd70e`, PR #1803, branch
`codex/roadmap-u6-e2e-16-diagnosis-20260917`). Files touched (`git diff
--name-status c0d621e88..72abfd70e`):

```
M	e2e/gm-two-player-token.pack.spec.ts
M	openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md
A	openspec/planning/2026-09-12-roadmap-completion/evidence/u6-admission-20260917.json
A	openspec/planning/2026-09-12-roadmap-completion/evidence/u6-local-20260917.json
A	openspec/planning/2026-09-12-roadmap-completion/evidence/u6-red-20260917.json
```

`git diff --numstat c0d621e88..72abfd70e`: `19/7` (e2e spec), `2/0`
(tasks.md), plus the three new evidence files (94/113/187 lines). No
`src/` file appears in the diff (`git diff --name-only ... | grep -c
'^src/'` → `0`).

---

## A. Does the repaired row still assert everything E2E-16's letter requires?

Yes. Diff of `e2e/gm-two-player-token.pack.spec.ts`:

```diff
   const socketUrls: string[] = [];
+  const guestSocketUrls: string[] = [];
   const requestUrls: string[] = [];
   await Promise.all([
     observeSocketAndRequestUrls(hostPage, socketUrls, requestUrls),
-    observeSocketAndRequestUrls(guestPage, socketUrls, requestUrls),
+    observeSocketAndRequestUrls(guestPage, guestSocketUrls, requestUrls),
   ]);
@@
-    assertNoBearerInUrls([...socketUrls, ...requestUrls], [shortToken.token]);
+    assertNoBearerInUrls(
+      [...socketUrls, ...guestSocketUrls, ...requestUrls],
+      [shortToken.token],
+    );
@@
-    const socketCountBeforeStaleReload = socketUrls.length;
+    const socketCountBeforeStaleReload = guestSocketUrls.length;
     await guestPage.reload({ waitUntil: 'domcontentloaded' });
+    await expect
+      .poll(() => guestSocketUrls.length, { timeout: 90_000 })
+      .toBeGreaterThan(socketCountBeforeStaleReload);
     await expect(
       guestPage.getByRole('heading', { name: 'Unlock vault' }),
     ).toBeVisible({ timeout: 90_000 });
-    expect(socketUrls.length).toBeGreaterThan(socketCountBeforeStaleReload);
+    expect(guestSocketUrls.length).toBeGreaterThan(
+      socketCountBeforeStaleReload,
+    );
@@
     assertNoBearerInUrls(
-      [...socketUrls, ...requestUrls],
+      [...socketUrls, ...guestSocketUrls, ...requestUrls],
       [shortToken.token, remintedToken.token],
     );
```

(`e2e/gm-two-player-token.pack.spec.ts:163-181, 258-296, 330-333`.)

No assertion was removed or weakened, and none was moved *after* a wait
in a way that could mask a failure — the opposite happened: a new
`expect.poll` on the guest redial count was inserted **before** the
`Unlock vault` heading check, tightening the row rather than loosening
it. The original single `expect(socketUrls.length).toBeGreaterThan(...)`
placed after the heading-visible wait is still present verbatim at the
end (now against `guestSocketUrls`), so no coverage was dropped, only
added to.

Every pre-existing letter assertion is untouched and still present:
membership (`guestSeatBeforeExpiry?.occupant?.playerId`), role
(`guestSideBeforeExpiry`/`guestSideAfterReauth`), the reminted-token
principal (`remintedToken.playerId`), the single-membership-row check
(`.toHaveLength(1)`), and both `assertNoBearerInUrls` sweeps. Both
`assertNoBearerInUrls` call sites now explicitly union `socketUrls`
(host), `guestSocketUrls` (guest), and `requestUrls` — the sweep covers
host, guest, and request URLs at both checkpoints (pre-expiry and
post-reauth), which is a **superset** of the pre-fix coverage (pre-fix,
host+guest sockets were pushed into one shared array, so the union was
already complete but not separately attributable).

## B. Is the new guest-only capture correct?

`e2e/helpers/tokenPackUrlSweep.ts:8-25` — `observeSocketAndRequestUrls`
calls `page.on('request', ...)` synchronously and returns
`page.routeWebSocket(...)`, filtered to `url.pathname ===
'/api/multiplayer/socket'`. In the test, both calls are made inside a
single `await Promise.all([...])` immediately after `hostPage` and
`guestPage` are created (`e2e/gm-two-player-token.pack.spec.ts:161-181`)
and **before** either page's first `.goto('/multiplayer')`
(`:172, :208`). So `routeWebSocket` is installed on `guestPage` before
its first navigation, and it only ever appends to the array passed for
that page — `guestSocketUrls` for `guestPage`, `socketUrls` for
`hostPage`. These are two independent Playwright route registrations on
two independent `Page` objects; a host reconnect dials through
`hostPage`'s own WebSocket client and can only be captured by
`hostPage`'s route (writing to `socketUrls`), never to
`guestSocketUrls`. A host reconnect therefore cannot satisfy
`expect.poll(() => guestSocketUrls.length, ...)`. Confirmed correct.

## C. Is the diagnosis consistent with the code?

Consistent, confirmed by direct code reading (no live run performed by
this review, per the setup constraints — builds/Playwright were not
run):

- `src/pages/multiplayer/lobby/[roomCode].tsx`: `tokenState` starts as
  `useState<MultiplayerTokenState | null>(null)` (`:255-257`).
  Restoration from `sessionStorage` happens in a `useEffect`
  (`:262-266`), which by React's contract runs only **after** the first
  commit/render. Render logic (`:328-346`) returns `LobbyAuthPrompt`
  (the `Unlock vault` heading, `:145`) whenever `!tokenState` — so on a
  hard reload the very first paint renders the vault heading, before
  the restoration effect has run. Once the effect restores the token
  and calls `setTokenState`, the render falls through to
  `LobbyJoiningState` (session not yet connected, `:352`) — not the
  vault heading — while `useMultiplayerSession`'s own effect (keyed off
  `auth`) opens the actual socket. `isTerminalStaleCredentialRejection`
  (`:241-248`) only returns true once `session.closedInfo?.code ===
  'RECONNECT_LIMIT'` **and** the restored token's `expiresAt` is
  already past; the effect at `:294-300` then calls
  `clearMultiplayerTokenCredential(roomCode)` and `setTokenState(null)`,
  which is what produces the second, terminal `Unlock vault` render.
  This is exactly "vault heading (transient, pre-restoration), then
  redials, then terminal credential clear and vault heading again."
- `src/lib/multiplayer/client.ts:1165-1195` (`scheduleReconnect`):
  `maxAttempts = runtime.options.maxReconnectAttempts` (`2` as passed at
  `[roomCode].tsx:294`); each attempt calls `openSocket(runtime)` after
  backoff, and once `nextAttempt > maxAttempts` it sets
  `closedByCaller = true` and emits `{ code: 'RECONNECT_LIMIT', ... }`.
  This is the mechanism that produces the "three rejected stale dials"
  (initial dial + 2 reconnect attempts) named in the tasks.md PROGRESS
  line and in the red receipt's timeline.
- The red receipt's own timeline
  (`openspec/planning/2026-09-12-roadmap-completion/evidence/u6-red-20260917.json`,
  `timeline` array) is internally consistent with this: `vault-heading-
  visible` fires at `socketCount:2` (the same count as immediately after
  reload, i.e. before any redial), followed by `read-credential`/
  `write-credential` (restore), three `socket-constructor`/`websocket-
  error`("HTTP Authentication failed")/`socket-close` cycles, then a
  `write-credential` with `present:false` (the clear), and finally
  `settled-after-assertion` at `socketCount:5, vaultVisible:true`.

I can confirm the sequence "vault heading (pre-restoration), then
rejected stale dials, then credential cleared" from the code alone
(React effect ordering plus the reconnect/terminal-rejection logic
above); the receipt's live timeline is corroborating but I did not
independently re-run it in this review.

## D. Mutants

- **M1 (survived, claimed equivalent for this row)** — remove the
  expired-token rejection from `src/lib/multiplayer/server/auth.ts`'s
  `verifyPlayerToken` (`:158-163`, the `expiresMs <= nowMs` branch). This
  function is used by `issuePlayerToken.ts` and the `auth.test.ts`/
  `socketTokenScope.test.ts` suites; it is **not** the function that
  gates the WebSocket upgrade this test exercises. `server.js` (the
  custom production server) has its own standalone,
  independently-implemented `verifyWireToken` (`server.js:308-320`) with
  the same expiry check (`if (expiresMs <= nowMs) return { ok: false,
  reason: 'expired' };`, `server.js:320`) used at the socket-upgrade
  boundary. So mutating `auth.ts`'s check does not touch the code path
  this row's socket dials traverse, and the row's outcome is genuinely
  unaffected — the equivalence claim ("server.js:320 independently
  rejected all three expired upgrades... did not exercise acceptance at
  the upgrade boundary") is accurate and correctly scoped to this row
  (it is not a claim that `verifyPlayerToken`'s expiry check is dead
  code globally, only that this row's upgrade path never reaches it).
- **M2 (caught)** — clear an expired restored token before dialing in
  `[roomCode].tsx`. This is caught specifically by the **new** assertion
  this diff introduces (`expect.poll(() => guestSocketUrls.length, ...)
  .toBeGreaterThan(...)` at `token.pack.spec.ts:277-279`) — if the
  client pre-emptively drops the stale token instead of attempting a
  redial, no socket dial happens and the poll times out. This is a
  distinct, meaningful behaviour this row did not previously guard
  against with this precision (the old row measured the same
  `socketUrls` array shared between host and guest, so a purely-guest
  redial regression could be masked by host traffic; the new row cannot
  be).
- **M3 (caught)** — put the wire token in the query string on an
  expired-token dial, in `client.ts`. Caught by
  `assertNoBearerInUrls`'s `url.searchParams.has('token')` check
  (`tokenPackUrlSweep.ts:36`), invoked from the final sweep at
  `token.pack.spec.ts:330-333`, which now includes `guestSocketUrls` in
  its input union. Distinct from M2/M4 (URL-bearer leak vs. redial
  absence vs. terminal-prompt suppression).
- **M4 (caught)** — disable terminal stale-credential recognition after
  reconnect exhaustion, in `[roomCode].tsx` (i.e. break
  `isTerminalStaleCredentialRejection` or its clearing effect). Caught
  by the `Unlock vault` heading-visible assertion
  (`token.pack.spec.ts:288-290`) timing out, since the credential is
  never cleared and the page never re-renders the vault prompt.

M2, M3, and M4 are three distinct behaviours (redial suppression,
URL-bearer leak, terminal-prompt suppression) each caught by a
different, specific assertion. M1's equivalence argument is sound as
stated (scoped to "did not exercise acceptance at the upgrade
boundary" for this row), and I was able to verify the code-path
separation between `auth.ts::verifyPlayerToken` and
`server.js::verifyWireToken` directly.

## E. tasks.md annotations

Confirmed via `git show 72abfd70e:.../tasks.md | sed -n '488,497p'`: two
lines were added — a `PROGRESS (2026-09-17, U6): ...` line immediately
under the (still-unchecked) `- [ ] 21.1 ...` item, and a
`NOTE (2026-09-17, U6; council finding FN-genesis-branch-row-is-a-
mirror-side-effect): ...` line immediately under the pre-existing
`DECISION D2 + PROGRESS (2026-09-03, ...)` bullet. No `- [ ]`/`- [x]`
text was touched (`git diff` shows only `+` lines added at those two
spots, no `-` on any checkbox line).

The NOTE's citation,
`openspec/council-decisions/2026-09-17-post-loop-recommendations.md,
section C`, resolves: the file exists on the head and contains
`### C. Genesis clauses: disclosure the owner should demand`, whose body
states "the campaign genesis branch row never comes from the campaign
genesis path; it appears only when the drive's own `AdvancePhase` match
commit fires the stream-agnostic backfill... with combat-journal mode
`off`, neither condition is met" — this is the same claim the NOTE
paraphrases ("the genesis branch row is a match-journal mirror side
effect gated on the combat-journal mode"). The finding id
`FN-genesis-branch-row-is-a-mirror-side-effect` does not appear
verbatim in the council doc (it names the disclosure inline in prose,
not as a tagged finding id), but the substance matches exactly; this is
not a broken or fabricated citation.

## F. Caps, hygiene, gates

- **Product line caps**: e2e spec `+19/-7` (`git diff --numstat`);
  tasks.md `+2/-0`. Combined tracked product-line delta = 28, against
  the 500-line cap — well within.
- **File cap**: 5 files touched, against the 15-file cap.
- **Review class routine**: yes — a single test file's assertion
  reorder/split plus two documentation annotations plus three new
  evidence receipts; no scope creep.
- **No `src/` change**: confirmed (`git diff --name-only ... | grep -c
  '^src/'` → `0`).
- **No AI attribution**: `git log -1 --format='%B' 72abfd70e` and a
  grep of both product files for `claude|anthropic|co-authored|generated
  by` returned nothing; author/committer is `Wes Rollings
  <wrollings@gmail.com>`.
- **No secrets / absolute machine paths in product files**: grepped
  `e2e/gm-two-player-token.pack.spec.ts` and `tasks.md` for
  `secret|api[_-]?key|E:\\|C:\\` — no matches. (The three new evidence
  JSON files do contain a Windows absolute worktree path in a
  `"worktree"` field and machine-local timestamps/PIDs, but these are
  receipts under `openspec/planning/.../evidence/`, not product code,
  and every other reviewed U-unit receipt in this roadmap loop follows
  the same convention.)

Commands run from inside the review worktree
(`E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u6-review`,
checked out at `72abfd70e`, `node_modules` junctioned from the root
checkout, no install/build/Playwright run):

```
$ npx tsc --noEmit -p tsconfig.json
(no output, exit 0)

$ npx oxfmt --check e2e/gm-two-player-token.pack.spec.ts
Checking formatting...
All matched files use the correct format.
Finished in 22ms on 1 files using 16 threads.
(exit 0)

$ npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts --runInBand
...
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Ran all test suites matching /scripts\__tests__\gm-two-player-campaign-qc.test.ts/i.
(exit 0)

$ node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs
ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows
(exit 0)
```

All four gates pass.

## Non-blocking observations

1. The u6-local receipt's `lineCounts.trackedAdded: 21 / trackedDeleted:
   7` at first glance looks off from `git diff --numstat`'s `19/7` for
   the e2e spec alone, but it reconciles exactly once tasks.md's `+2/-0`
   is folded in (19+2=21, 7+0=7) — not an error, just worth noting for
   whoever reads the receipt cold.
2. M1's equivalence write-up is scoped correctly ("did not exercise
   acceptance at the upgrade boundary") but a reader skimming only the
   tasks.md PROGRESS line ("a fourth mutation of the TypeScript verifier
   survived because server.js independently refused the expired
   upgrades") could over-read this as "the TS verifier's expiry check is
   dead code" globally — it is only unreached from *this* row's socket
   upgrade path, not necessarily elsewhere (e.g. `auth.test.ts` and
   `socketTokenScope.test.ts` exercise it directly). Not a defect in
   this change; a documentation nuance to be careful about if it's later
   cited by another lane.
3. This review did not execute a live browser/Playwright run (excluded
   by the setup constraints given), so C's "vault heading, then rejected
   redials, then credential cleared" conclusion rests on static code
   reading plus the committed red receipt's timeline, not an independent
   fresh run. I'm confident in the static analysis (React effect
   ordering + `scheduleReconnect`'s attempt-then-limit structure
   unambiguously produce this sequence), but flagging the boundary of
   what was and wasn't independently re-executed.
