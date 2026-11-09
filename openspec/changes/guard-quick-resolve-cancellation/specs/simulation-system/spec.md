## MODIFIED Requirements

### Requirement: UI Abort Signal Binding

The simulation system SHALL bind the `AbortSignal` exposed by
`useQuickResolve()` to the batch runner's cancellation contract so the
Cancel button stops the batch after the current run finishes. The hook SHALL
publish state only for its current batch while mounted. Cancellation SHALL
remain distinct from successful completion.

#### Scenario: Cancel from UI halts batch

- **GIVEN** a batch in progress dispatched via `useQuickResolve()`
- **WHEN** the consumer calls the hook's `cancel()` method
- **THEN** the underlying `AbortSignal` SHALL fire
- **AND** the batch runner SHALL stop after the current run finishes
- **AND** when the current batch returns its partial aggregate, the hook SHALL
  transition to `{isRunning: false, wasCancelled: true, result: null,
  partialResult: <partial>, error: null}`
- **AND** the completed-run count SHALL reflect the partial aggregate while
  the requested total remains unchanged
- **AND** progress emitted after cancellation SHALL be ignored

#### Scenario: Cancel before the completion continuation

- **GIVEN** the current batch has resolved but the hook has not published it
- **WHEN** the consumer cancels before the completion continuation runs
- **THEN** the hook SHALL expose the aggregate only as cancelled partial output
- **AND** `result` SHALL remain null

#### Scenario: Cancel is idempotent

- **GIVEN** a batch that has already been cancelled
- **WHEN** the consumer calls `cancel()` again
- **THEN** no error SHALL be thrown
- **AND** no additional state change SHALL occur

#### Scenario: Cancellation suppresses a late rejection

- **GIVEN** the current batch has been cancelled
- **WHEN** its service promise rejects
- **THEN** the hook SHALL settle with `isRunning: false`, `wasCancelled: true`,
  `result: null`, and `error: null`
- **AND** a systemic failure's attached aggregate SHALL appear only in
  `partialResult`

#### Scenario: Reset invalidates an in-flight batch

- **GIVEN** a batch is in flight
- **WHEN** the consumer calls `reset()`
- **THEN** the batch SHALL be aborted and the hook SHALL return to idle defaults
- **AND** `wasCancelled` SHALL be false
- **AND** late progress, results, or errors from that batch SHALL be ignored

#### Scenario: Replacement owns state and cancellation

- **GIVEN** a batch is in flight
- **WHEN** the consumer starts a replacement mutation
- **THEN** the old batch SHALL be aborted and cancellation state SHALL be cleared
- **AND** only the replacement SHALL publish progress, results, or errors
- **AND** old settlement SHALL NOT clear the replacement's abort controller
- **AND** the old batch SHALL remain unable to publish after replacement completes

#### Scenario: Unmount aborts the current batch

- **GIVEN** a batch is in flight
- **WHEN** the hook unmounts
- **THEN** its signal SHALL be aborted
- **AND** subsequent progress and settlement SHALL NOT publish state

#### Scenario: Ordinary completion and failure remain observable

- **GIVEN** a current mounted batch that has not been cancelled
- **WHEN** it completes successfully or fails
- **THEN** `wasCancelled` SHALL remain false
- **AND** success SHALL populate `result`
- **AND** failure SHALL populate `error` and any systemic-failure `partialResult`
