## Why

The combat turn rail mixed allied and opposing units into one strip, which made
team ownership and terminal outcomes hard to scan during real play. This wave
captures the focused presentation and accessibility seam independently from
the command-authority hardening discovered during review.

## What Changes

- In combat mode, split the roster into viewer-relative Allied Force and
  Opposing Force groups; in GM, replay, and spectator modes, use Player Force
  and Opponent Force labels. Every group reports its operational count plus any
  nonzero eliminated and withdrawn counts.
- Keep destroyed and withdrawn units visible under their original force with
  persistent text labels.
- Give desktop and narrow layouts stable edge framing, pinned group labels, and
  independently scrollable force lists.
- On narrow and short viewports, retain a readable tactical-map band and compact
  the existing hint and map-control chrome without changing control behavior.
- Mark only the live active unit as current; terminal units never retain current
  semantics.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `tactical-map-interface`: Define grouped force presentation, terminal roster
  retention, and responsive framing for the turn rail.
- `accessibility-system`: Define named force regions/lists, persistent
  non-color terminal text, and current-unit semantics.

## Non-goals

- Persisting in-memory combat events or battle outcomes across a cold reload.
- Changing morale behavior or adding map-control capabilities; responsive
  placement and sizing needed to preserve the tactical framing remain in scope.
- Changing multiplayer host authorization, fog-of-war projection, ejection
  semantics, or Locked/Revealed status vocabulary.
- Changing rail-selection behavior, command dispatch, GM authority, attack
  intent recovery, or direct store/engine authorization.
- Adding dependencies or changing the combat protocol.

## Impact

- Affects the tactical command shell, turn-rail components, gameplay layout
  presentation threading, and focused component and projection tests.
- Adds no API, persistence-schema, protocol, or dependency changes.
- The grouped-rail foundation is merged as PR #1083 at merge commit
  `67805c8302f78c5205921cafbee9d4544783fb96`. Task 3.2 owns a separate focused
  regression-hardening follow-up for narrow map and command framing within the
  same behavioral seam.
