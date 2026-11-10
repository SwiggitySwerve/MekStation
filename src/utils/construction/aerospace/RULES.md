# Aerospace construction rules

Contract and live editor BV share `projectAerospaceBVArmor`; status and both
record-sheet callers use `aerospaceBVUnitFromState`. Per-arc native type codes
stay separate from live armor points. Native fighter handlers retain explicit
`*_armor_type` tags, and the existing arc resolver accepts their lower-camel point
keys while rejecting unknown arcs. No UI layer computes armor BV. Pin 48fcb2f64:
BLKAeroSpaceFighterFile.java:148-164; BVCalculator.java:350-420. Nanook's armor BV
is 282.5, defensive BV 367.8 and final BV 1571. Selecting global armor clears the
type map through the existing editor action.

Capital and DropShip modifiers reuse the shared native link owner and MGA helper:
first compatible unlinked weapons in the same physical location, independent of
rear/bay markers. Apollo uses the shared 1.15 multiplier; PPC capacitors use the
shared per-PPC BV and year eligibility and add five heat. Raw ammo caps remain
unmodified. Java nominal selection sees physical linked weapons; firing groups
add capacitor BV once per equal native type/location/rear/link group, after arc
weighting. Unmatched links remain explicit. Pin 48fcb2f64:
MekFileParser.java:425-528,928-944; BVCalculator.java:807-816,853-877;
LargeAeroBVCalculator.java:203-269; HeatTrackingBVCalculator.java:170-224.

HULL is a physical location, not a firing arc. The shared equipment-role owner
admits audited zero-offense radar/imagers, cargo containers, CASPAR I/II
controllers and SDS self-destruct equipment before firing-arc validation.
Their native flags are neither the defensive flags nor DRONE_OPERATING_SYSTEM;
CASPAR controllers do not trigger the 0.8 weapon or 0.95 summary factors.
Weapons and unknown hull equipment remain unresolved. Pin 48fcb2f64:
MiscType.java:5298-5400,5447-5468,6367-6460,8675-8705;
BVCalculator.java:296,516-546,955-963,1159-1182;
AeroBVCalculator.java:162-180. Native Gaajian, Caspar and Pavise traces enforce it.

The native mount parser preserves `:size:` as a finite nonnegative size,
separately from ammo shots and bay/rear flags. MASH, communications equipment,
ATAC, DTAC and drone-carrier controllers are audited non-offensive miscellaneous
equipment; size changes construction facts, not their zero standalone BV.
Unknown sized equipment and malformed suffixes remain unresolved.
Pin 48fcb2f64: BLKFile.java:274-278,361-381;
MiscType.java:5059-5090,5400-5444,8790-8831,9072-9107;
BVCalculator.java:955-963. Enforcement: largeAerospaceNativePools.test.ts.

Screens use the shared defensive classifier and cap accumulator. Launcher BV
and whole-bin screen ammo belong in defense; screen ammo is capped at screen
launcher BV, independently of AMS/APDS. They supply no offensive BV, ammo cap
or offensive arc heat; the sheet still reports launcher heat on its physical arc.
Pin 48fcb2f64: BVCalculator.java:516-526,549-645,936-951;
ScreenLauncherWeapon.java:65-82; AmmoType.java:12875-12885.

Large-craft defensive ammo uses the shared defensive-equipment owner and the
same whole-bin multiplier as offensive ammo. Zero shots contribute zero;
positive partial bins count once and excess ammo is capped globally at AMS/APDS
weapon BV. Bay/rear markers identify physical defensive weapons once, including
laser AMS. Ordinary aircraft and vehicle callers keep their existing behavior.
Pin 48fcb2f64: BVCalculator.java:516-576,602-631;
LargeAeroBVCalculator.java:95-96. Enforcement: largeAerospaceNativePools.test.ts.

Drone weapons share the vehicle 0.8 owner before capacitor additions and TC;
physical ammo keeps its own value. Detection uses the canonical OS owner in
ordinary and large aircraft. The summary applies the inherited 0.95 followed
by the Aero 0.95, through the existing final-summary owner. Source pin
48fcb2f64: BVCalculator.java:845-847,936-963,1159-1182;
AeroBVCalculator.java:162-180. Enforcement: aerospaceBV.drone.test.ts.

## DropShip mount valuation

`dropShipMountBV.ts` owns raw DropShip mount-to-arc facts, using the shared
equipment resolver and defensive classifier. A `b-` bay-start marker counts
its weapon once. Rear side mounts use AL/AR; nose/aft mounts retain their arc.
Supported conventional type/rack groups combine IS/Clan cap BV within an arc.
Ammo uses the catalog owner's bin shot count and native
`max(1, floor(usableShots / binShots))`, with depleted bins contributing zero.
The shared cap accumulator and six-arc stage own accumulation and weighting.

The closed supported subset includes AC/Ultra/Rotary/light AC, Gauss/light/heavy
Gauss, LB-X, LRM/SRM/MRM/MML, Streak and represented laser/PPC/flamer subtypes,
including variable-speed and X-pulse lasers. LB-X slug and cluster bins share
their native type/rack cap; Gauss bins retain their distinct weapon types.
Artemis IV/V links select the first compatible unlinked launcher in the same
physical location, irrespective of rear flags (pinned `MekFileParser.java:425-449`).
The shared equipment owner applies the launcher modifier; ammo caps retain raw
weapon BV (`BVCalculator.java:860-872`, `LargeAeroBVCalculator.java:85-146`).
Represented naval C3, comm-scanner suites and tug adapters carry zero standalone
offensive BV even on the hull; force-context bonuses are outside this input.
Missing capital/screen/tele-operated catalog types, unsupported links and other
equipment, unknown identities/arcs and missing/invalid ammo
quantities produce indexed reasons. Returned arcs are partial diagnostics
while any reason remains. Catalog resolution alone does not certify native
numerical parity. `dropShipComplete.ts` composes only fully resolved sets. Tests enforce bay multiplicity, rear arcs, native
quantity ratios, depleted bins, local caps, unresolved facts and Union's
2339.75 offensive stage and complete 3972 from raw mounts.

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
as a complete calculator for unsupported mount modifiers. Unresolved dispatch
remains defensive-only and withholds offensive/final BV. Tests pin Union stage offense
2339.75, tie/heat boundaries, local ammo caps, speed and malformed facts. UL-20
offense evidence compares all 209 native stage inputs and all 620 unchanged
fighter/small-craft breakdowns; native-valued inputs do not prove app loading.

## Capital defensive slice

`capitalShipBV.ts` adapts JumpShip, WarShip and Space Station facts and calls
the aerospace defensive owner. Dispatch returns `kind: capital-ship`; the shared
composition owner decides complete or defensive-only scope. The contract
adapter requires SI and armor.byArc, accepts
zero and preserves hull/broadside mounts. Domain mounts may carry arc names.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587` factory routes
Warship to WarShipBVCalculator, Jumpship (including SpaceStation) to
JumpShipBVCalculator. Both inherit LargeAero -> Aero -> HeatTracking -> BV.
JumpShip overrides armor factor to 25 and SI to 20; neither KF nor sail
integrity contributes. Capital armor points are already capital scale: no
additional conversion applies. Ferro-carbide, lamellor ferro-carbide and
improved ferro-aluminum use the native default armor BV multiplier 1.
JumpShip/WarShip replace the whole aircraft type stage with 0.75/0.8; stations
use 0.7. They do not add aircraft stealth. Defensive equipment/caps, the empty
LargeAero explosive stage and Aero's neutral defensive factor are inherited.

Enforcement: `capitalShipBV.test.ts` pins Java defenses 2142/12920/1064 for
Comitatus/Aegis/Crucible, including native AMS facts for Comitatus, adapter
guards, equipment caps and type overrides. UL-21's external evidence compares
all 185 native defensive aggregates and verifies 620 aerospace and 209
DropShip results unchanged. Existing source-qualified equipment IDs, screen
identities and ammunition quantities remain boundary limitations, reported
per unit. Supported complete scope is documented below; missing identities remain unresolved.

## DropShip defensive slice

`dropShipBV.ts` adapts DropShip domain mounts and calls the same defensive
owner as fighters and small craft. `calculateBattleValueForUnit` returns
`kind: 'dropship'`; `dropShipComplete.ts` owns scope and composition.
The adapter transports SI, armor, mounts, maximum thrust, heat sinks and cockpit.
It requires SI and armor.byArc, accepts zero and preserves hull equipment.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587` routes Dropship to
DropShipBVCalculator (`BVCalculator.java:103-118`), which inherits
LargeAeroBVCalculator and AeroBVCalculator. Armor uses the inherited factor
2.5 and SI uses 2. Dropship extends SmallCraft, so its defensive type modifier
is 1; stealth still adds 0.3. LargeAeroBVCalculator's empty explosive stage
does not apply penalties or the heat-tracking minimum. Aero's defensive
factor is neutral. No small-craft armor bonus applies to DropShips.
Mounted defensive equipment uses the existing shared classification and cap.

Complete scope requires no unresolved mounts, finite nonnegative max thrust,
integer nonnegative sink count, represented sink type and supported cockpit.
Missing facts retain defense and explicit reasons; partial offense is withheld.
`battleValueTotals.calculateBaseBV` owns sum/modifier/base rounding, shared with
mechs and ProtoMechs. `battleValuePilot.calculateAdjustedBV` owns skill/final
rounding; fighters without a small cockpit retain their legacy single rounding.

Pinned BVCalculator.java:1159-1185 applies drone 0.95; AeroBVCalculator.java:162-181
then applies 0.95 for small/command-console cockpit OR drone (two factors total
for drones). BVCalculator.java:1252-1294 rounds base before pilot skill.
Crew.java:233-234 defaults to G4/P5; the uncrewed path also uses G4/P5
(BVCalculator.java:1307-1313). Crew counts do not enter this final stage.
Without a game, Entity.getExtraC3BV and processTagBonus contribute zero.
Dropship inherits Aero's IBomber: external stores can apply, but the contract
has no bomb loadout and Aero initializes empty loadouts (Aero.java:226-227).
Absent cockpit uses Aero's standard default (Aero.java:175). Unknown cockpits
and unresolved drone/equipment identities retain partial scope; no resolver
coverage is added by the independently callable final-stage component.
Existing equipment-ID gaps, screen/APDS coverage, variable equipment values,
Blue Shield and mount working/destroyed state are not resolved here.
Numeric armor codes retain the existing aerospace adapter's standard fallback.

Enforcement: `dropShipBV.test.ts` covers the Union defense 1632 reference,
contract transport, missing/zero facts, domain mounts and shared AMS caps.
UL-20's external comparison checks every defensive component for all 209
pinned DropShips and asserts every breakdown field is unchanged for the
same 620 aerospace inputs. `dropShipComplete.test.ts` enforces final ordering,
cockpit/drone factors and incomplete reasons; unresolved totals stay unavailable.

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
Rear-mounted flags, mounted ammo/equipment classification, quantities,
weapon links remain separate parity work; the group calculation preserves
their existing policies and does not establish full offensive parity.

Enforcement: `aerospaceBV.offensiveArcParity.test.ts` covers Sabre's native
prototype facts at the catalog boundary, source-derived Inseki II through
contract dispatch, both wing/side topologies, combined-group selection,
strong rear groups, Fuselage ties and empty/unknown locations. Sabre remains
unresolved in production catalog data. UL-19-offense's 620-source comparison
asserts unchanged inputs, raw arcs and unrelated breakdown fields.

## Ordinary rear-mounted weapons

aerospaceMountFlags.ts owns the native R- marker shared with the existing
large-craft mount boundary. Ordinary aircraft preserve physical location for
controller links while rear-marked weapons join Aft before dominance and heat
sorting (AeroBVCalculator.java:152-158, pin 48fcb2f64). Unmarked side mounts
remain forward. aerospaceBV.rearMounted.test.ts pins native Aquarius, both
marker states and same-side Artemis linking on a rear-mounted launcher.

The unit BV adapter also retains the editor's existing isRearMounted flag:
the definition mapper consumes the raw R- prefix when building editor mounts.
An explicit editor flag takes precedence; absent flags retain native marker
classification. The committed craft record-sheet suite verifies store-to-sheet
BV against the source owner.

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

Arc handling and final subtype scaling remain separate
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

## Capital offense and supported complete scope

The shared large-aerospace fire pool accepts WarShip eight-arc topology.
WarShip primary candidates are nose, aft and broadsides, in native index order;
its third weighted arc is opposite the primary, not the weaker adjacent.
Sources: MegaMek 48fcb2f64, WarShipBVCalculator.determineFront/processWeapons
and JumpShipBVCalculator.offensiveSpeedFactorMP (JumpShip fixed MP 1,
station 0 despite both having zero thrust). Heat and local caps reuse LargeAero.
The mount owner supports capital location tags and bay-start multiplicity;
capital/sub-capital identities lacking catalog facts remain indexed unresolved.
Capital defensive qualifiers/shot quantities absent from defense are unresolved.
`dropShipComplete.ts` composes both families through the existing final owner,
with Crew.java:233-234 / BVCalculator.java:1307-1313 no-pilot defaults G4/P5.
Only fully resolved mounts and represented heat/cockpit/thrust facts authorize
complete scope; other results retain defense and explicit reasons. No game
context supplies C3/TAG bonuses. UL-21/complete external evidence covers all
185 capital sources and unchanged 209 DropShips / 620 aerospace sources.

## Explosive equipment

`aerospaceBVEquipment.calculateMountedAerospaceExplosivePenalty` owns the stage:
15 BV per distinct explosive ammo identity, 1 per explosive mount. Gauss ammo
is safe; Gauss weapons and eligible capacitor-linked PPCs are explosive.
Clan chassis or CASE/CASE II protect the whole aircraft. `sourceTechType`
retains mixed-chassis identity; legacy inputs use declared tech base, and
inputs without either fact retain their explicit/default penalty. The pool
floors at one before type scaling, except the native early protection return.
Explicit totals remain authoritative. DropShip/capital keep their empty stage.

Source: MegaMek 48fcb2f64: AeroBVCalculator.java:78-115,
HeatTrackingBVCalculator.java:65-70,229-247, MekFileParser.java:90-93,472-497
(eligible same-location PPC links; Clan ER PPC requires year >= 3101).
The shared ammo predicate preserves the crit scanner's exclusions; Mek
per-slot penalties remain separate. `HULL` maps to Fuselage at the boundary.
Enforcement: aerospaceBV.residualParity.test.ts covers these rules and six hull failures.

## Ordinary armor and weapon heat

SmallCraft inherits 2.5 BV per armor point, without an additional armor bonus
(`BVCalculator.java:461-463`, MegaMek 48fcb2f64). Capital armor keeps its factor.
ASF and SmallCraft use heat efficiency 6 + heat capacity (`AeroBVCalculator.java:141-144`).
Conventional fighters and FixedWingSupport bypass weapon heat (`HeatTrackingBVCalculator.java:59-61,73-77`).
After arc weighting, the shared `battleValueHeatTracking` owner sorts zero-heat
weapons first, then descending BV, with lower heat breaking BV ties. The weapon
that reaches or crosses efficiency stays full; subsequent weapons contribute
half (`HeatTrackingBVCalculator.java:108-147`). Raw arc values stay unchanged.
Contract, unit and customizer inputs use the existing heat-dissipation owner;
absent cooling preserves legacy behavior. Catalog heat/mount modifiers, ammo
valuation and final modifiers remain independent residuals. Regression coverage:
`aerospaceBV.residual2Parity.test.ts` (five SmallCraft, Dragonfly, Goth B,
Dragonstar, cooling transport, bypass, ordering and cutoff boundaries).

## Ordinary aircraft Artemis links

The shared equipment link owner now supplies the existing IV/V modifier to
ASF/CF/FWS/SmallCraft, before direction selection, arc weighting and heat.
Unweighted raw arc BV includes the linked modifier. One compatible launcher
per controller at the same normalized physical location; Streak and absent
catalog variants remain unlinked. Ammo BV and caps retain their current policy.
Enforcement: `aerospaceBV.residual3Parity.test.ts` pins Ogotai A and Tyre 3
weapon pools, source-order links, location isolation and pre-heat modification.

## Native fixed-wing support admission

`FixedWingSupportUnitHandler` owns FWS admission/validity and keeps the existing
conventional-fighter persistence identity plus `isFixedWingSupport` (FU57/61).
The registry selects it by native source family before mapped-type lookup.
Positive source mass through 200 t is allowed; small is <5 t, medium <=100 t
(`FixedWingSupport.java:325-349`, `TestSupportVehicle.java:90`, pinned 48fcb2f6).
Conventional-fighter admission and limits remain separate.

`fixedWingSupport.ts` checks maritime lifeboats against the amphibious chassis,
and a supported slot lower bound: represented weapon/CASE costs, distinct ammo
kinds/racks, BAR-10 E/F armor, and `5 + floor(tons/10)` capacity. Other misc,
crew and transporter slots remain unrepresented, rather than assuming Mek
critical slots are SV slots (`TestSupportVehicle:1027-1038,1110-1116,1570-1655`).
Thunderbolt 20 uses its native five slots; no catalog is edited.

FWS BV uses the FU57/61 `isFixedWingSupport` family marker across all sizes
(`FixedWingSupport.java:130-138`, factory `BVCalculator.java:103-119`, pin
48fcb2f6). The BV adapter combines this marker with the legacy support hint.
BAR/10 scales armor before the support type factor of one; zero BAR is retained
(`BVCalculator.java:426-463`, `AeroBVCalculator.java:118-138`). Native and canonical
contract inputs both carry BAR to this owner.

Source ammo classification survives catalog aliases. Ammo is excluded from the
forward/rear weapon pool, accumulated by native ammo type/rack and capped by
matching weapon BV before speed (`BVCalculator.java:1045-1091,1190-1247`). The
existing exact-key ammo API remains the non-FWS compatibility path. The shared
support fire-control owner in `vehicleBVOffensive.ts` supplies basic/advanced/no
FCS factors to both weapons and capped ammo (`BVCalculator.java:966-976`).

Unresolved prototype weapons remain unresolved. Correct BAR can expose their
previously compensating armor error; evidence names every farther total and
enforces that no exact aerospace result loses exactness. Catalog values and
introduction years remain with their data owners.

capitalStructure owns KF drive mass and KF/sail integrity from Jumpship.java:806-818,849-855 and Warship.java:120-134 at 48fcb2f6. Source weight reuses the drive mass table with its existing default range; capital sheets pass the actual primitive jump range. DropShips have no KF/sail integrity; stations have no KF drive. largeAerospaceMountArc is the common physical/rear arc boundary for BV and sheets; groupLargeAerospaceMounts preserves source bay markers and equipment order without catalog aliases.

### Fixed-wing support editor facts (UL-15)

The existing chassis section transports canonical BAR, structural and engine tech ratings through the aerospace store, browser draft and shared serializer. Absent ratings remain Unknown; no catalog ratings are invented. Fire-control classification delegates to the shared support BV owner (BVCalculator.java:966-976). `getFixedWingSupportLimits` and `validateFixedWingSupportTonnage` share FixedWingSupport.java:325-349 / TestSupportVehicle:1570-1655 limits with source validation; the component contains no tonnage or slot formula. BAR choices come from the existing support armor table.

## Capital catalog valuation

The equipment catalog owns BV and heat; `capital-bv.json` supplies native capital/sub-capital flags, range attack values, and ammo enum/rack keys. Matching existing IDs retain their values and share the native facts only when name, BV, and firing facts agree. `getLargeAerospaceAmmoBVGroup` adds capital keys to the large-craft path and reuses the ordinary ammo-group owner. LargeAeroBVCalculator.java:69-122,293-358 caps ammo separately per arc and multiplies whole-ton shot ratios. BVCalculator.java:800-914 uses weapon BV without a capital damage multiplier. MiscType.java:9467-9529 and BVCalculator.countMiscAsOffensiveWeapon exclude mobile HPG from offense. Screen launchers/ammo and unsupported links still withhold complete scope. The three catalog traces pin full weapon, ammo, defense, offense and rounded totals from L-ORC2.

Ordinary large-craft weapons and bins share `getNativeAmmoBVGroup` enum/rack
keys, including generated Clan/Artemis bins, MG, ATM, HAG, Streak, extended
LRM and artillery. Legacy alias-key APIs remain separate. Heavy lasers and
artillery use their catalog BV and existing heat resolver, just like other
admitted weapons (LargeAeroBVCalculator.java:85-142; BVCalculator.java:804-914,
pin 48fcb2f64). Bay markers retain the first weapon, quantities remain shots,
and ammo caps remain per arc. Screen defense, defensive quantity multipliers,
unsupported hull mounts and linked modifiers still withhold complete scope.
`largeAerospaceNativePools.test.ts` pins Aqueduct, Buccaneer Rezak and Mule C
against the source-hash-joined UL-16b Java oracle.

## Ordinary aircraft small cockpits

The contract adapter preserves native cockpit identity; the aerospace adapter
recognizes native SMALL and the editor Small enum. The calculator applies the
shared small-cockpit modifier to the sum of defense and offense, rounds base,
then uses the shared pilot adjustment. Both raw pools remain unchanged.
MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587, AeroBVCalculator.java:162-180
and BVCalculator.java:1252-1294 own this order.
Enforcement: aerospaceBV.smallCockpit.test.ts covers native Cheetah, editor
transport, standard/primitive compatibility and the base/pilot rounding seam.
Console and drone summary handling remain separate unresolved parity classes.

Ordinary aerospace adds undamaged modular armor capacity before armor BV
multipliers, BAR and aircraft type scaling. Canonical mount identity and the
ten-point rule use battleValueDefensive.ts; other mounted defense rules do not
change. aerospaceBV.modularArmor.test.ts pins native Drake, Omni aliases,
support BAR ordering and the no-modular-armor path. Patchwork is separate.

The pure aerospaceBVCalculations owner supplies final summary and crew rounding
to ordinary small cockpits and large craft. Existing exports remain facades.
The trace adapter optionally accepts actual base/summary facts; omitting them
preserves its prior compatibility output. Java pin 48fcb2f64:
BVCalculator.java:1252-1294,1307-1313; AeroBVCalculator.java:162-180.
Enforcement: aerospaceBV.summaryOwner.test.ts and all-family report equality.

Positive offensive miscellaneous mounts enter the equipment stage after weapon
direction and heat, before speed (BVCalculator.java:990-1038, pin 48fcb2f64).
Controllers remain input facts and are collected before misc exclusion. Physical
ammo never becomes misc. Explicit offensiveEquipmentBV overrides the automatic
sum. Command consoles share the small-cockpit summary owner; actual summary
facts reach bvTrace without changing the neutral compatibility subtype field.
Enforcement: aerospaceBV.miscConsole.test.ts, native Hellcat and Zhen Niao.

Native aircraft adapters expose every physical ammo bin separately. With an
explicit ammo list, ordinary aircraft exclude those bins from arc dominance
and heat, then use native type/rack caps before speed. Ammo omission retains
the legacy flat equipment contract. Support FCS/eligibility guards remain.
Source pin 48fcb2f64: BVCalculator.java:936-963,1045-1091,1190-1247.
Enforcement: aerospaceBV.ammoPartition.test.ts and all-family comparison.

Patchwork transports current per-arc points and native armor codes through
contract and editor adapters. Each represented physical arc adds local modular
capacity before its native multiplier, BAR and aircraft type scaling. Capacity
at a zero-armor location still counts. Missing arc facts retain the legacy
total-armor path. Numeric codes use the shared defensive owner, independent of
editor enum ordinals. Source pin 48fcb2f64, BVCalculator.java:350-420.
Enforcement: aerospaceBV.patchwork.test.ts and catalog printing source-owner BV.

## Ordinary aerospace weapon diagnostics

The arc owner retains admitted physical weapon identities and actual values
after links, direction and heat. The offensive owner applies its existing
support fire-control factor to these diagnostic values before speed. The trace
only formats the supplied facts as `weapon.<local index>.<physical location>.<local id>`;
it does not reconstruct mounts, infer Java equipment identities or calculate BV.
The existing comparator folds both sides by physical location and multiplicity.
Absent facts remain absent; ammo and defensive/misc equipment do not become weapons.
Scalar aggregation order, native ammo ownership and final rounding remain unchanged.
MegaMek 48fcb2f64: AeroBVCalculator.java:147-155,
HeatTrackingBVCalculator.java:108-126 and BVCalculator.java:800-919,966-976.
Enforcement: `scripts/__tests__/unit-bv-aerospace-terms.test.ts`, 620-source
byte-preservation captures and the guarded all-family per-term comparison.

## Ordinary aerospace ammunition diagnostics

The ammo calculation owner retains uncapped bin availability and raw launcher
caps before direction, heat, support fire control and speed. Native type/rack
identities come from the shared ammo owner, including its supplemental diagnostic
identities; they do not expand legacy arithmetic matching. Defensive launcher
caps remain diagnostic facts outside offensive ammo arithmetic. One-shot launchers
and unresolved identities do not invent caps. Explicit empty ammo lists retain
represented caps; omitted ammo retains the legacy trace. The trace only formats
the supplied pools as `ammo.available.<group>` and `ammo.cap.<group>`.
MegaMek 48fcb2f64, BVCalculator.java:1189-1242.
Enforcement: `scripts/__tests__/unit-bv-aerospace-terms.test.ts`, including an
availability-clipped-to-cap mutant, 620-source byte-preservation captures and
the guarded all-family comparison. Existing A1 weapon terms remain unchanged.
