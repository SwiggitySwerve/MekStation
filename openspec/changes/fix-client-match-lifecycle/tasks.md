## Implementation

- [x] Record failing WS, store, P2P presence, and reconnect regressions; cover the exported sync-room path too.
- [x] Enforce sticky abort in the store and switch every automatic recovery writer.
- [x] Unify WS recovery cleanup and remove pause presentation on timeout and close.
- [x] Reset at WS teardown and P2P match boundaries without resetting on poll restarts.
- [x] Re-anchor affected validation citations by content.

## Verification

- [x] Kill unconditional defaultSetLive reset, missing store guard, and missing WS teardown reset mutants.
- [x] Run full affected test directories, integration, runner, replay/digest/golden, and combat validation gates.
- [x] Run both TypeScript configs, unit lint and its suite, root lint, formatting, OpenSpec validation, and CI budgets.

Handoff: one draft PR listing explicit reset callers and the M-H3 dependency;
Root watches hosted CI and owns merging. Never merge from this lane.

## Verification evidence

- Initial red run: 14 failed, 31 passed across four suites. Corrected P2P fixture
  identity and polling mocks before the final assertions and mutant runs.
- Full hooks, stores, P2P, multiplayer client, integration, runner directories,
  plus the unit-lint Jest suite: 294 suites passed; 3,429 tests passed and 32 skipped.
- Replay/digest/golden suites before and after: 67 suites and 1,015 tests passed
  on each run. No committed fixture or digest changed.
- `npm run validate:combat`: passed, including 79 suites and 2,095 tests.
- Both TypeScript configs passed. Root lint: 63 warnings, zero errors.
  Unit-lint ceilings passed; formatting checked 9,081 files; strict OpenSpec
  validation passed all 247 items. CI budget: 57 unkeyable tests, unchanged.
- Test runtime: Node 22.22.0, matching the installed native SQLite module.
  An initial Node 24 replay run failed due to a native ABI mismatch; dependencies
  were not rebuilt or changed.

### Required mutants

| Deliberate break | Test that kills it | Result |
| --- | --- | --- |
| Restore unconditional reset in `defaultSetLive` | `useP2PReconnectSession.test.tsx`: real default live transition after replay from aborted | 1 failed, 11 passed |
| Remove the store's aborted guard | `useGameplayStore.localMatchStatus.test.ts`: automatic writer requests live, pending, or aborted | 4 failed, 7 passed |
| Remove WS teardown reset | `useMultiplayerSession.test.tsx`: teardown permits later P2P match; match change ignores disposed socket | 3 failed, 11 passed |

An additional sync-room unconditional reset mutant was killed by
`useP2PPeerPresence.test.tsx`: exported sync-room awareness polling path
(1 failed, 8 passed). Restoring production code passed all 46 focused tests.

### Explicit reset caller census

Production `resetLocalMatchStatus` calls are limited to:

- `useMultiplayerSession.helpers.ts`: cleanup of the currently owned WS session.
- `useP2PPeerPresence.ts`: P2P match lifetime cleanup, keyed only by match identity.

Remaining callers are test setup/teardown or the explicit reset assertion in
`useP2PPeerPresence.test.tsx`, `useGameplayStore.localMatchStatus.test.ts`, and
`p2pCommandGate.page.test.tsx`. Automatic readiness, resume, presence polling,
sync-room polling, and replay completion all use `setLocalMatchStatus`.

M-H3 (Wave 2 item 32) remains the server dependency for missing pause broadcasts.
No server wire fields, event payloads, persisted formats, or canonical rules change.
