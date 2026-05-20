# Subsystem UI Coverage Audit — Wave 6.1.C

**Date**: 2026-05-20
**Source**: read-only audit of MekStation 19 MekHQ-equivalent campaign subsystems
**Conducted by**: Wave 6.1 Council Lean+ verdict follow-up
**Purpose**: Document the starting-state coverage matrix for `add-subsystem-validation-specs` (Wave 6.1.C). Captures which subsystems were testable from Playwright at the time Phase 6.1 began.

## Methodology

For each campaign subsystem the audit answered four questions:

1. **UI page** — what route mounts the surface?
2. **Primary action wired** — does a button/form call the subsystem lib? (YES / PARTIAL / NO)
3. **Output visible** — does a dedicated UI element render the subsystem output? (YES / PARTIAL / NO)
4. **Best selector** — what `data-testid` does a Playwright spec target?

A subsystem is **STRAIGHTFORWARD** when a Playwright spec can be written today (full action + output coverage with selectable testids). **NEEDS-SETUP** when the page exists but a testid backfill OR a campaign-state seed is required first. **BLOCKED** when no UI exists.

## Coverage Matrix

| #   | Subsystem                          | UI route                                            | Action                                              | Output                                         | Best selector                                                            | Viability                                    |
| --- | ---------------------------------- | --------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| 1   | Hiring Hall / Personnel Market     | `/gameplay/campaigns/[id]/hiring`                   | YES (`hireCandidate`)                               | YES (CandidateCard grid)                       | `hiring-panel-grid`, `candidate-hire-{id}`                               | **STRAIGHTFORWARD**                          |
| 2   | XP Earning + Leveling              | `PersonnelSidePanel` "Progression" tab              | PARTIAL (XP via day-pipeline; skill upgrades wired) | PARTIAL (no testids)                           | testids missing                                                          | **NEEDS-SETUP**                              |
| 3   | Medical Bay (Injury / Recovery)    | `/gameplay/campaigns/[id]/medical-bay`              | NO (read-only; healing via day-pipeline)            | YES                                            | `medical-bay-row-{pilotId}`, `medical-bay-recovery-{pilotId}`            | **NEEDS-SETUP** (needs seeded injured pilot) |
| 4   | Salvage                            | `/gameplay/campaigns/[id]/salvage`                  | YES (`setSalvageItemStatus`)                        | YES                                            | `salvage-panel`, `salvage-accept-{partId}`                               | **NEEDS-SETUP** (needs seeded candidates)    |
| 5   | Repair Queue                       | `/gameplay/campaigns/[id]/repair-bay`               | YES (`reorderRepairTicketPriority`)                 | YES                                            | `repair-bay-queue`, `repair-ticket-up-{ticketId}`                        | **NEEDS-SETUP** (needs seeded tickets)       |
| 6   | Refit                              | `/gameplay/campaigns/[id]/mech-bay` → click "Refit" | YES (`commitRefitOrder`)                            | YES                                            | `mech-bay-refit-{unitId}`, `refit-commit`                                | **NEEDS-SETUP** (needs seeded unit)          |
| 7   | Loans + Interest                   | `/gameplay/campaigns/[id]/finances`                 | YES (`takeLoan`)                                    | YES                                            | `take-loan-form`, `loan-submit`, `loan-row-{loanId}`                     | **STRAIGHTFORWARD**                          |
| 8   | Contract Market                    | `/gameplay/campaigns/[id]/contract-market`          | YES (`acceptContractOffer`)                         | YES                                            | `contract-market-grid`, `offer-accept-{offerId}`                         | **STRAIGHTFORWARD**                          |
| 9   | Contract Negotiation (4-clause)    | none                                                | NO                                                  | NO                                             | n/a                                                                      | **BLOCKED**                                  |
| 10  | Faction Reputation / Standing      | none                                                | NO                                                  | NO                                             | n/a                                                                      | **BLOCKED**                                  |
| 11  | Random Events                      | none (fires via day-pipeline only)                  | NO                                                  | NO                                             | n/a                                                                      | **BLOCKED**                                  |
| 12  | Morale State Machine               | `/gameplay/campaigns/[id]/prestige-morale`          | NO (transitions via day-pipeline)                   | YES                                            | `prestige-morale-panel`, `morale-state-badge`, `morale-transitions-list` | **NEEDS-SETUP** (needs seeded morale state)  |
| 13  | Formation / Force Hierarchy (TO&E) | `/gameplay/campaigns/[id]/forces`                   | NO (read-only)                                      | YES                                            | **testids missing on ForceNode**                                         | **NEEDS-SETUP**                              |
| 14  | Turnover                           | nested in `DayReportPanel` modal                    | PARTIAL (fires via day-pipeline)                    | PARTIAL (aria-labels only, no testids on root) | testids missing                                                          | **NEEDS-SETUP**                              |
| 15  | Aging                              | none                                                | NO                                                  | NO                                             | n/a                                                                      | **BLOCKED**                                  |
| 16  | Awards (Auto-Engine)               | none                                                | NO (persists to pilot store; no renderer)           | NO                                             | n/a                                                                      | **BLOCKED**                                  |
| 17  | Ranks + Pay                        | none                                                | NO                                                  | NO                                             | n/a                                                                      | **BLOCKED**                                  |
| 18  | Unit Market                        | none                                                | NO                                                  | NO                                             | n/a                                                                      | **BLOCKED**                                  |
| 19  | Maintenance Checks                 | none (downstream effect via RepairBay)              | NO                                                  | NO                                             | n/a                                                                      | **BLOCKED**                                  |

## Summary

| Viability           | Count | Subsystems                                                                                                                                                         |
| ------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **STRAIGHTFORWARD** | 3     | #1 Hiring Hall, #7 Loans + Interest, #8 Contract Market                                                                                                            |
| **NEEDS-SETUP**     | 7     | #2 XP/Leveling, #3 Medical Bay, #4 Salvage, #5 Repair Queue, #6 Refit, #12 Morale, #13 Force Hierarchy                                                             |
| **BLOCKED**         | 9     | #9 Contract Negotiation, #10 Faction Reputation, #11 Random Events, #14 Turnover (partial), #15 Aging, #16 Awards, #17 Ranks+Pay, #18 Unit Market, #19 Maintenance |

**3 of 19 subsystems were end-to-end testable from Playwright at the start of Wave 6.1.C** — no code changes required, just campaign-state seeding.

**7 more become testable with testid backfill only** (no new components):

- `PilotProgressionPanel`: add `xp-available`, `skill-upgrade-gunnery`, `skill-upgrade-piloting`
- `ForceNode`: add `force-tree` on the Card wrapper, `force-node-{forceId}` on each row
- `TurnoverReportPanel`: add `turnover-report-panel` on root, `departure-row-{pilotId}` on each card
- Medical Bay, Salvage, Repair Queue, Refit: testids already present — only `e2e/helpers/campaignSeeders.ts` state-seed helpers needed

**9 subsystems are fully BLOCKED** until read-only display panels are built for each. These are explicit follow-up change candidates documented in the `add-subsystem-validation-specs` Track C deliverables.

## Implementation in Wave 6.1.C

Per the proposal, Wave 6.1.C ships in three tracks:

- **Track A** (STRAIGHTFORWARD): write 3 specs against the existing surfaces — no code changes
- **Track B** (NEEDS-SETUP): testid backfill on the 3 components above + state-seed helpers + 7 specs
- **Track C** (BLOCKED): minimum-viable read-only UI stubs for the 9 subsystems + 9 specs

This audit document is the durable evidence of the starting-state coverage. Future runs comparing against this matrix can show how Wave 6.1.C (and subsequent waves) improved coverage.
