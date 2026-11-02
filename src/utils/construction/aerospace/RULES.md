# Aerospace construction rules

## Large aerospace offensive stage

`largeAerospaceFirePool.ts` owns the six-arc fire pool for already-valued
native arc facts, exported through `aerospaceBV.ts`. It follows pinned
`LargeAeroBVCalculator.determineFront/processWeapons/processArc/processAmmo`:
primary ties follow nose/left/left-aft/aft/right-aft/right; adjacent ties favor
clockwise. Primary weight is 1, stronger adjacent is 1 or 0.5, weaker adjacent
is 0.5 or 0.25, and the other arcs are 0.25. Adjacent weights use cumulative
heat strictly greater than heat capacity, checked after each entire arc.
Ammo uses the shared cap owner within each arc and native ammo type/rack.
The shared speed owner receives maximum thrust, without the fighter average.
Offensive equipment is added before speed and outside arc weighting.

This is a component port, not raw-mount valuation or complete DropShip BV.
Callers must supply resolved weapon BV/heat, native ammo quantities/cap keys
and offensive equipment BV. Ungrouped selection BV and grouped additions after
arc weighting (PPC capacitors) have separate input fields. Bay aggregation,
capital weapons, linked modifier valuation, crew/pilot, cockpit/drone,
C3/TAG and final rounding remain outside this stage. Do not use this component
as a complete calculator for unsupported mount modifiers. Dispatch remains
defensive-only and withholds offensive/final BV. Tests pin Union stage offense
2339.75, tie/heat boundaries, local ammo caps, speed and malformed facts. UL-20
offense evidence compares all 209 native stage inputs and all 620 unchanged
fighter/small-craft breakdowns; native-valued inputs do not prove app loading.

## DropShip defensive slice

`dropShipBV.ts` adapts DropShip domain mounts and calls the same defensive
owner as fighters and small craft. `calculateBattleValueForUnit` returns
`kind: 'dropship'` with `calculationScope: 'defensive-only'`. Offensive and
final BV are explicitly undefined; defense is not a complete unit BV.
The contract adapter transports only SI, total armor, armor identity and mounts.
It requires SI and armor.byArc, accepts zero and preserves hull equipment.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587` routes Dropship to
DropShipBVCalculator (`BVCalculator.java:103-118`), which inherits
LargeAeroBVCalculator and AeroBVCalculator. Armor uses the inherited factor
2.5 and SI uses 2. Dropship extends SmallCraft, so its defensive type modifier
is 1; stealth still adds 0.3. LargeAeroBVCalculator's empty explosive stage
does not apply penalties or the heat-tracking minimum. Aero's defensive
factor is neutral. No small-craft armor bonus applies to DropShips.
Mounted defensive equipment uses the existing shared classification and cap.

Dispatch integration of the large-aerospace offensive stage, native mount and
ammo valuation, weapon-link modifiers and final crew/pilot/drone adjustments
remain deferred after the size-capped component deliveries.
Existing equipment-ID gaps, screen/APDS coverage, variable equipment values,
Blue Shield and mount working/destroyed state are not resolved here.
Numeric armor codes retain the existing aerospace adapter's standard fallback.

Enforcement: `dropShipBV.test.ts` covers the Union defense 1632 reference,
contract transport, missing/zero facts, domain mounts and shared AMS caps.
UL-20's external comparison checks every defensive component for all 209
pinned DropShips and asserts every breakdown field is unchanged for the
same 620 aerospace inputs. It reports missing totals as unavailable.

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

## Offensive forward/rear groups

`aerospaceBVArcs.ts` owns ordinary aerospace mount weighting. Nose, both wings
or sides and Fuselage form one forward group; Aft forms the rear group. Compare
the complete groups before weighting: the stronger group contributes fully,
the weaker contributes half, and ties keep forward full. Fuselage participates
in the comparison and discount while retaining its separate public subtotal.
Per-arc raw BV remains unchanged; `primaryArc` identifies the largest populated
arc in the dominant group, preserving arc order on ties. Empty pools have no
primary and zero weights. Unknown locations remain excluded.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`AeroBVCalculator.java:147-155`, `BVCalculator.java:690-699,780-782,835-837`.
The large-aerospace 100/50/25 arc policy does not apply to ASF, CF, FWS or
SmallCraft. DropShip and capital offensive calculations are outside this owner.
Rear-mounted flags, heat, mounted ammo/equipment classification, quantities,
weapon links remain separate parity work; the group calculation preserves
their existing policies and does not establish full offensive parity.

Enforcement: `aerospaceBV.offensiveArcParity.test.ts` covers Sabre's native
prototype facts at the catalog boundary, source-derived Inseki II through
contract dispatch, both wing/side topologies, combined-group selection,
strong rear groups, Fuselage ties and empty/unknown locations. Sabre remains
unresolved in production catalog data. UL-19-offense's 620-source comparison
asserts unchanged inputs, raw arcs and unrelated breakdown fields.

## Offensive speed

`aerospaceBVCalculator.calculateAerospaceSpeedFactor` consumes maximum thrust
as airborne run MP for ASF, conventional fighters, fixed-wing support and
small craft. `thrustCalculations.calculateMaxThrust` owns the upward rounding;
`battleValueMovement.calculateOffensiveSpeedFactorForMP` owns the exponent and
two-decimal rounding before multiplication. The public `avgThrust` diagnostic
retains its arithmetic mean and does not affect speed. Supplied maximum thrust
remains authoritative at the BV boundary; this change does not rewrite inputs.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`AeroBVCalculator.java:183-186` reads `getRunMP(BV_CALCULATION)`;
`Aero.java:1656-1663` delegates airborne movement to
`Entity.java:4015-4017` (`ceil(walk * 1.5)`). ASF extends Aero, conventional
fighter extends ASF, fixed-wing support extends conventional fighter, and
small craft extends Aero; none overrides this movement rule.
`BVCalculator.java:1129-1132` supplies the shared speed formula.

Enforcement: `aerospaceBV.speedParity.test.ts` covers all four families,
odd-thrust ceiling, zero thrust, factor rounding and the compatibility mean.
The arc parity fixtures pin Sabre's native 248 BV pool at factor 2.58 and
639.84 offense, plus Inseki II's factor 1.37 through contract dispatch.
UL-19-speed compares all 620 unchanged corpus inputs and allows only speed,
offense and final BV to change. Sabre's production prototype IDs, heat, ammo,
links and other valuation gaps remain unresolved. This construction rule
does not represent grounded/damaged gameplay state or complete BV parity.

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
