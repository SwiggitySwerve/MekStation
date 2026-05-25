# Restrict Vehicle Charge Movement Mode Projection

## Why

The tactical map currently projects charge legality from attacker unit type and
whether the unit ran this turn. MegaMek also gates vehicle charge eligibility by
movement mode: WiGE vehicles cannot charge, and hover vehicles cannot charge
when the `no_hover_charge` option is enabled. Map previews and engine commit
validation need the same movement-mode context or they can light a target that
the rules should reject.

## What Changes

- Thread attacker motive mode and optional rule keys into shared physical attack
  projection and session commit validation.
- Block represented WiGE/VTOL charge rows with `AttackerCannotCharge`.
- Preserve hover charge by default, but block it when `no_hover_charge` is
  enabled.
- Preserve ordinary ground-vehicle charge eligibility behind the existing run
  gate.

## Impact

- Physical Attack phase charge projection, command preview, and declaration
  validation only.
- No charge damage, displacement, movement reachability, or vehicle movement-cost
  changes.
