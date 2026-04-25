# Notepad — Learnings

## [2026-04-24 apply] Initial inventory

Auditor's notes after re-reading design.md "Starting State Inventory" against the actual codebase.

- `TURN_LIMIT_DRAW_TOLERANCE = 0.05` and `isTurnLimitDraw(p,o)` were
  NOT in the worktree's `gameSessionCore.ts` (only in main repo's
  copy). Added in this wave at `src/utils/gameplay/gameSessionCore.ts:30,42`.
- `InteractiveSession.concede()` (`src/engine/InteractiveSession.ts:571-579`)
  ALREADY throws `Error('Game is not active')` when status !== Active.
  Design.md's inventory called this out as needing a fix; it had
  already been fixed pre-button-up. No change needed in this wave.
- `useGameplayStore` did NOT yet expose an `isGameCompleted` selector.
  Added `selectIsGameCompleted` + `useIsGameCompleted` hook in this
  wave.
- `ConcedeButton` is already wired into `GameplayLayout.tsx:745` as
  a trailing action on the ActionBar. **No HUD wiring task remaining.**
- `MvpDisplay` matches §8 except for the trailing
  `unitId.localeCompare` tie-break — added in this wave to
  `pickMvp()` in `postBattleReport.ts`.
- `postBattleReport.ts` originally counted heat problems via raw
  `>= 14` threshold. Replaced with `ShutdownCheck` event count per
  design D3.
- `phase1Capstone.test.ts` exists but did NOT assert byte-identical
  replay. Added shape-parity assertion + `STRICT_REPLAY=1` env gate
  for the future tightening.

## [2026-04-24 apply] Existing test infra

- Smoke test at
  `src/__tests__/unit/gameplay/addVictoryAndPostBattleSummary.smoke.test.ts`
  already covers concede semantics, derive shape, MVP zero-damage
  edge case, and `victoryReasonLabel`. New
  `victory-spec-coverage.test.ts` covers the SHALL scenarios it
  doesn't yet hit (unitId tie-break, kill accounting, turn-limit
  predicate boundaries).
- Smoke test at
  `src/components/gameplay/__tests__/addVictoryFlowUI.smoke.test.tsx`
  covers `ConcedeButton` + `MvpDisplay` UI. **Re-read before writing
  new UI tests to avoid duplication.**
- Capstone integration test
  `src/__tests__/integration/phase1Capstone.test.ts` already exists
  and consumes `derivePostBattleReport`.

## [2026-04-24 apply] Persistence layer pattern

- `SQLiteService.ts:56-262` defines `MIGRATIONS` array. v1=initial_schema,
  v2=pilots_schema, v3=campaign_instances_schema,
  v4=pilot_abilities_spa_designation. **v5 added in this wave =
  `match_logs`.**
- API route pattern lives at `src/pages/api/encounters/[id]/index.ts`.
  Calls `getSQLiteService().initialize()` first; uses
  `NextApiRequest`/`NextApiResponse`; methods routed via
  `req.method` switch.
- `IGameEvent` payload signatures: `IDamageAppliedPayload`,
  `IGameEndedPayload`, `IShutdownCheckPayload`, etc. — all
  available via `@/types/gameplay`.

## [2026-04-24 apply] Path resolution gotcha — worktree vs main repo

The Claude harness runs in
`E:\Projects\MekStation\.claude\worktrees\agent-a37728fc32783cec2\`
but the Edit/Write tool's absolute-path inputs `E:\Projects\MekStation\src\...`
RESOLVE TO THE MAIN REPO, NOT THE WORKTREE. Initial round of edits
landed in the wrong tree, leaving the worktree's git status "clean"
even after edits "succeeded."

**Workaround:** use the FULL worktree path
`E:\Projects\MekStation\.claude\worktrees\agent-a37728fc32783cec2\src\...`
with the Edit/Write tool. Bash heredocs with relative paths work
correctly because pwd is the worktree.

**Detection:** if `grep -c <pattern> src/foo.ts` returns 0
immediately after an Edit success, you're hitting this. Compare
`md5sum` of the worktree file vs `git show HEAD:src/foo.ts` —
matching hashes means the edit didn't land.
