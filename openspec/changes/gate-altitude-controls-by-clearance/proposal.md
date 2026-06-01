# Gate Altitude Controls By Clearance

## Why

VTOL/WiGE Climb and Descend commands are now replayable and reserve MP, but the
command surface still treats terrain clearance as a generic altitude-0/max
check. MegaMek gates UP/DOWN by the current hex's water, woods, bridge, and
building clearance before adding the movement step. The tactical map should not
offer an altitude-control action the represented rules state would reject.

## What Changes

- Evaluate selected-unit terrain and elevation metadata when deriving
  VTOL/WiGE Climb/Descend availability.
- Block descending below represented water, woods foliage, bridge deck, or
  building roof clearance.
- Block VTOL climbing under a bridge when represented unit height leaves no
  clearance, while allowing ordinary WiGE climb over represented building tops.
- Keep the runtime event payload and pending MP reserve unchanged for commands
  that remain legal.

## Source Pins

- MegaMek `Entity.java:2433-2497` computes minimum descent altitude from water,
  woods/jungle foliage, bridges, and buildings for VTOL/WiGE movement.
- MegaMek `Entity.java:2504-2540` computes maximum climb altitude, including
  VTOL under-bridge clearance and WiGE building-top clearance.
- MegaMek `MovementDisplay.java:2276-2291` enables altitude controls from
  `canGoUp` / `canGoDown`.

## Out Of Scope

- Full airborne path projection, velocity, turns, hover, takeoff, and landing.
- LAM/ProtoMek-specific WiGE altitude ceilings beyond the represented ordinary
  WiGE/building path.
- Separate encoded foliage-height terrain metadata beyond the current rendered
  woods height.
