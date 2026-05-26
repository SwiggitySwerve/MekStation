# Align Playtest3 Heavy-Duty Gyro Stand-Up

## Why

MegaMek's `playtest_3` option changes represented heavy-duty gyro behavior: a
heavy-duty gyro is destroyed at four hits instead of three, and its PSR
modifier scales by hit count through the third hit. MekStation now preserves
heavy-duty gyro type, but the shared stand-up projection still used the normal
three-hit destroyed threshold even when Playtest3 was enabled. That made the
map reject a rollable three-hit stand-up path that the engine should allow
under the represented optional rule.

## What Changes

- Make shared gyro threshold and PSR modifier helpers consume represented
  optional rules.
- Keep `playtest_3` three-hit heavy-duty gyro stand-up rollable with the
  represented +3 modifier.
- Keep `playtest_3` four-hit heavy-duty gyro stand-up blocked as destroyed.
- Add focused movement projection, PSR helper, and committed movement agreement
  coverage.

## Out Of Scope

- Other Playtest3 combat changes.
- QuadVee vehicle-mode, tracked-Mek, or LAM conversion/motive exceptions.
