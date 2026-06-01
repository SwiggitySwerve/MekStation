# Block Airborne LAM AirMek Ground Movement

## Why

LAM AirMek mode can be grounded WiGE-style movement or airborne VTOL/WiGE
movement. MekStation already resolves represented AirMek conversion to WiGE MP,
height, and heat for grounded projection, but an airborne AirMek can still be
shown through the ground movement overlay before MekStation has represented
airborne AirMek altitude, hover, landing, velocity, and clearance pathing.
That risks telling the player a destination is legal ground movement when the
source rules route the state through airborne controls.

## What Changes

- Detect represented LAM AirMek runtime state when its aerospace combat state is
  airborne by altitude or lifecycle state.
- Block ground movement projection for airborne LAM AirMek with an explicit
  airborne WiGE movement reason.
- Prove browser movement range, MP legend, invalid details, and committed
  movement validation expose the same blocked result.

## Source Pins

- MegaMek `MovementDisplay.java:2276-2291` uses altitude controls for airborne
  entities and separately treats grounded WiGE/LAM elevation controls.
- MegaMek `MovePath.java:1689-1741` distinguishes airborne WiGE/LAM hover and
  landing behavior from normal ground movement.
- MegaMek `Entity.java:12004-12022` defines airborne VTOL/WiGE state from
  VTOL/WiGE movement, elevation, and building/bridge clearance.

## Out Of Scope

- Full airborne AirMek/WiGE altitude pathing, hover step sequencing, takeoff,
  landing, velocity, turn mode, or control-roll resolution.
- Changing grounded AirMek WiGE movement, MP, heat, or elevation behavior.
- Broad LAM conversion action timing or external oracle differential sweeps.
