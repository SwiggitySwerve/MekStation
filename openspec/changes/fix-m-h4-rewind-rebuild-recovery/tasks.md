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

## Follow-up D-2c: resync marks survive a restart

- [x] 14. Record failing regressions: a recovered rewound match replays the rebuilt head to a seated player quoting a stale `lastSeq`; guards that a spectator, and a never-rewound match, are not marked.
- [x] 15. Mark the host and the seated players when boot recovery folds an activated rewind branch; no persistence.
- [x] 16. Kill the no-mark, host-only, every-recovery and spectator mutants; run the full affected directories and gates.

## Follow-up D-2b / D-2d: closed-host guard and reserved `waiting-effects`

- [x] 17. Record failing regressions: rebuilding a closed host rewrites its session and claims the branch; the route still calls the rebuild on a closed registered host; a host that closes while the rebuild is queued is rebuilt anyway.
- [x] 18. Guard `rebuildFromActivatedBranch` inside the command queue and have the route treat a closed host as no live host.
- [x] 19. Document `waiting-effects` as reserved for the effect-receipt change (contract comment, event-store requirement); no code or schema change (D-2d).
- [x] 20. Kill the no-host-guard, no-route-guard and call-time-guard mutants; run the full affected directories and gates.

## Follow-up D-3a: campaign retroactive correction candidates

- [x] 21. Record failing regressions: replay divergence, verification refusal, sealer failure and an escaping error leave the candidate `building`; an unsealed stranded candidate is never swept; guards that a sealed candidate and a lease-less commit leave candidates alone.
- [x] 22. Block the candidate on each of those failures while the lease is held, and sweep unsealed `building` candidates after acquiring the lease and before minting the commit's own.
- [x] 23. Kill the four block mutants and the sweep mutants (none, sealed, past `building`, after own mint, before lease); run the full affected directories and gates.

## Follow-up D-3b: coordinated outcome target candidates

- [x] 24. Record failing regressions: a non-retryable refusal leaves the saga's candidate `building`; the target lease is never released; an unsealed stranded candidate no live saga names is never swept; guards that a sealed candidate and a lease-less record leave candidates alone.
- [x] 25. Block the saga's candidate with the saga on a non-retryable refusal (not on retryable or crash paths); sweep unsealed `building` candidates no non-blocked saga names, after acquiring the lease and before the mint; release the lease in `finally`.
- [x] 26. Kill the candidate-block, over-block, sweep (saga-blind, blocked-saga-blind, sealed, none, before-lease, after-mint) and lease mutants; run the full affected directories and gates.

## Remaining follow-ups (separate PRs)

- [x] D-2c: resync marks lost on restart (above).
- [x] D-2b and D-2d: closed-host guard on the rebuild; `waiting-effects` is reserved for the effect-receipt change (above).
- [x] D-3a: the campaign retro builder strands `building` candidates (above).
- [x] D-3b: the coordinated-outcome target strands `building` candidates (above).
