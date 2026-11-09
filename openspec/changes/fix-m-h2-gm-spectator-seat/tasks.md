## Implementation

- [x] 1. Record failing GM-seat detach tests and predicate tests.
- [x] 2. Add the shared predicate and use it in `handleSocketDropped`.
- [x] 3. Pin the host-seat assumption with a handler-level test.
- [x] 4. Document the rule in TRANSPORT.md.

## Verification

- [x] 5. Kill the dropped-exemption and every-host-spectates mutants and record the tests.
- [x] 6. Run full affected directories, integration, typecheck, lint, formatting, unit lint, OpenSpec validation and CI budgets.

## Evidence (2026-11-09)

- Characterization first: a co-op GM seated in the spectator seat of an active
  match lost its seat and match membership when its last socket detached
  (membership lookup went from found to null) on origin/main.
- Red first: the three GM-seat host tests failed on the real symptom (the seat was
  gone) and the predicate tests on the missing function. The "host stays a campaign
  GM" test passes on old code only because the early return skipped migration; it
  now pins that migration is refused for a campaign GM.
- Refinement (Root): the exemption is automatic-cleanup only and grants no
  general immortality. The predicate (`isAutoReleasableSpectatorSeat`) is
  consulted by the last-socket detach (and later the boot sweep) and nothing else.
  A completed match releases the GM's seat on the next detach; `removeSpectatorSeat`
  and the other seat primitives are unchanged; explicit close (`DELETE` ->
  `host.closeMatch`) completes the match, closes the GM's socket and refuses a
  later bind as an unknown match. `closeMatch`, DELETE and prune never edit seats
  (the status flips, or the whole match row goes), so those paths are pinned as
  they behave today. The GM has no in-protocol way to vacate its own spectator
  seat: every intent from a spectator seat is rejected before lobby routing.
- Mutants, each killed: host exemption dropped (7 failures across the host,
  predicate and assumption tests), the completed-match rule removed so the
  exemption is unconditional (2), and every host seated as a spectator (the
  assumption pin).
- Full affected directories: 279 suites, 3039 tests passed, 35 existing skips.
- Both tsc configs passed. Root lint 62 warnings, 0 errors. Unit lint 17,080 of
  17,085, no ceiling change; its Jest suite passed. OpenSpec strict 322 of 322.
  `scripts/ci/budget-check.mjs` passed: 57 unkeyable of 57, 91 repo-wide of 93.
- Node v24.15.0, better-sqlite3 ABI 137.

Delivery is a small bug-fix PR ahead of the spectator boot sweep. Root owns hosted CI and merge.
