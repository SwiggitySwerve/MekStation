# Align Runtime Movement Commit Side Effects

## Why

The tactical map now resolves runtime movement capability for projection,
available-action queries, and commit validation. The movement commit side-effect
path still needs the same resolved capability for stand-up resolution and failed
stand-up movement declarations, otherwise a runtime conversion change can show
one MP cost in the projection and record another when the unit fails to stand.

## What Changes

- Resolve runtime movement capability once in the interactive movement commit
  path before validation, stand-up PSR projection, and movement declaration
  fallback handling.
- Add a regression for a LAM that changes to AirMek mode after import and uses
  careful stand, proving the projection's runtime AirMek stand-up cost is the
  same cost recorded when the stand-up PSR fails.
- Keep the OpenSpec tactical-map contract explicit that commit side effects must
  consume the same runtime capability as the movement projection.

## Out Of Scope

- New conversion action UI.
- Full LAM airborne Fighter or AirMek ground-clearance submode modeling.
- Broader external MegaMek oracle sweeps.
