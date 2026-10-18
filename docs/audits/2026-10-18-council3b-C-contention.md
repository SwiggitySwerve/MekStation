# Council 3b, lens C: contention, ownership and the merge train

Read-only, at 2026-10-18 ~13:10 MT against origin/main 1e0a34dc5. Sources: open-PR files, checks and bases; pairwise `git merge-tree` of the five PR heads; run 39156051361 logs; the four nightly diagnoses; PLAN.md; units.json ownership. No tracked file was edited.

## Headline findings

1. **The merge train is not a cascade.** I ran pairwise `git merge-tree` on #2278, #2279, #2281, #2282 and #2283. They produce exactly **one** conflict: #2278 × #2279, a single hunk in `nightly-validation.yml`. #2278 adds one env line after `HOSTNAME`, and #2279 rewrites the `run:` line directly below it. Lane C's workflow patch is already folded into #2279, and #2283 does not touch the workflow. Branch protection does not require branches to be current: #2278 shows **CLEAN** on a base of 631484c8f, four merges behind. **No other PR needs a rebase to merge.**
2. **#2281 (B14-0) is red right now**, which the brief does not record. Seam Anchors fails at `e2e/seam-fresh-construction-no-instant-defeat.spec.ts:360` with "unjustified completion", turn 3, player side 0 alive. "Lint and Test" fails as the aggregate. The spec is unchanged since #1044, and it drives a local `InteractiveSession` (`?seed=1337`, play-manually). B14-0 touches only the server WS host. #2282 passed the same job on the same main. **This is probably a flake, but that is unproven.** Rerun it once. If it reproduces, it blocks B14-0 and becomes a baseline item.
3. **#2278 carries a replay-class change.** It bumps the quickMeta `GameCreated` schema identity, and UI-NAV-REPLAY §4 says to coordinate it with the Events/Replay owner. Under the sensitive-class constraint it needs an **OWNER-RULING** in addition to the Fable review. #2283 edits files owned by P2CG1H, U25 and U2b on the privacy/authority surface, so it needs one too. That makes **three** rulings due at about the same time.
4. **units.json is the real single-writer file.** #2281, the B14-0 closure, the B14-HEAD admission and the L2 amendment all edit it; the baseline PRs do not.

## (1) Heavy-run scheduling: a FIFO ticket queue outside the repo

**Why the current approach fails.** Every lane polls `machine-idle.mjs`, so several waiting lanes see the same idle moment and start together. The result is overlapping runs, timeouts that may not be raised, flake reruns, idle gaps of half a poll interval, no priority, and Root arbitrating by hand.

**Mechanism.** The queue is `E:/Projects/Personal/MekStation-wt/_locks/heavy/`, driven by a wrapper `_locks/heavy-run.mjs --lane <id> --class build|jest|playwright|package [--p0] -- <cmd>`.

- **Enqueue.** The wrapper creates `tickets/<P0|P1>-<epochms>-<lane>.json` with exclusive create (`wx`). The ticket holds `{lane, pid, pidStartTime, worktree, class, cmd, createdAt}`.
- **Order.** Sort tickets by priority, then timestamp, then name. Only the head may run, so P0 tickets are FIFO among themselves. A P1 ticket older than 30 minutes is treated as P0, so nothing starves.
- **Grant.** When its ticket reaches the head, the wrapper still runs `machine-idle.mjs --wait --own-pid <self>`. That catches heavy processes outside the queue, such as a human's dev server or a manual Playwright run. The wrapper waits on them and never stops them. It then spawns the child and touches the ticket every 30 seconds as a heartbeat.
- **Release.** The wrapper deletes its ticket in `finally` and in exit/SIGINT handlers.
- **Crash recovery is file-only.** A ticket is stale if its PID is dead, if `process.kill(pid,0)` passes but the start time differs (the PID was reused), or if the heartbeat is more than 120 seconds old. Any waiter may _rename_ a stale ticket into `stale/`. **No process is ever signalled, killed or preempted.**
- **Leases.** Budgets are build 15, jest 20, playwright 45 and package 30 minutes. An overrun writes `overdue/<lane>` for Root, who asks that lane to stop; nothing is killed.
- **Deadlock freedom.** There is one resource, acquired at most once per process; a nested wrapper sees `HEAVY_TICKET` and runs under its parent's ticket. No hold-and-wait means no deadlock, and FIFO plus aging means no starvation.
- **Root controls.** A `PAUSE` file stops new grants (for the installer or human session). Root reorders by renaming _waiting_ tickets. `log.jsonl` records grants and releases, so utilization is measured, not guessed.
- **Placement.** It lives outside the repo, so it needs no unit or PR and avoids L1-SMOKE-A1's `scripts` ownership. One Sonnet lane can build and self-test it in about 45 minutes, and it can be upstreamed into `scripts/qc` later as a routine unit.

**Throughput.** These figures are estimates, not measurements. Handoff drops from a poll interval plus collision risk to about 2–5 seconds, and overlapping heavy runs go to zero. I expect heavy-slot utilization to rise from roughly 55–65% to 85–90%, about **1.4×** effective heavy capacity, plus fewer collision-driven reruns. The larger gain is that Root stops arbitrating. Confirm the figure from `log.jsonl` after one day.

**Demand cut, which compounds the gain.** Run locally only what hosted CI cannot prove: build- or package-specific proofs, L1-SMOKE, and the contracted exact-Main closure proofs. Test-only baseline lanes cite green PR Checks plus at most **one** targeted local spec.

## (2) The ownership-wall rule: pre-land plus carry-forward

**Standing rule, BASELINE CARVE-OUT.** A lane may change a file owned by a **planned or blocked** unit without asking, if all of the following hold:

1. **Purpose.** The change restores a check that passed on an earlier Main, the diagnosis names a cause, and the failure falls into category (b), (c) or (d), or into (a) when the minimal product repair does not change the owner's contract.
2. **Minimal.** At most about 40 changed lines per foreign file. No new exports, schema or event shapes, and no ownership of new behaviour.
3. **The owner is not in flight.** If the owning unit is _implementing_ or _has an open PR_, route the change to that lane instead.
4. **Review class is max(lane, owner).** For a sensitive owner (privacy, authority, replay or persistence) that means a full Fable review plus an OWNER-RULING, the same as the owner's own changes. The owner's ruling can be **batched**; see action 4.
5. **Carry-forward.** The PR body has a `CARRY-FORWARD: <unit> <file> <reason>` section. On merge, Root appends one line to `_receipts/carry-forward.md`. The owner's next admission freeze must re-baseline on post-merge Main and acknowledge each line. No ledger state changes, and units.json is not touched.
6. **Otherwise, known-red.** If the fix cannot meet 1–3, it becomes a known-red nightly entry instead: the failing test, the cause, the owner unit and a release predicate. Every remaining red must be known and owned, and no skip guards are added. A trustworthy baseline means _every red is explained and owned_, not that every check is green.

**Applying it today.**

- **C #2283 qualifies.** The owners are P2CG1H and U2b (blocked) and U25 (planned). It needs Fable plus a ruling, with carry-forward to P2CG1H, which covers successor note CF-S-5 and its ACK edit.
- **F.** The owner is LSC-2OP (blocked, persistence/authority), and whole-unit salvage is outside the minimum shared mission. F ends with a routing report: root cause plus a minimal patch as a _diff file_. If the patch meets rule 2, it becomes a carve-out PR in the next ruling batch; otherwise campaign-economy-browser goes known-red, owned by LSC-2OP. F does not hold a slot while waiting.

## (3) Merge train

Rule: **lanes never wait for merge SHAs.** The repo merges with merge commits (`Merge pull request #…`). A later PR that conflicts _stacks on the earlier PR's head_. When the earlier PR merges, those commits are already in Main and no second rebase is needed. Root merges in train order, which guards against an unreviewed predecessor arriving through the stack.

| #   | PR              | Gate remaining                                          | Notes                                                                                                                                                                                                                                                                                                           |
| --- | --------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **#2282** D     | Sonnet APPROVE                                          | All 32 checks green, routine, no conflicts. Merge on approval.                                                                                                                                                                                                                                                  |
| 2   | **#2278** A     | Fable APPROVE + **OWNER-RULING** (replay identity bump) | Green and CLEAN. Freeze the head at 60e4b54cb; any fix-up forces B to restack.                                                                                                                                                                                                                                  |
| 3   | **#2279** B     | Stack on #2278, then CI and review                      | **Lane B resolves the conflict now** by merging `60e4b54cb` into its branch. Keep both sides: the env `MEKSTATION_E2E_REPLAY_FIXTURE_ROOT` line and the `--grep-invert` run line for E2E-19 and E2E-25. The armed E2E-19/25 step does not need the replay root. Tell the reviewer to diff against #2278's head. |
| any | **#2283** C     | CI, then Fable + ruling (carve-out)                     | No textual conflict. It shares `gm-two-player-privacy.pack.spec.ts` with #2279's armed step, so the Fable reviewer checks the combined E2E-19/20/21/25 behaviour.                                                                                                                                               |
| any | **#2281** B14-0 | Seam rerun green, Fable, ruling                         | Independent of the baseline PRs; do not hold it for them. Its closure PR is first in the **units.json queue**: B14-0 closure, then B14-HEAD admission, then the L2 amendment. The docs PR (audits only) can go any time.                                                                                        |

## (4) Lanes: what each is blocked on now, and the one unblocking action

| Lane             | Blocked on                                                      | Single unblocking action                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B14-0 #2281      | Seam Anchors and the aggregate failing at 471d6281              | `gh run rerun 39156051361 --failed`. Run the Fable review in parallel; a `review-2281` worktree appeared at 13:09.                                                                                                                                          |
| L1-SMOKE-A1      | A production-build slot (red falsifiers committed at f7cb34aa4) | Give it a **P0** ticket for the next build slot. Freeze its literal leaf list so #2279's `scripts/qc` edits don't trip its `scripts` ownership.                                                                                                             |
| Baseline A #2278 | The Fable review, then an unplanned ruling                      | Put #2278 in the batched ruling packet **now**.                                                                                                                                                                                                             |
| Baseline B #2279 | The #2278 conflict and its own CI                               | Stack on #2278's head and resolve now; no waiting for a merge SHA.                                                                                                                                                                                          |
| Baseline C #2283 | A sensitive review that hasn't been launched                    | Launch Fable on 75c833ac0 under the carve-out rule, carry-forward to P2CG1H.                                                                                                                                                                                |
| Baseline D #2282 | The Sonnet review                                               | Merge on APPROVE; record campaign-economy-browser as known-red, owner pending F.                                                                                                                                                                            |
| Baseline F       | Ownership wall (LSC-2OP and reservations)                       | Root rules: diff file plus routing report, then a carve-out PR or known-red. Release the slot.                                                                                                                                                              |
| B14-HEAD         | B14-0's merge                                                   | **Pipeline it.** Its leaves (`src/pages-modules/api`) don't overlap B14-0's. Admission prep and red tests start stacked on 471d6281 while B14-0 is in review and ruling. The product-writing lane is idle during review, so this keeps the one-writer rule. |

**Chain arithmetic** (estimate). Today a unit runs implement, review, ruling, closure and verify in series: 3–5 h. Implementing the next unit during the previous one's review brings that toward max(implement, review cycle), about 2–3 h, saving roughly **35–40%** over 21 units (about 84 h down to 50–55 h). Folding unit N's closure into N+1's admission PR would save another CI cycle per unit, but it changes the separate-closure contract, so it is an **owner decision**.

## Actions for Root, in order

1. Call `watch_pull_request` on #2278, #2279, #2281, #2282 and #2283, and end the polling. T3 then wakes Root on check results, so lanes and Root stop watching CI by hand.
2. `gh run rerun 39156051361 --failed` for #2281's Seam Anchors. If it fails again, open a baseline diagnosis lane, because B14-0 cannot merge red.
3. Send lane B: "Merge #2278's head 60e4b54cb into your branch, resolve the single nightly-validation.yml hunk by keeping both sides, and push. Do not wait for a merge SHA." Broadcast the stack-on-predecessor rule to all lanes.
4. Assemble **one** OWNER-RULING packet covering #2281 (B14-0), #2278 (replay identity bump) and #2283 (privacy/authority carve-out). Send it as soon as the first Fable APPROVE lands, so the owner rules once instead of three times.
5. Launch the Fable review of #2283 at 75c833ac0, with the carve-out rule and the P2CG1H carry-forward in the brief.
6. Adopt the BASELINE CARVE-OUT rule (section 2) as a standing rule in STATUS.md and create `_receipts/carry-forward.md`. Rule on F: diff file plus routing report, then a carve-out PR or known-red with owner LSC-2OP, and release F's slot.
7. Merge in train order as gates clear: #2282, then #2278, then #2279. Merge #2283 and #2281 whenever their own gates pass.
8. Dispatch one Sonnet lane to build `_locks/heavy-run.mjs` (section 1) with self-tests, outside the repo. Until it lands, Root grants heavy slots by hand in this order: L1-SMOKE-A1 build (P0), then B14-0 verify, then the rest.
9. Instruct the test-only baseline lanes to cite hosted PR Checks plus at most one targeted local spec, and to run no local full suites.
10. Start B14-HEAD admission prep and red tests stacked on #2281's head now, as the pipelined writer while B14-0 sits in review and ruling.
11. Serialize units.json writers: B14-0 closure, then B14-HEAD admission, then the L2 amendment. Put the docs PR (review doc and diagnoses) up now; it does not conflict with anything.
12. Ask the owner, at the next ruling touchpoint, whether a unit's closure may be combined with its successor's admission in a single units.json PR.
