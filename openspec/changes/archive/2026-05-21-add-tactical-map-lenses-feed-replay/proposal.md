## Why

Players need to understand the battlefield quickly: movement, cover, LOS, heat, sensors, objectives, pins, recent events, and replay history should be available as map lenses and feeds without cluttering the map. Civilization-style minimap filters and notifications provide a useful premise, but MekStation needs BattleTech-specific overlays and replay fidelity.

## What Changes

- Add tactical map lenses for movement, path, cover, LOS, firing arcs, heat, objectives, sensors, fog, damage/effects, and terrain/elevation.
- Add map pins/markers for GM notes, player reminders, objectives, and detected contacts.
- Add combat feed and notification prioritization.
- Add replay timeline controls tied to map, feed, and inspectors.

## Capabilities

### New Capabilities

- `tactical-map-lenses-feed-replay`: BattleTech map lenses, pins, combat feed, notifications, and replay controls.

### Modified Capabilities

- `tactical-map-interface`: Adds lens panel, pin behavior, feed docking, and minimap filter integration.
- `replay-library`: Adds tactical replay timeline and terrain/map-state fidelity expectations.

## Impact

- Affected UI: map controls, minimap, overlay/layer state, event log, notification stack, replay viewer.
- Affected data: lens configuration, pins/markers, replay cursor, camera bookmarks, terrain snapshot/derivation policy.
- No new combat calculations; lenses visualize engine/session outputs.
