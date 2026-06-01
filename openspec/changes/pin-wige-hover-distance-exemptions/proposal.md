# Pin WiGE Hover And Distance Exemptions

## Why

`auto-land-short-wige-movement` made the map and runtime replay automatic WiGE
landing for represented positive-altitude WiGE vehicles, Glider ProtoMeks, and
LAM AirMeks. MegaMek's `MovePath.automaticWiGELanding(...)` has two extra
guards the projection must preserve before the map can be trusted as the
player's explanation layer:

- distance already moved this turn contributes to the minimum-distance check;
- UP/HOVER-style represented steps exempt the automatic landing.

Without this, a player could see a forced landing badge on a hover-style move
that MegaMek would keep airborne, or see a forced landing after a short plotted
segment even though the unit has already moved enough hexes this turn.

## What Changes

- Count represented `hexesMovedThisTurn` together with the currently projected
  path when evaluating short-distance WiGE automatic landing.
- Suppress automatic landing projection and runtime landing patches when the
  represented movement mode is hover or when altitude-control steps are pending.
- Keep the top-down/isometric `LAND` badge and automatic-landing tooltip
  metadata aligned with the same source-backed helper.

## Source Anchor

- MegaMek `MovePath.java:1699-1743`
