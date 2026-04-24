# Change: Add Quick Resolve Monte Carlo

## Why

Phase 1 delivers a playable tactical skirmish, but a single match is a
sample size of 1. Players making campaign decisions, weighing force
composition, or sizing up a scenario need to know "how often do I win
this?" without sitting through 30 minutes of manual play. Phase 2's core
promise is "run 100 auto-resolves and see the outcome distribution."
This change wires a Quick Resolve batch runner on top of the existing
`GameEngine.runToCompletion()` so any configured encounter can be fed to
the engine N times with distinct seeds, aggregated, and reported as a
distribution — win probability per side, turn-count percentiles,
casualty distribution, heat-shutdown frequency, and mech-destroyed
frequency.

## What Changes

- Add `QuickResolveService.runBatch(config, { runs, baseSeed })` that
  executes `GameEngine.runToCompletion()` N times (default 100), varies
  the seed deterministically (`baseSeed + runIndex`), and collects each
  completed session into an `IBatchOutcome[]`
- Add `aggregateBatchOutcomes(outcomes): IBatchResult` that reduces the
  raw outcomes into win probabilities (player/opponent/draw), turn-count
  mean/median/p25/p75/p90, heat-shutdown frequency per side,
  mech-destroyed frequency per side, and per-unit survival rate
- Extend the existing `after-combat-report` schema with a batch-level
  summary shape (`IBatchResult`) that wraps the Phase 1
  `IPostBattleReport` samples
- Reuse the existing `SeededRandom` + injectable `DiceRoller` —
  Monte Carlo must NOT introduce a second source of randomness
- Add a React Query hook `useQuickResolve()` that wraps the batch runner
  and exposes progress (`runsCompleted / totalRuns`) plus the aggregated
  result once done
- Add a "Quick Resolve" button on the encounter detail page; the button
  opens a small run-size selector (25 / 100 / 500) and dispatches the
  hook

## Dependencies

- **Requires**: Phase 1 A1–A5 (rule accuracy — otherwise aggregated
  outcomes are garbage), `simulation-system` (existing `runToCompletion`),
  `combat-resolution` (existing `CombatResolver`), `game-session-management`
  (session lifecycle), `after-combat-report` (per-session report shape),
  `add-victory-and-post-battle-summary` (defines `IPostBattleReport` that
  batch aggregation consumes)
- **Required By**: `add-quick-sim-result-display` (renders the
  `IBatchResult` shape produced here)

## Impact

- Affected specs: `simulation-system` (ADDED — batch runner +
  deterministic seed variation), `combat-resolution` (MODIFIED —
  exposes batch aggregation helper), `after-combat-report` (MODIFIED —
  adds `IBatchResult` schema wrapping N `IPostBattleReport` samples)
- Affected code: new `src/simulation/QuickResolveService.ts`, new
  `src/simulation/aggregateBatchOutcomes.ts`, new
  `src/hooks/useQuickResolve.ts`, `src/pages/gameplay/encounters/[id]/index.tsx`
  (adds button), existing `src/engine/GameEngine.ts` remains untouched
  (read-only consumer)
- Non-goals: surfacing the result UI (that is
  `add-quick-sim-result-display`), persisting batch runs to disk (Phase
  3 campaign integration), streaming partial results (future), running
  batches concurrently via workers (future — MVP is sequential main
  thread with yielding)
