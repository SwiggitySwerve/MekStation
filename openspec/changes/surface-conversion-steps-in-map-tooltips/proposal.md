# Surface Conversion Steps In Map Tooltips

## Why

Movement projection already carries pending conversion step count and MP cost so
the engine path can consume conversion actions before movement. The map still
needs to expose that state as player-facing explanation, not only as hidden
projection data. If a LAM conversion adds two zero-MP convert-mode steps before
walking, the reachable hex tooltip and badge metadata should say so.

## What Changes

- Preserve conversion step count and MP cost when same-hex movement options are
  summarized for top-down badges and tooltips.
- Add conversion step/cost attributes to hex movement cells, movement badges,
  movement option rows, and projection overlay attributes.
- Add a movement hover tooltip row that explains pending conversion steps and
  MP cost before the destination movement path.

## Source Pins

- MegaMek `MovePath.java:1047-1053` documents LAM AirMek-to-Biped conversion as
  two convert commands.
- MegaMek `MovementDisplay.java:5691-5712` adds the represented convert-mode
  commands before later movement path edits.
- MegaMek `ConvertModeStep.java:52-68` keeps LAM conversion MP at 0 while
  QuadVees pay conversion cost.

## Out Of Scope

- Changing conversion legality or conversion command metadata.
- Full airborne AirMek/WiGE pathing or conversion oracle sweeps.
