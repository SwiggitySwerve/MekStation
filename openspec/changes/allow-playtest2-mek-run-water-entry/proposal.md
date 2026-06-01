# Allow Playtest2 Mek Run Water Entry

## Why

MegaMek's Playtest2 water branch lets Mek-style biped/quad/tripod movement run
into water after the first step, while standard rules keep the post-first-step
run-water prohibition. MekStation already carries optional rules into movement
projection and commit validation, but this represented Playtest2 legality
exception is still missing.

## What

- Allow represented Mek-style run movement to enter water after the first step
  when `playtest_2` is enabled.
- Keep standard rules blocked and keep infantry-profile, vehicle, naval, hover,
  VTOL, WiGE, UMU, swim, amphibious, and bridge/ice paths on their existing
  legality rules.
- Add preview-to-commit agreement coverage for the Playtest2 run-water path.

## Impact

The run overlay no longer under-highlights legal Playtest2 Mek-style paths that
cross into water after an initial step, and committed movement accepts the same
path the map highlights.
