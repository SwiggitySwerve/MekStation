# Entity-History Wave Ownership Map

`harden-gm-two-player-campaign-sessions` remains the program-level acceptance contract for the GM plus two-player experience. The leaf changes below own implementation sequencing and PR boundaries for its event-history portions. They do not create a second authority model.

| Order | Leaf change | Status | Owns implementation from umbrella task sections |
| --- | --- | --- | --- |
| 1 | `establish-entity-event-journal-contract` | Archived 2026-07-31 | 2-3 foundation schema, adapter contract, integrity, receipts, entity history |
| 1.5 | `harden-sqlite-journal-coherent-verified-open` | Archived 2026-08-01 | Coherent fail-closed SQLite verified opening before any replay or authority adoption |
| 2 | `add-replay-schema-and-checkpoint-safety` | In progress; spec PRs #1120/#1124 and PR 1A kernel (#1125) merged 2026-08-01; PR 1B fingerprint admitted | 12 and 15 replay/upcast/checkpoint/quarantine foundation |
| 3 | `add-authority-audit-and-privacy-proof` | Proposed | 11, 12, and 18 membership-gated projection, action/private audit, privacy evidence |
| 4 | `adopt-combat-event-journal-authority` | Proposed | 4 and combat portions of 5, 7, 14, and 24 |
| 5 | `adopt-campaign-event-journal-authority` | Proposed | 8, 10, and campaign portions of 5, 7, 9, 12, and 24 |
| 6 | `add-cross-stream-effect-receipts` | Proposed | 13 and the linear outcome/progression portions of 17 |
| 7 | `add-authoritative-history-branches` | Proposed | 14, 16, 17, and branch/correction portions of 18-19 |

Rules:

1. The mapped umbrella sections are frozen as program acceptance trackers. Implementation MUST be driven from the named leaf change's tasks and focused PRs.
2. An umbrella checkbox closes only after the corresponding leaf task/PRs merge, exact-main evidence passes, and the umbrella acceptance requirement remains satisfied.
3. The umbrella owns cross-cutting membership, privacy, performance, three-context E2E, cutover, and final-verdict requirements. A leaf change may strengthen but may not waive them.
4. Before a leaf is archived/synced into main specs, reconcile its overlapping umbrella delta requirements in the same docs-only step so main receives one non-contradictory requirement definition.
5. Dependencies are strict: foundation → coherent SQLite verified opening → replay safety → audit/privacy gate → combat and campaign authority → effects → branches. Combat and campaign adoption may proceed independently only after the first four gates, but effects wait for both.
6. No leaf PR may combine the implementation work of another leaf. The umbrella remains open until the full program acceptance suite passes.
7. Every leaf implementation PR MUST stay under 500 non-generated changed lines and 15 changed files and MUST own one user-visible or contract-visible behavior seam. If a named task group cannot fit, update and re-review its OpenSpec to split the PR before implementation; there is no size-cap exception.
8. Every downstream leaf task file MUST begin with a fail-closed predecessor admission receipt. That receipt verifies the required leaf is synced/archived on exact main, its terminal exact-main evidence passed, and its merged branch/worktree was pruned before downstream PR 1 begins.
