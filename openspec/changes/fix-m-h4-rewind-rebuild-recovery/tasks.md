## PR1: rewind rebuild pending and rebuild-lease ownership

- [x] 1. Record failing regressions: foreign lease survives the rebuild, route answers committed with `rebuildPending`, rebuild runs before the reason writer, next command and seated join heal a pending host, a failed retry stays pending.
- [x] 2. Stop the rebuild adopting a live lease it did not acquire.
- [x] 3. Keep a pre-claim rebuild failure pending on the host; never after the claim.
- [x] 4. Retry a pending rebuild before each command and after each join, inside the command queue; drop it when the stream has left its branch.
- [x] 5. Rebuild before the reason writer; answer `rebuildPending: true` instead of 500; document it in `TRANSPORT.md`.
- [x] 6. Kill the lease, route, retry, claim and ordering mutants; run the full affected directories and gates.

## PR2: failed and stranded candidates move to blocked

- [x] 7. Record failing regressions: verification refusal, sealing or activation failure, and a stranded candidate all end `blocked`; the current commit's candidate is never swept.
- [x] 8. Move the rewind's own candidate to `blocked` on every refusal or failure after it exists, while the lease is held.
- [x] 9. After acquiring the lease, move every other `building` candidate on the same stream to `blocked`.
- [x] 10. Kill the block and sweep mutants; run the full affected directories and gates.

## Follow-up D-2a: private-reason writer throw after commit

- [x] 11. Record failing regressions: a reason-writer throw after the commit answers 200 `committed` (was 500), alone and after a failed rebuild (`rebuildPending` kept), and is logged.
- [x] 12. Catch and log the writer failure in the route; no new response field.
- [x] 13. Kill the no-catch, no-log and dropped-`rebuildPending` mutants; run the full affected directories and gates.

## Remaining follow-ups (separate PRs)

- [ ] D-2c: resync marks lost on restart.
- [ ] D-2b: closed-host guard on the rebuild; `waiting-effects` (D-2d) is reserved for the effect-receipt change.
- [ ] D-3: coordinated-outcome and campaign-retro builders strand `building` candidates.
