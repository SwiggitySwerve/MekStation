## Why

Turnover records a departure reason but leaves pilots Active, so payroll,
deployment, and future turnover still include them. Retirement can pay again.

## What Changes

- Set Retired or Deserted alongside the existing reason.
- Keep roster departure, salary eligibility, deployability, and legacy
  normalization in the personnel status rules owner.
- Settle each departure once, excluding missing and already-departed pilots.
- Normalize loaded legacy Active pilots with known departure reasons on both
  roster load paths. Exclude departed pilots from the medical projection.

## Capabilities

### Modified Capabilities

- `turnover-retention`: departure settlement, consumer exclusions, and legacy saves.

## Impact

Adds two persisted status strings without changing record shape or schema
version. See design.md for compatibility and pinned MekHQ evidence.

## Non-goals

Critical/MIA healing, turnover classification parity, payout formula changes,
loan servicing, bulk migrations, refunds, and historical ledger repair.
