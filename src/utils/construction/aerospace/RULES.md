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
already rounds LAM fighter-mode run upward. Remaining aerospace BV terms
still differ from `AeroBVCalculator`; this correction changes only the max
thrust input and does not establish complete BV parity. No catalog is
regenerated or migrated.

## Battle value

The aerospace construction module owns aerospace BV calculations. Its public
entry is `aerospaceBV.ts`; `aerospaceBVCalculator.ts` owns the defensive pool.

## Defensive thrust factor

There is no thrust-based defensive multiplier. `defensiveFactor` remains in
the public breakdown as 1. Maximum thrust still feeds the existing offensive
speed calculation.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`AeroBVCalculator.java:137-138` (empty `processDefensiveFactor`), invoked after
the separate type modifier by `BVCalculator.java:274-280`.

The aircraft type modifier at `AeroBVCalculator.java:118-134`,
armor bonuses, arc/heat handling and final subtype scaling remain separate
parity work. This rule does not assert full-unit parity. Construction SI
defaults, source movement and shared thrust helpers are outside this correction.

Enforcement: `aerospaceBV.defensiveFactorParity.test.ts` checks the Boeing
oracle reference and thrust independence for all supported subtypes. The
UL-19-first corpus comparison also checks that unrelated breakdown terms
remain identical for every converted source.

## Structural integrity valuation

SI contributes `SI × 2` to defensive BV, independently of tonnage, for ASF,
conventional fighters, FixedWingSupport and small craft. Source: the same
MegaMek pin, `AeroBVCalculator.java:64-70`. `BVCalculator.java:103-118` routes
all four families through that calculator: `AeroSpaceFighter.java:44` extends
`Aero`; `ConvFighter.java:54` extends `AeroSpaceFighter`;
`FixedWingSupport.java:57` extends `ConvFighter`; `SmallCraft.java:70` extends
`Aero`. There is no separate small-craft SI formula.

Java also multiplies this contribution by 1.2 with working Blue Shield.
`IAerospaceBVInput` cannot express that state, so Blue Shield remains a later
term. This correction changes neither construction SI defaults/weight nor
source SI, armor, equipment, movement, aircraft type or final subtype scaling.

Enforcement: `aerospaceBV.siParity.test.ts` checks the Boeing (SI BV 18), Sabre
(22), Mosquito (12) and Dragonstar (12) references through the contract BV
adapter, plus tonnage independence for every supported subtype. UL-19-si's
620-row comparison asserts that only `siBV`, `defensive` and `final` change.
