## Context

The repository already has record sheet and combat planning components. This change defines how those details compose inside a tactical shell and how much state is visible at each density.

## Goals / Non-Goals

**Goals:**

- Make selected own-unit state immediately scannable.
- Make target state comparable without leaving the map.
- Provide drill-down drawers for full BattleTech record details.
- Respect opponent intel redaction.

**Non-Goals:**

- No replacement for full construction/customizer screens.
- No hidden rules calculations in the inspector.
- No duplicate state stores for unit health.

## Decisions

- **Right tray owns detail.** The right shell slot contains selected unit and target inspectors.
- **Bottom sheet owns mobile detail.** On phone, inspectors become bottom sheets with tabs.
- **Summaries before full sheets.** Default view shows status bands; drawers expose full location, weapon, and effect tables.
- **Target comparison is contextual.** When a command preview is active, target comparison prioritizes to-hit, range, arc, heat, and damage expectations.

## Risks / Trade-offs

- **Too much text** -> use tabs, progressive disclosure, and dense tables.
- **Stale target data** -> derive from current session projection and selected command preview.
- **Opponent leaks** -> consume only redacted unit projections.

## Open Questions

- Should the record sheet drawer preserve the exact printed record sheet shape, or optimize for combat readability first?
- Should damage location diagrams be pure SVG, CSS grid, or existing `ArmorPip` composition?
