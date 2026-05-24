# Gate Fire Volley By Combat Projection

## Why

The tactical map already projects attack legality, LOS, range, arc, visibility, and weapon availability before the player commits. The weapon command surface still allowed `Fire Volley` whenever a target was selected, leaving the engine to reject impossible attacks after confirmation. That breaks the map-as-explanation contract: the command surface should refuse the same target the map marks as blocked.

## What Changes

- Thread shared combat projection data into tactical command context.
- Disable `Fire Volley` when the selected target's combat projection is blocked.
- Surface the projection's player-facing blocked reason in the dock and enemy token context menu.
- Keep projection derivation outside the command/menu renderer; commands consume projection data rather than recalculating combat rules.

## Out of Scope

- Changing combat projection, LOS, range, arc, visibility, indirect-fire, or weapon resolution rules.
- Adding per-weapon manual selection to the dock.
- Replacing the existing confirmation UI.
