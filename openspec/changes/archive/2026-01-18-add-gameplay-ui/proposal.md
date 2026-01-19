# Change: Add Gameplay UI

## Why

Users need a visual interface for gameplay: a hex map for positioning, record sheets for unit status, and action controls for each phase. This proposal establishes the gameplay UI with split view, contextual phase emphasis, and action previews.

## What Changes

- Add gameplay layout (split view: map + record sheet)
- Add hex map renderer with unit tokens
- Add live record sheet display
- Add phase-specific action controls
- Add movement/attack preview system
- Add game event log display

## Dependencies

- **Requires**: All Phase 2 proposals (`add-game-session-core`, `add-hex-grid-system`, `add-combat-resolution`)
- **Required By**: None (final integration layer)

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Phase Banner: "Movement Phase - Your Turn"      [Turn 3]   │
├─────────────────────────────────┬───────────────────────────┤
│                                 │                           │
│         HEX MAP                 │      RECORD SHEET         │
│                                 │                           │
├─────────────────────────────────┴───────────────────────────┤
│  Action Bar: [Lock Movement] [Undo] [End Phase]             │
├─────────────────────────────────────────────────────────────┤
│  Event Log (collapsible)                                    │
└─────────────────────────────────────────────────────────────┘
```

## Contextual Emphasis

| Phase | Map Emphasis | Record Sheet Emphasis |
|-------|--------------|----------------------|
| Movement | **Primary** | Secondary |
| Attack Declaration | Target overlay | **Primary** |
| Attack Resolution | Hit indicators | **Primary** |
| Heat | Dim | **Primary** |

## Impact

- Affected specs: None (new capability)
- New specs: `gameplay-ui`
- Affected code: New `src/gameplay/ui/` directory
- New pages: Enhanced `/gameplay/games/[id]`
