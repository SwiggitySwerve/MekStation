# Council 3, member A: critical path and order

Date: 2026-10-18. Lens: dependency DAG, true serialism, cadence compression, next 24-48 h. Read-only; sources are units.json on origin/main (1e0a34dc5), the 2026-10-18 project review, the four nightly diagnoses, and live gh state for #2278/#2279/#2281/#2282.

## 1. The DAG as the ledger actually encodes it

Predecessors and ownership paths from units.json, remaining L1 units only:

| Unit                                     | Predecessors (ledger)                        | Owned paths                                                                               | Review                 |
| ---------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------- |
| B14-0 (#2281)                            | B14-0B                                       | src/lib/multiplayer/server, fog spec                                                      | sensitive              |
| B14-HEAD                                 | B14-0                                        | src/pages-modules/api                                                                     | sensitive              |
| P2CG1HP                                  | B14-0, B14-HEAD                              | src/components/campaign/coop, src/lib/multiplayer/server                                  | sensitive              |
| LSC-0                                    | P2CG1HP                                      | openspec/changes/design-campaign-authority-and-sync                                       | sensitive (contract)   |
| LSC-1DB                                  | LSC-0                                        | src/services/persistence                                                                  | sensitive + migration  |
| LSC-1S                                   | LSC-1DB                                      | src/services/vault                                                                        | sensitive              |
| LSC-1                                    | LSC-1S                                       | src/services/vault, src/pages/api/multiplayer/auth, securitySchemas.ts, src/**tests**/api | sensitive              |
| LSC-2OP                                  | LSC-1                                        | src/lib/campaign, src/pages-modules/gameplay/campaigns                                    | sensitive              |
| LSC-2                                    | LSC-2OP                                      | same + CampaignNavigation.tsx                                                             | sensitive              |
| LSC-2P                                   | LSC-2                                        | e2e, docs/releases                                                                        | sensitive              |
| L1-SMOKE-A1                              | P2CG1S                                       | scripts (new leaves)                                                                      | sensitive proof        |
| L1-SMOKE-A2                              | A1                                           | scripts                                                                                   | sensitive proof        |
| L1-SMOKE-B                               | A2, B14-0, B14-HEAD                          | scripts                                                                                   | sensitive proof        |
| P2CG1H                                   | G2, R, B14-0, LSC-2P, A1, A2, B (+HP via N6) | server.js, server, pages-modules/api, e2e packs                                           | sensitive              |
| P2CG1I1                                  | H                                            | src/pages-modules/api                                                                     | sensitive              |
| P2CG1I2                                  | I1                                           | server (test-only)                                                                        | sensitive              |
| P2CG1I3                                  | I2                                           | server                                                                                    | sensitive              |
| P2CG1I4                                  | I3                                           | server                                                                                    | sensitive              |
| P2CG2 -> P2CH -> P2C -> P2 -> U38 -> P2J | chain                                        | server; e2e; docs; client launch files                                                    | sensitive, P2J routine |

Two facts fall out immediately.

**The LSC chain is file-disjoint from B14-0, B14-HEAD and P2CG1HP.** Not one owned path overlaps. B14-HEAD owns src/pages-modules/api; HP owns src/components/campaign/coop plus the server; LSC touches persistence, vault, auth routes, campaign UI, e2e. The only shared file is units.json itself, which every unit edits and which is a trivial rebase.

**The "P2CG1HP -> LSC-0" edge is a sequencing choice, not a dependency.** LSC-0's behavior text consumes nothing from HP, B14-HEAD or B14-0; its real consumer is P2CG1H (admission requires LSC-2P) and P2/P2J (release hold on LSC-2 and LSC-2P). The edge was written by localSeatCredentialsRegistration20261018's "order" string to satisfy the one-product-writing-lane rule. The ledger already contains the precedent for relaxing that rule for a disjoint lane: l1SmokeRegistration20261018 registered A1/A2 "alongside L1" under the owner's parallelism text and states that "array placement does not add a B14 predecessor to A1/A2". The same device, applied to LSC, is a registration-only ledger edit under the standing instruction, owner-overridable, with no contract or cap change.

Within LSC, LSC-0 (openspec only) and LSC-1DB (persistence) are also disjoint, and LSC-2OP (campaign UI) is disjoint from LSC-1 (vault/auth). Within I1-I4, I1 (pages-modules/api) and I2 (server test-only) share no files and both functionally depend on H, not on each other.

## 2. What is truly serial

After B14-0 merges, the hard chain that cannot be parallelised by file disjointness is:

B14-HEAD -> P2CG1HP -> [wait for LSC-2P and SMOKE-B] -> P2CG1H -> I1/I2 -> I3 -> I4 -> P2CG2 -> P2CH -> P2C -> P2 -> U38 -> P2J.

That is 13-14 units, almost all in src/lib/multiplayer/server. At the current 3-5 h per unit it is 40-70 h of wall time by itself. Nothing in the ledger lets two of those overlap except I1 with I2.

The other two chains (LSC: 7 units; smoke: A2 then B) are gates on H, not on each other. If LSC starts only after HP, the path to H is HEAD + HP + 7 LSC units = 9 serial units. If LSC starts now, the path to H is max(HEAD + HP, 7 LSC units) = 7, and HEAD/HP finish with ~5 units of slack during which that Opus lane can take SMOKE-A2 and SMOKE-B. **LSC, not B14, is the critical path to H; starting it now saves roughly 2 units (6-10 h) and makes the B14 lane's slack productive.**

## 3. Compressing the per-unit cadence without dropping review + ruling

The 3-5 h per unit is mostly hand-offs, not work. Today each unit needs six Root touches (launch reviewer, read review, rule, merge, launch closure, launch verify), each a stall. Compress to three (rule, merge, release) by:

1. **Reviewer on PR-open, not on CI-green.** Fable starts the moment the implementer reports a PR; CI runs in parallel.
2. **Ruling drafted from the review, posted at CI-green.** The ruling is Root's; it should not wait for a second Root read of the thread.
3. **Next unit implements on the merge SHA, before closure verifies.** The ledger gate is "predecessor main-verified before admission/PR open", not before implementation. Prep (census, red tests) is already allowed ahead; extend it: the next unit's implementer starts the moment the predecessor merges and holds its PR until the closure verify reports. Closure verify and next-unit implementation then overlap fully.
4. **Subagents compute merge SHAs themselves.** Standing instruction in every brief: run "gh pr view N --json mergeCommit --jq .mergeCommit.oid" and "git fetch origin main"; never ask Root for a SHA.
5. **Root watches PRs with watch_pull_request immediately on open** and ends its turn; no polling by Root, no asking subagents to watch.
6. **Closure PRs are docs-only; let the closure agent also prepare the next unit's admission evidence** in the same session so one Opus does closure(N) + prep(N+1) as one task. Do not batch closures into one PR: the TS7 precedent forbids it and the saving is one CI cycle.

With 1-3 and 6 the per-unit wall time falls to roughly implementation + max(CI, review) + merge, about 1.5-2.5 h, and closure disappears from the critical path. 13 serial post-H units at 2 h is ~26 h instead of 40-70.

## 4. Heavy-run and shared-file contention

Shared file: .github/workflows/nightly-validation.yml is edited by #2278 (fixture root) and #2279 (recapture + C's E2E-19/25 journal-switch patch). #2278 is CLEAN and fully green; merge it now, then B rebases once and no later PR touches that workflow except through B. Baseline C must not add a third edit.

Heavy runs: give the single machine slot a fixed priority order rather than letting lanes poll: (1) exact-main closure verifies on the critical path (B14-0 next), (2) L1-SMOKE-A1's production build, (3) Baseline D/B Playwright, (4) everything else. Baseline PRs should rely on PR CI rather than local Playwright; only exact-main proofs need the slot.

Note on #2281: its Seam Anchors job failed on e2e/seam-fresh-construction-no-instant-defeat.spec.ts:360 ("unjustified completion, advance 15/18"). That spec is a seeded single-player construction anchor, outside B14-0's WebSocket refusal paths, and the same job passed on #2278 and #2282 heads today. Re-run it before treating it as a B14-0 defect; the Fable review should start regardless.

## 5. Ownership walls

Baseline C (E2E-20/21 move; E2E-08 reader), Baseline F (salvage roster projection in the campaign route) and the diagnosed E2E-19/25 header rewrite all land in files owned by blocked units (U25/U2b, P2CG1H, the campaign manifest). No standing rule covers it, so each one stalls into a "routing report". Adopt one rule now, recorded as a ledger note under the standing instruction: a baseline PR may edit a blocked unit's owned file when the change is a test/fixture repair or a bounded product fix of one defect, the PR names the owning unit and its successor note (for example CF-S-5), and the owning unit's admission re-censuses the file. Sensitive classes still get the full review. That unblocks C and F today without reopening contracts.

## 6. Concrete ordering, next 24-48 h

Lanes (one Opus each, Fable reviews on demand, Sonnet for routine):

- **Lane 1, B14/H chain (Opus-1):** #2281 ruling/merge -> closure(B14-0) + prep(HEAD) -> B14-HEAD -> closure(HEAD) + prep(HP) -> P2CG1HP -> then SMOKE-A2 and SMOKE-B while LSC catches up.
- **Lane 2, LSC chain (Opus-2):** LSC-0 (openspec deltas + the parallel-lane registration amendment, one PR) -> LSC-1DB (prep now in lsc-impl worktree; PR after LSC-0 merges) -> LSC-1S -> LSC-1 -> LSC-2 -> LSC-2P. A third Opus prepares LSC-2OP against LSC-1S's service interface once 1S is merged, so 2OP's PR opens the hour LSC-1 merges.
- **Lane 3, proof (Opus-3):** L1-SMOKE-A1 to PR with heavy slot #2; then LSC-2OP prep as above.
- **Lane 4, baseline/docs (Sonnet):** #2282 merge; #2279 rebase/merge; Baseline C PR under the pre-land rule (privacy review); Baseline F as a bounded route fix under the same rule; docs PR (review doc + four diagnoses); L2 amendment and v2.2.0 prep registrations.

Hour 0-6: merge #2278, rerun #2281 Seam Anchors and start its Fable review in parallel, B rebases onto post-#2278 main, Sonnet review of #2282 finishes and it merges, LSC-0 PR opens, SMOKE-A1 builds.
Hour 6-12: B14-0 ruling and merge; closure(B14-0)+prep(HEAD) in one task; B14-HEAD implementation begins on the merge SHA; LSC-0 review/ruling/merge; LSC-1DB PR; #2279 merges; Baseline C and docs PRs merge.
Hour 12-24: B14-HEAD review/ruling/merge; HP implementation; LSC-1DB review/ruling/merge; LSC-1S PR; SMOKE-A1 review/ruling/merge; SMOKE-A2 prep.
Hour 24-48: HP merge; Lane 1 moves to SMOKE-A2 then B; LSC-1S, LSC-1 merge; LSC-2OP and LSC-2 PRs; nightly run on the repaired baseline becomes the regression reference.

Expected position at 48 h: 12 -> about 20 of 36 L1 units main-verified, with H's three gates (HP, LSC-2P, SMOKE-B) all within one or two units of done, versus about 15-16 on the strictly serial order.

## Actions for Root, in order

1. Merge #2278 now (CLEAN, 32/32 green); tell Baseline B to rebase #2279 onto the result and merge it when CI is green.
2. Re-run the Seam Anchors job on #2281 and spawn the Fable full review of #2281 immediately, without waiting for the rerun.
3. Register the LSC parallel lane: a registration-only ledger amendment making LSC-0's predecessor P2CG1S (main-verified) rather than P2CG1HP, mirroring l1SmokeRegistration20261018's wording; spawn Opus-2 on LSC-0 with that amendment in the same PR.
4. Adopt the baseline pre-land rule (section 5) as a ledger note; release Baseline C's PR as privacy-sensitive and Baseline F as a bounded route fix under it.
5. Set the machine heavy-run priority list (closure verifies, SMOKE-A1 build, baseline Playwright, rest) and give L1-SMOKE-A1 the next slot.
6. Put the merge-SHA and watch rules in every brief: subagents fetch merge SHAs themselves; Root calls watch_pull_request on every PR at open and ends its turn.
7. Change the per-unit sequence: reviewer starts on PR-open; closure(N) and prep(N+1) are one Opus task; implementer of N+1 starts on the merge SHA and holds its PR until the closure verify reports.
8. After B14-0 merges, run one task for closure(B14-0) + prep(B14-HEAD) and start the B14-HEAD implementer on the merge SHA the same hour.
9. When LSC-1S merges, spawn a third Opus to prepare LSC-2OP against its interface so LSC-2OP opens the hour LSC-1 merges; allow I1 and I2 to run concurrently after H.
10. Merge #2282 on Sonnet's report, then the docs PR (review + four diagnoses) and the L2/v2.2.0 prep registrations as routine Sonnet work; hold DF/EQ.
