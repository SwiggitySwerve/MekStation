# Pin LAM AirMek To Mek Conversion Steps

## Why

The tactical map now exposes represented LAM conversion actions as runtime
movement-state metadata, and the movement projection consumes pending
conversion steps before previewing or committing movement. MegaMek requires a
standard LAM converting from AirMek/WiGE mode back to Mek/Biped mode to emit two
`CONVERT_MODE` movement commands, not one. MekStation currently treats every
represented AirMek conversion as one step, so the map and event replay can
under-explain the command sequence that the rules engine is modeling.

## What Changes

- Treat represented standard LAM AirMek-to-Mek conversion as a two-step
  conversion action with 0 MP cost.
- Preserve one-step Mek-to-AirMek and AirMek-to-Fighter conversion metadata, and
  keep direct Mek/Fighter conversion unavailable for standard LAMs.
- Prove tactical command metadata, runtime projection carry-forward, and
  movement event serialization all retain the two represented conversion steps.

## Source Pins

- MegaMek `MovePath.java:1047-1053` documents that LAMs converting from AirMek
  to Biped mode require two convert commands.
- MegaMek `MovementDisplay.java:5691-5712` adds one `CONVERT_MODE` step and
  adds a second when the resulting final conversion mode still does not match
  the requested end mode.
- MegaMek `ConvertModeStep.java:52-68` gives LAM conversion steps 0 MP cost
  while QuadVees pay their conversion cost.

## Out Of Scope

- Full LAM airborne AirMek/WiGE pathing, takeoff, hover, landing, velocity,
  turn-mode, or control-roll resolution.
- Full standard-versus-bimodal LAM import differentiation beyond currently
  represented conversion commands.
- External oracle differential sweeps across every conversion path.
