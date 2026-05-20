## Why

The tactical map needs a Civilization-like command shell so players can keep the battlefield visible while reading status, issuing commands, inspecting units, and navigating map tools. Current combat UI pieces exist, but there is no single border-layout contract that says where each combat concern lives across the screen.

## What Changes

- Add a map-first tactical shell with stable border regions: top status band, left command tray, right inspector tray, bottom action dock, minimap cluster, and transient overlays.
- Define ownership rules so every combat fact has one primary home and optional secondary peek surfaces.
- Keep the center map unframed and dominant on all viewports.
- Establish shell behavior for combat, replay, spectator, and GM-controlled modes without changing combat rules.

## Capabilities

### New Capabilities

- `tactical-command-shell`: The primary in-map command shell, layout slots, information hierarchy, and mode ownership.

### Modified Capabilities

- `tactical-map-interface`: Adds shell-level composition requirements around the existing map surface.

## Impact

- Affected UI: `GameplayLayout`, `HexMapDisplay`, minimap, action panels, phase banner, record sheet drawers, event log, replay surfaces.
- Affected state: tactical shell view mode, tray open state, pinned panels, active context, and viewport-aware slot allocation.
- No engine rule changes.
