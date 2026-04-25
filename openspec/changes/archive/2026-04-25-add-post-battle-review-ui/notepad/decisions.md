# Decisions Notepad — add-post-battle-review-ui

# 2026-04-25 apply

Closeout pass for Tier 4. The change is `add-post-battle-review-ui`.
Goal of this session: get the change to verifier APPROVE without
waiting on the Wave 5 pilot/contract/scenario pipelines, by
distinguishing "actually shippable today" from "blocked on upstream
data shape" and tagging both halves explicitly.

## Implementations landed in this session

- `CasualtyPanel`: ammo-bins-remaining row added per casualty
  (`casualty-ammo-<unitId>` testid). Reads
  `IUnitCombatDelta.ammoRemaining` directly. (Task 3.5)
- `PilotXpPanel`: 6-dot wound tracker swaps in for the inline
  "Wounds: N/6" text. Each dot exposes `data-testid` +
  `data-filled`; the wrapping element carries an `aria-label`
  "Wounds taken: N of 6" for screenreaders. KIA pilots get a
  red "KIA — no posthumous XP awarded." notice in place of the XP
  estimate row. (Tasks 4.4, 11.7)
- `useCampaignStore.reviewReady(matchId)`: new selector returning
  true while `pendingBattleOutcomes` contains the matchId.
  Implemented on the campaign store (NOT the gameplay store, which
  is what the original spec text suggested) because the pending
  outcome queue lives on the campaign store. Task 10.1 is flipped
  with that pickup note. (Tasks 10.1)
- `PostBattleHeader`: end-reason label test added as a
  parameterized `it.each` over all five `CombatEndReason` enum
  values. (Task 2.4)
- `PostBattleReviewScreen` integration smoke: asserts all six
  panel testids are present in one render. (Task 11.6)
- Standalone-skirmish path (`contractId = null`) now has a smoke
  test that asserts ContractPanel hidden + SalvagePanel empty
  state — closes the after-combat-report spec scenario.

## Wave 5 deferrals (all flipped `[x] — DEFERRED:` in tasks.md
and mirrored as `> DEFERRED to Wave N:` blockquotes on the
relevant SHALL blocks in `specs/`)

The verifier rejects bare task-level DEFERREDs, so for every
deferred SHALL block the spec.md now carries a paired blockquote
explaining the upstream blocker AND a `pickup:` file:line
pointer. The notepad pattern below mirrors the spec entries.

| Task   | Reason                                                         | Pickup                                                  |
| ------ | -------------------------------------------------------------- | ------------------------------------------------------- |
| 1.2    | REST `/api/matches/[id]/outcome` is Wave 5 persistence work    | `src/pages/gameplay/games/[id]/review.tsx:171`          |
| 3.2    | Per-location armor SVG depends on a record-sheet ArmorDiagram  | `src/components/gameplay/post-battle/CasualtyPanel.tsx:131` |
| 3.3    | Hover tooltip is gated on 3.2                                  | same                                                    |
| 3.6    | Max-heat / shutdown-count are Wave 5 pilot-event pipeline      | `src/types/combat/CombatOutcome.ts:98`                  |
| 3.8    | Same SVG blocker as 3.2                                        | same                                                    |
| 4.5    | Consciousness-roll telemetry not on `IUnitCombatDelta`         | `src/types/combat/CombatOutcome.ts:103`                 |
| 4.6    | Capture faction id not on `pilotState`                         | `src/types/combat/CombatOutcome.ts:103`                 |
| 5.5    | `splitMethod` lives on allocation, not the report DTO          | `src/types/campaign/Salvage.ts:228`                     |
| 6.3    | Scenarios-played counter is contract-pipeline state            | `src/components/gameplay/post-battle/ContractPanel.tsx:78` |
| 6.5    | Morale-shift is contract-pipeline state                        | `src/types/combat/CombatOutcome.ts:115`                 |
| 7.3    | `IRepairTicket.estimatedCBills` does not exist yet             | `src/components/gameplay/post-battle/RepairPreviewPanel.tsx:94` |
| 8.3    | ~~Deferred~~ — landed via `markBattleReviewed` audit follow-up | `src/stores/campaign/useCampaignStore.ts`               |
| 8.5    | No global toast surface mounted                                | `src/pages/gameplay/games/[id]/review.tsx:240`          |
| 9.1/9.2| `/gameplay/matches/[id]` route does not exist (Wave 5)         | `src/pages/gameplay/games/[id]/review.tsx`              |
| 12.1/2 | Screenshots blocked on visual-regression pipeline              | n/a                                                     |

# 2026-04-25 audit follow-up — task 8.3 reviewed-flag

Closing the last archive blocker for this change. Audit found the
"Return to Campaign" CTA dequeued the outcome but the page-level UX
for "battle reviewed" was implicit (queue absence). Implementation:

- **Why epoch-ms reviewedAt over a boolean:** future-audit visibility.
  A timestamp lets later UIs surface "reviewed 3 days ago" or order
  the post-battle log by review time without bolting on a separate
  audit trail.
- **Why on the campaign store, not `useGameplayStore`:** the original
  spec text suggested the gameplay session store, but the pending-
  outcome queue lives on the campaign store. Co-locating
  `reviewedBattleIds: Record<string, number>` with
  `pendingBattleOutcomes` keeps queue-membership and review-status
  reads cheap and racy-free (single source of truth).
- **Why a sibling map instead of widening `ICombatOutcome`:** the
  outcome is the engine hand-off shape (campaign-consumable, persisted
  via the bus). Adding UI lifecycle state to it would pollute the
  engine model. The store-side map is a UI ledger, mirroring the
  same pattern used by `processedBattleIds`.
- **`markBattleReviewed(matchId)` semantics:** stamp-and-filter — sets
  the reviewed timestamp AND removes from the pending queue. The CTA
  invokes it after `applyPostBattle` so the existing dequeue + apply
  contract is preserved verbatim (no behavioral change to processors,
  the dashboard banner, or the round-trip integration test).
- **Spec update:** `specs/after-combat-report/spec.md` "Return-to-
  campaign commits outcome" scenario no longer carries the DEFERRED
  blockquote; all three SHALL clauses are now met.

## Conventions observed

- The repo uses oxfmt + double quotes (PostToolUse formatter
  flips single → double on save). Future panels must match.
- `data-testid` naming convention for the post-battle surface:
  `<panel-noun>-<sub>-<unitId>`. New testids added this session:
  `casualty-ammo-<unitId>`, `pilot-wound-tracker-<unitId>`,
  `pilot-wound-dot-<unitId>-<i>`, `pilot-kia-notice-<unitId>`.
- Status-icon design system not in repo yet — text labels
  (COMPLETED / FAILED / IN PROGRESS) substitute for
  iconography. Tracked separately so we don't gate the change
  on design work.
