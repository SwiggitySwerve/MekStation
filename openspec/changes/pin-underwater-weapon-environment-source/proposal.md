# Pin Underwater Weapon Environment Source

## Why

Underwater and torpedo combat projections already share legality checks between
the tactical map and engine commit path, but their projection source metadata
still described the rule surface as a MekStation represented helper with a
MegaMek/official source pin pending. That leaves the map explanation layer less
trustworthy than the behavior it is explaining.

## What Changes

- Replace the placeholder water-weapon environment source metadata with
  concrete MegaMek references for underwater attack classification, torpedo
  water-line rejection, and target-water handling.
- Keep the existing projection and commit behavior unchanged.
- Update combat hover coverage so underwater restrictions expose MegaMek-backed
  source and rule references.

## Out Of Scope

- New underwater weapon range math.
- Surface naval/submarine hit-table expansion beyond the represented projection.
- New official rulebook citations beyond the local MegaMek source pin.
