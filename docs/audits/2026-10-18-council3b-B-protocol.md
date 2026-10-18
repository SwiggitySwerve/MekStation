# Council 3B: coordination protocol and agent autonomy

2026-10-18. Recommendation for Root adoption; this report grants no new admission. Read-only research; only this report was written.

**Decision:** delegate complete bounded stages, with predetermined handoffs. Root owns admission, integration, rulings and resource allocation; agents own execution inside their charter. More agents help preparation and review. They do not remove predecessor gates or create additional product-writing authority.

## Evidence and corrections

Inspected PLAN.md and the current STATUS.md entries in `.omo/plans/mekstation-phased-delivery-20261015`, the supplied uncommitted project review, nightly diagnosis reports, and the three roadmap ledgers at local `origin/main` **1e0a34dc5**. No runtime checks were run.

The live `units.json.l1ReleaseChecklist20261018` names **36 closures: 12 main-verified, two planned, 22 blocked**. The brief/STATUS's 33 omits the three smoke registrations. Thus 24 remain on the full release checklist, including the parallel proof branch; this is not a completion percentage or a new serial-chain estimate.

T3 history provides direct evidence. In [lane B](t3-thread://v1/thread:delegated-task:command%3Amcp%3A310c61f3-de87-486d-b9d3-2c11dd9b4cd9%3Adelegate-task%3Amek-baseline-b-sol-20261018-r1), timeline positions 127–130 record the subagent watcher rejection; 187 records completed proof waiting for #2278; 208 and 214 repeat Root's correction through both a steering message and a pending-question answer. Position 215 resumes the rebase. These are protocol stalls, not missing technical capability. Its pending-question list was empty when inspected.

The live tool contracts establish: async completion wakes the parent; `task_status.summary` remains the original result; follow-up work may have a new task ID; `hasPendingChildRuns` and `latestTerminal*` matter. `t3_thread_send(auto)` can start, steer or queue. A sent message is not proof it was consumed. New independent review rounds require new `delegate_task` calls.

## Standing execution rules

**Rebase autonomously.** Fetch and inspect latest Main before admission, PR publication, conflict repair and merge readiness. Never wait for Root to copy a public merge SHA: obtain it through GitHub/Git and verify ancestry. Rebase only the assigned branch, preserve evidence, rerun affected checks and re-census ownership/caps. Resolve mechanical conflicts inside the manifest; escalate semantic conflicts or unexpected remote changes. Push rewritten history only with an explicit expected-head lease. Root pins merges to the reviewed head.

A dependency on another PR's eventual merge does not prohibit independent implementation or CI. #2279 can progress now; after #2278 merges, integrate its fixture-root setting. Freeze the candidate once review starts. A subsequent rebase or fix invalidates head-bound approval/CI/ruling claims: record old/new heads and obtain the required review and proof for the replacement. Never relabel old evidence.

**After opening a PR, hand off immediately.** Link it, publish `REVIEW_READY`, and end the stage; do not wait for green CI before requesting review. The handoff contains PR/base/head, manifest and cap measurements, sensitivity, acceptance matrix, proof commands/results/artifact hashes, unresolved findings, dependencies, and a complete reviewer prompt. Root launches the named independent reviewer and starts the parent-only PR watcher in the same dispatch turn. Review and CI overlap. No child watcher or polling loop.

Use this review prompt: “Review PR [URL] at [HEAD] against [contract/manifest], class [classes]. Verify acceptance, ownership/caps, evidence and applicable adversarial cases. Preserve prior findings [links], responses and unresolved objections. Return APPROVE/CHANGES, exact head, findings and evidence limitations. No edits/merge; heavy work requires the queue.” Full sensitive review remains full review, even for test/workflow changes.

Prepare closure instructions and successor analysis during CI/review. Their admission still waits for the existing gates. On merge, Root dispatches the already-prepared closure stage; on closure readiness, the named verifier. No need to rediscover the procedure each time.

**Pre-authorized inside an admitted charter:** read-only research; successor preparation without source admission; scoped edits and ordinary fixes; affected lightweight checks; assigned-branch rebase/push/PR updates; review packets; owned-process cleanup; reporting blockers. An authorized heavy command additionally needs its resource grant.

**Root decisions:** admission and GATE OPEN; ownership/reservation exceptions; manifest/cap/contract/dependency changes; concurrency exceptions; quarantine/assertion/retry policy changes; sensitive OWNER-RULING; merges and closure acceptance; resource priority or disputed/stale ownership; release/installation actions outside the recorded grant; unresolved security or product-policy tradeoffs. Root applies existing owner authority and records its basis; missing authority goes to the owner. Standing direction does not fabricate an OWNER-RULING or human attestation.

## Ownership and heavy work

Assign **B as the sole nightly-workflow integrator** for the remaining baseline batch. C supplies a patch and proof. Treat A's already-reviewed fixture-root edit as a grandfathered incoming change; do not churn #2278 merely to move it. After A merges, B rebases and validates the composition. No further A/C workflow edits. Give ledger/lifecycle integration the same single-writer treatment; product ownership and integration ownership are distinct.

For blocked-unit files, require a bounded **baseline repair admission**, not an informal exemption. C/F submit the reproduced failure, exact leaves, all intersecting holders, proposed behavioral delta, cap fit, proof plan and deferred work. Root records the authorized carve-out or registers the required predecessor amendment, reconciles reservations, and assigns one writer. Keep the blocked unit blocked; a repair earns no successor acceptance. Privacy/replay/persistence repairs retain sensitive gates. Until admission, C/F finish the routing packet and stop editing disputed paths. “Baseline first” is not blanket permission to invade LSC/H.

Resolve the concurrency tension explicitly: retain one product-writing lane, including closure, plus the already-authorized disjoint A1/A2/B proof lane. Finish admitted baseline repairs; Root must state any further finite exception before work starts. Parallelize research, review and preparation freely within configured limits. Do not let optional L2/DF/EQ work displace baseline or L1 gates.

Replace competing idle polls with **one Root-owned heavy queue**. Each request states lane, exact command, SHA/build identity, expected duration and dependency unlocked. Root grants one command bundle at a time; the existing machine-idle check remains mandatory, including Jest detection from #2280. Priority: baseline-blocking validation, then critical-path closure, then A1 proof, with explicit ordering within each class. Do not preempt a running bundle. Preserve separate worktrees, outputs and owned PIDs. Completion/failure releases the slot. An expired estimate triggers inspection, not permission to overlap or kill an unknown process. After one BUSY result, report the observed holder and yield.

## Events, pending requests and the lane board

Use one JSON event in the final stage result, or an early parent message explicitly authorized by the charter:

```json
{
  "schema": 1,
  "eventId": "C:7",
  "lane": "C",
  "taskId": "…",
  "childThreadId": "…",
  "state": "BLOCKED",
  "head": "…",
  "blockedOn": [{ "kind": "OWNERSHIP", "key": "P2CG1H", "resolver": "Root" }],
  "nextAction": "Approve exact-leaf repair admission",
  "resumeWhen": "recorded admission",
  "evidence": ["path#sha256"],
  "safeNext": "Finish review packet",
  "updatedAt": "UTC"
}
```

States: `PREPARING`, `IMPLEMENTING`, `WAIT_HEAVY`, `REVIEW_READY`, `REVIEWING`, `CHANGES`, `WAIT_CI`, `WAIT_RULING`, `WAIT_MERGE`, `CLOSURE`, `VERIFIED`, `BLOCKED`. A blocker always names its resolver and release condition. Do safe independent work, then end the turn; do not spin. Root acknowledges the event ID once. This is a message convention, not an implemented automatic JSON parser.

For genuine questions, Root reads `hasPendingQuestion`, then calls pending-request list/read/respond on the child thread. A normal steering message does not replace answering the pending request. These APIs exclude permission approvals; never substitute them for owner decisions. Avoid opening user-input questions merely to request CI watching, a SHA, or routine next-stage work.

Track every new task ID, including IDs returned by follow-up sends. Use stable client request IDs across retries, distinct IDs across rounds. Independent review: fresh `delegate_task` with full context. Same-implementer correction: `t3_thread_send` with explicit mode and tracked returned task/run. Inspect delivery before duplicate dispatch; do not treat a completed original task as completion of later child work.

Put one short **current lane board at the top of STATUS.md**, above its history. Root alone updates it; agents send events. Each row holds lane, accountable agent, task/thread IDs, stage, head/PR, next action and actor, blocker/release condition, heavy-slot position, last event/time, and charter/evidence links. Show the supported user journey and actual remaining blockers above it. `units.json` remains the acceptance ledger; thread state is execution state. No second canonical acceptance database. This report does not edit STATUS or the root checkout.

On every wake Root drains pending questions and completion events, updates the board, dispatches review/correction/closure transitions, registers PR watches, then grants the next heavy slot. End the turn when only external waits remain. Measure review-ready-to-dispatch delay, blocker age, heavy-queue wait and journey evidence—not agent count.

## Standard lane charter header

```text
LANE / OUTCOME / PRIORITY:
PARENT THREAD / EVENT DESTINATION / TASK ID:
STAGE / BASE SHA / WORKTREE / BRANCH:
AUTHORITY: exact instruction/ruling; admitted unit or preparation-only
WRITE MANIFEST / RESERVED SHARED FILES / CAPS / SENSITIVE CLASSES:
DEPENDENCIES: exact closure/evidence predicates; permitted safe preparation
AUTONOMY: scoped repair/rebase/push; no merge or gate bypass
HEAVY BUNDLE: command, estimate; grant required; owned PID/output scope
HANDOFF: reviewer + full prompt; parent owns CI watch; closure verifier
STOP/ESCALATE: disputed ownership, cap/scope/policy change, unknown process
REPORT: JSON events to parent explicitly authorized; event IDs; evidence pins
DONE: stage deliverable and next actor; end turn after handoff
```

## Actions for Root, in order

1. Correct STATUS to 12/36 and populate the current lane board from live task/PR state; adopt the charter and event convention.
2. Drain existing questions; ensure parent watches cover every active PR. Dispatch #2281's full Fable review now with its exact head while CI runs.
3. Confirm B owns remaining workflow integration; let #2279 progress independently, then rebase after #2278 without a manual-SHA dependency.
4. Resolve C/F's exact ownership admissions and sensitive review routes; explicitly bound product-writing concurrency before admitting more repairs.
5. Publish the single heavy queue, prioritize baseline proof, then closures and A1; stop competing idle polling.
6. Prewrite review, closure, verifier and successor handoffs for B14 → HEAD → HP → LSC and A1 → A2 → B. Release each only on its existing gates.
7. Obtain trustworthy baseline evidence, then complete the ordinary shared journey, installer rehearsal and human session. Keep optional expansion held.
