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

Armor bonuses, arc/heat handling and final subtype scaling remain separate
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
source SI, armor, equipment, movement or final subtype scaling.

Enforcement: `aerospaceBV.siParity.test.ts` checks the Boeing (SI BV 18), Sabre
(22), Mosquito (12) and Dragonstar (12) references through the contract BV
adapter, plus tonnage independence for every supported subtype. UL-19-si's
620-row comparison asserts that only `siBV`, `defensive` and `final` change.

## Aircraft type modifier

After armor, SI, defensive equipment and explosive penalties, multiply the
complete defensive pool by 1.2 for ASF, 1.1 for conventional fighters and 1
for support vehicles or small craft. Support classification takes precedence:
FixedWingSupport extends ConvFighter but is a support vehicle. The contract
adapter carries that source subtype as `isSupportVehicle` to the BV owner.

Non-patchwork stealth armor adds 0.3 to the selected modifier (1.5 ASF,
1.4 CF, 1.3 support/small craft). Patchwork gets no stealth bonus. Java's
`hasStealth()` checks armor identity; it does not require active stealth mode
or working ECM. Source: the same MegaMek pin, `AeroBVCalculator.java:118-134`,
`Entity.java:16132-16136`, `FixedWingSupport.java:131-132` and defensive stage
ordering in `BVCalculator.java:274-280`. The thrust factor stays neutral.

The final sum uses no CF/FWS reduction; see the final-sum rule below.
This correction does not establish full-unit BV parity.

Enforcement: `aerospaceBV.typeParity.test.ts` checks Sabre defense 347.4,
Boeing defense 63.8, Boomerang support defense 8, each classification and
Saroyan's stealth contribution, plus synthetic stealth/patchwork inputs.
The converter preserves vehicle stealth code 22 as STEALTH, matching code 8;
`test_blk_aerospace_qualifiers.py` enforces both identities. Twelve aircraft
in the pinned 620-row corpus use code 22. UL-19-type's comparison asserts every breakdown field other
than `defensive` and `final` is unchanged for all 620 sources.

## Defensive equipment and final sum

`aerospaceBVEquipment.ts` owns the represented mounted defensive equipment
classification and sum. It uses resolved catalog categories (ECM and Active
Probe), the AMS subtype and exact canonical miscellaneous identities matching
`BVCalculator.java:518-546`. Each mount contributes once to defense before
the aircraft type modifier. The same classification excludes these items from
offensive arc pools, weapon sums and offensive ammunition cap groups. AMS
ammunition adds at most the installed ammunition-using AMS BV; laser AMS does
not support ammunition (`BVCalculator.java:549-646`). Explicit
`defensiveEquipmentBV` supplies additional BV absent from the equipment list.
The contract adapter already preserves equipment IDs and locations; the BV
owner resolves them for both direct and dispatched callers.

The ProtoMech classifier retains a separate legacy substring policy and
offensive equipment split. Reusing it would change this rule's exact identity
matching and its defensive ammo cap; this change does not alter that policy.

All supported aerospace subtypes use the sum of defense and offense before
pilot adjustment and rounding. `getAerospaceSubTypeMultiplier` and the public
breakdown field remain as neutral 1 for compatibility. Java's full path uses
`AeroBVCalculator` for all four families (factory at `BVCalculator.java:103-118`),
inherits `HeatTrackingBVCalculator` without a summary override, and sums at
`BVCalculator.java:1159-1182`. `AeroBVCalculator.java:159-179` then handles
specific cockpit/drone modifiers. None applies a generic CF/FWS 0.8 reduction.
The Java 0.8 drone weapon modifier is a separate offensive rule.

Enforcement: `aerospaceBV.equipmentParity.test.ts` pins Boeing final 64 and
Saroyan defense 191.8/final 192 through contract dispatch, plus represented
defensive categories, mount multiplicity, AMS ammo caps, explicit additions,
weapon exclusion and preserved pilot adjustment. The followup-59 corpus
comparison checks all 620 rows, unchanged inputs and unrelated breakdown fields.
Java screen-launcher/APDS identities without catalog coverage, depleted or
multi-ton ammunition state, variable equipment BV, destroyed/grouped mounts,
cockpit/drone modifiers and complete aerospace BV parity remain open. This
construction input has no working/destroyed state. Catalogs are unchanged.
