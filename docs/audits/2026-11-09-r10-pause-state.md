HANDOFF CONTEXT
===============
USER REQUESTS (AS-IS)
---------------------
“OWNER DIRECTIVE (PARITY-PLAN §50): R10 is PARKED. Stop new implementation now.”
“Commit your current work”, “Push once and open it as a DRAFT PR”, and
“No further runs.” This snapshot is not for merge.

GOAL
----
I was implementing the first D-8 R10 typed gm_correction_applied writer PR.
I have stopped implementation under §50. This is an incomplete parked snapshot,
not a certified correction writer or an enablement release.

WORK COMPLETED
--------------
- I branched fix/d8-r10-gm-correction-writer with --no-track from freshly fetched
  origin/main 943f5354db0a8f88bd567e91ec4565ed83d3c5a7.
- I reproduced the original live loss with the real InteractiveSession:
  heat 0 → 17 → 0 on Initiative → Movement. Both original regression
  assertions failed: the correction disappeared and no event was appended.
- I added the closed authority after/clear effect union, strict schemas,
  opaque independent UUIDv4 event/correction identities, enum, payload union,
  replay pack/composition/provenance, event builder and reducer dispatch.
- I extracted resolved assignment in the existing intervention projection
  owner. Ledger behavior stayed unchanged in the 161-test baseline.
- I added a new awaited SP applyGmCorrection path, expected-head rejection,
  pending-commit command guards, failed-write non-adoption, and a server-owned
  scratch append entrypoint. It does not run finalization or combat cascades.
- I added fresh durable-GM authorization using the existing branded human
  authorization gate. This helper is not wired to a hosted correction intent.
- I added explicit leaf/carrier coverage and named admission refusals.
- I wrote the requested viewer contract proposal. No viewer-delta contract,
  parser, projector or mirror integration has been implemented.
- I added an active OpenSpec change with a colocated ledger. Re-enablement
  belongs to a follow-up after complete writer/hosted/privacy proof.

Completed runs before parking (these are earlier-tree results, not final-tree proof):
| Run | Result |
|---|---|
| Initial real SP loss/event-boundary regression | 2 failed, expected red |
| Existing intervention directory before extraction | 16 suites, 161 passed |
| Existing intervention directory after preserving extraction | 16 suites, 161 passed |
| Intervention directory after initial admission implementation | 17 suites, 167 passed |
| Resolved correction projection suite | 4 passed |
| SP correction regression + server GM authorization | 2 suites, 10 passed (6 SP, 4 authority) |
| Closed leaf-coverage suite | 7 passed |
| Admission with new full-ammo-slot-gap witness | 6 passed, 1 failed; latest run was red |
| Focused OpenSpec validation of persist-typed-gm-corrections | passed before later additions |
| Last completed root TypeScript run | failed: missing parseGmCorrectionAppliedPayload export during edits |

I subsequently added the parser export and the ammo-gap refusal, but did not
rerun those checks before the park directive. There is no claimed final green
tree. Required Git hooks may run during the requested commit; no manual test,
formatter, lint, validation, budget, build or probe follows the directive.
No dependency installation was performed; this worktree uses a junction to the
already installed primary-checkout node_modules.

CURRENT STATE
-------------
PARKED under PARITY-PLAN §50; no merge, activation, release or certification.
No version owner was created and no version number was bumped. All published
recordings, committed golden/digest fixtures and generated Zod files are unchanged.
The new enum/registrations will affect completeness/schema identities; that
movement has not been fully measured or approved for repinning.

The new SP API has passing focused regression evidence, but the old
applyCorrectedState direct setter and its production UI caller still remain.
The interim #3306 disable was not removed or re-enabled by this work.
The correction wire catalog entry is deliberately hidden pending the viewer
decision. This is containment of incomplete work, not hosted support.

PENDING TASKS
-------------
1. Wait for explicit owner authorization to resume. Do not turn this parked PR
   into mergeable work or start dependent implementation while §50 applies.
2. Obtain the reconnect duplicate-events reachability result before continuing
   the R10 build. PARITY-PLAN's §48-era note reports a 32-events-for-20 witness
   when replaying a full snapshot onto a board that already holds its prefix.
   The required read-only tracing of SessionJoin baseline, reconnect tail and
   P2P guest adoption is a dependency; this lane has no reachability result.
   If a reachable production path appends the duplicate prefix, it is the top
   D-8 item and takes priority over this writer.
3. Obtain Root's review of R10-VIEWER-CONTRACT.md before any viewer contract
   implementation. Then implement strict projected facts, receipt-bound
   superseded notices, ordinary-policy history/last-known handling and the mirror.
4. Complete actual generated correction differential tests over seven supported
   families × both fog modes × GM/owner/distinct teammate/opponent/spectator.
   Expected values must come independently from ordinary projection. The current
   leaf registry/coverage is not that differential proof. None of the six
   mandated differential/privacy/RNG mutants has been executed or claimed killed.
5. Replace the production raw SP setter path; finish real IndexedDB cold
   recovery, duplicate/no-op approval and private-ledger success ordering.
6. Implement hosted strict intent, private draft resolution, admission order for
   spectator-shaped GMs, stale/head/branch/rate/paused/completed gates,
   decide/stamp/atomic commit/outbox/journal adoption, full-frame verification,
   retry/receipt handling and cold recovery in off/enabled authority modes.
   The existing authority helper alone proves none of this integration.
7. Merge R11a when it is available and owner authorization permits resumption;
   add version wiring last in a separate commit, using the next integer on the
   then-current merged base. Do not create a competing version owner.
8. Run approved focused/hosted gates after resumption; attribute any schema,
   fingerprint/digest/golden movement. Do not regenerate committed evidence.
9. Keep P2P, unit reload and #3306's affected controls blocked until their
   applicable proofs pass. Any supported-family UI re-enable is a follow-up;
   reload retains a visible named unsupported reason.

KEY FILES
---------
1. src/engine/InteractiveSession.gmCorrection.ts — authority preparation/awaited persistence.
2. src/engine/InteractiveSession.ts — new SP/scratch entrypoints and pending-write guards.
3. src/lib/interventions/GmCombatInterventionProjection.ts — shared resolved application owner.
4. src/lib/interventions/GmReplayCorrectionSchema.ts — closed authority schemas and sanitized parser.
5. src/lib/interventions/GmReplayCorrectionAdmission.ts — named refusals.
6. src/lib/interventions/GmCorrectionLeafPolicy.ts — explicit carrier/refusal inventory.
7. src/lib/interventions/__tests__/GmCorrectionLeafCoverage.test.ts — schema-leaf coverage.
8. src/engine/__tests__/InteractiveSession.correctionReplay.test.ts — SP regression/failure/roller tests.
9. src/lib/multiplayer/server/gmCorrectionAuthority.ts — fresh durable GM authorization helper.
10. openspec/changes/persist-typed-gm-corrections/ — incomplete specification/tasks/ledger.

IMPORTANT DECISIONS
-------------------
Dependencies:
- R11a is independently owned and now parked. Its rulings remain recorded in
  d8-fidelity/R11-PROPOSAL.md §0 and PARITY-PLAN §§39–43: shared
  src/types/gameplay/ReplayFidelityVersion.ts; writer 2; absent reads 1 without
  rewriting; immutable shipped rule minima; named reload-required reader
  failure. C-1c 2b plans 3. R10 takes the next number on its final merged base.
  R11a had no visible branch/PR when this lane checked. No R11a merge was made.
- Viewer proposal exists at:
  E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R10-VIEWER-CONTRACT.md
  Root has not approved it in this lane. It proposes closed typed per-field
  viewer map/list deltas, the exact approved superseded notice, strict parser,
  ordinary-carrier policy reuse, and receipt/history-based reconstruction.
- Reconnect duplicate-events reachability: pending, not investigated here.

Refused leaves/families so far:
- Named no-carrier refusal: lifecycle after.rescued, including false; turn-order
  after.activationIndex, after.initiativeOrder[], after.activeUnitId; undefined
  pendingAction variants. The latter is outside every supported closed effect.
  Source: approved R10-FIELD-TABLE.md rev 2 §4, order/lifecycle/reload-pending rows.
- Full heat/ammo ammoState slot snapshots are refused because their required
  metadata has no AmmoConsumed carrier. Gap leaves:
  after.ammoState.*.location, maxRounds, damagePerRound, caseProtection,
  isExplosive. Source: rev 2 §4 heat/ammo row's unsupported-slot qualification;
  Appendix A ammo/ammoState rows at lines 214 and 233.
  AmmoConsumed represents binId, weaponType and remainingRounds; its reducer
  only changes an existing bin's remainingRounds. The new refusal was added
  after the last red witness and has not been rerun.
- Whole unit-reload family: gm-correction-unit-reload-unsupported. Root/C4
  explicitly accepted this boundary because the full snapshot necessarily
  contains unrepresented required members. No partial reload DTO is built.
- The 35 explicit BLOCKED reload members are all under effects[].after.unit;
  each includes its descendants. Exact approved Appendix A references:

| Member | R10-FIELD-TABLE.md rev 2, Appendix A after.unit line |
|---|---:|
| grappledUnitId | 151 |
| isGrappleAttacker | 152 |
| grappledThisRound | 153 |
| grappleSide | 154 |
| isChainWhipGrappled | 155 |
| isSpotting | 161 |
| spotTargetId | 162 |
| partialWingJumpBonus | 197 |
| leftLegHasTalons | 198 |
| rightLegHasTalons | 199 |
| leftArmHasTalons | 200 |
| rightArmHasTalons | 201 |
| leftArmHasClaw | 202 |
| rightArmHasClaw | 203 |
| carriedGroundObjectIds | 206 |
| hasStealthArmor | 207 |
| startingInternalStructure | 210 |
| pilotWounds | 215 |
| pilotConscious | 217 |
| isBracing | 229 |
| empInterferenceTurns | 231 |
| empShutdownTurns | 232 |
| pendingPSRs | 237 |
| weaponsFiredThisTurn | 238 |
| neuralInterfaceMode | 243 |
| isDodging | 256 |
| narcedBy | 258 |
| iNarcPods | 259 |
| tagDesignated | 260 |
| isIlluminated | 261 |
| unitHeight | 267 |
| infantryMounted | 274 |
| infantryMountHeight | 275 |
| combatState | 276 |
| rescued | 277 |

Appendix A additionally requires exact mapping for pending heat buckets,
represented equipment/status fields, ammo-slot members and sealed pending
choices; these have not been certified. Whole-family reload refusal covers
every reload request, not just the 35 named BLOCKED members.

EXPLICIT CONSTRAINTS
--------------------
No new implementation or further manual runs after the park directive.
Commit current work without bypassing hooks; push once; draft PR only,
titled [PARKED] D-8 R10 …, explicitly not for merge.
Never merge, use --admin/--auto/--no-verify, alter Git configuration, install
dependencies, start subagents or regenerate fixtures/digests/catalogs.
Use git -C with the absolute assigned worktree for Git operations.
Future main updates use fetch and merge, never reset/rebase.
The differential plus all six killed mutants must land with the first writer
PR before Root can approve merge. Root's approved superseded shape is
{ status: 'superseded', originalVisibleEventId }.
Corrections draw no dice and trigger no cascade.
Optional GM-private inconsistency warnings are a follow-up, not implemented.

CONTEXT FOR CONTINUATION
------------------------
Canonical shared state note:
E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R10-PAUSE-STATE.md
Repository copy:
docs/audits/2026-11-09-r10-pause-state.md
Assigned workspace:
C:/Users/wroll/.t3/worktrees/MekStation/t3-7a56eb6a-63347ef8f875b53a
The draft PR is a preservation artifact. Its head and hosted-check state belong
in PR metadata and the lane's final report, not a claim of completion.

TO CONTINUE IN A NEW CODEX SESSION:
1. Open the same workspace and read this state note and the parked draft diff.
2. Paste this context and obtain explicit owner authorization to resume.
3. Resolve reconnect reachability, R11a and Root's viewer-schema ruling first;
   then state the next approved task. Preserve all recorded red evidence.

