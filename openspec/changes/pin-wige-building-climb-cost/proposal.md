# Pin WiGE Building Climb Cost

## Why

WiGE movement projection still treated every represented terrain/elevation step
as a flat 1 MP move. MegaMek's movement source keeps the ordinary WiGE
terrain/elevation bypass, but charges +2 MP when a WiGE must stay in climb mode
over a higher building-top crossing. The tactical map needs that cost before it
can be trusted as the player's movement explanation layer.

## What Changes

- Add the represented WiGE +2 MP climb-mode surcharge when entering a building
  hex whose represented ceiling is higher than the source hex ceiling.
- Keep ordinary represented elevation, woods, and non-building terrain ignored
  for WiGE ground projection.
- Keep movement preview, pathfinding, and committed movement validation on the
  same shared movement-cost helper.
- Document the sheer-cliff +1 MP rule as a remaining source gap because
  MekStation does not yet encode directional cliff-top terrain metadata.

## Source Anchor

- MegaMek `MoveStep.java:2844-2864`
