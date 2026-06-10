# Add Movement Cost Context Rule Reference Context

## Why

Movement hovers already show terrain cost, elevation cost, heat, and path
length. Those rows are key rules explanations, but they should be inspectable
as shared movement projection facts with source and rule references instead of
plain UI text.

## What Changes

- Surface movement projection source and rule references on movement terrain,
  elevation, heat, and path rows.
- Expose stable attributes for movement type, movement mode, reachability, MP
  cost, terrain cost, elevation delta/cost, heat generated, and path
  coordinates when represented.
- Apply the same movement cost context rows to movement-only and combined
  movement+combat tactical hovers.
- Keep the rows sourced from `IMovementRangeHex` and the shared tactical map
  projection.

## Out Of Scope

- Changing movement pathfinding, terrain/elevation cost calculation, heat
  calculation, commit validation, or movement resolution.
