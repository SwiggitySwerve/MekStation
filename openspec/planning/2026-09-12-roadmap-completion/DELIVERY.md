# Delivery, verification, and cleanup contract
> **Status:** Active; named CNI0 bootstrap only
> **Created:** 2026-09-15
> **Updated:** 2026-10-02

This roadmap is authorized by the user's 2026-09-12 request for implementation, verification, incremental PRs, merging, cleanup, and completion. The parent owns decomposition, integration, acceptance, and Git delivery. Workers own only their assigned files or evidence question.

## One bounded change at a time

1. Admit the next slice from `roadmap.json`: verify dependencies against current source, the active package, required predecessor receipts, and fetched `origin/main`. Capture the exact baseline commit, file ownership, intended behavior, and acceptance command. Inspect open PRs and existing worktree ownership before starting another worker.
2. Resolve missing or contradictory requirements in a small spec change before implementation. A roadmap is not an apply-ready OpenSpec delta. Existing package task/PR caps still apply; use the stricter cap if two packages overlap. Default new slices target one behavior, no more than 15 files and 500 non-generated changed lines; those 500 are product lines only, and test lines are reported separately and never count (owner decision OD-line-cap-product-lines, 2026-09-23). The cap counting rule (U41): a unit's counted lines are the added lines `git diff --numstat --no-renames <mergeSha>^1 <mergeSha>` reports (the squash commit against its parent on main), skipping the ledger's evidence/ directory, generated files (package-lock.json, .next/, __snapshots__/ and *.snap, public/data/, src/types/contracts/generated/) and test files (__tests__/, e2e/, *.test.* and *.spec.*), and `validate-roadmap.mjs --git` fails a unit whose count exceeds its `caps.maxNonGeneratedLines` unless its `capException.countedLines` records that exact count. The history/effect packages explicitly permit 1000 lines; that is a ceiling, not a target. Split larger work into buildable prefixes with no forward dependency.
3. For behavior repairs, reproduce the failure at the actual boundary before changing it. Implement the smallest complete slice and retain the red/green evidence. Do not create tests that merely repeat implementation, weaken assertions, or convert unexpected failure into a skip.
4. Run the package's focused tests, then applicable type/lint/format, QC, integration, and production-build/browser gates. Preserve immutable command arrays where CAMP receipts require them. A routine local developer command is not a substitute for a receipt writer's declared command ID.
5. Parent reviews the exact diff and test evidence, then runs review in two lanes. Lane A is an independent-context review of every PR. New version-2 receipts use GOAL.md's audited author/reviewer/ALL-finisher task AND child-session contract, with truthful observed models; valid historical unversioned receipts retain the different-model implementer/finisher rule. The receipt records models, effort, exact reviewed head, review-output hash and immutable identity evidence. Lane A is local engineering evidence and is never recorded as, or counted as, a GitHub approval. Lane B is an owner ruling, required for authority, privacy, migration, replay, idempotency, and concurrency changes and for any owner-gated unit: the owner posts it out of band as a PR comment whose first line begins `OWNER-RULING <40-hex head>` and applies the label `owner-ruled`, and the receipt stores the comment id, the author login, that head, and a sha256 of the comment body. A ruling is bound to the exact head it names and is void the moment the head changes; the CAMP three witnesses stay owner-only and no agent lane substitutes for them.
6. Open a small PR against `main` from a `codex/` branch. Its description explains the problem, resulting behavior, exact checks, residual limits, and original task/requirement IDs. Write multiline descriptions through a body file. Do not mix unrelated research or historical worktree changes into the PR.
7. Observe checks on the exact proposed head. Required checks must complete successfully; investigate failed/cancelled/stale results. Do not use administrative bypass, force-push, `--no-verify`, fabricated approval, or relaxed validators. Where a sensitive class or an owner-gated unit is in scope, wait for the Lane B ruling comment tied to that head before merging; where a package additionally requires a non-author approved GitHub review, wait for an eligible real review tied to that head. A new head requires fresh evaluation of review/check validity, voids any Lane B ruling naming the old head, and requires a fresh Lane A review of the new head.
8. Immediately before merge, verify PR repository/base/head, required reviews/checks, unresolved blocking comments, and branch state. Parent uses explicit `--squash --match-head-commit <exact-reviewed-head>` by default. Attest actual topology and the whole native integration tree under GOAL.md; a two-parent merge additionally requires ordered parent2 to equal the exact reviewed source head. If the head changed, re-read and revalidate it; do not blindly retry.
9. Fetch the merged main commit and execute the slice's required post-merge proof against that exact commit. Archive/sync only after the implementation and required verification are recorded. Archive moves preserve original evidence and update the active ledger consistently; canonical requirements must describe what is accepted, including explicit limits.
10. Close the roadmap slice only after its durable receipt is validated and program-owned branch/worktree/process cleanup is complete. A PR merge alone is not completion where exact-main receipts remain required.

## Version-2 review delivery (2026-09-29)

Follow GOAL.md's canonical v2 census, observation, bindings, archive and fail-closed contract. Before fold, record the complete local contributor census; closure requires paired `--review-identity <manifest-json>` AND `--engine-records-dir <caller-directory>`. Parent independently audits live observations and contributor coverage; hashes do not authenticate provenance. PRI requires fresh SOURCE review under its candidate contract, then all existing CI/pinned-merge/exact-main/closure gates. Registration approval and synthetic fixtures are not delivery; no Task60 tick or PMP admission before closure.

## Codex-native delivery amendment (2026-10-02)

Follow GOAL.md's owner-approved LOCAL version-3 policy and [the exact registration](evidence/cni-registration-20261002.json). The owner's approval permits CNI0 docs-bootstrap delivery only; unchanged v2 cannot represent it, so retain OPEN canonical native closure debt without invented receipts. This section supersedes prior no-bootstrap wording only for CNI0. All old modes/receipts/actors/resources and every ordinary review, CI, owner, topology, whole-tree, exact-main and cleanup gate retain their contracts.

CNI0 owns exactly six files/500 counted additions. Its new docs-registration milestone records actual bootstrap delivery independently from the blocked canonical CNI0 unit. Admit CNI1 only after that milestone's real merged/main-proved registration, ancestry, independent review and exact scope are checked. CNI1 owns exactly seven files/500 counted additions in ONE atomic source PR; no separate producer prefix. Every changed test/doc/register/evidence file counts toward file caps; existing U41 line exclusions remain exact. Stop for separately reviewed registration before exceeding scope/caps.

CNI2 and CNI3 each own only units.json, roadmap.json and finite actual CNI0/CNI1 evidence filenames allowed by the registration's naming contract; each stays within 15 files/500 counted additions. Freeze actual dates/hash names and exact byte/hash list before publication review. No placeholder snapshot, wildcard write grant or invented contributor is permitted. Reopen exports and independently qualify all source/result/reviewer bytes and actual contributor/route/context bindings. Partial prefixes never complete canonical CNI0/CNI1 or original Task1.

Existing literal ownership paths are executable navigation; absent prospective files are exact `ownershipExceptions`, constrained by the registration's authoritative grants. Parent must independently enforce reservations, complete changed-file scope and publication caps because NEXT does not reserve exceptions and --git excludes ledger evidence paths. Future exception lists stay empty until genuine names freeze. No global harness/config/hook/lock, credential, fold/main-proof source, package/schema, game/browser/service or historical-resource grant exists.

Only after genuine v3 closure/debt publication and required delivery/cleanup may the parent requalify Task1 against fetched current main. A missing consumer, witness, gate, SOURCE reviewer or complete byte readback remains a blocker; docs approval and synthetic tests do not discharge it.

Use GOAL.md's finite same-scope milestone follow-ups: units.json/roadmap.json plus existing registration JSON only if needed, recording actual predecessor proofs under ordinary exact-head review/required CI/owner-ruling/guarded merge/main-proof gates. No registry edit rides CNI1's seven-file source PR. Aggregate initial/follow-up CNI0 counted additions must stay within 500; no extra filename or bootstrap exception is granted. The general approval does not supply a final `OWNER-RULING <head>` comment or `owner-ruled` label for these authority/privacy units.

## Ordered-parent successor and retained historical proof

U17e registration, SOURCE and closure each retain normal parent head-guarded squash delivery, independent exact-head review, full required CI, actual one-parent/whole-tree witnesses, exact-main proof and genuine own v2 closure. No bootstrap exemption, source-only completion claim or reuse of a historical PMP review as U17e approval. CLOSE U17e before later PMP closure.

For that later closure, run the accepted new producer and current ledger from the closed-U17e lineage, with `--repo-root` pointing at a clean exact historical b034 checkout. Pass the preserved original proof directory as absolute `--proof-dir` and a new owned external `--preserved-root`; reopen/hash actual old logs. Preserve original source, baseline, merge identities and proof checkout bytes. Do not use a false `--reproof-commit`: the new producer/current-ledger root and the historical runtime-proof root are distinct. Fresh native ordered-parent/whole-tree attestation and modern review identity/prospective consumption are still required; this seam never invents approval or reruns historical delivery.

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
