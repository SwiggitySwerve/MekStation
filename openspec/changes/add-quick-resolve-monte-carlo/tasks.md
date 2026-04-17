# Tasks: Add Quick Resolve Monte Carlo

## 1. Batch Outcome Schema

- [ ] 1.1 Define `IBatchOutcome` capturing `{runIndex, seed, report:
    IPostBattleReport, durationMs}`
- [ ] 1.2 Define `IBatchResult` with `{totalRuns, winProbability:
    {player, opponent, draw}, turnCount: {mean, median, p25, p75, p90,
    min, max}, heatShutdownFrequency: {player, opponent},
    mechDestroyedFrequency: {player, opponent}, perUnitSurvival:
    Record<unitId, number>, mostLikelyOutcome}`
- [ ] 1.3 Add both shapes to `after-combat-report` spec's type exports

## 2. Batch Runner

- [ ] 2.1 Create `QuickResolveService.runBatch(config, options)` that
      takes the same `IGameConfig` the interactive session accepts plus
      `{runs: number, baseSeed: number}`
- [ ] 2.2 For each run index `i`, instantiate a fresh `GameEngine` with
      `seed = baseSeed + i` to guarantee reproducibility
- [ ] 2.3 Call `engine.runToCompletion(...)` and derive
      `IPostBattleReport` from the completed session's event log
- [ ] 2.4 Collect results into `IBatchOutcome[]` and pass to
      `aggregateBatchOutcomes`
- [ ] 2.5 Yield to the event loop every 10 runs so the UI stays
      responsive during a 500-run batch

## 3. Aggregation

- [ ] 3.1 Create `aggregateBatchOutcomes(outcomes): IBatchResult`
- [ ] 3.2 Win probability: count `winner` values across reports,
      normalize over `totalRuns`
- [ ] 3.3 Turn-count stats: compute mean / median / p25 / p75 / p90 /
      min / max from `report.turnCount`
- [ ] 3.4 Heat-shutdown frequency: count reports where `units[].heatProblems`
      contains a shutdown event, normalize per side
- [ ] 3.5 Mech-destroyed frequency: count reports where a side has
      units with `damageReceived >= structureMax`, normalize per side
- [ ] 3.6 Per-unit survival: for each unit id, count reports where
      `units[unitId].destroyed === false`, divide by totalRuns
- [ ] 3.7 `mostLikelyOutcome`: select the winner with highest probability
      (ties resolve to `"draw"`)

## 4. Seed Management

- [ ] 4.1 Document in the spec that `seed = baseSeed + runIndex` makes
      each run independent yet reproducible as a whole
- [ ] 4.2 If the caller omits `baseSeed`, generate a cryptographically
      random integer once and include it in the returned `IBatchResult`
      so the batch can be re-run deterministically
- [ ] 4.3 Never reuse the interactive session's `SeededRandom` instance
      across runs — each run gets a fresh `DiceRoller`

## 5. React Query Hook

- [ ] 5.1 Create `useQuickResolve()` that wraps `runBatch` in a
      `useMutation`
- [ ] 5.2 Expose `{runsCompleted, totalRuns, isRunning, result}` so the
      UI can render progress
- [ ] 5.3 Support cancellation via an `AbortSignal` — canceling mid-batch
      returns the partial `IBatchResult` with `totalRuns` equal to the
      number of completed runs
- [ ] 5.4 Log the seed used on the completed result so users can
      reproduce a run for debugging

## 6. Encounter Page Entry Point

- [ ] 6.1 Add "Quick Resolve" button to
      `/gameplay/encounters/[id]/index.tsx` below the "Launch Match"
      button
- [ ] 6.2 Button opens a small modal with run-size options: 25, 100
      (default), 500
- [ ] 6.3 On confirm, dispatch `useQuickResolve()` and show a progress
      bar `runsCompleted / totalRuns`
- [ ] 6.4 On completion, navigate (or expand in place) to the result
      surface owned by `add-quick-sim-result-display`

## 7. Error Handling

- [ ] 7.1 If a single run throws, catch it, include an error entry in
      the `IBatchOutcome` list with `{runIndex, seed, error}`, and
      continue the batch
- [ ] 7.2 If >20% of runs error out, abort the batch and surface
      `"Quick Resolve failed: engine errors"`
- [ ] 7.3 If the caller provides an invalid `runs` (not 1..5000), throw
      `"Invalid run count"` before starting

## 8. Performance Targets

- [ ] 8.1 A 100-run batch with the Phase 1 default encounter (2v2 light
      mechs) SHALL complete in under 30 seconds on reference hardware
- [ ] 8.2 Main thread SHALL NOT be blocked for more than 50ms at a time
      (requires the event-loop yield from task 2.5)
- [ ] 8.3 Memory: batch SHALL NOT retain the full event log of
      completed sessions — only the derived `IPostBattleReport`

## 9. Tests

- [ ] 9.1 Unit test: `aggregateBatchOutcomes` with fixed input produces
      expected win probabilities
- [ ] 9.2 Unit test: `aggregateBatchOutcomes` with all-draws returns
      `mostLikelyOutcome = "draw"`
- [ ] 9.3 Determinism test: `runBatch(config, { runs: 10, baseSeed: 42
    })` called twice produces deeply equal `IBatchResult`
- [ ] 9.4 Integration test: running a small batch (10 runs) on the
      Phase 1 default encounter completes without throwing
- [ ] 9.5 Integration test: engine error in run 3 produces an error
      entry but the batch continues to run 10

## 10. Spec Compliance

- [ ] 10.1 Every delta requirement across `simulation-system`,
      `combat-resolution`, and `after-combat-report` has at least one
      GIVEN/WHEN/THEN scenario
- [ ] 10.2 `openspec validate add-quick-resolve-monte-carlo --strict`
      passes clean
