# Add Movement Reason Context Rule Reference Context

## Why

Movement hovers already show blocked destination reasons, and projection context
rows expose aggregate movement-channel metadata. The primary movement reason row
should carry the same shared projection source and rule references so players and
tests can inspect why a destination is blocked without relying on aggregate hex
metadata or color alone.

## What Changes

- Surface movement projection source and rule references on movement blocked
  reason rows.
- Expose stable attributes for reachability, movement type, movement mode,
  blocked reason, engine invalid reason, engine invalid details, and the
  displayed reason.
- Apply the same movement reason context row to movement-only and combined
  movement+combat tactical hovers.
- Keep movement reason classification sourced from `IMovementRangeHex` and the
  shared tactical map projection.

## Out Of Scope

- Changing movement reachability, MP costs, terrain/elevation costs, heat,
  pathfinding, commit validation, or movement resolution.
