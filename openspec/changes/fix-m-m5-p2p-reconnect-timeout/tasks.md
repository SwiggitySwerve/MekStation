## Implementation

- [x] 1. Record failing regressions: silent host after the request, chunk restart, bad-chunk chain, wrong-match, unmount cleanup, sticky aborted.
- [x] 2. Arm, restart and clear the replay wait; share the host-pending path with the pre-request timeout.
- [x] 3. Log-and-continue `.catch` on the replay chain.
- [x] 4. Hear `peer-rejected` `wrong-match` while the request is pending.

## Verification

- [x] 5. Kill each mutant separately and record the test that catches it.
- [x] 6. Run full affected directories, integration, typecheck, lint, formatting, unit lint and CI budgets.

Delivery is one draft PR. Root owns hosted CI and merge.

## Evidence (2026-11-08)

- Red run before the fix: 6 of 11 new tests failed (silent host, chunk restart,
  bad chunk, wrong-match, aborted-timeout, unmount); the 5 that passed are the
  negative cases (other reasons, before request, after replay started, final
  chunk, explicit reconnect-reject).
- After the fix: 11 of 11 green, plus the 12 + 4 existing reconnect hook tests.
- Mutants, each applied alone and killed: replay chain without `.catch` (1),
  no wait armed after the request (2), chunk not restarting the wait (1), final
  chunk not ending the wait (1), any `peer-rejected` reason redirecting (1),
  wrong-match honoured before the request (1) and after replay started (1),
  wrong-match listener never unsubscribed (1), wait timer not cleared (2).
- The sticky-`aborted` test runs through the real `setHostPending` default and
  the store guard (M-M2/3); it guards that the new timeout path still goes
  through the store setter rather than being a mutant of this change.
- Full directories on Node 22 (`src/hooks`, `src/lib/p2p`,
  `src/components/gameplay/pages/gameSession`, `src/__tests__/integration`):
  132 suites, 1,452 passed, 32 skipped, 0 failed.
- `npm run typecheck` (both configs) clean. Root lint 63 warnings, 0 errors.
  oxfmt clean. Unit lint 17,082 of 17,085. budget-check: 57 unkeyable.
