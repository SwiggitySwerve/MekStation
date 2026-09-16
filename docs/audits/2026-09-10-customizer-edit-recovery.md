# Customizer edit recovery — 2026-09-10

Accepted after 307 affected tests, a fresh production build, and both complete browser scenarios passed. Preview: http://localhost:3611/customizer. Build: `1789063045257` on `main` at `45a94017a` with the shared working changes present.

## Delivered behavior

- Per-unit undo/redo holds up to 50 complete operations. Engine, armor, equipment, and placement cascades restore together; a new edit clears redo, and reload starts a new session. Keyboard shortcuts preserve native text undo and work on construction dropdowns.
- Undo changes only the fields recorded by its transaction, preserving a designation applied by a later library save. Draft identity, provenance, and library receipts remain intact.
- Visible browser-write status is separate from the last known library save. Library receipts contain the actual returned ID/version and survive reload. The library comparison uses serialized construction; dirty protection includes editor-only fields. Both normalize temporary equipment IDs while exact undo snapshots and request guards retain them.
- Saved history reads immutable server versions and restores the selected version into the bound draft as one undoable edit. Closed, switched, replaced, or newer drafts reject late responses.
- Successful library saves retain their receipt in memory even when browser storage fails. Retry browser draft writes local state without creating another server version.
- Reopening Save validates the unchanged designation against the server library. Matching names offer Overwrite, unavailable library reads remain errors, and stale validation responses cannot enable Save for newer input.

## Verification

Evidence root: `2026-09-16-evidence-distilled/customizer-recovery-20260910.md` (formerly `.sisyphus/customizer-recovery-20260910`).

| Check                                  | Result                                    | Evidence                          |
| -------------------------------------- | ----------------------------------------- | --------------------------------- |
| Affected tests                         | 307 passed, 20 suites                     | `unit-acceptance.json`            |
| Type checking                          | Passed                                    | `restore-final-types-status.json` |
| Lint                                   | 0 errors; 82 existing warnings            | `restore-final-lint.log`          |
| Owned-file formatting                  | Passed                                    | `owned-format-check.log`          |
| Diff whitespace                        | Passed                                    | `diff-check.log`                  |
| OpenSpec change validation             | Strict validation passed                  | `spec-validate-final.log`         |
| Production build and runtime hydration | Passed                                    | `build-verification.json`         |
| Browser acceptance                     | 2 passed; 0 skipped, unexpected, or flaky | `browser-final-results.json`      |
| Build/source consistency               | 23 product-file fingerprints retained     | `source-fingerprints-final.json`  |

The first browser scenario verifies engine dropdown Ctrl+Z, exact equipment restoration, derived metrics, armor auto-allocation, equipment placement, independent Atlas/Locust histories, 390px layout, and history reset after reload.

The second scenario creates v1, overwrites v2, reads both stored versions, cancels a delayed restore, restores v1, undoes/redoes that restore, and verifies v1/v2 remain unchanged. It saves v3, reloads, restores the matching v3 without a false dirty flag, injects a browser-storage quota error, retries only local storage, and confirms the server remains at v3. Created test units are removed. Screenshots and immutable-version attachments are under `browser-final-artifacts`.

## Review and repairs

Cursor Grok 4.6 High assisted with implementation and independent review. The undo review found stale designation restoration after Save As and shortcuts being skipped on native dropdowns. Both fixes were rechecked independently (`undo-review/RESULT.md`, `undo-review/RECHECK.md`). A later integration review found no actionable defect in the save/restore boundary fixes (`integration-review/RESULT.md`).

Browser testing reproduced Save remaining disabled when reopened without editing the name. Separate characterization exposed name validation using IndexedDB while library saves use the server. Both were repaired at their actual boundaries. The independent recheck then identified retained Save availability on the first reopening paint; a layout-effect probe reproduced it, and closed-dialog state reset fixed it. Parent review also reproduced temporary equipment identifiers causing a false dirty flag; normalization fixed it while the armor-budget regression continued to protect editor-only changes.

Failure evidence remains in `recovery-boundaries-before.log`, `save-open-before.log`, `name-authority-before.log`, `first-paint-before.log`, and `restored-ids-before.log`. Earlier browser reports are retained separately. A server-startup race in one earlier run was corrected by waiting for HTTP 200 before the final run.

The global capability lock check reported its existing skill-surface mismatch; the routing audit passed. No configuration was changed or re-locked, and fresh Cursor initialization confirmed Grok 4.6 High. Parent verification is the acceptance authority.

## Scope and limitations

This wave covers BattleMech-family editor recovery. Undo history remains local to the current session. Library status identifies the last known save and does not continuously track changes made elsewhere. The user's separate 3D/model work remains outside this wave.

The workspace contains unrelated active changes. Whole-repository formatting still reports 13 unrelated model-catalog and chassis-audit artifacts; the owned files pass. A full repository test-suite result is not claimed. An earlier accidentally broad unit invocation was stopped after a chassis-page check failed against the then-current build manifest. The final affected tests and production browser scenarios above completed with no skipped assertions.

The preview uses the existing preview database. Browser proof used a separate test database and controlled browser contexts; its library is empty after cleanup and its server is stopped. The verified preview remains running. No commits, staging, migrations, publication, or canonical-spec archival were performed.
