## Why

Same-destination movement projections can be legal for Walk or Run while another
mode, such as Jump, is engine-blocked. The reachable movement badge now shows
the legal per-mode costs, but the blocked alternate mode is only visible through
mixed-status metadata and hover details.

Players need to see the blocked alternate movement mode directly on the hex so
map movement remains understandable before hovering.

## What Changes

- Add a compact blocked movement-option badge for reachable hexes with mixed
  same-hex movement options.
- Source the badge label, title, and metadata from existing
  `movementModeOptions` projection data.
- Preserve the legal movement-cost badge as the legal movement choice summary.

## Non-Goals

- Recalculate movement legality in the component.
- Change pathfinding, MP costs, heat costs, or commit validation.
- Change blocked-only movement projection rendering.
