## Context

The layered map contract introduced typed layer ids. This change expands that into player-facing lens workflows and ties the event log/replay viewer back to the map.

## Goals / Non-Goals

**Goals:**

- Make every important combat overlay discoverable and toggleable.
- Keep common lenses one click away and advanced filters in a tray.
- Let event feed rows focus map locations and replay cursor state.
- Preserve terrain/map fidelity when replaying tactical combat.

**Non-Goals:**

- No new LOS/pathfinding algorithms.
- No full replay editor.
- No decorative minimap replacement.

## Decisions

- **Lenses group layers by task.** Movement, attack, survival, intel, objective, and terrain lenses control multiple layers when appropriate.
- **Pins are event-aware.** Player/GM pins can attach to coordinates, units, objectives, or replay events.
- **Feed rows are map commands.** Selecting a row focuses relevant units/hexes and opens the right inspector.
- **Replay controls live in the shell.** Playback changes map, feed, rail, and inspectors together.

## Risks / Trade-offs

- **Overlay soup** -> lens presets plus intensity controls instead of every layer enabled at once.
- **Replay mismatch** -> require terrain/grid source in replay metadata or deterministic reconstruction.
- **Notification fatigue** -> severity and deduplication rules.

## Open Questions

- Should pins be persisted in match save data or remain local UI annotations?
- Should replay terrain be stored as full grid snapshot or reconstructed from scenario seed/config?
