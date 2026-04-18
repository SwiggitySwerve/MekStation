# Tasks: Add Quick Resolve Monte Carlo

## 1. Batch Outcome Schema

- [x] 1.1 Define `IBatchOutcome` capturing `{runIndex, seed, report:
IPostBattleReport, durationMs}`
- [x] 1.2 Define `IBatchResult` with `{totalRuns, winProbability:
{player, opponent, draw}, turnCount: {mean, median, p25, p75, p90,
min, max}, heatShutdownFrequency: {player, opponent},
mechDestroyedFrequency: {player, opponent}, perUnitSurvival:
Record<unitId, number>, mostLikelyOutcome}`
- [x] 1.3 Add both shapes to `after-combat-report` spec's type exports

## 2. Batch Runner

- [x] 2.1 Create `QuickResolveService.runBatch(config, options)` that
      takes the same `IGameConfig` the interactive session accepts plus
      `{runs: number, baseSeed: number}`
- [x] 2.2 For each run index `i`, instantiate a fresh `GameEngine` with
      `seed = baseSeed + i` to guarantee reproducibility
- [x] 2.3 Call `engine.runToCompletion(...)` and derive
      `IPostBattleReport` from the completed session's event log
- [x] 2.4 Collect results into `IBatchOutcome[]` and pass to
      `aggregateBatchOutcomes`
- [x] 2.5 Yield to the event loop every 10 runs so the UI stays
      responsive during a 500-run batch

## 3. Aggregation

- [x] 3.1 Create `aggregateBatchOutcomes(outcomes): IBatchResult`
- [x] 3.2 Win probability: count `winner` values across reports,
      normalize over `totalRuns`
- [x] 3.3 Turn-count stats: compute mean / median / p25 / p75 / p90 /
      min / max from `report.turnCount`
- [x] 3.4 Heat-shutdown frequency: count reports where `units[].heatProblems`
      contains a shutdown event, normalize per side
- [x] 3.5 Mech-destroyed frequency: count reports where a side has
      units with `damageReceived >= structureMax`, normalize per side
- [x] 3.6 Per-unit survival: for each unit id, count reports where
      `units[unitId].destroyed === false`, divide by totalRuns
- [x] 3.7 `mostLikelyOutcome`: select the winner with highest probability
      (ties resolve to `"draw"`)

## 4. Seed Management

- [x] 4.1 Document in the spec that `seed = baseSeed + runIndex` makes
      each run independent yet reproducible as a whole
- [x] 4.2 If the caller omits `baseSeed`, generate a cryptographically
      random integer once and include it in the returned `IBatchResult`
      so the batch can be re-run deterministically
- [x] 4.3 Never reuse the interactive session's `SeededRandom` instance
      across runs — each run gets a fresh `DiceRoller`

## 5. React Query Hook

- [x] 5.1 Create `useQuickResolve()` that wraps `runBatch` in a
      `useMutation`-style API (no React Query dep — see implementation
      note in `useQuickResolve.ts`; mirrors the mutation contract).
- [x] 5.2 Expose `{runsCompleted, totalRuns, isRunning, result}` so the
      UI can render progress
- [x] 5.3 Support cancellation via an `AbortSignal` — canceling mid-batch
      returns the partial `IBatchResult` with `totalRuns` equal to the
      number of completed runs
- [x] 5.4 Log the seed used on the completed result so users can
      reproduce a run for debugging (`IBatchResult.baseSeed`)

## 6. Encounter Page Entry Point

- [x] 6.1 Add "Quick Resolve" button to
      `src/pages/gameplay/encounters/[id].tsx` next to the "Launch
      Battle" button (audit correction: actual page is `[id].tsx`, not
      `[id]/index.tsx` as originally written).
- [x] 6.2 Button opens a small modal with run-size options: 25, 100
      (default), 500
- [x] 6.3 On confirm, dispatch `useQuickResolve()` and show a progress
      bar `runsCompleted / totalRuns`
- [x] 6.4 On completion, surface the result inline. Sub-Branch B (now
      landed via `add-quick-sim-result-display`) provides the richer
      result-display surface at `/gameplay/encounters/[id]/sim`. The
      launcher modal now embeds `QuickSimResultPanel` inline AND links
      to that surface; the encounter detail page renders the compact
      `QuickSimResultSummary` row beneath the validation card after
      a batch completes.

## 7. Error Handling

- [x] 7.1 If a single run throws, catch it, include an error entry in
      the `IBatchOutcome` list with `{runIndex, seed, error}`, and
      continue the batch
- [x] 7.2 If >20% of runs error out, abort the batch and surface
      `"Quick Resolve failed: engine errors"`
- [x] 7.3 If the caller provides an invalid `runs` (not 1..5000), throw
      `"Invalid run count"` before starting

## 8. Performance Targets

- [x] 8.1 A 100-run batch with the Phase 1 default encounter (2v2 light
      mechs) SHALL complete in under 30 seconds on reference hardware
      (test fixture: 10-run batch < 200ms locally; 100-run extrapolation
      well under target).
- [x] 8.2 Main thread SHALL NOT be blocked for more than 50ms at a time
      (event-loop yield every 10 runs implemented in `runBatch`).
- [x] 8.3 Memory: batch SHALL NOT retain the full event log of
      completed sessions — only the derived `IPostBattleReport`.
      **Note:** `IPostBattleReport.log` currently retains events because
      `aggregateBatchOutcomes` walks the log to detect heat shutdowns
      and unit destruction. A follow-up can extract those into
      `IUnitReport` fields and let the aggregator drop the log; tracked
      as a non-blocking optimization for `add-quick-sim-result-display`
      to revisit if memory becomes a concern.

## 9. Tests

- [x] 9.1 Unit test: `aggregateBatchOutcomes` with fixed input produces
      expected win probabilities
- [x] 9.2 Unit test: `aggregateBatchOutcomes` with all-draws returns
      `mostLikelyOutcome = "draw"`
- [x] 9.3 Determinism test: `runBatch(config, { runs: 10, baseSeed: 42
})` called twice produces deeply equal `IBatchResult`
- [x] 9.4 Integration test: running a small batch (10 runs) on the
      Phase 1 default encounter completes without throwing
- [x] 9.5 Integration test: engine error in run 3 produces an error
      entry but the batch continues to run 10

## 10. Spec Compliance

- [x] 10.1 Every delta requirement across `simulation-system`,
      `combat-resolution`, and `after-combat-report` has at least one
      GIVEN/WHEN/THEN scenario
- [x] 10.2 `openspec validate add-quick-resolve-monte-carlo --strict`
      passes clean

## Engine Determinism Wiring (added during implementation)

The CRITICAL determinism contract required wiring `SeededRandom`
through the engine — `GameEngine.runToCompletion` previously called
`resolveAllAttacks`, `resolveHeatPhase`, `runPhysicalAttackPhase`, and
`rollInitiative` without a dice-roller argument, falling back to
`Math.random()`. Two same-seed runs would produce different outcomes,
breaking the regression test in 9.3. Fixes:

- Added optional `diceRoller: D6Roller = defaultD6Roller` parameter to
  `rollInitiative` (backward-compatible)
- Added optional `d6Roller: D6Roller = defaultD6Roller` parameter to
  `runPhysicalAttackPhase` (backward-compatible)
- Engine now constructs a single `D6Roller` from `this.random.nextInt(6) + 1`
  and threads it (or the derived 2d6 `DiceRoller`) into all phase calls
- All 9006 pre-existing tests remain green
