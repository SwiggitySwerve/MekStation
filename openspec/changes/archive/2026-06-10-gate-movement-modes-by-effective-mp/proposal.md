# Proposal: Gate Movement Modes By Effective MP

## Why

Walk, Run, and Jump commands are the player's first movement-mode affordance, but availability did not fully consume the heat-adjusted MP budget that movement projection already uses. This could leave a movement command clickable even when the projection engine would leave that mode with 0 effective MP.

## What Changes

- Use the same heat movement penalty and `getMaxMP` floor used by movement projection when command availability has an engine-derived movement capability.
- Disable Walk, Run, or Jump with a player-facing reason when raw capability is absent for that mode or heat reduces its effective MP to 0.
- Preserve legacy availability when no movement capability has been supplied to the command context.
- Cover both dock and hex-menu command surfaces with focused tests.

## Out of Scope

- Changing terrain, elevation, jump pathing, or committed movement validation.
- Changing movement projection generation or the movement legend.
- Removing legacy command behavior when non-interactive callers do not provide movement capability.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: movement command availability and command-surface tests
- Tests: focused command adapter, dock, and hex-menu coverage
