# Import MegaMek Cliff-Top Exits

## Why

The movement engine now understands explicit `cliffTopExits` metadata, but
imported MegaMek `.board` files still drop `cliff_top:1:<exits>` terrain
entries. That leaves real maps unable to drive the source-backed cliff movement
projection added by the prior slice.

## What Changes

- Parse MegaMek `cliff_top:1:<exitMask>` terrain entries from `.board` hex
  terrain strings.
- Convert the exit bitmask into facing directions `0..5`, matching MegaMek's
  `1 << direction` encoding.
- Preserve valid cliff-top exits as MekStation `cliffTopExits` terrain-feature
  metadata.
- Discard cliff-top exits that do not point to an in-board 1- or 2-level drop,
  matching MegaMek's automatic-terrain correction behavior.

## Source Anchor

- MegaMek `Terrain.java:103-119` and `Terrain.java:302`
- MegaMek `Terrains.java:147-150` and `Terrains.java:199`
- MegaMek `Board.java:537-602`
