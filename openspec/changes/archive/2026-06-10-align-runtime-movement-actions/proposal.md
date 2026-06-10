# Align Runtime Movement Actions

## Why

Movement previews and movement commits already resolve represented runtime state
such as LAM conversion mode and infantry mount state, but action availability is
also a player-facing rules surface. A unit imported with one movement capability
can change state during play, and the available-move list must agree with both
map projection and commit validation after that state changes.

## What Changes

- Resolve runtime movement capability at the available-action query boundary.
- Prove a LAM imported in Mek mode, then changed to AirMek at runtime, exposes
  the AirMek-reachable destination before commit.
- Prove the same destination commits with the same runtime movement capability,
  MP cost, heat, and path.

## Out of Scope

- Full conversion action timing.
- Additional LAM airborne Fighter, AirMek ground-clearance, or control-roll
  rules.
- Broad external oracle sweeps.
