## 1. Reproduce and Lock Authority

- [x] 1.1 Add an IndexedDB-backed regression in the interactive match-log test surface that persists the launch events, drives a real post-launch phase or command mutation, flushes storage, and fails unless the stored sequence/type order equals the live session.
- [x] 1.2 Extend active-session recovery coverage so the same match is reloaded after post-launch progress and the test asserts the raw persisted tail, recovered phase, activation position, event log, and continued drivability.

## 2. Commit Interactive Event Suffixes

- [x] 2.1 Update the `InteractiveSession` runtime session-commit boundary to detect and enqueue only the newly appended event suffix for the same match id, preserving sequence order and ignoring event-free replacements.
- [x] 2.2 Consolidate the existing explicit append-and-persist path through the commit boundary so each authoritative event is enqueued exactly once.
- [x] 2.3 Preserve the existing non-crashing storage-divergence behavior and prove that a rejected persistence write does not reject an otherwise legal in-memory combat command.

## 3. Focused Verification

- [x] 3.1 Run the focused interactive match-log and active-session recovery tests under Node 22 and confirm the new regressions pass.
- [x] 3.2 Run TypeScript diagnostics, formatting, lint, and the applicable quick command-browser and deep UX audit gates.
  - TypeScript, formatting, OpenSpec strict validation, and lint completed under Node 22; lint retained the repository's 71-warning/zero-error baseline.
  - The focused recovery browser suite passed 3/3, the deep UX audit passed 3/3 journeys and 49/49 steps after removing a stale generated cache, and the long campaign signoff passed 1/1.
  - The quick command-browser gate passed 7/10. Its three failures reproduced unchanged on the exact-main product tree: one Next development-manifest MIME diagnostic and two existing campaign-ledger timing/state expectations.
- [x] 3.3 Execute a clean browser journey that records pre-reload live state, raw IndexedDB events, cold-reload recovered state, and one further legal command.

## 4. Review and Handoff

- [x] 4.1 Run independent code, authority/persistence, security, and browser QA review against the exact commit; resolve every in-scope finding.
  - The original review receipts were not retained in the repository or on PR #1084. This historical completion marker is therefore not independently auditable from GitHub and is not used as archive-closeout proof.
- [x] 4.2 Record the evidence paths and exact gate outcomes in the gameplay audit and wave handoff without mixing maintenance or turn-rail artifacts.
  - The gameplay audit records the authority defect, repair, reload continuation, raw IndexedDB/live equality, and residual QC baseline in Session 17 and GAME-04: `docs/audits/2026-07-27-gameplay-customizer-campaign-ux-audit.md`.
  - Untracked local receipts remain isolated under `.sisyphus/evidence/playtest/f688582-{unit,e2e,openspec}-output.md` and `.sisyphus/evidence/playtest/f688582-manual-qa.md`; the browser receipt proves 3/3 Chromium recovery scenarios and the unit receipt proves 9/9 focused match-log tests.
- [x] 4.3 Commit one focused user-visible outcome, push the dedicated `codex/` branch, open one review-ready PR, and wait for terminal `gh pr checks` before starting the next product wave.
  - Posthumously verified from GitHub: PR #1084 (`f688582108128e86078cf0d38000d31344328378`) merged as `5e50317b17f11594edab942a482ba5040301a9e1` after all 29 checks in Actions run `30529524306` completed successfully.
