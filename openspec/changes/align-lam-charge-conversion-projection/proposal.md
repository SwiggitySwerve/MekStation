# Align LAM Charge Conversion Projection

## Why

The previous vehicle charge slice correctly blocked generic WiGE / VTOL charge
projection, but Land-Air 'Mechs are a special case. MegaMek's
`LandAirMek.canCharge()` blocks fighter mode and airborne AirMek mode while
letting grounded non-fighter LAMs fall back to normal Mek charge eligibility.
MekStation's map projection needs that conversion-state distinction so a
grounded AirMek does not disappear from valid charge highlights just because its
runtime motive projects as WiGE.

## What Changes

- Thread represented attacker conversion mode and airborne VTOL/WiGE state into
  physical attack eligibility, declaration validation, and resolution.
- Allow grounded represented AirMek charge projection when the normal run gate
  passes.
- Block represented LAM fighter mode and airborne AirMek charge attempts with
  `AttackerCannotCharge`.

## Impact

- Physical Attack phase charge projection and commit validation only.
- No charge damage, LAM movement reachability, ram handling, or aerospace combat
  changes.
