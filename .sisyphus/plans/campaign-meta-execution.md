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
- [ ] All 17 plans have change-ids, branch names, and spec mappings defined
- [ ] Execution order is clear with dependency gates between tiers
- [ ] Prerequisites are listed and actionable
- [ ] Per-plan lifecycle template is documented

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

### Plan 11: Scenario & Combat Expansion (Tier 3)
| Field | Value |
|-------|-------|
| Change-ID | `add-scenario-combat` |
| Branch | `feat/add-scenario-combat` |
| Specs MODIFIED | `scenario-generation`, `combat-resolution`, `mission-contracts` |
| Specs ADDED | `scenario-combat` |
| Sisyphus Plan | `scenario-combat-expansion.md` |
| Gap Review Notes | Circular dep with Plan 12 on CombatRole type — define CombatRole in Plan 11 first |

### Plan 12: Contract Types Expansion (Tier 3)
| Field | Value |
|-------|-------|
| Change-ID | `add-contract-types` |
| Branch | `feat/add-contract-types` |
| Specs MODIFIED | `mission-contracts` |
| Specs ADDED | `contract-types` |
| Sisyphus Plan | `contract-types-expansion.md` |
| Gap Review Notes | Depends on Plan 11 for CombatRole; expands 5→19 contract types |

### Plan 14: Awards & Auto-Granting (Tier 3)
| Field | Value |
|-------|-------|
| Change-ID | `add-awards-auto-granting` |
| Branch | `feat/add-awards-auto-granting` |
| Specs MODIFIED | `awards`, `day-progression` |
| Specs ADDED | `awards-auto-granting` |
| Sisyphus Plan | `awards-auto-granting.md` |

### Plan 15: Rank System (Tier 3)
| Field | Value |
|-------|-------|
| Change-ID | `add-rank-system` |
| Branch | `feat/add-rank-system` |
| Specs MODIFIED | `personnel-management` |
| Specs ADDED | `rank-system` |
| Sisyphus Plan | `rank-system.md` |

### Plan 16: Random Events (Tier 3)
| Field | Value |
|-------|-------|
| Change-ID | `add-random-events` |
| Branch | `feat/add-random-events` |
| Specs MODIFIED | `day-progression`, `campaign-management` |
| Specs ADDED | `random-events` |
| Sisyphus Plan | `random-events.md` |
| Gap Review Notes | Re-declares `useRandomEvents` — use existing field |

### Plan 17: Markets System (Tier 3)
| Field | Value |
|-------|-------|
| Change-ID | `add-markets-system` |
| Branch | `feat/add-markets-system` |
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
- [ ] A1. Read the Sisyphus plan: .sisyphus/plans/{plan}.md
- [ ] A2. Read relevant existing specs: openspec show {spec-id}
- [ ] A3. Check for conflicts: openspec list
- [ ] A4. Create change directory: mkdir -p openspec/changes/{change-id}/specs/{capability}
- [ ] A5. Write proposal.md (Why, What Changes, Impact)
- [ ] A6. Write tasks.md (implementation checklist mirroring Sisyphus plan TODOs)
- [ ] A7. Write design.md (if cross-cutting, new patterns, or complex migration)
- [ ] A8. Write spec deltas:
         - MODIFIED specs: copy existing requirement, edit, paste under ## MODIFIED Requirements
         - ADDED specs: write new requirements under ## ADDED Requirements
         - Every requirement MUST have #### Scenario: with WHEN/THEN
- [ ] A9. Validate: openspec validate {change-id} --strict → must PASS
- [ ] A10. Present proposal to user for approval
```

### Phase B: Implementation

```
- [ ] B1. Create branch: git checkout -b feat/{change-id}
- [ ] B2. Read proposal.md, design.md, tasks.md
- [ ] B3. Implement tasks sequentially (following Sisyphus plan TODOs)
- [ ] B4. Run tests: npx jest --no-coverage {relevant-paths}
- [ ] B5. Type-check: verify no new errors in changed files
- [ ] B6. Mark all tasks.md items as [x]
```

### Phase C: Ship & Archive

```
- [ ] C1. Commit: git add . && git commit -m "feat(campaign): {description}"
- [ ] C2. Push: git push -u origin feat/{change-id}
- [ ] C3. Create PR: gh pr create --title "..." --body "..."
- [ ] C4. Verify PR checks pass (lint, test, build)
- [ ] C5. Merge PR: gh pr merge --squash (or user merges manually)
- [ ] C6. Archive OpenSpec: openspec archive {change-id} --yes
- [ ] C7. Validate post-archive: openspec validate --strict
- [ ] C8. Commit archive: git add . && git commit -m "chore(openspec): archive {change-id}"
- [ ] C9. Push archive commit to main
- [ ] C10. Delete feature branch: git branch -d feat/{change-id}
```

---

## Execution Order

### Gate Rules
- **TIER GATE**: All plans in Tier N must have their PRs MERGED before any Tier N+1 plan starts Phase A
- **WITHIN TIER**: Plans within the same tier can be executed in any order
- **EXCEPTION**: Plan 11 must complete before Plan 12 (CombatRole type dependency)

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

TIER 3 (Dependent Systems) — 2/8 MERGED
  Plan 11: Scenario & Combat ────────────── A → B → C  ← MUST be before Plan 12
  Plan 12: Contract Types ───────────────── A → B → C  ← AFTER Plan 11
  Plan 9:  Acquisition & Supply Chain ────── A ✅ → B ✅ → C ✅ ARCHIVED (PR #184)
  Plan 10: Personnel Progression ─────────── A ✅ → B ✅ → C ✅ ARCHIVED (PR #186)
  Plan 14: Awards & Auto-Granting ────────── A → B → C
  Plan 15: Rank System ──────────────────── A → B → C
  Plan 16: Random Events ───────────────── A → B → C
  Plan 17: Markets System ──────────────── A → B → C
  ─── GATE: All Tier 3 PRs merged ───

TIER 4 (Capstone)
  Plan 6:  Campaign Options Presets ──────── A → B → C
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
