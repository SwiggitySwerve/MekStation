# Advisory resource observations

## Why

Owner rulings PARITY-PLAN sections 24 and 25 remove arbitrary byte and memory
acceptance limits. Existing heap ceilings can fail healthy deployments, while
size proxies provide weaker evidence than the backpressure behavior they seek
to protect.

## What Changes

- Record performance bytes, heap and RSS without resource-growth verdicts.
- Prove bounded per-viewer delivery, stopped issuance, healthy-peer progress,
  acknowledgement-driven recovery and convergence through production behavior.
- Retain direct structural proof against recursively nested cascade history.
- Keep container health telemetry; heap magnitude alone never produces 503.
- Preserve real probe failures, product backpressure thresholds, latency gates,
  event/envelope counts and input validation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `e2e-testing`: advisory resource observations and behavioral acceptance.

## Impact

Touches the controlled performance fixture, tactical backpressure pack, cascade
regression and health route. No persisted schema or product queue threshold
changes. The separate CI-budget PR owns package measurements and approval.
Historical umbrella memory/byte acceptance clauses are superseded by this delta;
their dated proof receipts are preserved. These behavioral tests do not prove
the absence of every possible memory leak or bound the campaign-channel heap.
