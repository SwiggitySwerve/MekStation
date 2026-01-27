# Campaign System — Meta Execution Plan

## Context

### Original Request
Create a meta-level execution checklist for all 17 campaign system plans. Each plan must go through the full OpenSpec lifecycle before implementation: create proposal → get approval → implement → complete tasks.md → archive change → create branch → PR → merge.

### Interview Summary
**Key Discussions**:
- Plan 1 (Day Advancement Pipeline) is already implemented with PR #172
- 16 remaining plans follow the tiered execution order from the cross-plan gap review
- Each plan is isolated: one branch, one PR, one merge cycle

**Research Findings**:
- OpenSpec 3-stage workflow: Create → Implement → Archive
- 15 campaign-related specs already exist in openspec/specs/
- 3 active OpenSpec changes (none conflicting with campaign work)
- Gap review identified 9 critical issues and 14 permanently stubbed functions

### Metis Review
**Identified Gaps** (addressed):
- PR #172 status: needs merge/close before proceeding → added as Prerequisite #1
- Plan 1 retroactive OpenSpec: MODIFY existing `day-progression` spec → Prerequisite #2
- `add-quick-session-mode` dangling: needs archive → Prerequisite #3
- Approval gate undefined: user approves each proposal before implementation
- Archive strategy: combined in same PR as implementation (not separate)
- Tier order flexibility: strict within tiers, but plans within same tier can run in any order
- Cross-plan spec conflict: later plans must include earlier plans' MODIFIED content

---

## Work Objectives

### Core Objective
Define the repeatable lifecycle every campaign plan follows, pre-map all change-ids/branch-names/spec-mappings, and provide an ordered execution checklist.

### Concrete Deliverables
- This meta-plan document with full checklist for all 17 plans

### Definition of Done
- [x] All 17 plans have change-ids, branch names, and spec mappings defined
- [x] Execution order is clear with dependency gates between tiers
- [x] Prerequisites are listed and actionable
- [x] Per-plan lifecycle template is documented

### Must Have
- Exact change-id for every plan
- Exact branch name for every plan
- Spec mapping: which existing specs each plan touches (ADDED/MODIFIED)
- Explicit tier gates (Tier N must merge before Tier N+1 starts)
- Retroactive OpenSpec for Plan 1

### Must NOT Have (Guardrails)
- NO implementation details (each plan has its own .sisyphus/plans/ document)
- NO plans beyond the existing 17 (no fatigue, loyalty, shares, Dragoon rating, etc.)
- NO cleanup of TBD spec purposes (handled naturally by archive)
- NO concurrent OpenSpec changes for campaign work (one at a time per tier)
- Plan 6 (Presets) OpenSpec proposal MUST NOT be created until all Tier 3 plans are merged

---

## Prerequisites (Before Tier 1 Starts)

- [x] P1. Merge or close PR #172 (Plan 1: Day Advancement Pipeline)
  - Branch: `feat/day-advancement-pipeline`
  - If blocked: check CI status, resolve any failing checks
  - After merge: delete branch
  - COMPLETED: PR #172 merged, Plan 1 retroactively documented and archived

- [x] P2. Create retroactive OpenSpec for Plan 1
  - Change-id: `update-day-advancement-pipeline`
  - Action: MODIFY `day-progression` spec to reflect pipeline/registry architecture
  - Since code is already deployed, immediately archive after validation
  - `openspec validate update-day-advancement-pipeline --strict`
  - `openspec archive update-day-advancement-pipeline --yes`

- [x] P3. Archive dangling `add-quick-session-mode` change
  - `openspec archive add-quick-session-mode --yes`

- [x] P4. Verify `externalize-mm-data-assets` won't conflict
  - Check remaining 9 tasks — if CI/build related, note potential conflicts
  - Campaign branches should be created from main AFTER this merges if possible
  - VERIFIED: Remaining 9 tasks are manual validation (desktop bundling, local mm-data workflow, fresh clone tests)
  - NO CONFLICT: These tasks don't touch campaign code or specs
  - SAFE TO PROCEED: Campaign branches can be created now

---

## Naming Conventions

### Change-ID Convention
Format: `add-{plan-slug}` (for new features) or `update-{plan-slug}` (for modifications)

### Branch Convention
Format: `feat/{change-id}`

---

## Per-Plan Registry

### Plan 1: Day Advancement Pipeline ✅ DONE
| Field | Value |
|-------|-------|
| Change-ID | `update-day-advancement-pipeline` |
| Branch | `feat/day-advancement-pipeline` |
| PR | #172 |
| Status | Merged + Archived |
| Specs MODIFIED | `day-progression` |
| Specs ADDED | — |
| Sisyphus Plan | `day-advancement-expansion.md` |

---

### Plan 7: Skills Expansion (Tier 1) ✅ DONE
| Field | Value |
|-------|-------|
| Change-ID | `add-skills-expansion` |
| Branch | `feat/add-skills-expansion` |
| PR | #173 |
| Status | Merged + Archived |
| Specs MODIFIED | `personnel-management` |
| Specs ADDED | `skills-system` |
| Sisyphus Plan | `skills-expansion.md` |
| Gap Review Notes | Defines ISkillType catalog (40+ skills), 2d6 check system |

### Plan 13: Personnel Status & Role Expansion (Tier 1) ✅ DONE
| Field | Value |
|-------|-------|
| Change-ID | `add-personnel-status-roles` |
| Branch | `feat/add-personnel-status-roles` |
| PR | #176 |
| Status | Merged + Archived (#177) |
| Specs MODIFIED | `personnel-management`, `campaign-management` |
| Specs ADDED | `personnel-status-roles` |
| Sisyphus Plan | `personnel-status-role-expansion.md` |
| Gap Review Notes | Expands PersonnelStatus 10→37, CampaignPersonnelRole 10→expanded |

---

### Plan 2: Turnover & Retention (Tier 2) ✅ DONE
| Field | Value |
|-------|-------|
| Change-ID | `add-turnover-retention` |
| Branch | `feat/add-turnover-retention` |
| PR | #178 |
| Status | Merged + Archived |
| Specs MODIFIED | `personnel-management`, `day-progression` |
| Specs ADDED | `turnover-retention` |
| Sisyphus Plan | `turnover-retention-system.md` |
| Gap Review Notes | Depends on Plan 7 (skills) for skill modifiers; stubs 14 permanently-neutral modifiers |

### Plan 3: Repair & Quality Cascade (Tier 2) ✅ DONE
| Field | Value |
|-------|-------|
| Change-ID | `add-repair-quality-cascade` |
| Branch | `feat/add-repair-quality-cascade` |
| PR | #179 |
| Status | Merged + Archived |
| Specs MODIFIED | `repair` |
| Specs ADDED | `quality-system` |
| Sisyphus Plan | `repair-quality-cascade.md` |
| Gap Review Notes | Quality A(worst)-F(best) SEPARATE from condition; re-declares `maintenanceCycleDays` — use existing field |

### Plan 4: Financial System Expansion (Tier 2) ✅ DONE
| Field | Value |
|-------|-------|
| Change-ID | `add-financial-system` |
| Branch | `feat/add-financial-system` |
| PR | #181 (code included in later PRs) |
| Status | Merged + Archived |
| Specs MODIFIED | `campaign-finances`, `day-progression` |
| Specs ADDED | `financial-system` |
| Sisyphus Plan | `financial-system-expansion.md` |
| Gap Review Notes | HIGH: needs dailyCosts/financial mutual exclusion gate; re-declares `useLoanSystem` — use existing field |

### Plan 5: Faction Standing (Tier 2) ✅ DONE
| Field | Value |
|-------|-------|
| Change-ID | `add-faction-standing` |
| Branch | `feat/add-faction-standing` |
| PR | #181 |
| Status | Merged + Archived (#183) |
| Specs MODIFIED | `campaign-management` |
| Specs ADDED | `faction-standing` |
| Sisyphus Plan | `faction-standing-system.md` |
| Gap Review Notes | Regard/standing per faction, reputation modifiers |

### Plan 8: Medical System (Tier 2) ✅ DONE
| Field | Value |
|-------|-------|
| Change-ID | `add-medical-system` |
| Branch | `feat/add-medical-system` |
| PR | #182 |
| Status | Merged + Archived (#183) |
| Specs MODIFIED | `personnel-management`, `day-progression` |
| Specs ADDED | `medical-system` |
| Sisyphus Plan | `medical-system.md` |
| Gap Review Notes | 3 medical system tiers, field hospital, MASH |

---

### Plan 9: Acquisition & Supply Chain (Tier 3) ✅ DONE
| Field | Value |
|-------|-------|
| Change-ID | `add-acquisition-supply-chain` |
| Branch | `feat/add-acquisition-supply-chain` |
| PR | #184 |
| Status | Merged + Archived (#185) |
| Specs MODIFIED | `campaign-management`, `day-progression` |
| Specs ADDED | `acquisition-supply-chain` |
| Sisyphus Plan | `acquisition-supply-chain.md` |

### Plan 10: Personnel Progression (Tier 3) ✅ DONE
| Field | Value |
|-------|-------|
| Change-ID | `add-personnel-progression` |
| Branch | `feat/add-personnel-progression` |
| PR | #186 |
| Status | Merged + Archived |
| Specs MODIFIED | `personnel-management`, `day-progression` |
| Specs ADDED | `personnel-progression` |
| Sisyphus Plan | `personnel-progression.md` |
| Gap Review Notes | xpPerMission/xpPerKill vs new outcome-specific XP fields — resolve in proposal |

### Plan 11: Scenario & Combat Expansion (Tier 3) — Phase B COMPLETE
| Field | Value |
|-------|-------|
| Change-ID | `add-scenario-combat` |
| Branch | `feat/add-scenario-combat` |
| PR (OpenSpec) | #190 (MERGED) |
| PR (Implementation) | #195 (awaiting merge) |
| Status | Phase A ✅ — OpenSpec merged. Phase B ✅ — Implementation complete (7/8 tasks). Phase C — PR #195 awaiting merge. |
| Specs MODIFIED | `scenario-generation`, `combat-resolution`, `mission-contracts` |
| Specs ADDED | `scenario-combat` |
| Sisyphus Plan | `scenario-combat-expansion.md` |
| Gap Review Notes | Circular dep with Plan 12 on CombatRole type — define CombatRole in Plan 11 first |

### Plan 12: Contract Types Expansion (Tier 3) — Phase A COMPLETE
| Field | Value |
|-------|-------|
| Change-ID | `add-contract-types` |
| Branch | `feat/add-contract-types` |
| PR (OpenSpec) | #193 (MERGED) |
| Status | Phase A ✅ — OpenSpec proposal merged. Phase B (implementation) not started. |
| Specs MODIFIED | `mission-contracts` |
| Specs ADDED | `contract-types` |
| Sisyphus Plan | `contract-types-expansion.md` |
| Gap Review Notes | Depends on Plan 11 for CombatRole; expands 5→19 contract types |

### Plan 14: Awards & Auto-Granting (Tier 3) — Phase A COMPLETE
| Field | Value |
|-------|-------|
| Change-ID | `add-awards-auto-granting` |
| Branch | `feat/add-awards-auto-granting` |
| PR (OpenSpec) | #190 (MERGED — bundled with Plan 11) |
| Status | Phase A ✅ — OpenSpec proposal merged. Phase B (implementation) not started. |
| Specs MODIFIED | `awards`, `day-progression` |
| Specs ADDED | `awards-auto-granting` |
| Sisyphus Plan | `awards-auto-granting.md` |

### Plan 15: Rank System (Tier 3) — Phase A COMPLETE
| Field | Value |
|-------|-------|
| Change-ID | `add-rank-system` |
| Branch | `feat/add-rank-system` |
| PR (OpenSpec) | #190 (MERGED — bundled with Plan 11) |
| Status | Phase A ✅ — OpenSpec proposal merged. Phase B (implementation) not started. |
| Specs MODIFIED | `personnel-management` |
| Specs ADDED | `rank-system` |
| Sisyphus Plan | `rank-system.md` |

### Plan 16: Random Events (Tier 3) — Phase A COMPLETE
| Field | Value |
|-------|-------|
| Change-ID | `add-random-events` |
| Branch (Impl) | `feat/add-random-events` |
| PR (OpenSpec) | #191 (MERGED) |
| Status | Phase A ✅ — OpenSpec proposal merged. Phase B (implementation) not started. |
| Specs MODIFIED | `day-progression`, `campaign-management` |
| Specs ADDED | `random-events` |
| Sisyphus Plan | `random-events.md` |
| Gap Review Notes | Re-declares `useRandomEvents` — use existing field |

### Plan 17: Markets System (Tier 3) — Phase A COMPLETE
| Field | Value |
|-------|-------|
| Change-ID | `add-markets-system` |
| Branch (Impl) | `feat/add-markets-system` |
| PR (OpenSpec) | #192 (MERGED) |
| Status | Phase A ✅ — OpenSpec proposal merged. Phase B (implementation) not started. |
| Specs MODIFIED | `campaign-management`, `day-progression` |
| Specs ADDED | `markets-system` |
| Sisyphus Plan | `markets-system.md` |

---

### Plan 6: Campaign Options Presets (Tier 4 — LAST)
| Field | Value |
|-------|-------|
| Change-ID | `add-campaign-presets` |
| Branch | `feat/add-campaign-presets` |
| Specs MODIFIED | `campaign-management`, `campaign-ui` |
| Specs ADDED | `campaign-presets` |
| Sisyphus Plan | `campaign-options-presets.md` |
| Gap Review Notes | `campaignType` as REQUIRED field is the only breaking change; build LAST after all options exist |

---

## Per-Plan Lifecycle Template

For every plan, the executor follows these steps IN ORDER:

### Phase A: OpenSpec Proposal (before any code)

```
- [ ] A1. BLOCKER CHECK: Verify NO open campaign PRs exist (gh pr list --state open)
         → If any open PR exists, STOP. Wait for merge before proceeding.
- [ ] A2. Read the Sisyphus plan: .sisyphus/plans/{plan}.md
- [ ] A3. Read relevant existing specs: openspec show {spec-id}
- [ ] A4. Check for conflicts: openspec list
- [ ] A5. Create change directory: mkdir -p openspec/changes/{change-id}/specs/{capability}
- [ ] A6. Write proposal.md (Why, What Changes, Impact)
- [ ] A7. Write tasks.md (implementation checklist mirroring Sisyphus plan TODOs)
- [ ] A8. Write design.md (if cross-cutting, new patterns, or complex migration)
- [ ] A9. Write spec deltas:
         - MODIFIED specs: copy existing requirement, edit, paste under ## MODIFIED Requirements
         - ADDED specs: write new requirements under ## ADDED Requirements
         - Every requirement MUST have #### Scenario: with WHEN/THEN
- [ ] A10. Validate: openspec validate {change-id} --strict → must PASS
- [ ] A11. Present proposal to user for approval
- [ ] A12. Create proposal PR, push, and wait for merge
         → PR MUST BE MERGED before starting Phase B. No exceptions.
```

### Phase B: Implementation

```
- [ ] B1. BLOCKER CHECK: Verify the Phase A proposal PR is MERGED (gh pr view {pr-number} --json state)
         → If PR is not merged, STOP. Do NOT begin implementation.
- [ ] B2. Pull latest main: git checkout main && git pull
- [ ] B3. Create branch: git checkout -b feat/{change-id}
- [ ] B4. Read proposal.md, design.md, tasks.md
- [ ] B5. Implement tasks sequentially (following Sisyphus plan TODOs)
- [ ] B6. Run tests: npx jest --no-coverage {relevant-paths}
- [ ] B7. Type-check: verify no new errors in changed files
- [ ] B8. Mark all tasks.md items as [x]
```

### Phase C: Ship & Archive

```
- [ ] C1. Commit: git add . && git commit -m "feat(campaign): {description}"
- [ ] C2. Push: git push -u origin feat/{change-id}
- [ ] C3. Create PR: gh pr create --title "..." --body "..."
- [ ] C4. WAIT FOR CI + MERGE (automated polling):
         → DO NOT commit additional changes after creating the PR — each push resets CI.
         → Poll: sleep 60, then `gh pr checks {pr-number}`.
         → Repeat until ALL checks show "pass" or any shows "fail".
         → If any check FAILS: read the failure log, fix on the branch, push, restart polling.
         → If ALL checks PASS: merge immediately with `gh pr merge {pr-number} --merge --delete-branch`.
         → If merge fails due to local changes: `git stash`, merge, `git stash pop`.
- [ ] C5. Pull latest main: git checkout main && git pull
- [ ] C6. Archive OpenSpec: openspec archive {change-id} --yes
- [ ] C7. Validate post-archive: openspec validate --strict
- [ ] C8. Commit archive: git add . && git commit -m "chore(openspec): archive {change-id}"
- [ ] C9. Push archive commit to main (or create archive PR and wait for merge)
- [ ] C10. Delete feature branch: git branch -d feat/{change-id}
- [ ] C11. FINAL GATE: Confirm ALL PRs for this plan are MERGED before starting next plan.
         → gh pr list --state open → must show NO open campaign PRs
```

### CRITICAL: PR Merge Workflow

**After creating a PR, follow this exact sequence:**

1. **STOP committing.** Every push resets CI checks. Do not add documentation, fix formatting, or make any other changes unless CI fails.
2. **Poll in 60-second intervals:**
   ```bash
   while true; do
     sleep 60
     gh pr checks {pr-number}
     # If all pass → break and merge
     # If any fail → fix, push, restart loop
   done
   ```
3. **Merge immediately when green:**
   ```bash
   gh pr merge {pr-number} --merge --delete-branch
   ```
4. **Continue working.** Do not write status documents, preparation docs, or blocker summaries. Just wait for CI and merge.

---

## Execution Order

### Gate Rules
- **PR-MERGE GATE**: After creating a PR, poll CI checks every 60 seconds. When all pass, merge immediately with `gh pr merge --merge --delete-branch`. Do NOT commit additional changes while waiting (resets CI). Do NOT write documentation or preparation work while waiting — just poll and merge.
- **SPECS-FIRST GATE**: ALL Phase A (OpenSpec proposals) for every plan in a tier MUST be created, PR'd, and MERGED before ANY plan in that tier begins Phase B (implementation). No plan starts coding until every sibling plan's spec is merged.
- **TIER GATE**: All plans in Tier N must have their PRs MERGED (Phase A, B, and C complete) before any Tier N+1 plan starts Phase A.
- **WITHIN TIER**: Plans within the same tier can be implemented in any order during Phase B, but each plan's implementation PR must merge before starting the next plan's implementation.
- **EXCEPTION**: Plan 11 must complete Phase B+C before Plan 12 starts Phase B (CombatRole type dependency).
- **VERIFICATION**: Before starting ANY new work, run `gh pr list --state open` to confirm no unmerged campaign PRs exist.

### Execution Sequence

```
PREREQUISITES
  P1. Merge/close PR #172
  P2. Retroactive OpenSpec for Plan 1 (update-day-advancement-pipeline)
  P3. Archive add-quick-session-mode
  P4. Verify externalize-mm-data-assets status
  ─── GATE: Prerequisites complete ───

TIER 1 (Infrastructure) ✅ COMPLETE
  Plan 7:  Skills Expansion ─────────────── A ✅ → B ✅ → C ✅ ARCHIVED
  Plan 13: Personnel Status/Roles ────────── A ✅ → B ✅ → C ✅ ARCHIVED
  ─── GATE: Both Tier 1 PRs merged ✅ ───

TIER 2 (Core Systems) ✅ COMPLETE
  Plan 2:  Turnover & Retention ──────────── A ✅ → B ✅ → C ✅ ARCHIVED (PR #178)
  Plan 3:  Repair & Quality Cascade ──────── A ✅ → B ✅ → C ✅ ARCHIVED (PR #179)
  Plan 4:  Financial System ──────────────── A ✅ → B ✅ → C ✅ ARCHIVED (code in PR #181+)
  Plan 5:  Faction Standing ──────────────── A ✅ → B ✅ → C ✅ ARCHIVED (PR #181)
  Plan 8:  Medical System ───────────────── A ✅ → B ✅ → C ✅ ARCHIVED (PR #182)
  ─── GATE: All Tier 2 PRs merged ✅ ───

TIER 3 (Dependent Systems) — 2/8 COMPLETE
  ── Phase A: ALL Specs (COMPLETE ✅) ──────────────────────────────────────
  Plan 9:  Acquisition & Supply Chain ────── A ✅ (PR #184 scope)
  Plan 10: Personnel Progression ─────────── A ✅ (PR #186 scope)
  Plan 11: Scenario & Combat ────────────── A ✅ (PR #190 MERGED)
  Plan 12: Contract Types ───────────────── A ✅ (PR #193 MERGED)
  Plan 14: Awards & Auto-Granting ────────── A ✅ (PR #190 MERGED)
  Plan 15: Rank System ──────────────────── A ✅ (PR #190 MERGED)
  Plan 16: Random Events ───────────────── A ✅ (PR #191 MERGED)
  Plan 17: Markets System ──────────────── A ✅ (PR #192 MERGED)
  ─── SPECS-FIRST GATE: All 8 Tier 3 specs merged ✅ — implementation may begin ───

  ── Phase B+C: Implementation & Ship (2/8 COMPLETE) ──────────────────────
  Plan 9:  Acquisition & Supply Chain ────── B ✅ → C ✅ ARCHIVED (PR #184)
  Plan 10: Personnel Progression ─────────── B ✅ → C ✅ ARCHIVED (PR #186)
  Plan 11: Scenario & Combat ────────────── B ✅ → C (PR #195 - awaiting merge) ← MUST complete before Plan 12 Phase B
  Plan 12: Contract Types ───────────────── B → C  ← AFTER Plan 11 B+C complete
  Plan 14: Awards & Auto-Granting ────────── B → C
  Plan 15: Rank System ──────────────────── B → C
  Plan 16: Random Events ───────────────── B → C
  Plan 17: Markets System ──────────────── B → C
  ─── TIER GATE: All Tier 3 implementation PRs merged before Tier 4 starts ───

TIER 4 (Capstone)
  ── Phase A: ALL Specs ───────────────────────────────────────────────────
  Plan 6:  Campaign Options Presets ──────── A
  ─── SPECS-FIRST GATE: Plan 6 spec merged before implementation ───

  ── Phase B+C: Implementation & Ship ─────────────────────────────────────
  Plan 6:  Campaign Options Presets ──────── B → C
  ─── DONE ───
```

---

## Gap Review Constraints (Per Plan)

These critical issues from the cross-plan gap review MUST be addressed in each plan's OpenSpec proposal:

| Issue | Severity | Affected Plan | Resolution |
|-------|----------|---------------|------------|
| `maintenanceCycleDays` duplicate field | MEDIUM | Plan 3 | Use existing ICampaignOptions field, do NOT re-declare |
| `useLoanSystem` duplicate field | MEDIUM | Plan 4 | Use existing ICampaignOptions field, do NOT re-declare |
| `useRandomEvents` duplicate field | MEDIUM | Plan 16 | Use existing ICampaignOptions field, do NOT re-declare |
| xpPerMission/xpPerKill vs outcome XP | MEDIUM | Plan 10 | Resolve which fields to keep in proposal |
| `campaignType` as REQUIRED field | HIGH | Plan 6 | Only breaking change — address migration in proposal |
| dailyCosts/financial mutual exclusion | HIGH | Plan 4 | Must gate existing dailyCosts processor vs new financial processor |
| Plan 11↔12 circular CombatRole dep | HIGH | Plans 11, 12 | Define CombatRole in Plan 11; Plan 12 imports it |
| String phase names vs DayPhase enum | LOW | Plans 3, 4, 8 | Use DayPhase enum values, not strings |
| Plan 3 duplicate Tech skill type | LOW | Plan 3 | Use Plan 7's ISkillType, do not re-define |

---

## Success Criteria

### Verification Commands
```bash
openspec list              # No dangling campaign changes
openspec validate --strict # All specs valid
npx jest --no-coverage     # All tests pass
```

### Final Checklist
- [ ] All 17 plans implemented, PRed, merged, and archived
- [ ] All OpenSpec changes archived under changes/archive/
- [ ] All new specs exist under openspec/specs/
- [ ] `openspec validate --strict` passes globally
- [ ] Full test suite passes
- [ ] ICampaignOptions has ~114 fields (from gap review projection)
- [ ] 16 day processors registered in pipeline
- [ ] No duplicate ICampaignOptions fields
