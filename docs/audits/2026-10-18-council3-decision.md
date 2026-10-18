# Council 3 decision: roadmap registrations

2026-10-18. Registration baseline: `origin/main` at `cf42ab567`.
This document transcribes Root's supplied council-3 ruling. It registers future
work and release obligations; it admits no source work and claims no runtime,
release, human-session or exact-main acceptance.

Authority reported by Root:

- Standing owner instruction: "continue with recommended options and fix the issues that come up, publish as needed".
- Direct 2026-10-18 response: "I think the recommended actions make sense for the ones that have them".
- Fog direction: "Fog reveals should be incremental allowances of information revealed from GM state to player state(s) as effects that just happen upon movements or things being revealed".

The supplied A/B/C reports are historical research at `f32626fbd`, not fresh
runtime proof. Their complete bytes are preserved under
`openspec/planning/2026-09-12-roadmap-completion/evidence/`:

| Seat | Evidence                                                                                                          | SHA256                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| A    | [council3-a-20261018.txt](../../openspec/planning/2026-09-12-roadmap-completion/evidence/council3-a-20261018.txt) | `260d715aea386b05b7719110212281cf74f70f56902144d430ddda460c99fe9f` |
| B    | [council3-b-20261018.txt](../../openspec/planning/2026-09-12-roadmap-completion/evidence/council3-b-20261018.txt) | `c6b260e9810cce9e1070872b05969d32ace0501368bcc525ec34d3aba64e6202` |
| C    | [council3-c-20261018.txt](../../openspec/planning/2026-09-12-roadmap-completion/evidence/council3-c-20261018.txt) | `b66e63e933e79327859ebe43316c3739f99c96b64614d8e5dea34f1c9e9d2ecf` |

Council B's file contains CRLF endings. The adjacent `.gitattributes` preserves
those bytes in Git; no report is reformatted or corrected.

## Synthesis and ruling

| Item                                     | Council A                                                                                                                                     | Council B                                                                                                                                          | Council C                                                                                                                                       | Root ruling implemented                                                                                                                                                                                                                                                                                                                                                                                               | Owner questions / disposition                                                                                                                                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. First shared mission human acceptance | One human can drive three seats; prefer packaged GM plus two browser profiles. Add three-context terminal mission proof; names Task 17.       | One loopback server, three independent profiles, real completion and reload; human attestation distinct from automation. Preserve installer smoke. | Automated three-context terminal journey and agent rehearsal before spending human time; correctly identifies P2 / Task 18. Rehearse installer. | Add documentary L1 checklist: all 23 closures, journey and ownership gates on release-candidate SHA, automated GM + two-player terminal mission with reload before human session, packaged-installer rehearsal, then human three-seat script under `playtest/checklists`. Root checks P2 / Task 18 coverage and registers any missing acceptance before P2 admission. Do not rewrite Task 18.                         | Operator/date and number of humans remain logistics to record truthfully. One human operating three seats must be labeled as such. An agent rehearsal does not satisfy the human session. Packaged installer rehearsal is required. |
| B. PRIV-1 discovery                      | Omit co-op campaign and mission vessels entirely; remove code from default name. Suggest before B15-0.                                        | Separate sensitive privacy slice in B15 before B15-6; omit generic lobby and spectatable listings, retain invitation path.                         | Same exclusion using co-op metadata; B15-6 remains docs and cites privacy slice exact-main PASS.                                                | Register blocked sensitive B15-PRIV after B15-5R and before B15-6, post-U38. Exclude both co-op metadata forms from `getJoinableLobbies` and spectatable listings; default name has no code. Acceptance: authenticated stranger sees no co-op row/code/matchId, ordinary lobbies unchanged, member invite join works. Target <=10 files; budget remains a hypothesis.                                                 | No new owner answer needed for adopted exclusion. A future member-only discovery surface is outside this registration. B15 is not added to L1.                                                                                      |
| C. Incremental fog reveal                | Derived reveal/update/lost knowledge fold; automatic effects never appended canonically. Central capability predicate; head of P5 before U26. | Seven bounded slices, historical audience facts, common projector, generation cursors, viewer digests, byte-leak proof. After P4 Task33 in P5.     | Hidden units absent; shared projector; capability wording; spectator public-only recommendation. Proposes earlier post-L2 layer.                | Adopt B's FOG-S/K/B/L/R/H/X split, all blocked and sensitive privacy/authority/replay, ordinary 15/500 caps. Head of P5 after P4 Task33, before U26 and Tasks 34-40. Integrate A/C derived-effect, own-side bootstrap and capability wording. FOG-H owns projected lifting of B14-HEAD; FOG-X owns guarded enablement and modifies B14-0. U26/U30 successors consume FOG-R/H; original contracts/task holders remain. | Seven policy questions remain pending below. Adopted scheduling remains P5 unless separately changed; C's earlier layer is not adopted.                                                                                             |
| D. Maintenance debt                      | Ledger acknowledged debt; bounded cleanup between closures; defer refactors. Asks whether acknowledgment can green the gate.                  | Counts overlap; preserve single product/closure lane and existing deferral. Read-only preparation and measured cleanup, no manufactured green.     | One bounded routine lane outside L1 ownership; register debt, defer refactors, never raise baseline.                                            | No maintenance implementation, ledger waiver, gate relaxation or new maintenance unit is authorized by this registration brief. Preserve existing deferral, protected ownership, one product lane and machine-wide heavy-run discipline. Further maintenance registration remains separate.                                                                                                                           | Council questions about release-blocking policy and acknowledgment-only green are not resolved here. No baseline increase, suppression or claim that 124 entries are 124 independent defects.                                       |
| E. Release discipline                    | Three-context gap; code/name leak; disclose unavailable fog and known results defects.                                                        | Explicit checklist: 23 closures, exact-Main automation, human playtest, installer smoke, same-host and Docker refusal release notes.               | Check Task 18 coverage, rehearse actual installer, explain fog refusal; suggests disabling toggle and batched rulings.                          | Add inert checklist record with same-host topology, Docker HOSTNAME refusal, and exact release-note line: "fog-of-war is unavailable in multiplayer in this release". Root prepares the three-seat script before use and verifies candidate evidence.                                                                                                                                                                 | No fog-toggle source change, new defect waiver, release publication or owner-ruling bypass here. Optional UI messaging requires a separate bounded registration.                                                                    |

## Pending fog policy

These are council recommendations retained as pending questions, not owner
answers. FOG-S must resolve applicable policy before downstream implementation.

| Question                                           | Recommendation                                                                          | Status                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| Do allied players automatically share sight?       | Shared allied sight using trusted per-unit ownership and historical audience policy.    | Pending                                  |
| May never-seen destruction reveal a unit identity? | No unknown-unit identity disclosure; reconcile the out-of-LOS destruction clause.       | Pending                                  |
| What is the first-contact tier?                    | Use specification open/rough tiers and freeze the exact permitted fields.               | Pending                                  |
| How long does last-known information persist?      | Until contradicted, with a stale timestamp and only permitted fields.                   | Pending                                  |
| What do spectators and GM know?                    | Spectators public-only; authenticated GM sees all. Host identity alone is insufficient. | Pending                                  |
| May the GM grant information manually?             | Audited GM grants are canonical facts; resulting reveal effects are derived.            | Pending                                  |
| Should fog rank above P4?                          | Keep head-of-P5 placement after Task33 production journal authority proof.              | Pending; P5 remains the adopted schedule |

## Registration boundaries

The canonical edits are in `roadmap.json` and `units.json`. The new fog node and
seven units remain blocked. Budgets include tests, lifecycle and evidence files
and are hypotheses; admission must freeze literal manifests, count U41 additions
without deletion credit, and split rather than omit required proof. FOG-L must
split server/client work if it cannot fit. Every fog unit requires sensitive
review despite FOG-S being specification work.

B14-0 changes only its unadmitted behavior wording: a single capability decision
in `fogMatchAdmission.ts` ("no per-viewer reveal projection available for this
match") and this future fog-of-war spec delta:

> fog-on private reads SHALL be served only through a per-viewer projection; when none is available, refuse with fog-projection-unavailable

Its caps, manifest, lifecycle, fixed refusal, membership-first behavior and
fog-off compatibility remain intact. No test may pin `GameCreated` as public
full-roster state. B14-0/B14-HEAD containment remains through L1/L2; FOG-H prepares
projected head/HTTP parity, and FOG-X enables surfaces only after the complete
boundary passes.

B15-PRIV has six candidate source/test leaves plus lifecycle and three evidence
slots (ten-file hypothesis). Protected co-op paths and overlaps with B14/G2 are
future census inputs, not permission to edit them now. B15-6 only documents the
result and cites B15-PRIV exact-main PASS, ancestry and closure. All B15 stays
blocked after U38.

Only predecessor metadata is added to U26/U30; their original behavior, states,
task keys and historical receipts remain intact. The shared registration says
their successors consume FOG-R/H rather than duplicate projection work. P2CG1G2,
Task 18, the 23-unit L1 contract and protected implementation files are unchanged.
The new `l1ReleaseChecklist20261018` is documentary and inert to the validator;
Root must enforce it. No receipts are fabricated and no unit is released by NEXT.
