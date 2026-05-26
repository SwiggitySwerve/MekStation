# Block Hull-Down Attacker Actions

## Why

MegaMek keeps target-side hull-down cover and attacker-side hull-down action
limits as separate rules. MekStation now projects target hull-down modifiers, but
the tactical map and commit paths still allow a hull-down Mek to preview or fire
leg-mounted weapons, and kick options do not explain the hull-down block before
commit.

## What Changes

- Source-pin the attacker-side hull-down weapon gate to MegaMek
  `ComputeToHitIsImpossible.java:629-634`.
- Carry weapon mount location into projection and commit weapon shapes so
  leg-mounted weapons can be blocked consistently.
- Surface the block in tactical-map combat overlays and interactive attack
  commits before the engine declares the volley.
- Source-pin hull-down kick rejection to MegaMek `KickAttackAction.java:269-270`
  and show the same reason in physical attack projections.

## Out Of Scope

- Vehicle/QuadVee front-weapon hull-down side-table handling.
- Hull-down entry/exit movement actions.
- Punch/club hull-down hit-table nuances; MegaMek references hull-down there for
  elevation and hit-table behavior, not an outright rejection.
