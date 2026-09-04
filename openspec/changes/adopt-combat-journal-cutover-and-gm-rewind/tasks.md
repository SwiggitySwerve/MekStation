# Tasks

Successor of `harden-gm-two-player-campaign-sessions` for GM combat rewind (owner ruling 2026-09-04). Blocker name used by the umbrella: `journal-cutover`. Umbrella boxes this change closes by receipt: 14.1, 14.2, 14.4, 14.5. Umbrella rows this change un-gates: E2E-40, E2E-41, E2E-42, E2E-43, E2E-44, E2E-76 (`e2e/gm-two-player-rewind.pack.spec.ts`, group `rewind-pack`, strict `test.fail` tagged `@until-journal-cutover`).

Rules carried from the umbrella: one PR per seam, under the 500-line / 15-file cap; every seam lands with its own mutant matrix and a dated receipt; workers never edit `openspec/**`; nothing here un-gates a row until the SHALL it proves is discharged live.

## 0. Provenance and the honest count

- [ ] 0.1 Reconcile all 80 acceptance scenarios of the umbrella's `e2e-testing` delta to test identifiers and evidence paths (the umbrella's box 25.4 first half), recording which rows are real, which are strict expected failures, and which have no row. Deliverable: a table in this change's notepad and a receipt naming the reachable surface (34 of 80 at the split).
- [ ] 0.2 Verify on fetched exact main that `add-authoritative-history-branches` exposes the branch port this change activates through (`hasHistoryBranchStore`, `readEffectiveHead`, supersession), and record the exact SHA and the port's shape.

## 1. Production match-stream journal writer (the cutover)

- [ ] 1.1 S1: append every committed combat batch to `event_journal_events` at the expected revision and install `event_journal_stream_heads` and the match's genesis / `event_history_effective_heads` row on the first batch. Both rewind routes answer a real preview on a live match. Receipt must state that no SHALL is discharged by this seam alone.
- [ ] 1.2 S2: route `readEffectiveHead` and the live branch admission consult through the journal head so both `STALE_BRANCH` arms are reachable; prove with the four illegal command shapes the umbrella's 14.2-a receipt names.
- [ ] 1.3 S3: retire the `mp_journal_authority_started` marker write; one source of "started".
- [ ] 1.4 S4: restart recovery rebuilds the live host from the journal head and the effective branch; prove with the umbrella's restart pack against a rewound match.
- [ ] 1.5 S5-a: make the sequence-versus-revision offset explicit at every derivation site; re-pin the four suites that encode it.
- [ ] 1.6 S5-b: the expected revision for a commit comes from the journal head; sequence-conflict and duplicate-command refusals proven against races.
- [ ] 1.7 S6: reviewed cutover flag with shadow parity, migration states and rollback law in the campaign cutover's shape; new matches admit through the journal, legacy completed matches keep their reads. Rollback proof: revert the flag, no row erased.

## 2. Moved requirements (umbrella 14.1, 14.2, 14.4)

- [ ] 2.1 `Combat Intervention Has Distinct Preview and Commit Phases`: finalization commits actor, reason reference, deterministic replacement data and authorized player projections through the authoritative transaction; stale preview refuses typed and appends nothing. Closes umbrella 14.1 by receipt.
- [ ] 2.2 `Combat Rewind Is GM-Only and Append-Only` (replacement-branch clause): a GM commit before the receipt boundary creates a building replacement branch from a trusted checkpoint and preserves prior history.
- [ ] 2.3 `Superseded Combat Commands Are Rejected`: commands name branch and revision; an old-branch command returns `STALE_BRANCH` with the active branch and resync action and appends nothing. Closes umbrella 14.2 by receipt.
- [ ] 2.4 `Combat Rebuild Gates Commands and Activation` (activation clause): one branch-activation fact after replay, validation, fog, hidden-state and viewer-projection checks; a failed check leaves the candidate blocked.
- [ ] 2.5 `Combat Rewind Preserves Viewer-Specific Hidden State`: per-viewer fog, sealed choices, private GM records, owned-unit visibility and public facts rebuilt as of the checkpoint; the preview's `fog-preview-unsupported` refusal lifted by computing the rebuild. Closes umbrella 14.4 by receipt.

## 3. Verification (umbrella 14.5) and the un-gate

- [ ] 3.1 GM intervention suites, deterministic replay tests, fog integration tests and `npm.cmd run verify:qc:gm:campaign-ledger` green on the cutover. Closes umbrella 14.5 by receipt.
- [ ] 3.2 Remove the `test.fail` marks from E2E-40, E2E-41, E2E-42, E2E-43, E2E-44 and E2E-76 one row per seam as its SHALL lands (a strict mark goes red on its own the day the row passes; that red is the signal to remove it, never a reason to skip). Live proof on the production build per row; live mutant per row.
- [ ] 3.3 Update the umbrella's 25.4 count and the archive receipt language: the reachable surface after this change, and that the headline capability withdrawn on 2026-09-04 shipped here.
