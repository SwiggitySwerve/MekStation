# Proposal: Add Out-of-Ammo Browser Projection Proof

## Why

MekStation already rejects ammo-fed weapon attacks when every selected weapon is
dry, but the browser tactical-map harness did not prove that the rendered hex,
badge, and tooltip expose the same `OutOfAmmo` state. A map user needs to see
that a visible target is blocked because the selected weapon has no ammunition,
not because the target silently disappeared from the combat projection.

MegaMek treats ammo-using attacks with absent or empty usable ammo as
`WeaponAttackAction.OutOfAmmo`, and treats ammo weapons without remaining linked
ammo as crippled. The tactical map should surface that same reason in browser
metadata and non-color visual evidence.

## What Changes

- Add an e2e tactical-map scenario with a selected AC/5 that has zero ammo.
- Assert the browser-rendered target hex is blocked with `OutOfAmmo` details.
- Assert the dry selected weapon remains visible as a blocked per-weapon range
  option.
- Assert the combat invalid badge renders the non-color `AMMO` label.
- Assert the tooltip explains the lack of ammunition.
- Pin the dry-weapon projection state in focused projection/component tests.

## Out of Scope

- Changing ammo accounting, heat, damage, or attack resolution rules.
- Adding ammo-bin inventory UI.
- Changing weapon range, LOS, firing arc, or target-selection behavior.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: tactical-map e2e harness and focused combat projection tests
- Tests: Jest projection/component coverage and Playwright browser smoke proof
