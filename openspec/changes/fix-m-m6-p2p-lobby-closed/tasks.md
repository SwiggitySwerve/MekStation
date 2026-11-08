## Implementation

- [x] 1. Record failing regressions: closed lobby launch/ready/edit/join, self-absence close, rewrite of a closed lobby, panel controls, host-route reopen (persisted and live).
- [x] 2. `canLaunchLobby` false when closed; `lobby-closed` rejection in the channel; store message.
- [x] 3. Panel closed notice and disabled controls.
- [x] 4. Host-route effect replaces a closed, unlaunched lobby.

## Verification

- [x] 5. Kill each mutant separately and record the test that catches it.
- [x] 6. Run full affected directories, integration, typecheck, lint, formatting, unit lint and CI budgets.

Delivery is one draft PR. Root owns hosted CI and merge.

## Evidence (2026-11-08)

- Red run before the fix: 20 of 33 new tests failed (channel guards, builder,
  panel, store message, and the reopen hook, which did not exist yet).
- After the fix: 33 of 33 green across the five touched test files.
- 18 mutants, each applied alone and killed: `canLaunchLobby` ignoring closed;
  missing `lobby-closed` guards on join, loadout, map, ready, host side and
  launch; the self-absence and already-closed guards; no panel notice; ready,
  host loadout and map controls left enabled; reopen ignoring `matchId`, running
  on guest routes, not claiming the host role, or never reinitialising; the
  store message.
- Full directories on Node 22 (`src/lib/p2p`, `src/stores`,
  `src/components/gameplay`, `src/pages-modules`, `src/utils/gameplay`,
  `src/types`, `src/__tests__/pages`, `src/__tests__/integration`): 838 suites,
  837 passed. The one failing suite, `CampaignDashboardPage.advanceButtons`
  (4 tests, `missionReadinessProjection.units` undefined, from #3053), is not
  in this diff and fails identically on untouched `origin/main` `0217646cc`.
- `npm run typecheck` (both configs) clean. Root lint 63 warnings, 0 errors.
  oxfmt clean. Unit lint 17,082 of 17,085. budget-check: 57 unkeyable.
