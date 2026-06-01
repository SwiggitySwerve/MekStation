# Block Destroyed Gyro Nontracked Movement

## Why

The tactical map already blocks prone destroyed-gyro stand-up attempts, but a
standing Mek with a destroyed gyro could still preview and commit ordinary
walk/run/jump movement. MegaMek rejects non-tracked/non-wheeled MP once the gyro
is destroyed while preserving tracked/wheeled exceptions such as represented
QuadVee vehicle mode or tracked Meks.

## What Changes

- Add destroyed-gyro runtime movement blocking to the shared movement
  projection.
- Preserve tracked and wheeled movement as legal destroyed-gyro exceptions.
- Route the same projection into movement commit validation so preview and
  engine acceptance agree.

## Out Of Scope

- Modeling in-progress QuadVee/LAM conversion cancellation state.
- Adding hull-down movement handling for destroyed gyros.
- Full external MegaMek movement oracle differencing.
