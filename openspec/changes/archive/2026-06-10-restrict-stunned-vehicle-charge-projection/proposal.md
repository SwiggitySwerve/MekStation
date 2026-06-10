# Restrict Stunned Vehicle Charge Projection

## Why

MegaMek's `Tank.canCharge()` rejects vehicle charges while the crew is stunned.
MekStation already represents vehicle crew stun on `IUnitGameState`, but the
physical-attack projection was not consuming that state. That could let the map
light a charge target for a vehicle the engine should reject.

## What Changes

- Derive a shared physical-attack input flag from vehicle
  `crewStunnedPhases`.
- Block stunned vehicle charge rows with `AttackerCannotCharge`.
- Make session declaration validation consume the same live unit-state flag as
  the map projection.
- Preserve ordinary tracked/wheeled vehicle charge when the crew is not stunned
  and the existing run gate is satisfied.

## Impact

- Physical Attack phase charge projection and declaration validation only.
- No vehicle critical-hit, stun-duration, charge damage, or displacement
  changes.
