# Audit Corrections — Issues & Gotchas

> Problems encountered, solutions applied, edge cases discovered.


## [2026-01-27T19:10] Task 1: DO-NOT-TOUCH File Violation

**Problem**: Subagent modified files outside scope
- Modified: `ux-audit.md`, `ux-audit-screen-map.md` (both on DO-NOT-TOUCH list)
- Root cause: Unclear - subagent was given explicit instruction to edit ONLY `skills-expansion.md`

**Solution**: Reverted unauthorized changes with `git checkout`
- Verified: Only `skills-expansion.md` modified (+ boulder.json state update)

**Prevention**: Add explicit DO-NOT-TOUCH list verification to all future task prompts
