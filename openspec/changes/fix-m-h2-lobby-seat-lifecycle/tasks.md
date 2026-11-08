## Implementation

- [x] 1. Record baseline replay proof and failing lifecycle regressions.
- [x] 2. Share intent classification and enforce lobby/recovery status policy.
- [x] 3. Remove detached spectators through the serialized host queue; preserve reattachments and viewer cursors.
- [x] 4. Reject spectator-to-AI conversion and reuse vacant spectator slot ids safely.
- [x] 5. Document policy and re-anchor dispatcher citations by content.

## Verification

- [x] 6. Kill status-gate and spectator-removal mutants separately and record the tests.
- [x] 7. Run full affected directories, integration, combat, replay, typecheck, lint, formatting, unit lint and CI budgets.

Delivery is one draft PR with deferred follow-ups. Root owns hosted CI and merge.

## Evidence (2026-11-08)

- Unchanged-code replay/digest/golden selection: 73 suites, 1,039 tests passed.
- Red-first host/pure-rule regressions: 23 failures, 89 passing tests. SQLite
  reopen regression separately failed on retained spectator membership; REST
  capacity regression separately failed after detach.
- Initial focused green: 8 suites, 122 tests passed, including durable cursor
  and acknowledgement retention, re-registration, queue ordering and reattachment
  during the removal metadata read. Heartbeat and wrong-slot coverage were added
  before the full directory gates.
- Status mutant: replaced `lobbyIntentAllowedInStatus` with unconditional
  acceptance. Killed by `ServerMatchHost lobby intents > active status gate >
  rejects SetAiSlot without changing metadata or events` (1 failure).
- Removal mutant, run separately: replaced `removeSpectatorSeat` with a copy of
  the existing seats. Killed by `ServerMatchHost spectator connection > removes
  a spectator after the last detach and preserves playing membership` (1 failure).
  Both original implementations were restored before full gates.
- Both TypeScript configs passed. Root lint: 63 warnings, 0 errors. Unit lint:
  17,077 findings against the existing 17,085 ceiling; no ceiling changes.
- CI budgets: 3,048 files, 57 unkeyable tests, 91 repo-wide keys; passed without
  changing the 57-test budget.
- Final replay/digest/golden selection: 73 suites, 1,039 tests passed again;
  no committed fixtures or digests changed. Full runner directory: 151 suites,
  1,484 tests passed. `npm run validate:combat` passed, including its 79 suites /
  2,095 tests and zero unresolved inventory rows. Strict OpenSpec validation:
  248 items passed. Repository-wide formatting passed.
- The full multiplayer/integration/API run exposed one old rebuild-admission
  test that expected SetReady to succeed in active status. Its fixture now uses
  lobby status, preserving the existing assertion that an admissible readiness
  intent bypasses the engine rebuild gate. Final full server rerun after that
  correction: 180 suites passed, 1,681 tests passed, 3 existing skips. The first
  combined run covered 274 suites: 273 passed and that one fixture failed;
  all other multiplayer/client/P2P, integration, API (including spectate) and
  unit-lint suites passed (2,883 passing tests, 35 existing skips in that run).
- Tests use Node 22.22.0, matching CI and the installed SQLite native ABI. The
  first Node 24 baseline attempt hit an ABI mismatch and is not counted as proof.
