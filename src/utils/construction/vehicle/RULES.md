# Combat-vehicle construction rules

## Defensive BV type modifier

`vehicleBVTypeModifier.ts` owns the motion-type defensive multiplier and its
chassis-equipment additions. `vehicleBVDefensive.ts` applies it to the entire
armor + structure + defensive equipment - explosive penalty pool, before the
separate TMM factor: tracked 0.9, wheeled 0.8, hover/VTOL/WiGE 0.7, all others
0.6. Non-support vehicles add 0.2 per fully amphibious mount or 0.1 per limited
amphibious, dune buggy, flotation hull, environmental sealing or armored motive
mount. Additions can exceed 1; support vehicles receive only the motion base.

Pinned [CombatVehicleBVCalculator.java:83-108](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/battleValue/CombatVehicleBVCalculator.java#L83)
defines the stage; inherited
[BVCalculator.java:274-280](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/battleValue/BVCalculator.java#L274)
orders it before TMM. Adapters carry all mounted IDs and support identity.
The store's sealing/flotation flags represent the same installation as a
matching mount and are counted once. Generic `isAmphibious` is insufficient
to distinguish full/limited/SV equipment, so only identified mounts add BV.

`vehicleBV.defenseParity.test.ts` enforces every motion base, mounted bonuses,
support exclusion and store/contract transport. Tamerlane's isolated defense
becomes 136.5, versus Java 141.75: structure and TMM still differ. Armor/BAR,
structure, equipment partitioning, explosive penalties, TMM and all offensive
rules remain separate terms; this correction does not establish whole-unit parity.

## Turret armor lifecycle

`armor.ts` owns the installed-turret armor projection and total. The state
module retains a compatibility export; the status bar uses the same projection
for BV input. Selecting None clears both configurations and both allocations.
Installing a previously absent turret starts its armor at zero; editing an
installed turret preserves armor. Hull, body and rotor values are preserved.
Real store save/reopen tests enforce the removal and BV armor-input agreement.

Pinned MegaMekLab `62bf19360382049e2e6a1e8f24e859e27bdc5878`,
[CVStructureTab.java:272](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/ui/combatVehicle/CVStructureTab.java#L272)
unallocates removed mounts; lines 285-292 initialize armor to zero and
[769-793](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/ui/combatVehicle/CVStructureTab.java#L769)
remove both turrets for None. MekStation's fixed-key map clears removed armor
immediately so removal survives serialization and reinstallation.

Equipment unallocation remains unimplemented: upstream retains mounts at
`Entity.LOC_NONE`, while the canonical spec's Body relocation is obsolete.
This bounded fix preserves equipment and does not certify equipment effects
on weight, heat or BV. Legacy inconsistent turret configurations, primary
Dual versus the separate secondary toggle, and full mount-state validation
remain separate work. No catalog data is migrated or regenerated.

## Offensive BV mass contribution

`vehicleBVOffensive.ts:calculateVehicleOffensiveBV` owns the offensive mass
contribution: add raw tonnage / 2 to weapon, capped ammunition and offensive
equipment BV, then apply the speed factor. Do not round tonnage or require
weapons. Tank, SuperHeavyTank, VTOL and support vehicles use this same term;
BAR and defensive type modifiers do not scale the mass contribution.

Pinned MegaMek [CombatVehicleBVCalculator.java:139-144](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/battleValue/CombatVehicleBVCalculator.java#L139)
adds `entity.getWeight() / 2`.
[BVCalculator.java:283-291](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/battleValue/BVCalculator.java#L283)
places it before speed. Its factory selects the same calculator for these
Tank subclasses. None overrides
[Entity.java:2033-2035](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Entity.java#L2033),
which returns raw loaded tonnage.

`vehicleBV.massParity.test.ts` enforces Tamerlane's Java offensive component,
unarmed Ferret VTOL mass and fractional support mass. Other offensive terms,
defense and final rounding retain their existing rules. Complete unit parity
and the separate sponson multiplier remain unresolved.

## Turret weapon BV

`vehicleBVOffensive.ts` owns the turret weapon BV modifier. Single, Dual and
Chin turrets receive no rotating-turret bonus. Turret weapons remain exempt
from the rear-facing penalty. The BV dialog consumes `turretModifier`, so it
remains a compatibility breakdown field with value 1 for these turret kinds.
Sponson's separate 1.025 term is unchanged and is not covered by this parity claim.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`CombatVehicleBVCalculator.java:123-125` excludes both turret locations from
the nominal rear filter. Inherited `BVCalculator.java:803-907` applies weapon
modifiers without a turret bonus; its `arcFactor` at lines 779-781 returns 1.
`vehicleBV.turretParity.test.ts` checks the Tamerlane (Flamer) contract fixture
(UL-16 Java total 436) and each ordinary turret kind. Other vehicle BV terms
still differ; a neutral turret factor does not establish whole-unit parity.

The contract BV adapter preserves the existing Vehicle, SuperHeavyVehicle and
VTOL location enums for armor and equipment, including six-side and Rotor keys.
This vocabulary mapping changes no BV arithmetic.

`equipmentMounts.ts` owns the combat-vehicle import mount flags and primary
turret inference. Nonempty `Turret` / `Turret Equipment` blocks, a Turret armor
value in the source layout, or an explicit turret type install a primary turret;
a Turret 2 armor value makes it dual. `Rear Turret` equipment is turret-mounted,
not rear-facing (`Tank.java:127-130`). Sponson and secondary-turret blocks carry
mount flags independently; neither alone installs the primary turret. Explicit
dual/chin and the existing fallback to single are preserved for BLK imports.
The contract BV adapter uses this same owner, translating `SPONSON` to a
sponson mount label while keeping its body location. Its boundary requires
cruise/flank or safe/max thrust and the applicable armor allocation map;
absence throws, while explicit zeros and empty maps remain valid source facts.

`engine.ts` owns combat-vehicle rating and installed-weight derivation.
`suspension.json` owns the suspension table facts consumed by TypeScript and
`scripts/megameklab-conversion/combat_vehicle_engine.py`. Python is a conversion
adapter, not a second table authority. Tracked, rail and maglev use the upstream
default suspension factor zero.

Pinned source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:

- [Tank.java:1678](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Tank.java#L1678)
  gives movement/tonnage suspension thresholds and extensions. The naval
  extension is literally `ceil(tons / 10) + ceil(tons / 10) % 5`; do not replace
  it with conventional rounding to five.
- [BLKTankFile.java:155](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/loaders/BLKTankFile.java#L155)
  subtracts suspension from cruise times integer tonnage, clamps to at least 10,
  then rounds upward to five. Zero cruise with explicit no engine yields zero.
- [Engine.java:396](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/equipment/Engine.java#L396)
  owns the previously corrected installed-weight rounding, shielding and minima.
- [Tamerlane BLK](<https://github.com/MegaMek/mm-data/blob/50f7efef0c9f775b0258f8283525ed4f906e1985/data/mekfiles/vehicles/3075/Tamerlane%20Strike%20Sled%20(Flamer).blk>)
  identifies Magna 155: `20 * 12 - 85 = 155`, installed weight 8.5 tons.

The real store derives rating on cruise, tonnage and motion changes. Its rating
editor adds suspension back before deriving cruise. Rounding/minimum ratings
can represent more than one movement value; the inverse selects the greatest
integer cruise admitted by that rating. The existing tonnage-edit 10..400 clamp
is preserved; other derivations retain ratings above 400 for validation.
The status bar consumes stored rating; validation independently uses the owner.
Combat vehicle and VTOL import/weight/cost callers use the same rating owner;
their other existing approximate weight/cost rules are not corrected here.

Tank import preserves the independent raw engine code and trailer flag.
`BLKFile.NONE` (8), with zero cruise, selects the no-engine rating exception;
trailer identity never selects it. The handler translates that fact once for
parse, weight and cost callers. The shared BLK facts adapter resolves known NONE to `null` at the installed-engine
boundary, preserving raw code 8 and independent Clan context on loaded entities.
Unknown and unsupported codes retain errors; neither becomes absence or fusion.
The mass owner returns exactly zero for null before table lookup, shielding,
fission or hover minima, even at a positive rating. Positive-cruise NONE retains
the loader-derived rating and receives a separate construction legality error.
The store's `EngineType` currently represents installed engines only, so
engine-less store designs are not supported; a trailer with any representable
engine retains minimum rating 10. The tonnage-edit clamp remains unchanged.
BLKVTOLFile lacks Tank's NONE exception: the generic converter's engine-less
zero-cruise VTOL case remains a disclosed loader-family gap, not proven parity.

`engine.ts:computeStoredVehicleEngineRating` owns effective support ratings:
`min(maxRating, tonnage * cruiseMP)`, preserving fractional tonnage without
suspension or rounding to five. `supportEngine.json` owns the limit; the Python
`combat_vehicle_engine.py:support_engine_rating` adapter consumes it for all three support BLK families.
The supplied Java oracle's 227 support rows agree with this formula, including
the 500 cap. `engine.ownerAwareRating` is effective; `engine.rating` is the stored
zero sentinel. The serialized engine rating is a number so this effective value
can cross both schema boundaries. Handler parsing, approximate weight/cost and store derivations use
the owner. Existing imported/saved catalog ratings are not migrated on load.
Support identity survives motion edits. Other support UI and construction
approximations remain outside this rating correction.
The converter's support-VTOL discriminator and broader BLK engine ordinal
semantics remain separate work; this slice adds no engine-code table.

`equipmentMounts.ts` owns imported primary turret configuration; the shared BLK
adapter supplies installed armor locations and occupied equipment blocks.
SupportTank and LargeSupportTank retain single/dual turrets even with zero armor;
SupportVTOL retains a chin turret with the existing 180-degree arc. The legacy
10%-tonnage capacity remains a separate defect. VTOL handler weight classes use
the existing shared unit classifier, whose thresholds are unchanged. Handler
fidelity and Python support-engine regression tests enforce these boundaries.

`controlsLift.ts` owns controls and lift/dive mass (standard combat construction
ceilings): controls = upward-half-ton-rounded tonnage / 20, unless explicit
`hasNoControlSystems` is true; lift = upward-half-ton-rounded tonnage / 10 for
HOVER, VTOL, HYDROFOIL, SUBMARINE and WIGE only. NAVAL has no lift term.
`weightComposition.ts` composes these with the existing component owners;
the former status-bar utility is a compatible re-export. Validation calls the
same controls/lift owner with the same family, motion and no-controls context.

Pinned [TestTank.java:229-250](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/verifier/TestTank.java#L229)
uses `ceilMaxHalf` for both terms.
[BLKTankFile.java:268-270](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/loaders/BLKTankFile.java#L268)
sets no-controls from the tag's **presence**, including a zero payload;
[Tank.java:268](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Tank.java#L268)
defaults it to false. Store creation accepts the explicit fact and persists it;
legacy saves without it retain standard controls. This slice does not connect
BLK raw tags to store creation: that import boundary still needs to preserve
presence semantics, rather than parse the payload as a boolean.

Support identity explicitly excludes these new combat terms; zero here means
legacy behavior, not zero actual support controls/lift mass or support parity.
Tamerlane at rating155 independently has engine8.5, controls1, lift2,
structure2, armor3, weapons3 and turret0.5 = 20 tons. Its additional heat-sink
mass is zero in the pinned runtime reference; general vehicle heat-sink rules
remain unresolved. No stored catalog ratings are migrated. Turret rules,
full BV parity and broader construction validity remain separate work.

Focused enforcement: `useVehicleStore.suspension.test.ts` exercises the real
Zustand actions, pinned thresholds, validation, direct import and actual Python
converter output. `test_vehicle_suspension.py` covers converter rounding and
support exclusion. Construction, store, status bar, handler and BV regressions
must accompany changes. No complete corpus numeric-parity gate is claimed.

## Ordinary turret mechanism mass

`turret.ts:computeTurretWeight` owns the default half-ton-rounded 10% mechanism
mass for each ordinary Single, Dual or VTOL Chin turret. The caller supplies
resolved qualifying equipment mass and adds the independently rounded turret
results. Weight composition excludes ammunition from the mechanism basis while
retaining it in total equipment mass. Validation and Weight Free consume this
same owner; no equipment-count estimate is introduced here.

Pinned MegaMek [TestTank.java:178-226](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/verifier/TestTank.java#L178)
defines both mechanisms. [TestEntity.java:147-150](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/verifier/TestEntity.java#L147)
routes combat VTOLs through TestTank, and MegaMekLab
[CVChassisView.java:297-300](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/ui/combatVehicle/CVChassisView.java#L297)
labels their installed turret Chin. There is no separate 5% chin rule.
The pinned Java runtime returns a 1-ton mechanism for a synthetic source-loaded
Ferret with a resolved 7-ton PPC in its chin, and independently returns 0.5 tons
for each of two 2.5-ton turret loads. The synthetic designs are invalid; these
observations certify individual terms, not valid designs or whole-unit parity.

This owner still lacks explicit Omni base-chassis mechanism allowances and
support-specific rounding. Sponson behavior is unchanged and unverified here.
Primary patchwork armor-mount exclusion and upstream secondary/Omni asymmetries
need richer resolved equipment facts before integration. Missing equipment
resolution still counts as zero in legacy composition and is not parity-ready.
The generic 10%-tonnage `maxWeight` capacity, equipment-count display, and
handler approximations remain separate tracked defects; they are not actual
Omni mechanism allowances. No catalog data or BV arithmetic changes here.

## Base flank movement

`engine.ts:computeFlankMP` owns unmodified vehicle flank MP: cruise times 1.5,
rounded upward. [Entity.java:4004-4016](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Entity.java#L4004)
provides the base rule; [Tank.java:1570-1575](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Tank.java#L1570)
adds a separate armed-MASC override. The store helper is a compatibility export
of the owner. Defaults, actions, validation, BV state adaptation, status and
template displays consume it. Vehicle, VTOL and support imports retain their
previous ceil results; the support import's nonpositive guard remains intact.

The store factory derives flank from initial cruise after defaults and saved
fields merge, so reopening, duplication and direct initialization cannot retain
default or stale flank values. The persisted document keeps cruise as the source
of truth. `useVehicleStore.flank.test.ts` exercises real registry save/reopen,
duplication, rating edits and record-sheet movement transport. Component tests
cover full/compact status and odd-cruise new-unit templates.

The generic 'Mech run helper has a separate nonpositive-input guard. ProtoMek
movement enhancements are a distinct policy (`ProtoMek.java:612-616` booster
override). Python BLK conversion already rounds upward; it retains its
language-boundary expression. No copy of the old floor-based vehicle
construction calculation remains. In-play flank after motive damage
(`utils/gameplay/motiveDamage.ts` `computeEffectiveMP`) calls the owner on the
reduced cruise: MegaMek subtracts motive damage from cruise in `Tank.getWalkMP`
(`Tank.java:397`), and `Entity.getRunMP` then rounds up (`Entity.java:4016`).
The same upstream rule still floors outside this owner, as separate follow-ups:

- Aerospace max thrust (`aerospace/thrustCalculations.ts`, the aerospace
  store, handlers and spec, and the new-unit template display in
  `NewTabModalNewMode.tsx:163`). Airborne `Aero.getRunMP` delegates to
  `Entity.getRunMP` (`Aero.java:1656-1658`), and MegaMekLab derives Flank MP and
  Max Thrust from one `Math.ceil(walk * 1.5)` (`MovementView.java:295`).
- BattleMech run MP in `services/construction/CalculationService.ts`
  `calculateMovement`, which feeds customizer BattleMech BV.

ProtoMek run MP already rounds upward in `protomech/movementCaps.ts`.
Boosters, modified cruise, rail/zero-MP BV special cases and complete BV parity
remain separate work. This correction establishes only base movement and its
propagation. It does not regenerate or migrate unit catalogs.
