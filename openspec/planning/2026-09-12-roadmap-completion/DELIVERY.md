# Delivery, verification, and cleanup contract

This roadmap is authorized by the user's 2026-09-12 request for implementation, verification, incremental PRs, merging, cleanup, and completion. The parent owns decomposition, integration, acceptance, and Git delivery. Workers own only their assigned files or evidence question.

## One bounded change at a time

1. Admit the next slice from `roadmap.json`: verify dependencies against current source, the active package, required predecessor receipts, and fetched `origin/main`. Capture the exact baseline commit, file ownership, intended behavior, and acceptance command. Inspect open PRs and existing worktree ownership before starting another worker.
2. Resolve missing or contradictory requirements in a small spec change before implementation. A roadmap is not an apply-ready OpenSpec delta. Existing package task/PR caps still apply; use the stricter cap if two packages overlap. Default new slices target one behavior, no more than 15 files and 500 non-generated changed lines. The history/effect packages explicitly permit 1000 lines; that is a ceiling, not a target. Split larger work into buildable prefixes with no forward dependency.
3. For behavior repairs, reproduce the failure at the actual boundary before changing it. Implement the smallest complete slice and retain the red/green evidence. Do not create tests that merely repeat implementation, weaken assertions, or convert unexpected failure into a skip.
4. Run the package's focused tests, then applicable type/lint/format, QC, integration, and production-build/browser gates. Preserve immutable command arrays where CAMP receipts require them. A routine local developer command is not a substitute for a receipt writer's declared command ID.
5. Parent reviews the exact diff and test evidence, then runs review in two lanes. Lane A is a cross-model agent review of every PR: the reviewer runs on a different model from the implementer and shares no context with it, and its receipt records `reviewerModel`, `implementerModel`, effort, the reviewed head, and a sha256 of the review output. Lane A is local engineering evidence and is never recorded as, or counted as, a GitHub approval. Lane B is an owner ruling, required for authority, privacy, migration, replay, idempotency, and concurrency changes and for any owner-gated unit: the owner posts it out of band as a PR comment whose first line begins `OWNER-RULING <40-hex head>` and applies the label `owner-ruled`, and the receipt stores the comment id, the author login, that head, and a sha256 of the comment body. A ruling is bound to the exact head it names and is void the moment the head changes; the CAMP three witnesses stay owner-only and no agent lane substitutes for them.
6. Open a small PR against `main` from a `codex/` branch. Its description explains the problem, resulting behavior, exact checks, residual limits, and original task/requirement IDs. Write multiline descriptions through a body file. Do not mix unrelated research or historical worktree changes into the PR.
7. Observe checks on the exact proposed head. Required checks must complete successfully; investigate failed/cancelled/stale results. Do not use administrative bypass, force-push, `--no-verify`, fabricated approval, or relaxed validators. Where a sensitive class or an owner-gated unit is in scope, wait for the Lane B ruling comment tied to that head before merging; where a package additionally requires a non-author approved GitHub review, wait for an eligible real review tied to that head. A new head requires fresh evaluation of review/check validity, voids any Lane B ruling naming the old head, and requires a fresh Lane A review of the new head.
8. Immediately before merge, verify PR repository/base/head, required reviews/checks, unresolved blocking comments, and branch state. Merge with a head-SHA guard. If the head changed, re-read and revalidate it; do not blindly retry.
9. Fetch the merged main commit and execute the slice's required post-merge proof against that exact commit. Archive/sync only after the implementation and required verification are recorded. Archive moves preserve original evidence and update the active ledger consistently; canonical requirements must describe what is accepted, including explicit limits.
10. Close the roadmap slice only after its durable receipt is validated and program-owned branch/worktree/process cleanup is complete. A PR merge alone is not completion where exact-main receipts remain required.

## State and evidence

Allowed slice states: `planned`, `admitted`, `implementing`, `local-verified`, `pr-open`, `review-required`, `ci-running`, `merged`, `main-verified`, `archived`, `complete`, `blocked`, and `owner-gated`. Store blocking cause and next independent action without repeatedly retrying the same failed approach. The native goal's blocked state follows its separate three-turn rule.

Each slice receipt records: task and requirement IDs; baseline, tested head, PR head and merge SHA; owned paths and final content hashes; selected worker/model/effort; exact command or immutable command ID; exit/status and assertion counts; durable evidence paths/hashes; reviewer identity/scope and GitHub approval if required; canonical/archive disposition; and cleanup identities/results. Preserve failed attempts. Never use an old successful run as current-head proof.

Update `roadmap.json` and `PROGRESS.md` after a meaningful state transition. No completion percentage based only on checkbox counts. A checked task can contain scoped nonclaims; an unchecked task can have shipped implementation. Reconcile those against source and evidence first.

## Isolation and shared resources

The initiating checkout contains existing reconciliation changes and unrelated printable-model research. Capture and preserve both. Prepare integration work in a program-owned checkout/worktree when that avoids exposing another task's dirty files. Record canonical absolute paths and the associated Git worktree ID/ref/HEAD at creation. Existing detached audit worktrees and the maintenance branch are not cleanup targets.

At most six workers may run at once, including external CLI workers. Use disjoint file ownership. Keep full production builds and browser server runs serialized unless measured isolation proves concurrent execution safe. Give every browser run an owned port, isolated durable store, and recorded server PID. Preserve unrelated Chrome tabs, servers, and user sessions.

## Verification and closure limits

Use `npm.cmd run typecheck`, `npm.cmd run lint`, focused Jest suites, applicable repository QC commands, `npm.cmd run build`, and the repository Playwright wrapper as dictated by the slice. OpenSpec closure requires strict validation, purpose/terminology checks, and active-ledger/CI consistency. Do not claim all 220 capabilities are behaviorally tested from an inventory pass.

The existing unrelated six-file formatting debt must be diagnosed in the isolated PR tree. Do not weaken the formatter or edit unrelated research to make it green. If those files are not in the PR checkout, record that fact; if a required gate still fails, handle the concrete cause in a separately owned repair slice.

For UI persistence, verify the real server/storage authority and cold reload. For replay, verify the recorded snapshot/event/head and deterministic recovery. For privacy, compare authorized viewer projections and refusals. For migrations, prove legacy input, repeated application, rollback compatibility, and cold reopen. Scenario packs and rights-sensitive assets are not routine test fixtures to acquire or mint without their required authorization.

A slice that edits a shared e2e helper (a file under `e2e/helpers/`) or a `scripts/qc` runner re-runs, in its own exact-main proof, every ladder group whose spec imports that file; a main proof taken before the edit is not evidence for the edited file (rule added 2026-09-22). A unit carrying a sensitive review class (authority, privacy, migration, replay, idempotency or concurrency) cites the exit code and the output of `validate-roadmap.mjs --github` in its merge or mainProof receipt (rule added 2026-09-22).

## Owned cleanup

Export and reopen durable evidence before removing a proof worktree. Before any removal, verify exact canonical non-reparse target, recorded worktree identity, expected HEAD/ref/OID, clean state, and allowed ignored/untracked manifest. Use Git's non-force worktree removal and compare-guarded branch deletion. Never use globs, recursive shell deletion, `reset --hard`, or `git clean` as generic cleanup. Stop only recorded program-owned processes. If identity or contents drift, preserve the target and diagnose it.

The goal ends only after all admitted obligations have terminal receipts, accepted implementation is merged and rechecked on main, specs/ledgers/archives agree, program-owned unmerged work is resolved, and a final handoff lists the actual remaining explicit deferrals and preserved external constraints.

## Planning prerequisite

R0.plan is a local admission gate: independent roadmap review plus a passing accounting validator permit first product slices when it reaches local-verified. It is not a predecessor implementation receipt. R0.publish separately owns publication of the plan/accounting through capped documentation PRs and must finish before program closeout. All product and source-contract predecessors retain their required merged-main gates.

## Large planning-data publication

PUBLICATION.md records the two named documentation-only allowances for the authored inventory and roadmap JSON files. All product/package caps and the 15-file limit remain intact. Each other publication prefix keeps the default line target, complete inputs and valid links.

Within one checkout, serialize TypeScript checking and Next production builds. The build regenerates .next/types, which are explicit TypeScript inputs. The first Infantry exact-main typecheck overlapped a successful build and reported TS6053 for cache-life.d.ts and validator.ts; retain that failed attempt and rerun only after the build finishes.
