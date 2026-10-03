# Goal statement - the goal-drivable roadmap loop
> **Status:** Active; CNI0 bootstrap admitted, native closure debt open
> **Created:** 2026-09-16
> **Updated:** 2026-10-03

This is the statement to point `/goal` at. It describes one loop, run one unit at a time, over the unit ledger that rides beside the roadmap of record.

## What to loop over

The work list is `units.json`, linked from `roadmap.json` as `unitLedger`. Never pick a unit by reading the file and choosing; ask the validator:

```
node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs --next
```

It prints exactly one unit id, and that is the unit you work. If it prints `NONE-ADMISSIBLE: <n> owner-gated, <m> blocked` it exits 3, and that sentence is the state of the program, not a puzzle to route around. A unit is admissible only when it is `planned`, every `dependsOn` of its node (or of the node it is re-owned to) is `main-verified` or `complete`, it is not owner-gated, and no in-flight unit already owns one of its paths. Run the validator with no arguments before and after every change to the ledger; it must print `ROADMAP VALIDATION PASSED` with unchanged counts.

Each unit carries its own behavior sentence, ownership paths, review classes, caps and `ciClass`. Those are the whole brief. A unit is never widened while it is being worked; a unit that turns out to need more is parked as a packet and a narrower successor is written.

## The seven stages, their receipts and their gates

Every unit walks the same seven stages, and each one writes a receipt into `stageReceipts` before the next begins. The validator refuses a state whose earlier receipts are missing, so the ladder cannot be climbed out of order.

1. **Admission** - verify the node dependencies, the active package and fetched `origin/main`, then record the exact baseline commit, the owned paths, the intended behavior and the acceptance commands in the `admission` receipt. The unit moves to `admitted`.
2. **Red** - reproduce the failure at the real boundary before changing it and keep the failing output in the `red` receipt. A test that only repeats the implementation, weakens an assertion or converts a failure into a skip is not red evidence.
3. **Local** - implement the smallest complete slice inside the unit's caps, run the package's focused tests plus the applicable type, lint, format, QC and build gates, and record the commands and their results in the `local` receipt. The unit reaches `local-verified`.
4. **Review** - two lanes, as DELIVERY.md step 5 defines them. Lane A is an independent-context review under the audited version-2 contract below; its `review` receipt records truthful models, effort, the reviewed head and the review-output SHA-256. Historical unversioned receipts retain the cross-model rule, including reviewer/finisher inequality. Lane B is the owner ruling required for the authority, privacy, migration, replay, idempotency and concurrency classes and for any owner-gated unit: a PR comment beginning `OWNER-RULING <40-hex head>` with the `owner-ruled` label, receipted by comment id, author login, head and body sha256. Lane A is never recorded as a GitHub approval, and a Lane B ruling is void the moment the head moves.
5. **Merge** - observe the required checks on the exact proposed head, then merge with a head-SHA guard and record the head and the merge commit in the `merge` receipt. The validator requires `review.head === merge.head === prHead` and `merge.mergeSha === mainProof.mergeCommit`, all 40-hex, so a merge cannot be attributed to a head nobody reviewed.
6. **Main proof** - fetch the merged commit and run the unit's required post-merge proof against that exact commit, recording it in the `mainProof` receipt. `--git` re-checks that the merge commit is an ancestor of `origin/main`.
7. **Tick** - only now check the `tasks.md` rows the unit holds, and record the `tick` receipt. The validator re-reads the live `tasks.md`, matches each row by source id and text rather than by line number, and fails if the row does not actually read `- [x]`. Rows tick whole or not at all: a row is checked only when every scenario its letter names is proven on main at the tick commit, and partial proof is a receipt on the open row, never a tick (owner decision OD-whole-row-tick-rule, 2026-09-22).

## Merge topology and whole-tree attestation

Use parent-delivered `--squash --match-head-commit <exact-reviewed-head>` by default; observe the actual commit, not the method label. Closure supports one actual parent, or exactly two ordered actual parents only when parent2 is the independently reviewed PR source head. Parent1 is the actual main-side target, not the registered baseline. Both topologies retain commit, merge-base and ancestry guards: missing/noncommit/unrelated or future source, and source already integrated into parent1, refuse. Zero or three-plus parents and wrong/reversed/stale second parents refuse.

For either topology, conflict-free native `git merge-tree --write-tree --no-messages parent1 reviewedHead` must exit 0, return exactly one 40-hex tree, and equal the WHOLE actual merge tree. Reviewed-tree equality or touched-path comparisons cannot replace it; merge-only edits and dropped parent content refuse. Only the two-parent `treeIntegration` receipt adds ordered `parents`; the original sole-parent shape is unchanged. Review identity, runtime, strict, ownership/caps, CI and prospective-ledger gates remain mandatory.

## Audited review identity (2026-09-29)

New receipts use `reviewContractVersion: 2`. The local receipt contains `implementationActors`: exactly one author and every actual finisher/edit contributor, with role, observed `task_id`, `child_session_id` and truthful model. Deduplicate an author who also finishes. Fold preserves this census inline; parent independently audits its completeness. Optional scalar `finisherModel` must truthfully name a single finisher, never substitute for the complete census. Changing the head or adding a contributor after review requires a new frozen head/census/review.

Closure requires paired `--review-identity <json-file>` and `--engine-records-dir <directory>`. The manifest binds unit, source head, whole local-receipt and review-output hashes, author/reviewer snapshot refs and mandatory `finishers[]`, including an empty array. Every ref carries safe relative forward path, SHA-256 and byte length. Snapshots carry only observed `task_id`, `child_session_id`, `model`, `execution_mode`, nullable `agent_type` (null when absent), and `resolved_model.provider/model_id`, with the registered unit/head/review-hash/observation-time envelope; `model` must equal provider + '/' + model_id. The first six review lines contain exactly one plain `Verdict: APPROVE`, `reviewedHead:`, `reviewerModel:` and `reviewContractVersion: 2`, matching those bindings.

Reviewer task AND child session must differ from author AND every finisher, even when models differ. Honest independent same-model review is allowed only in version 2. Missing/null/unknown/partial/downgraded evidence refuses, including under `--no-evidence`. Closure compares caller-supplied live task-derived records and validates the complete prospective ledger before publishing modern receipts/state. It archives checked bytes as content-addressed `identity-<sha256>.json` snapshots and `review-identity-<sha256>.json` manifests, checking all existing content before writing any archive and never overwriting conflicting bytes. Consumer reopens immutable portable archives, verifies bytes/hashes and external/inline agreement. No private engine directory is archived. Hashes establish integrity/binding, not cryptographic engine authenticity: trusted parent/independent observer must compare the allowlisted observations and actual contributor census to live engine records.

PRI itself has no exception. Freeze source head, obtain a NEW independent exact-head source reviewer and real author/all-contributor observations, exercise candidate producer/consumer on controlled mirrors, then require CI, pinned merge, exact-main PASS and truthful closure. Synthetic QA and registration approval do not approve the source unit. Valid historical unversioned cross-model receipts stay byte-unchanged; invalid same-model legacy remains rejected. All other gates below remain binding.

## Owner-approved Codex-native prerequisite (2026-10-02)

The owner's `approved` decision admits only the CNI0 named docs-bootstrap lifecycle and the LOCAL version-3 trust policy in [the registration](evidence/cni-registration-20261002.json). This dated section supersedes the earlier no-bootstrap and version-2-only wording only for this new transport. Existing historical/v2 observations, provider law, receipts, actors and resources remain unchanged. CNI0 is not v2-closed. Its canonical unit remains blocked with native closure debt OPEN until genuine version-3 candidate intake and portable consumption exist and its full evidence is published.

The new transport truthfully records provider `openai`, model `gpt-6.1-sol` and actual served `high` or `xhigh` effort. It never aliases `chatgpt-subscription/gpt-6.1-sol`; subscription identity is unproved. LOCAL trust requires all three independently correlated sources: actual native `item_completed`/`McpToolCall` completion/result bytes, matching live App thread/turn/call/status/workdir observations, and independently witnessed raw route/parent/context with source provenance/integrity. Local writable files, hashes, requested spawn arguments and role TOMLs alone do not authenticate execution.

Require exact source HEAD/tree/index/diff and relevant dirt, full current-source/reviewer-output byte readback and independent reopen, exactly one author and every real contributor, audited complete-or-empty finisher census, and a fresh reviewer in a different native session/task identity without author context. A reviewer who edits becomes a contributor and voids review. Parent contributors count. Refuse absent, foreign, stale, changed, aliased, ambiguous, truncated, fabricated or downgraded inputs. The 330-byte marker qualifies one bounded result/call only; it proves no large-output, complete-census or SOURCE approval.

CNI1 is ONE atomic thirteen-file source PR under the registration's exact grant and `sourceSizing.CNI1`. The review-identity package owns identity policy through `review.mjs`; the ledger library remains its orchestration/reexport facade, the named producer owns capture, and the portable consumer dispatches the same exact versions. Preserve legacy outcomes/bytes; do not widen Senpi IDs or invent engine fields. Native archives use distinct `codex-observation-<sha256>.json` and `codex-review-identity-<sha256>.json` names. CNI2/CNI3 publish finite actual evidence prefixes separately; partial publication completes no unit and releases no original task.

CNI1 source sizing remains the exact registered sourceSizing.CNI1 contract. Later direct per-file/cleanliness instructions govern the distinct native ordinary planning/evidence path through planningSizing in the same registration. That owner replaces future manual aggregate addition ceilings; it does not change canonical numeric unit/node fields, their historical source-merge checks or unrelated product contracts.

`--next` enforces node dependencies/state and existing ownership paths, not documentary unit predecessors or exception-only reservations. CNI0's approved docs delivery is explicitly selected by the parent, outside canonical closure, through `R0.cni-registration`; that milestone starts planned and reaches main-verified only after actual registration merge/main proof. CNI1 waits for that milestone, not fictional CNI0 closure. Later milestones similarly mean actual source or prefix delivery, never full native closure. Keep CNI0-CNI3 units blocked until their documented admission conditions are genuinely met; no prefilled review/merge/mainProof/tick receipts. The parent must freeze/check all exact exceptions and ordinary gates; the existing validator does not enforce those prospective reservations or the bootstrap policy.

The only bootstrap is CNI0 docs delivery: independent exact-head Sol high/xhigh review under the approved live native observations, actual required CI/owner gates, guarded merge, actual main-source proof and evidence reopen/owned cleanup. CNI1 uses its genuine candidate producer/consumer for source qualification and closure, with isolated SOURCE review reproducing two mutants. CNI2/CNI3 must discharge CNI0 and CNI1 native debt with complete actual observations and portable archives. Repeat original Task1 on fetched current main only after discharge; registration, source merge and fixture success cannot release it.

Milestones advance through separate ordinary follow-up PRs confined to units.json, roadmap.json and, if needed, the existing registration JSON. Each records an already merged/proved predecessor, never its own future merge: registration proof enables only CNI1; actual source proof enables only CNI2; actual prefix proof prepares only the blocked successor. CNI2P owns only those three files and must complete actual Main/custody/cleanup before separately registered CNI3R corrects the existing six policy files. CNI3R actual Main/custody/cleanup precedes recovery/component admission. Original objects/order, states, task holders and OPEN debt remain truthful. planningSizing owns future ordinary sizing; retain historical raw/U41 counts without an accumulated reserve, reset or deletion credit.

## How to park

When a unit cannot proceed because a real decision belongs to the owner, do not guess and do not narrow the row. Write a decision packet in `units.json`: a closed question in one sentence, at least two options each with its consequence and effort, the agent recommendation, the revert cost, `decision: null` and `ruling: null`. Move the affected unit to `owner-gated` with `ownerGate.packetId` naming the packet, or, if no unit exists yet, let the packet hold the task keys directly. The loop then continues with the next admissible unit. A packet is resolved only by the owner recording a decision and a head-bound ruling; an agent never fills in `decision` or `ruling`.

A row that belongs to a different lane is deferred rather than parked: a deferral names the task keys, the sibling node that will carry them, and a reason quoting the source text that says so.

## What terminal means

The program is terminal when both of these hold:

- `--next` exits 3, and
- for every activated package - every package with at least one unit - each open occurrence in the admission snapshot is either delivered by a unit whose tick receipt is recorded on main, parked in a packet, or deferred to a named node.

The holders rule is what makes the second condition checkable: the validator fails if an activated package has an open occurrence that no unit, packet or deferral holds. Terminal is therefore a validator verdict, never a judgement call, and a program that is terminal with packets outstanding is honestly parked rather than finished.

### Forbidden moves

- Narrowing a row's letter so it can be ticked. Re-write the letter through a spec change, or park it.
- Editing `evidence/admission-snapshot.json`, or any occurrence key derived from it. The snapshot is the frozen admission record; a package outside the admitted thirteen needs a second snapshot passed through `--snapshot`, never an edit of this one.
- Self-approving Lane B. The agent never writes the `OWNER-RULING` comment, the label, or the packet decision.
- Flipping a production flag to make a proof pass. Cutover flags move only through the slice that owns the cutover.
- Checking a `tasks.md` row without a tick receipt taken on main. A merged PR is not a tick.

## Standing constraints

- **No AI attribution** anywhere - commit messages, PR bodies, comments. The repository's commit-guard hook enforces it.
- **No `--no-verify`**, no force-push, no amend, no administrative bypass on a product unit, no relaxed validator.
- **Caps** are per unit and never exceed the owning node: at most 15 files and 500 non-generated changed lines, lower where the unit says so. The 500 counts non-generated product lines only: test lines are reported separately in the unit's receipts and never count toward it (owner decision OD-line-cap-product-lines, 2026-09-23; `caps.maxNonGeneratedLines` in units.json is unchanged). The cap counting rule (U41): a unit's counted lines are the added lines `git diff --numstat --no-renames <mergeSha>^1 <mergeSha>` reports (the squash commit against its parent on main), skipping the ledger's evidence/ directory, generated files (package-lock.json, .next/, __snapshots__/ and *.snap, public/data/, src/types/contracts/generated/) and test files (__tests__/, e2e/, *.test.* and *.spec.*), and `validate-roadmap.mjs --git` fails a unit whose count exceeds its `caps.maxNonGeneratedLines` unless its `capException.countedLines` records that exact count. The named native ordinary tasks below are explicitly selected and measured under registration.planningSizing, not a new canonical-unit cap interpretation.
- **Docs-class units** - those owning only `openspec/planning/**` or `docs/**` - are combined into one documentation PR and merged with the administrative merge that lane already uses. **Product-class units** ship one PR each and wait for the full required check set on the exact proposed head. A combined PR containing any product path is product class.
- **Node 22** for every `node`/`npm`/`npx` call: `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH`.
- **Two-core CPU allowance.** Serialize `next build`, Playwright runs and other CPU-heavy local processes across lanes; poll the node process list before starting one. Model concurrency is a separate budget from CPU concurrency.
- **Port 3639** is the primary server only (3617 for the two-process harness's second server); every browser run gets an owned port, an isolated durable store and a recorded server PID.
- Work in a program-owned worktree branched from a freshly fetched `origin/main`; never touch the root checkout's working tree or index.

## Named native ordinary publication and recovery contract

The registration is the single policy owner: planningSizing, ordinaryPublicationTasks, ordinaryPublicationMilestones and historicalRecovery. These sections supersede the native CNI3 single-publication-package scheduling/accounting obligation only for the named ordinary tasks. Each task retains its exact finite file grant and ordinary delivery gates; no new bootstrap, canonical unit, NEXT selection or sourceInventory capture under a task ID is created. Root selects one registered task manually after its actual predecessor Main/custody/cleanup, reserves all literal files, freezes/reopens complete path/byte/hash/physical-line/diff metrics and verifies independent cohesive review. Canonical CNI3 stays blocked with null own receipts; component merges never become its source ladder.

CNI3A publishes only CNI1 admission/red/new LOCAL and the two planning files. CNI3B publishes the matching new review/output/all original-contributor observations/manifest and merge/Main/tick/logs with the two planning files. CNI3C publishes full CNI0 evidence and the two planning files, including every actual finisher. CNI3D owns only the three predecessor-proof/debt-agreement planning/registration files. Actual filename/hash freezes, source/merge identities, full gate matrices and lifecycle evidence belong to the registration's task contracts; empty or null fields prove nothing. All public refs exist in the same package or an accepted predecessor. Partial publication completes no canonical source unit or original Task1.

Only an explicitly admitted complete private prospective ledger may move the selected historical CNI0/CNI1 entry from blocked to planned before the unchanged fold. Root qualifies real source/dependencies/admission/red preimages, complete actors, exact private scope and a sensitive decision packet first. The assigned private performer records that admission, keeps debt OPEN, validates the full ledger and uses a new truthful ready LOCAL owned by the genuine original author. Historical committed grants/source and public live state do not change. Public CNI3A carries blocked/OPEN CNI1 with only first-three-stage receipts, actual packet and later paths null.

Original actors complete actual new full source readbacks; reviewers are fresh isolated Sol high/xhigh contexts; Root is the accepted separately authenticated observer and never a bound-LOCAL/source contributor observing itself. All native/App/result/route/birth/followup/terminal/census/full-byte bindings and privacy guards remain mandatory. Actual current accepted producer, complete prospective repository and unchanged historical source/merge proof roots are distinct. Full source-unit closure needs new tuple intake, portable/public consumption, real owner/CI/whole-tree/Main and evidence custody/cleanup. The separate discharge milestone and its follow-up use already observed component proof only; original Task1 is freshly qualified on fetched current main afterward.
