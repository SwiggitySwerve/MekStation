# Block Airborne AirMek Push Projection

## Why

MegaMek rejects push attempts when the attacker is airborne VTOL/WiGE, with the
push action specifically noting that LAM AirMeks can only push while grounded.
MekStation already derives represented AirMek airborne state for charge
projection. Push projection and declaration validation should consume the same
runtime state so airborne AirMeks do not highlight or commit impossible pushes.

## What Changes

- Add an `AttackerAirborne` physical restriction reason.
- Block represented push rows when the attacker is airborne VTOL/WiGE.
- Prove runtime AirMek state suppresses push projection and declaration
  validation with the same reason code.

## Impact

- Physical Attack phase push projection and declaration validation only.
- No change to grounded AirMek charge/push behavior or movement-phase ramming.
