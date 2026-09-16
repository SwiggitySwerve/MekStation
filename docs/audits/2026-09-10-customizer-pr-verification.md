# PR verification: customizer editing and saved-design combat

This branch combines the completed customizer recovery and saved-design combat follow-ups to the merged UI baseline. It also includes compact status alignment, stable unit navigation, and simulation timeline rendering fixes.

The PR checkout starts from `45a94017a449519491726c52083abc1c7bd1e7e3` and contains only this task's files. The shared checkout and its chassis/model work are preserved. Earlier shared-tree checks are recorded in the [follow-up audit](2026-09-10-non-3d-followups.md) and [editing recovery audit](2026-09-10-customizer-edit-recovery.md); acceptance below is rerun against the isolated PR tree.

## Final verification

- Complete stable suite: **2,648 suites passed; 34,985 assertions passed; 16 existing skips; zero failures**. All eight snapshots passed.
- Production browser proof: **36 scenarios passed**, with no skips, failures, or retries. This includes all application palettes, responsive customizer layouts, unit isolation, server-backed saves, undo/redo, immutable history restore, browser-write recovery, and campaign handoff.
- Accessibility: **103 assertions in nine suites passed**.
- Full TypeScript check, lint (81 warnings, zero errors), and repository-wide formatting passed.
- Production compilation and standalone hydration passed. Browser scenarios ran against the actual packaged server, build `1789065512007`, with isolated SQLite storage.
- All **228 OpenSpec items** passed strict validation. OpenSpec CI inventory/quality, generated schema checks, the combat determinism audit, and the combat validation suite passed. All **554 required assets** were present.
- SHA-256 verification binds the final 92 source/test files to the tested contents. The unrelated chassis/model files are excluded from the branch.

The first isolated build exposed a shared dependency junction in standalone packaging. The TypeScript loader was restored from the previously verified local package, and this checkout now has independent physical dependency copies. The initial full-suite run also inherited an E2E-only setting. After correcting both verification-environment problems, the complete stable suite was rerun successfully. These initial failures are retained as failed attempts, not counted as acceptance.

The expanded browser run exposed a layout test that assumed the old header height. Its replacement waits for Equipment navigation, verifies 44px recovery controls without metric overlap, and checks that the workspace fills the space below the section bar. All existing clipping, scrolling, and mobile assertions remain. All 36 browser scenarios passed after this test correction.

## Baseline limitation

The separate `qc:validate` registry command reports four stale references to the archived `prove-live-coop-campaign-journey` change. A clean checkout of the exact target commit produces byte-for-byte identical errors. No registry/spec-archive repair is included in this PR; the complete stable suite and OpenSpec CI quality checks still pass.

Earlier shared-checkout formatting and chassis route-coverage failures do not occur in this isolated PR tree. Local logs, reports, source fingerprints, and failed-attempt evidence are retained under `2026-09-16-evidence-distilled/pr-customizer-20260910.md` (formerly `.sisyphus/pr-customizer-20260910/`) (ignored by Git).

## Supported behavior

- Per-draft undo/redo, explicit browser/library save status, browser-only write retry, and version-history restore without rewriting saved history.
- Server-backed repeat-save validation and safe cancellation, tab switching, stale responses, and save/restore races.
- Exact server-saved biped BattleMech admission to campaigns and combat; immutable construction survives library edit/deletion and durable match recovery.
- Private construction remains hidden from opponents and spectators through live delivery, replay, and reconnect.

Local-only and unsupported constructions remain blocked from combat, and fast-forward combat remains canonical-only. The browser proof covers campaign roster persistence; authoritative combat/recovery is tested at the server and SQLite boundaries.
