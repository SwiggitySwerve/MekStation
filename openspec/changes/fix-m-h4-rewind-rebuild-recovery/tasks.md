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

## Follow-up D-2c: resync marks survive a restart

- [x] 14. Record failing regressions: a recovered rewound match replays the rebuilt head to a seated player quoting a stale `lastSeq`; guards that a spectator, and a never-rewound match, are not marked.
- [x] 15. Mark the host and the seated players when boot recovery folds an activated rewind branch; no persistence.
- [x] 16. Kill the no-mark, host-only, every-recovery and spectator mutants; run the full affected directories and gates.

## Follow-up (not in this change)

- [ ] M-H4 follow-up: private-reason writer throw after commit returns 500; needs a decision on retrying or persisting the reason.
- [x] M-H4 follow-up: resync marks lost on restart (D-2c, above).
