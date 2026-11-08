## Implementation

- [x] 1. Record failing regressions against the real y-webrtc provider (retry after leave, ghost retry after switching rooms, rebuild on retry, error-vs-reconnecting) and the store invariants.
- [x] 2. Mark intentional teardown, cancel the pending retry on destroy, reuse the room on retry, emit `reconnecting`.
- [x] 3. Store: keep the room while reconnecting, ignore `connected` without a matching room, leave without depending on the store's room.
- [x] 4. Toast and connection-indicator copy for Reconnecting.

## Verification

- [x] 5. Kill each mutant separately and record the test that catches it.
- [x] 6. Run full affected directories, integration, typecheck, lint, formatting, unit lint and CI budgets.

Delivery is one draft PR. Root owns hosted CI and merge.

## Evidence (2026-11-08)

- Red run before the fix: 11 of 14 new tests failed. The leave test returned the
  revived `LEAVE1` room (on the default signaling servers, so the old retry also
  dropped custom `signalingServers`); retry events arrived as `error`; the store
  read Connected with no room.
- Contract: `yWebrtcContract.test.ts` drives the real `WebrtcProvider`
  (`signaling: []`, jsdom) and pins that `disconnect()` emits `status false`
  and `connect()` re-arms it. No mock of y-webrtc was needed; only y-indexeddb
  is stubbed.
- After the fix: 15 new tests green.
- Mutants, each applied alone and reverted: teardown not marked intentional
  (killed by 4), destroy not cancelling a pending retry (killed by 2), retry
  emitting `error` (killed by 2), store accepting `connected` without a room
  (killed by 2), store `leaveRoom` depending on its own room (killed by 1),
  store ignoring `reconnecting` (killed by 1), indicator label reverted
  (killed by 1). Retry rebuilding the room instead of reusing it aborts the jest
  worker (exit 134) rather than failing an assertion; the suite is red either way.
- Full directories on Node 22 (CI runtime; the shared better-sqlite3 build is
  ABI 127): `src/lib/p2p`, `src/components/sync`, `src/hooks`, `src/stores`,
  `src/__tests__/integration`: 203 suites, 2,705 passed, 32 skipped, 0 failed.
- `npm run typecheck` (both configs) clean. Root lint: 63 warnings, 0 errors.
  oxfmt check clean. Unit lint 17,082 of 17,085, no ceiling change; its Jest
  suite 33 passed. `node --test scripts/ci/*.test.mjs` 164 passed;
  budget-check: 57 unkeyable (budget unchanged).
- Not run locally: the Playwright `e2e/p2p-sync.spec.ts` and `/e2e/sync-test`
  page. They use the mock provider (`?mockSync=true`) or direct provider calls
  that this change keeps source-compatible; hosted CI runs them.
