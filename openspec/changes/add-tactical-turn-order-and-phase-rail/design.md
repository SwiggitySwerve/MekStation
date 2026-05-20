## Context

Existing game session specs define phases and events, but the UI needs a compact command-layer projection of turn order and unresolved work. This is not a new initiative engine; it is a readable projection of session state.

## Goals / Non-Goals

**Goals:**

- Make the current phase and next required action obvious.
- Show which units still need movement, weapon attack, physical attack, or heat/end resolution.
- Support hot-seat, AI turns, spectator mode, and replay cursor state.
- Provide auto-center and auto-cycle as settings, not hard-coded behavior.

**Non-Goals:**

- No initiative algorithm redesign.
- No simultaneous-turn multiplayer planner.
- No change to event sourcing.

## Decisions

- **Rail is a projection.** It derives from `InteractiveSession`/game state and does not own phase truth.
- **Phase blockers are first-class.** If End Phase cannot advance, the rail names the blocking units/actions.
- **Auto-cycle is configurable.** The UI may advance focus to the next required unit, but players can disable that behavior.
- **Replay rail follows cursor.** Replays show historical phase/turn state without enabling commands.

## Risks / Trade-offs

- **Overstating certainty in AI/hot-seat flow** -> label ownership and pending AI actions explicitly.
- **Rail crowding on mobile** -> compact pills plus bottom-sheet details.
- **Divergence from engine state** -> rail selectors must be pure projections with regression tests.

## Open Questions

- Should initiative ties expose raw roll values, or just ordering and side priority?
- Should skipped optional attacks remain visible until phase end or disappear immediately?
