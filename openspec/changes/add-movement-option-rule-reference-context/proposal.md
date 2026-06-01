# Add Movement Option Rule Reference Context

## Why

Movement hover tooltips already show per-mode Walk, Run, and Jump costs, heat,
terrain costs, elevation deltas, and blocked reasons. The aggregate hex
projection now exposes MegaMek-backed rule references, but the individual
option rows do not yet carry that evidence. A player or test inspecting a
blocked Jump row should not need to climb back to the parent hex to know which
rules surface justified the option state.

## What Changes

- Add movement projection source and rule-reference metadata to the per-mode
  movement option row container.
- Add the same movement rule-reference metadata to each rendered Walk, Run, and
  Jump option row.
- Keep movement legality, cost calculation, heat, terrain, elevation, and
  blocked-reason behavior unchanged.

## Out Of Scope

- Recalculating movement ranges or costs.
- Adding new movement modes.
- Changing movement command validation or commit behavior.
