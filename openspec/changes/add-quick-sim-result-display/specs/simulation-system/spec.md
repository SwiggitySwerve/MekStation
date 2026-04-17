# simulation-system Specification Delta

## ADDED Requirements

### Requirement: UI Progress Channel Contract

The simulation system SHALL expose the batch progress channel as a
React-query-compatible observable that the `useQuickResolve` hook can
subscribe to and surface to the `QuickSimResultPanel` progress bar
without busy-polling.

#### Scenario: Hook receives progress updates

- **GIVEN** `useQuickResolve()` is invoked with `runs: 100`
- **WHEN** a run completes
- **THEN** the hook's `{runsCompleted, totalRuns}` state SHALL update
  to reflect the new completion count
- **AND** any subscribed React component SHALL re-render within one
  animation frame

#### Scenario: Progress snapshot survives renders

- **GIVEN** a component subscribed to the progress channel mid-batch
- **WHEN** the component unmounts and remounts during the batch
- **THEN** the newly mounted component SHALL receive the current
  `{runsCompleted, totalRuns}` value on first render (no reset to
  zero)

### Requirement: UI Abort Signal Binding

The simulation system SHALL bind the `AbortSignal` exposed by
`useQuickResolve()` to the batch runner's cancellation contract so the
Cancel button in the result panel stops the batch after the current
run finishes.

#### Scenario: Cancel from UI halts batch

- **GIVEN** a batch in progress dispatched via `useQuickResolve()`
- **WHEN** the consumer calls the hook's `cancel()` method
- **THEN** the underlying `AbortSignal` SHALL fire
- **AND** the batch runner SHALL stop after the current run finishes
- **AND** the hook SHALL transition to state
  `{isRunning: false, result: <partial>}`

#### Scenario: Cancel is idempotent

- **GIVEN** a batch that has already been cancelled
- **WHEN** the consumer calls `cancel()` again
- **THEN** no error SHALL be thrown
- **AND** no additional state change SHALL occur
