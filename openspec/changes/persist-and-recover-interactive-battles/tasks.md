# Tasks: Persist and Recover In-Progress Interactive Battles

## 1. Investigation and red-first evidence

- [ ] 1.1 Trace the persistence loop end-to-end and record findings in the PR
  description: confirm the write side fires (`InteractiveSession.appendAndPersistEvent`
  → `persistMatchLogEvent` → `matchLogStorage.appendEvent`,
  `src/engine/InteractiveSession.ts:664-677`) and that the client read factory
  exists (`InteractiveSession.fromMatchLog` →
  `hydrateSessionFromMatchLog`, `src/engine/InteractiveSession.persistence.ts:20-39`)
  but is never called from `loadSessionLogic`
  (`src/stores/useGameplayStore.session.ts:98-124`).
- [ ] 1.2 Write a red-first reproduction test: launch an interactive session over
  a mock IndexedDB (`src/__tests__/mocks/storage/MockIndexedDB.ts`), append a few
  events, construct a FRESH gameplay store (no in-memory session) backed by the
  same match-log store, call `loadSession(matchId)`, and assert that TODAY it sets
  `state.error === 'Session not found'` (proving C-9 is observable before the fix).
- [ ] 1.3 Confirm whether `fromMatchLog` returns a data `IGameSession` vs a live
  `InteractiveSession`, and document that the client recover must compose
  `fromSessionAsync` (the client analog of
  `MatchRecovery.rebuildSessionFromEvents`, `src/lib/multiplayer/server/MatchRecovery.ts:80-86`)
  to produce a drivable instance — resolves design D1 step 2.

## 2. Client recover entry point

- [ ] 2.1 Add (or compose from existing factories) a single client-facing
  `recoverInteractiveSession(matchId, storage?)` in `src/engine/InteractiveSession.persistence.ts`
  (or `InteractiveSession.ts`) that reads the log via `getEventsForMatch`,
  rebuilds via `hydrateGameSessionFromEvents` + `InteractiveSession.fromSessionAsync`,
  and returns a live, drivable `InteractiveSession` — reusing the exact sequence
  `rebuildSessionFromEvents` uses server-side.
- [ ] 2.2 Make the helper classify failures: throw a distinct corrupt-log error
  when the log is non-empty but missing `GameCreated` / unrebuildable, and signal
  "not found" (empty log) separately from "corrupt", per design D3.
- [ ] 2.3 Unit-test `recoverInteractiveSession`: (a) happy path returns a drivable
  session whose `currentState` deep-equals the source; (b) empty log → not-found
  signal; (c) corrupt log → corrupt error; (d) `MatchLogStorageUnavailableError`
  propagates as a graceful non-crash (risk R1).

## 3. Wire recovery into the load path

- [ ] 3.1 In `loadSessionLogic` (`src/stores/useGameplayStore.session.ts`),
  preserve the in-memory idempotency fast-path (lines 104-109) and the `'demo'`
  fast-path, then for any other id call `recoverInteractiveSession(id)` and adopt
  the result through the existing `setInteractiveSessionLogic` path so the
  recovered match reaches the same store shape as a launched one (design D1, R4).
- [ ] 3.2 Replace the blanket `throw new Error('Session not found')` with the
  recoverability-aware errors from task 2.2: a precise "match not found or already
  cleared" for empty-log, a distinct corrupt-log error for unrebuildable logs, and
  NO demo fallback on corrupt (design D3).
- [ ] 3.3 Thread the recover dependency through `loadSession` in
  `src/stores/useGameplayStore.ts:303-304` (mirror the existing `loadDemo`
  injection) so the store stays testable with an injected mock storage.

## 4. Guarantee recoverability at launch

- [ ] 4.1 In `usePreBattleLaunch` (`src/components/gameplay/pages/preBattle/usePreBattleLaunch.ts`,
  interactive branch ~line 147-156), after `setInteractiveSession` and before
  `router.push`, `await flushMatchLogWrites()` and `upsertMatchMetadata({matchId,
  status})` so the post-navigation hydrate is guaranteed to find at least
  `GameCreated` (design D4, risk R3).
- [ ] 4.2 Add a launch test asserting that immediately after the interactive
  launch handshake, `getEventsForMatch(session.id)` returns a non-empty log
  beginning with `GameCreated`.

## 5. Refresh-loss warning safety net

- [ ] 5.1 Register a `beforeunload` guard (in `useGameplayStore.ts` wiring or a
  dedicated hook mounted by the gameplay page) that warns the player whenever an
  interactive `InteractiveSession` is the active store session and the match is
  not `Completed`, reusing the established `useGameStatePersistence` beforeunload
  pattern (design D5).
- [ ] 5.2 Test the guard: active interactive session → handler registered and
  returns a warning string; demo/spectator/completed session or no session →
  handler not registered (or no-op).

## 6. Recover round-trip and persistence-contract enforcement

- [ ] 6.1 Create `src/stores/__tests__/useGameplayStore.recover.test.ts` (or a
  sibling engine test): launch interactive session → append movement/attack events
  → simulate reload (new store + new IndexedDB-backed handle over the same mock
  data) → `loadSession(matchId)` → assert recovered `currentState` deep-equals the
  pre-reload `currentState` AND the recovered session accepts a subsequent
  move/attack (drivable, per R2).
- [ ] 6.2 Add the not-found and corrupt-log cases to the same suite: unknown id →
  precise not-found error in `state.error`; corrupt log → corrupt error with no
  demo fallback.

## 7. Verification and documentation

- [ ] 7.1 Full verification: `npx tsc --noEmit --skipLibCheck`, lint, affected Jest
  suites (gameplay-store, InteractiveSession persistence, matchLogStorage,
  usePreBattleLaunch), and the new recover round-trip suite green.
- [ ] 7.2 Run `npx openspec validate persist-and-recover-interactive-battles --strict`
  and confirm it prints valid.
- [ ] 7.3 Update the C-9 row in `docs/audits/2026-06-12-full-codebase-review.md`
  remediation mapping: session-lost-on-refresh closed — client load path wired to
  the existing match-log recover, launch made recoverable, refresh warning added.
