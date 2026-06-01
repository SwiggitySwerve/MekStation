# Pin Directional Cliff Movement Metadata

## Why

The previous WiGE building-climb slice intentionally did not infer MegaMek's
sheer-cliff rules from ordinary elevation deltas. MegaMek represents cliff tops
as directional hex-edge metadata, and movement legality/cost depends on whether
the unit crosses that encoded edge. MekStation needs the same distinction before
the tactical map can explain cliff movement without over-blocking normal hills.

## What Changes

- Add explicit `cliffTopExits` terrain-feature metadata using existing facing
  direction values.
- Apply the source-backed WiGE +1 MP sheer-cliff ascent surcharge only when the
  destination hex has a cliff-top exit toward the source hex and the move rises.
- Block represented tracked/wheeled/hover vehicle ascent over an encoded sheer
  cliff unless the destination has a pavement/road/bridge surface that cancels
  the cliff effect for road-capable movement.
- Keep ordinary elevation changes without cliff metadata on the existing
  non-cliff movement path.

## Source Anchor

- MegaMek `Hex.java:744-750`
- MegaMek `MoveStep.java:2858-2864`
- MegaMek `MoveStep.java:3159-3178`
