# Goal statement - the goal-drivable roadmap loop

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
4. **Review** - two lanes, as DELIVERY.md step 5 defines them. Lane A is a cross-model agent review that shares no context with the implementer; its `review` receipt records `reviewerModel`, `implementerModel`, effort, the reviewed head and a sha256 of the review output, and the validator rejects a receipt whose reviewer and implementer are the same model. Lane B is the owner ruling required for the authority, privacy, migration, replay, idempotency and concurrency classes and for any owner-gated unit: a PR comment beginning `OWNER-RULING <40-hex head>` with the `owner-ruled` label, receipted by comment id, author login, head and body sha256. Lane A is never recorded as a GitHub approval, and a Lane B ruling is void the moment the head moves.
5. **Merge** - observe the required checks on the exact proposed head, then merge with a head-SHA guard and record the head and the merge commit in the `merge` receipt. The validator requires `review.head === merge.head === prHead` and `merge.mergeSha === mainProof.mergeCommit`, all 40-hex, so a merge cannot be attributed to a head nobody reviewed.
6. **Main proof** - fetch the merged commit and run the unit's required post-merge proof against that exact commit, recording it in the `mainProof` receipt. `--git` re-checks that the merge commit is an ancestor of `origin/main`.
7. **Tick** - only now check the `tasks.md` rows the unit holds, and record the `tick` receipt. The validator re-reads the live `tasks.md`, matches each row by source id and text rather than by line number, and fails if the row does not actually read `- [x]`. Rows tick whole or not at all: a row is checked only when every scenario its letter names is proven on main at the tick commit, and partial proof is a receipt on the open row, never a tick (owner decision OD-whole-row-tick-rule, 2026-09-22).

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
- **Caps** are per unit and never exceed the owning node: at most 15 files and 500 non-generated changed lines, lower where the unit says so. The 500 counts non-generated product lines only: test lines are reported separately in the unit's receipts and never count toward it (owner decision OD-line-cap-product-lines, 2026-09-23; `caps.maxNonGeneratedLines` in units.json is unchanged). The cap counting rule (U41): a unit's counted lines are the added lines `git diff --numstat --no-renames <mergeSha>^1 <mergeSha>` reports (the squash commit against its parent on main), skipping the ledger's evidence/ directory, generated files (package-lock.json, .next/, __snapshots__/ and *.snap, public/data/, src/types/contracts/generated/) and test files (__tests__/, e2e/, *.test.* and *.spec.*), and `validate-roadmap.mjs --git` fails a unit whose count exceeds its `caps.maxNonGeneratedLines` unless its `capException.countedLines` records that exact count.
- **Docs-class units** - those owning only `openspec/planning/**` or `docs/**` - are combined into one documentation PR and merged with the administrative merge that lane already uses. **Product-class units** ship one PR each and wait for the full required check set on the exact proposed head. A combined PR containing any product path is product class.
- **Node 22** for every `node`/`npm`/`npx` call: `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH`.
- **Two-core CPU allowance.** Serialize `next build`, Playwright runs and other CPU-heavy local processes across lanes; poll the node process list before starting one. Model concurrency is a separate budget from CPU concurrency.
- **Port 3639** is the primary server only (3617 for the two-process harness's second server); every browser run gets an owned port, an isolated durable store and a recorded server PID.
- Work in a program-owned worktree branched from a freshly fetched `origin/main`; never touch the root checkout's working tree or index.
