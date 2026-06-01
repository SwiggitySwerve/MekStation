# Pin AirMek Landing Control Context

## Why

The tactical map can now represent LAM AirMek WiGE elevation and clear that
elevation through replayable altitude-control state. MegaMek also makes AirMek
landings damage-sensitive: a descent to ground level may require a control roll
only when gyro or leg damage is present, with hip-only damage gated by the
TacOps leg-damage optional rule. MekStation needs to expose that context at the
same moment the map lets the player land, otherwise the map can still hide a
landing risk the engine would later care about.

## What Changes

- Attach source-backed AirMek landing-control metadata when an AirMek Descend
  command changes represented `lamAirMekAltitude` to 0.
- Distinguish clean landings from gyro/leg-damaged landings in the runtime
  movement event payload.
- Include the landing-control modifier and readable damage breakdown for
  damaged landings.
- Render the landing-control result in the event log so the tactical map
  explains the consequence immediately after the landing action.

## Source Pins

- MegaMek `LandAirMek.java:789-847` implements
  `checkAirMekLanding()`, requiring the landing control roll only when effective
  gyro hits, destroyed legs, or qualifying leg actuators are present.
- Heavy-duty gyros ignore the first gyro hit for this landing-control gate.
- MegaMek `OptionsConstants.java:460` names the TacOps leg-damage option
  `tacops_leg_damage`, and `GameOptions.java:240` defaults it to disabled.

## Out Of Scope

- Rolling or resolving the landing PSR.
- Applying falls, pilot damage, or landing damage from a failed control roll.
- Full AirMek/WiGE airborne pathing, takeoff, hover, velocity, and automatic
  minimum-distance landing.
