## 1. Time Cascade Contracts

- [x] 1.1 Add typed time-cascade command, conflict, projected-effect, day-summary, public-effect, and domain-payload types under `src/types/interventions/`.
- [x] 1.2 Extend campaign intervention domain exports so `time` can register without weakening existing post-combat/economy/repair/salvage typing.
- [x] 1.3 Define changed-state reference helpers for campaign date, travel, repair queue, finances, missions/contracts, markets, unit state, and external roster/vault effects.

## 2. Preview and Projection Engine

- [x] 2.1 Implement a pure time-cascade preview helper that advances one or more days from an input campaign snapshot and returns serializable projected effects without mutating live store state.
- [x] 2.2 Capture per-day summaries, generated day events, before/after campaign dates, optional travel destination, and affected campaign roots in the projected effect.
- [x] 2.3 Detect stale base state, invalid day counts, unknown destinations, and unprojected external roster/vault effects as blocked or manual-takeover conflicts.
- [x] 2.4 Implement replay/apply helpers that derive campaign state from stored projected effects without re-running day processors.

## 3. Ledger Integration

- [x] 3.1 Add a `time` intervention implementer that follows the existing preview/apply/public/private projection contract.
- [x] 3.2 Register time-cascade implementers through an explicit helper without disrupting existing campaign implementer registration.
- [x] 3.3 Ensure ready approvals append intervention and action ledger records, while blocked, stale, unsupported, or manual-takeover previews append nothing.
- [x] 3.4 Ensure player-public projections redact GM-private rationale, hidden notes, default outcome, conflict analysis, and manual takeover notes.

## 4. Tests and Validation

- [x] 4.1 Add focused unit tests for ready one-day and multi-day previews, approval replay parity, optional travel, public/private redaction, and action-ledger append behavior.
- [x] 4.2 Add tests for invalid payloads, stale approvals, unknown destinations, and manual-takeover conflicts for unprojected external roster/vault effects.
- [x] 4.3 Update boundary tests proving `time` is no longer deferred when registered and remains unsupported when no implementer is registered.
- [x] 4.4 Run `openspec.cmd validate add-time-cascade-system --strict`, focused intervention tests, `npm.cmd run typecheck`, `npm.cmd run format:check`, and `git diff --check`.

## 5. Archive and PR Gate

- [x] 5.1 Archive the OpenSpec change only after implementation tests pass.
- [x] 5.2 Re-run `openspec.cmd validate --all --strict` after archive.
- [ ] 5.3 Commit with the repo Lore protocol, open a PR, wait for CI, merge, and prune local branch state.
