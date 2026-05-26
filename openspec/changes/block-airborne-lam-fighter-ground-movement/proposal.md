# Block Airborne LAM Fighter Ground Movement

## Why

LAM Fighter mode has two different tactical-map surfaces: grounded aerospace
taxi movement and airborne aerospace flight. MekStation already projects the
grounded Fighter case as wheeled/taxi movement, but an airborne Fighter could
fall back to ordinary imported ground movement before the aerospace flight
projection exists. That risks showing movement highlights the engine should not
commit as ground movement.

## What Changes

- Resolve airborne LAM Fighter runtime MP from aerospace thrust instead of the
  imported Mek walk/run values.
- Block ground movement projection for airborne LAM Fighter mode with an
  explicit aerospace-flight reason.
- Prove the browser movement range, MP legend, invalid badge, and committed
  movement rejection expose the same blocked reason.

## Out Of Scope

- Full aerospace flight pathing, turn modes, velocity gates, takeoff/landing,
  or control-roll resolution.
- Changing grounded LAM Fighter taxi movement behavior.
- Broad LAM conversion action timing.
