# Show Per-Mode Movement Badge Costs

## Why

When walk, run, and jump projections overlap on the same destination hex, the
visible movement badge currently lists all legal modes but displays only the
primary option's MP cost. A label such as `W/R/J 3MP` implies every mode costs
3 MP even when jump or run has a different engine-projected cost.

## What Changes

- Render same-hex movement badges with compact per-mode MP costs.
- Keep blocked options in tooltip and metadata while the badge text lists the
  legal correction choices.
- Update rendered-map tests for all-legal and mixed legal/blocked mode
  projections.

## Impact

Players can compare walk/run/jump costs from the hex itself before committing a
movement plan, reducing reliance on color or hidden tooltip-only details.
