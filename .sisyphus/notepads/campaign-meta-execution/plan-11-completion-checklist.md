# Plan 11 Completion Checklist

## Status: Phase C - Awaiting PR #195 Merge

### Completed Steps

- [x] C1. All changes committed (10 commits on feat/add-scenario-combat)
- [x] C2. Branch pushed to origin
- [x] C3. PR #195 created with comprehensive description
- [x] C4. PR checks verified locally (tests, build, lint all pass)
- [ ] C5. **BLOCKED** - PR #195 awaiting merge

### Remaining Steps (After PR #195 Merges)

```bash
# C6. Pull latest main
git checkout main
git pull

# C7. Archive OpenSpec change
openspec archive add-scenario-combat --yes

# C8. Validate post-archive
openspec validate --strict

# C9. Commit archive
git add .
git commit -m "chore(openspec): archive add-scenario-combat"

# C10. Push archive commit
git push

# C11. Delete feature branch
git branch -d feat/add-scenario-combat
git push origin --delete feat/add-scenario-combat

# C12. Verify no open PRs
gh pr list --state open  # Must show NO open campaign PRs
```

### Post-Completion Updates

After completing C6-C12, update these files:

1. **`.sisyphus/plans/campaign-meta-execution.md`**:
   - Change Plan 11 status from "B ✅ → C (PR #195 - awaiting merge)" to "B ✅ → C ✅ ARCHIVED"
   - Update Tier 3 progress counter from "2/8 COMPLETE" to "3/8 COMPLETE"

2. **`.sisyphus/plans/scenario-combat-expansion.md`**:
   - Mark Task 11.8 as deferred (add note explaining UI work can be follow-up PR)
   - Add final summary section with commit hashes and PR links

3. **`.sisyphus/notepads/campaign-meta-execution/progress.md`**:
   - Move Plan 11 from "In Progress" to "Completed Plans"
   - Update overall progress counter

### Next Plan: Plan 12 (Contract Types)

**Why Plan 12 is next**: Line 378 of meta-execution plan states:
> **EXCEPTION**: Plan 11 must complete Phase B+C before Plan 12 starts Phase B (CombatRole type dependency).

Plan 12 depends on the `CombatRole` type defined in Plan 11, so it must wait for Plan 11 to fully complete.

**Plan 12 Details**:
- Change-ID: `add-contract-types`
- Branch: `feat/add-contract-types`
- OpenSpec: PR #193 (already merged)
- Sisyphus Plan: `contract-types-expansion.md`
- Expands 5 → 19 contract types
- Uses CombatRole from Plan 11

**Plan 12 Phase B Checklist**:
1. Verify PR #195 merged and Plan 11 archived
2. Pull latest main
3. Create branch: `git checkout -b feat/add-contract-types`
4. Read `.sisyphus/plans/contract-types-expansion.md`
5. Read OpenSpec proposal in `openspec/changes/add-contract-types/`
6. Implement tasks sequentially
7. Create PR when complete

### Alternative Plans (If Plan 12 Blocked)

If Plan 12 encounters issues, these plans can proceed independently:
- Plan 14: Awards & Auto-Granting
- Plan 15: Rank System
- Plan 16: Random Events
- Plan 17: Markets System

All have Phase A complete (OpenSpec merged) and no dependencies on Plan 11.
