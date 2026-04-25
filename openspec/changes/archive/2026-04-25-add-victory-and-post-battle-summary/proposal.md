# Change: Add Victory And Post-Battle Summary

## Why

Phase 1 defines "done" as a skirmish that reaches a decisive outcome with
a readable summary. The engine can detect destruction-only end conditions
today, but there's no way to concede, no turn-limit handling, no victory
screen, and no post-battle report surface. Players need a moment of
resolution — "I won/lost, here's what happened" — and a persistent log
the fuzzer + future campaign integration can read from.

## What Changes

- Detect win conditions: last side standing (existing), opt-in concede,
  turn-limit reached per `config.turnLimit`
- Render a victory screen when a session transitions to `Completed`,
  showing the winner, reason, and a short human summary
- Render a post-battle report with per-unit damage received, kills, heat
  problems, physical attacks, MVP determination (most damage dealt),
  and an XP column marked `"pending campaign integration"` (Phase 3)
- Persist the match log to `/api/matches` so it survives a page reload
  and can be re-opened via `/gameplay/matches/[id]`
- Concede affordance in the combat screen (small button under the phase
  HUD) that appends `GameEnded` with `reason: 'concede'`

## Dependencies

- **Requires**: `add-interactive-combat-core-ui` (phase HUD for concede
  button), `add-damage-feedback-ui` (post-battle report needs structured
  damage events), `game-session-management` (session lifecycle),
  `after-combat-report` (existing ACAR spec hosts casualty/damage
  distribution shapes we re-use)
- **Related**: Lane A A4 must be done or the post-battle report renders
  zeroes
- **Required By**: Phase 2 (Quick Sim reads the same post-battle report
  schema)

## Impact

- Affected specs: `game-session-management` (MODIFIED — victory
  detection rules for concede + turn limit + last-side-standing cleanup),
  `after-combat-report` (MODIFIED — add `IPostBattleReport` schema),
  `combat-resolution` (MODIFIED — tactical resolution path references
  the same report schema)
- Affected code: new `/gameplay/games/[id]/victory.tsx` page, new
  `/gameplay/matches/[id].tsx` page, `useGameplayStore` gains an
  `isGameCompleted` selector, new API route `/api/matches` for
  persistence, `src/engine/InteractiveSession.ts` gains a
  `concede(side)` method
- Non-goals: XP calculation (Phase 3), contract-pay calculation (Phase
  3), salvage generation (Phase 3), per-weapon hit-rate stats (Phase 2
  Quick Sim)
