# Spend Conversion MP in Movement Projection

## Why

Runtime conversion controls now expose source-backed conversion step count and
MP cost, but the movement projection must also spend that reserved MP before a
player commits later path movement. Without this, QuadVee conversion can be
shown as legal while the following movement overlay overstates remaining MP.

## What Changes

- Replay conversion-action metadata into unit movement state as pending
  conversion steps and pending conversion MP.
- Include pending conversion MP in movement projection cost and committed
  movement validation.
- Emit represented conversion steps on movement-declared payloads and clear the
  pending conversion reserve once movement is committed.

## Source Pins

- MegaMek `ConvertModeStep.java`: QuadVee `CONVERT_MODE` steps use
  `conversionCost()`, while other conversion steps cost 0 MP.
- MegaMek `MovementDisplay.java`: conversion controls add one or more
  `CONVERT_MODE` steps before later movement path steps.
