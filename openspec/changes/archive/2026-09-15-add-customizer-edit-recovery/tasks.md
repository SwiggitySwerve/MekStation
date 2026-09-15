## Implementation

- [x] 1. Implement complete per-unit snapshots, bounded transactions and library receipts.
- [x] 2. Add accessible undo/redo controls and keyboard behavior.
- [x] 3. Expose visible draft/library status and server-backed saved history with safe draft restore.
- [x] 4. Verify store round trips, races and failures, and real browser save/history/restore/reload.
- [x] 5. Run required static/build gates and record acceptance with limitations.

Evidence: shipped in PR #1635 (c8780618e). Draft/library status, undo/redo controls, saved history and draft restore verified by e2e/customizer-edit-recovery.spec.ts plus the browser, store and gate runs recorded in docs/audits/2026-09-10-customizer-edit-recovery.md.
