## 1. Fast-forward completion
- [x] 1.1 Record red runner regressions: fast-forwarded encounter stays Ready; refused POST/PATCH session writes still publish.
- [x] 1.2 Route the session handler through the in-process router with a loopback Host; inject fetch into the lifecycle client; link, complete, then publish in the runner.
- [x] 1.3 Kill the remove-completion and publish-before-completion mutants.

## 2. Guarded close
- [x] 2.1 Pin unmount without a terminal outcome (Setup, Active, Abandoned) against a Completed control; kill the dropped-Completed-gate mutant.

## 3. Verification
- [x] 3.1 Replay/digest/golden suites before and after with no fixture or digest change; run the lane gates and record evidence in verification.md.

## 4. Deferred follow-up: multiplayer completion (Root ruling 2026-11-08, Option B)
Land with whichever lane wires co-op mission play to the server match. Today no client joins the `coop-…` mission match, so this would have no caller.
- [ ] 4.1 Linkage: co-op launch links the repository encounter to `missionMatchId` instead of the placeholder session created by `EncounterService.launchEncounter`. This needs a server route, because the browser cannot reach the SQLite encounter service.
- [ ] 4.2 Evidence rule: server match sessions carry no `encounterId` in GameCreated (`ServerMatchHostBootstrap.ts` builds them with empty linkage), so completion trusts the durable match record: a committed `GameEnded` for the match whose ID equals the encounter's linked session.
- [ ] 4.3 Owner: `completeLinkedEncounterForMatch` inside `matchCompletion.ts` (`markMatchCompleted`). It reaches the journal commit, journal duplicate resume, legacy dispatch, forfeit and boot repair. Host `closeMatch` calls `store.closeMatch` directly and must never reach it. On failure, log and still close the match; note that recovery skips completed rows, so there is no later retry.
- [ ] 4.4 Tests: a committed terminal completes the linked encounter; a journal duplicate retry neither double-completes nor throws (timestamps unchanged); `closeMatch` mid-fight without `GameEnded` does not complete; boot repair of an ended active match completes it.
- [ ] 4.5 Mutants: remove the `GameEnded` check; call completion from `closeMatch`; drop the same-session no-op guard.
