## Context

The tactical shell already projected initiative order, blockers, and an active
unit, but rendered all units in a single roster strip. This wave is limited to
presentation, projection consumption, responsive framing, and accessible force
and status semantics.

This is a posthumous design for the implementation merged through PR #1083 at
merge commit `67805c8302f78c5205921cafbee9d4544783fb96`. It records the
reviewed behavior without claiming that the separately discovered combat-event
durability defect is resolved.

## Goals / Non-Goals

**Goals:**

- Make force ownership and terminal unit outcomes immediately scannable.
- Preserve one authoritative initiative projection and avoid a second turn
  model in the component.
- Keep the rail operable and readable at desktop, mobile, and zoomed narrow
  widths.
- Preserve accessible names, list structure, status text, and current-unit
  semantics.

**Non-Goals:**

- Persist in-memory combat events, phase changes, or battle outcomes.
- Change protocol, multiplayer host authorization, or campaign reconciliation.
- Change rail selection, command dispatch, attack-intent recovery, or direct
  store/engine authorization.
- Resolve fog-safe rail projection, ejection status, or Locked/Revealed
  vocabulary.
- Rework morale, map controls, or other combat-shell framing outside the rail.

## Decisions

### Use the existing phase projection as the ordering authority

`TacticalTurnRail` consumes `IPhaseQueueProjection.initiativeOrder` and derives
presentation status from `IUnitGameState`. Destroyed and withdrawn units remain
in initiative order, while projection blockers and unresolved collections
exclude terminal units.

Alternative considered: create force-specific initiative arrays in the
component. Rejected because it would duplicate ordering and blocker logic.

### Resolve force labels by mode and viewer

In combat mode, `TacticalTurnRailProps.playerSide` determines Allied Force
versus Opposing Force. GM, replay, and spectator modes instead use Player Force
and Opponent Force because those surfaces do not present one tactical player as
the viewer. A unit side is resolved first from authoritative unit state, then
from game-unit metadata. Missing side data is represented as Unassigned rather
than silently classified as allied.

Alternative considered: use one label pair in every mode. Rejected because
combat needs viewer-relative ownership while observer modes need stable
player/opponent terminology.

### Treat terminal status as stronger than the active cursor

`UnitRailStatus` is derived in terminal-first order. `IRailUnit.isActive` is true
only when the final status equals `active`; destroyed or withdrawn units cannot
retain `aria-current` even if an engine cursor still references them.

```ts
interface IRailUnit {
  readonly id: string;
  readonly name: string;
  readonly side: GameSide | null;
  readonly status: UnitRailStatus;
  readonly isActive: boolean;
}
```

Alternative considered: compare only unit id to the projected active id.
Rejected because stale cursors would misrepresent terminal units.

### Frame each force as an independent responsive list

Desktop renders one persistent frame per available force group across the top
edge. Narrow layouts use one fixed-height row per rendered group—normally two,
or three when Unassigned is present—with pinned labels and horizontally
scrollable token lists. Terminal state uses text plus color, and a visible
overflow cue appears on narrow screens.

Alternative considered: one horizontally scrolling mixed strip. Rejected
because team identity and eliminated ownership disappear during scanning.

## Risks / Trade-offs

- [The rail still consumes raw session units before future fog projection] ->
  Record as a separate visibility wave; do not imply this change grants new
  hidden information.
- [The source specification already requires an explanation when fog-hidden or
  unavailable units cannot be focused] -> Preserve that inherited scenario in
  the modified requirement, but do not claim PR #1083 implemented it; a
  separate fog-safe projection and focus change owns that behavior.
- [Independent horizontal lists can hide off-screen tokens] -> Keep group
  labels pinned, expose a visible narrow-screen overflow cue, and preserve
  native scrolling.
- [A stale engine cursor can reference a terminal unit] -> Derive terminal
  status first and gate current semantics on final status.
- [Combat state appears correct before reload but is not durable] -> Pair
  browser screenshots with store, engine, IndexedDB, and cold-reload evidence;
  track durability as a separate Major.
- [The existing rail selection callback can enter phase-specific interaction
  flows] -> Keep that behavior unchanged in this presentation wave and harden
  inspection/command authority in a separate reviewed change.
