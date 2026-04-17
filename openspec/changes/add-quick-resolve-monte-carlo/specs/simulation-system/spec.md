# simulation-system Specification Delta

## ADDED Requirements

### Requirement: Batch Monte Carlo Runner

The simulation system SHALL expose a `QuickResolveService.runBatch(config,
options)` that executes `GameEngine.runToCompletion()` N times with
deterministic seed variation and collects the per-run outcomes into an
`IBatchOutcome[]`.

#### Scenario: Batch runs the requested number of sessions

- **GIVEN** a valid `IGameConfig` and `options = { runs: 100, baseSeed:
42 }`
- **WHEN** `QuickResolveService.runBatch(config, options)` is invoked
- **THEN** `GameEngine.runToCompletion` SHALL be called 100 times
- **AND** the returned `IBatchOutcome[]` SHALL contain 100 entries
  (including entries for runs that errored)

#### Scenario: Seed variation produces distinct outcomes

- **GIVEN** `options = { runs: 5, baseSeed: 42 }`
- **WHEN** the batch runs
- **THEN** run `i` SHALL use `seed = baseSeed + i` (so runs use seeds
  42, 43, 44, 45, 46)
- **AND** each run SHALL have its own fresh `DiceRoller` instance
- **AND** no two runs SHALL share `SeededRandom` state

#### Scenario: Batch reproducibility

- **GIVEN** identical `config` and `options = { runs: 10, baseSeed: 42
}` across two invocations
- **WHEN** both batches complete
- **THEN** the two resulting `IBatchResult` objects SHALL be deeply
  equal
- **AND** each `IBatchOutcome.report` SHALL match position-for-position

#### Scenario: Default run count applied

- **GIVEN** `options.runs` is omitted
- **WHEN** `runBatch` is invoked
- **THEN** the default `runs = 100` SHALL be used

### Requirement: Batch Progress Reporting

The batch runner SHALL expose an observable progress channel so the UI
can render `runsCompleted / totalRuns` without busy-polling.

#### Scenario: Progress increments per run

- **GIVEN** a batch of 100 runs in progress
- **WHEN** the 10th run completes
- **THEN** the progress signal SHALL emit
  `{runsCompleted: 10, totalRuns: 100}`

#### Scenario: Progress reaches total on completion

- **GIVEN** a batch of 100 runs has fully completed
- **WHEN** the progress signal is observed
- **THEN** the final emission SHALL be
  `{runsCompleted: 100, totalRuns: 100}`

### Requirement: Event Loop Yielding During Batch

The batch runner SHALL yield control to the event loop at least every
10 completed runs so that the main thread does not freeze during long
batches.

#### Scenario: Main thread stays responsive

- **GIVEN** a 500-run batch is executing
- **WHEN** the batch is halfway done
- **THEN** the runner SHALL have performed at least 25 `await
setTimeout(0)` yields (or equivalent)
- **AND** a UI progress bar bound to the progress channel SHALL update
  during the batch

### Requirement: Batch Cancellation

The batch runner SHALL accept an `AbortSignal` and produce a partial
`IBatchResult` when cancellation fires mid-batch.

#### Scenario: Cancellation returns partial aggregate

- **GIVEN** a 100-run batch in progress, 37 runs completed
- **WHEN** the caller aborts the signal
- **THEN** the runner SHALL stop after the current run finishes
- **AND** `aggregateBatchOutcomes` SHALL be called with the 37
  completed outcomes
- **AND** `IBatchResult.totalRuns` SHALL equal 37 (not 100)

#### Scenario: Immediate cancellation before first run

- **GIVEN** a batch is requested but the signal is already aborted
- **WHEN** `runBatch` is invoked
- **THEN** the runner SHALL return an empty `IBatchResult` with
  `totalRuns: 0`
- **AND** no `GameEngine` instances SHALL be created

### Requirement: Per-Run Error Isolation

A single run that throws SHALL NOT abort the entire batch; the error
SHALL be captured in the corresponding `IBatchOutcome` and the batch
SHALL continue.

#### Scenario: Engine error captured as outcome

- **GIVEN** a batch where run 3's `runToCompletion` throws `"Invalid
weapon state"`
- **WHEN** the batch completes
- **THEN** `outcomes[3]` SHALL contain `{runIndex: 3, seed, error:
"Invalid weapon state"}`
- **AND** `outcomes.length` SHALL equal the configured run count

#### Scenario: Batch aborts on systemic failure

- **GIVEN** a batch where more than 20% of runs error out
- **WHEN** the threshold is crossed
- **THEN** the batch SHALL abort
- **AND** the caller SHALL receive `"Quick Resolve failed: engine
errors"` with the partial outcomes attached

### Requirement: Invalid Run Count Rejection

The batch runner SHALL reject run counts outside the inclusive range
`[1, 5000]` before launching any sessions.

#### Scenario: Zero runs rejected

- **GIVEN** `options = { runs: 0 }`
- **WHEN** `runBatch` is invoked
- **THEN** the call SHALL throw `"Invalid run count"`
- **AND** no `GameEngine` SHALL be created

#### Scenario: Excessive runs rejected

- **GIVEN** `options = { runs: 10000 }`
- **WHEN** `runBatch` is invoked
- **THEN** the call SHALL throw `"Invalid run count"`

### Requirement: Auto-Generated Base Seed

When the caller omits `baseSeed`, the batch runner SHALL generate a
cryptographically random integer and include it in the returned
`IBatchResult` so the batch can be replayed deterministically.

#### Scenario: Omitted baseSeed is generated and reported

- **GIVEN** `options = { runs: 10 }` with no `baseSeed`
- **WHEN** `runBatch` completes
- **THEN** `IBatchResult.baseSeed` SHALL be a non-null integer
- **AND** calling `runBatch(config, { runs: 10, baseSeed:
result.baseSeed })` again SHALL reproduce the same
  `IBatchResult`
