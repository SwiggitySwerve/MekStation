# Aerospace construction rules

## Max thrust

`thrustCalculations.ts:calculateMaxThrust` owns the max thrust derived from safe
thrust: safe thrust times 1.5, rounded upward. The aerospace and capital-vessel
BLK basics, the small craft handler, the default aerospace state, the
safe-thrust and engine-rating store actions and the new-unit template summary
consume it; status bars, record sheets and the aerospace BV adapter read the
stored result. The store factory derives `maxThrust` from the initial safe
thrust, so registry duplication and reopened drafts cannot keep a default or
stale value. A characterization test
(`stores/__tests__/aerospaceMaxThrust.consumers.characterization.test.tsx`) pins
one safe-to-max table through every consumer.

Pinned source, MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`, per family:

| Family                                                                                      | Rule                                                                                                                                                                                                                                                                                                                                      | Source                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aerospace fighter, conventional fighter, fixed-wing support, small craft, DropShip, WarShip | `ceil(walk x 1.5)` while airborne; walk is the BLK `SafeThrust`                                                                                                                                                                                                                                                                           | [Aero.java:1656-1658](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Aero.java#L1656) delegates to [Entity.java:4015-4017](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Entity.java#L4015); no subclass overrides `getRunMP` (`Dropship` only overrides `getWalkMP` for water) |
| JumpShip, space station                                                                     | no safe thrust: `BLKJumpshipFile.java:158` and `BLKSpaceStationFile.java:153` set walk 0, and [Jumpship.java:1207-1212](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Jumpship.java#L1207) returns `floor(accumulatedThrust)` while a station-keeping drive is fitted | dynamic game state, not a construction rating                                                                                                                                                                                                                                                                                                                                                                          |
| WarShip                                                                                     | `Warship` extends `Jumpship` but loads `SafeThrust` (`BLKWarshipFile.java:163`), so it has a transit drive and takes the `ceil` path                                                                                                                                                                                                      | Jumpship.java:1207-1210                                                                                                                                                                                                                                                                                                                                                                                                |
| Grounded aerospace                                                                          | no run multiplier (`Aero.java:1660-1663`); not a construction rating                                                                                                                                                                                                                                                                      |                                                                                                                                                                                                                                                                                                                                                                                                                        |

[MegaMekLab MovementView.java:295](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/ui/generalUnit/MovementView.java#L295)
derives the editor's "Max Thrust" with the same `Math.ceil(walk * 1.5)`, and
[AeroBVCalculator.java:184-186](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/battleValue/AeroBVCalculator.java#L184)
reads `getRunMP(BV_CALCULATION)` for the offensive speed factor.

JumpShips and space stations carry safe thrust 0 in every pinned source, so the
rounding does not touch them. MekStation has no fixed-wing support handler.

Not covered: `BlkParserService.extractAerospace` (a parse result with no
production consumer) reports `2 x safeThrust`; gameplay `runtimeCapability`
already rounds LAM fighter-mode run upward. The aerospace BV formula itself
(SI x 0.5 x tonnage, `1 + max / 10` defensive factor, average of safe and max
thrust) is MekStation's own and differs structurally from `AeroBVCalculator`;
this correction changes only the max thrust input and does not establish BV
parity. No catalog is regenerated or migrated.
