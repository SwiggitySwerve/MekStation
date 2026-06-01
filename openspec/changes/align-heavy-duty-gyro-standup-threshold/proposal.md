# Align Heavy-Duty Gyro Stand-Up Threshold

## Why

MegaMek treats represented heavy-duty gyros differently from standard gyros:
they are destroyed after more than two gyro hits, not after two hits. A prone
Mek with two heavy-duty gyro hits should still have a finite stand-up PSR with
the heavy-duty damage modifier, while three hits should make the stand-up
impossible. MekStation's destroyed-gyro projection previously treated all
represented gyros like standard gyros, which could hide a legal rollable
stand-up path.

## What Changes

- Preserve the represented gyro type from compendium/unit data into runtime
  game units and unit state.
- Evaluate destroyed-gyro stand-up thresholds by represented gyro type:
  standard gyros are destroyed at two hits, heavy-duty gyros at three hits.
- Apply the represented heavy-duty gyro PSR modifier to stand-up projection and
  committed PSR resolution so preview and engine outcomes agree.
- Add focused projection, PSR, adapter, and committed movement coverage for the
  two-hit and three-hit heavy-duty gyro cases.

## Out Of Scope

- PLAYTEST3 heavy-duty gyro thresholds.
- QuadVee vehicle-mode, tracked-Mek, or LAM conversion/motive exceptions beyond
  the existing source-backed follow-up work.
