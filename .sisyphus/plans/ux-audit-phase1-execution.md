# UX Audit Phase 1: Domain-Specific Reviews — Execution Plan

## Status

**Phase 0**: ✅ Complete (PR #211 merged)  
**Phase 1**: ✅ Complete (12/12 reviews done, ~250 findings)  
**Phase 2**: ⏳ Pending (Cross-Cutting Reviews)  
**Phase 3**: ⏳ Pending (Synthesis)

---

## Phase 1: Domain-Specific Reviews (12 Tasks, All Parallel)

### Batch 1: Core Screens (Tasks 3-6)
- [x] Task 3: List Page Reviews — 32 findings (2 P0, 9 P1, 13 P2, 8 P3)
- [x] Task 4: Detail Page Reviews — completed (prior session)
- [x] Task 5: Form & Wizard Reviews — completed (prior session)
- [x] Task 6: Editor & Builder Reviews — 34 findings (5 P0, 10 P1, 12 P2, 7 P3)

### Batch 2: Game & Tools (Tasks 7-10)
- [x] Task 7: Game UI Reviews — 28 findings (3 P0, 7 P1, 11 P2, 7 P3)
- [x] Task 8: Replay & Audit Tools Reviews — 22 findings (3 P0, 5 P1, 9 P2, 5 P3)
- [x] Task 9: Comparison View Reviews — 14 findings (0 P0, 3 P1, 7 P2, 4 P3)
- [x] Task 10: Settings Page Reviews — 16 findings (0 P0, 3 P1, 7 P2, 6 P3)

### Batch 3: Structure & Layout (Tasks 11-14)
- [x] Task 11: Navigation & App Shell Reviews — 18 findings (1 P0, 4 P1, 7 P2, 6 P3)
- [x] Task 12: Card & Entity Display Reviews — 21 findings (2 P0, 5 P1, 9 P2, 5 P3)
- [x] Task 13: Data-Dense Display Reviews — 18 findings (0 P0, 3 P1, 8 P2, 7 P3)
- [x] Task 14: Split Panel & Layout Reviews — 15 findings (1 P0, 2 P1, 5 P2, 7 P3)

---

## Output Structure

Each review produces: `.sisyphus/evidence/findings/{task-name}.md`

Format:
```markdown
# {Task Name} — UX Findings

**Reviewer**: {agent-type}
**Date**: {timestamp}
**Screenshots Reviewed**: {count}

## Summary
- Total Findings: {count}
- P0 (Blocker): {count}
- P1 (Critical): {count}
- P2 (Major): {count}
- P3 (Minor): {count}

## Findings

### Finding {ID}: {Title}
**Finding ID**: {AGENT}-{NUMBER}
**Route**: /path/to/page
**Viewport**: phone | tablet | tablet-desktop | desktop
**Dimension**: {1-10 from audit dimensions}
**Severity**: P0 | P1 | P2 | P3
**Finding**: {One-sentence description}
**Evidence**: {Screenshot path or code reference}
**Fix Plan**:
  - Files: {affected file paths}
  - Change: {what to change conceptually}
  - Complexity: trivial | small | medium | large
  - Cross-impact: YES (affects N components) | NO (isolated)
  - Confidence: high | medium | low
```

---

## Execution Notes

- Each task runs independently as a text-only subagent
- All use standardized audit standards from ux-audit.md
- **Visual evidence is provided as pre-extracted text descriptions** from `.sisyphus/evidence/screenshot-descriptions.md`
- Screenshot file paths in `.sisyphus/evidence/screenshots/` are referenced for traceability only
- Test data manifest in `.sisyphus/evidence/test-data-manifest.json`

### ⚠ Stability Constraint (Added 2026-01-27)

**Subagents MUST NOT call `look_at` on screenshot files.**

The `oh-my-opencode` MCP server is a Bun-compiled standalone binary (~119MB). When 10+ subagents
concurrently decode PNG images via `look_at`, the Bun runtime segfaults under memory pressure.
This crashed multiple audit sessions before diagnosis.

**Mitigation**: Phase 0.5 (centralized screenshot analysis) runs in the main Sisyphus session,
producing `.sisyphus/evidence/screenshot-descriptions.md`. All Phase 1 and Phase 2 subagents
receive these text descriptions instead of raw images. This eliminates concurrent image decoding.

