# Issues - MekHQ Campaign System

Problems, gotchas, and edge cases discovered during implementation.

---


## Delegation System Blocker (2026-01-26)

### Issue
All `delegate_task()` calls for UI tasks are failing immediately with status="error" and duration=0s.

### Evidence
- Task bg_452e6ee2: Create campaign dashboard - FAILED (0s)
- Task bg_9e515be0: Create campaign dashboard - FAILED (0s)
- Task bg_22030d9d: Create personnel list page - FAILED (0s)

### Pattern
- Background tasks start but fail before any work begins
- No error message in output
- Session IDs are generated but tasks don't execute
- Only affects visual-engineering category tasks

### Workaround
- Created UI files directly using Write tool
- Fixed TypeScript errors using Edit tool
- Verified with typecheck and build
- All files working correctly

### Impact
- Cannot use delegation for remaining UI tasks (7.1, 7.3, 7.4)
- Must create files directly
- Still following verification protocol (typecheck, build, commit)

### Files Created Directly
1. src/pages/gameplay/campaigns/[id]/index.tsx (dashboard) - 250 lines
2. src/pages/gameplay/campaigns/[id]/personnel.tsx - 210 lines

Both files: Zero TypeScript errors, build passes, committed successfully.

