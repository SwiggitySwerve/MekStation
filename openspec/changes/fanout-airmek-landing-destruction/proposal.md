# Fan Out AirMek Landing Destruction

## Why

Failed AirMek landing fall clusters now reduce armor/internal state, but a
destroying cluster still lacks the explicit destruction events emitted by normal
combat damage. That leaves replay/UI consumers without the same location and
unit lifecycle signals they already receive for weapon and physical damage.

## What Changes

- Emit `LocationDestroyed` when an AirMek landing fall cluster destroys a
  location.
- Emit `TransferDamage` when crash damage spills through the normal transfer
  path.
- Emit `UnitDestroyed` when the fall damage resolver marks the unit destroyed.
- Preserve movement-phase event stamping for those crash lifecycle events.

## Source Notes

- MegaMek failed AirMek landings route into the normal fall/crash damage
  lifecycle rather than an explanation-only marker.
- MekStation already emits `DamageApplied` -> destruction/transfer -> destroyed
  lifecycle events for combat damage; AirMek landing crashes should use the same
  replay vocabulary.
