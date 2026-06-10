# Change: Preserve Run Overlay Movement Options

## Why

The live run overlay derives both run and walk projections, but merged them
into one same-hex answer before the map could expose per-mode costs. That made
a hex with different walk and run MP, heat, terrain, or elevation facts look
like a single unexplained movement option.

## What Changes

- Preserve same-hex walk/run option metadata when live run overlays merge their
  projections.
- Keep the existing primary projection behavior: reachable run remains the
  committed active-mode answer, while a reachable walk fallback is used when run
  is blocked.
- Cover both reachable-overlap and blocked-run/walk-fallback cases with focused
  movement-planning tests.

## Non-Goals

- Change BattleTech movement legality, MP math, heat math, pathfinding,
  terrain costs, or elevation rules.
- Add new movement controls or change jump overlay behavior.
- Recalculate movement options inside the map renderer.
