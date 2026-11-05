# Combat-vehicle construction rules

## Shared unit/size-dependent equipment mass

`variableEquipmentMass.ts` owns the existing support variable rules for MASH,
drone systems, booby traps, cargo, communications and fire-control mass. It calls
the formula registry for supported generic formulas; there is no second formula
copy in the support consumer. Source `:size:` metadata is an input to the owner.
Fixed zero and unsupported variable formulas remain distinct; callers preserve
their existing unsupported-rule policy. Small support uses kilogram rounding;
combat components use half tons. MegaMek 48fcb2f6, MiscType.java:700-730,820-842
and RoundWeight.java:58-68 own these terms. Weapon-basis computer mass remains
its separately gated correction.

## Linked thermal load

`mountedWeight.ts` uses the existing native pairing owner in
`equipmentBV/weaponLinks.ts`. Insulators prefer the immediately preceding
eligible laser, then the first unlinked laser at the same location. RISC modules
occupy the same link slot. Capacitors use the shared PPC compatibility/year gate.
The running weapon-heat sum subtracts one for a linked insulator, restores one
when the sum reaches zero, and adds five for a linked capacitor. Engine-free
sinks are subtracted afterward by `weightComposition.ts`. This preserves the
pinned running-total guard rather than replacing it with a per-laser clamp.
Sources: MegaMek 48fcb2f64a1b, MekFileParser.java:360-388,472-495 and
TestEntity.java:945-966. Complete handler weight remains unavailable.

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
support exclusion and store/contract transport. Tamerlane's defense with the
corrected structure and TMM factor is 141.75, equal to Java. Armor/BAR,
structure, equipment partitioning, explosive penalties and all offensive
rules remain separate terms; this correction does not establish whole-unit parity.

## Defensive BV movement factor

`vehicleBVMovement.ts:calculateVehicleBVDefensiveTMM` owns defensive BV TMM selection; the shared
`constants/movement.ts` owns the standard brackets. Assembled `flankMP` is
Java's run MP, not cruise or submarine depth MP. Positive run adds one for
VTOL or WiGE (exactly one for VTOL); positive jump adds one independently.
Zero run/jump contributes zero, including stealth/airborne bonuses. Uniform
stealth adds two to each nonzero mode; patchwork does not. The represented
armor name or pinned numeric codes are classified once by `hasVehicleStealth`;
adapters transport that fact without changing armor valuation. Converter
armor-name losses and assembled MP adjustments (MASC, hardened armor and
mechanical jump boosters) remain upstream input-fidelity limits.

`vehicleBVDefensive.ts` applies `1 + max(run TMM, jump TMM, 0) / 10` to the
type-modified defensive pool without rounding. Only the existing final BV
rounding follows the sum with offense. Submarine depth MP still feeds the
existing offensive speed rule, which is outside this correction.

Pinned sources: `CombatVehicleBVCalculator.java:56-80`,
`BVCalculator.java:324-334,650-687`, `Compute.java:3099-3147` and
`Entity.java:16132-16136` at the MegaMek pin above. Java's base run is
`ceil(cruise * 1.5)` (`Entity.java:4004-4016`), with an armed-MASC override in
`Tank.java:1570-1575`; TMM consumes supplied assembled run rather than deriving
it again. `vehicleBV.tmmParity.test.ts` covers brackets, airborne/zero guards,
jump comparison, represented stealth and fractional defense. The acceptance
comparison asserts equality outside TMM, factor, defense and final across all
1,419 combat/support rows and explains each total moving away from Java.

The public `calculateVehicleTMM` compatibility helper retains its existing
effective-MP/submarine override, unconditional VTOL running bonus and shared
positive-only jump guard (including NaN rejection). Its facade exports and the
shared construction, validation and gameplay entry points remain unchanged.
`battleValueMovement.test.ts` pins those contracts independently of defensive BV.

## Catalog combat adaptation

`CompendiumAdapter.vehicle.ts` transports vehicle contracts through the shared
contract mapper and BV dispatcher. Installed armor names also select structure
locations, including zero armor turrets, rotor and six-side hulls; each uses
`computeVehicleLocationStructurePoints`. Flank MP uses `computeFlankMP`.
`vehicleInit` enters GameCreated through the engine seed splice. MotiveDamaged
replays through `applyMotiveDamageToState`; notifications alone do not mutate it.

## Structure BV

`structure.ts:computeVehicleBVStructurePoints` owns installed-location internals
for BV. Each non-body location has `ceil(tonnage / 10)` points: four hull
locations for Tank, six for SuperHeavyTank/LargeSupportTank, plus installed
turrets and a VTOL rotor. Zero armor does not remove a location. Handlers and
the contract adapter preserve the source layout before fixed-key armor maps
add placeholder locations; legacy inputs fall back to chassis/turret metadata.
The construction weight/maximum-armor table has a separate contract.

`vehicleStructureBVType` transports numeric structure codes to the existing
shared `getStructureBVMultiplier` table: industrial/composite 0.5, reinforced
2, otherwise 1. `vehicleBVDefensive.ts` multiplies total points by 1.5 and this
multiplier, adding 0.2 to the multiplier for installed Blue Shield. Construction
inputs describe working equipment; runtime damage is outside this contract.

Pinned MegaMek sources: `Tank.java:537-542,1607-1616`,
`SuperHeavyTank.java:333-338`, `VTOL.java:734-736`, `Entity.java:4724-4732`,
and `BVCalculator.java:492-512` at the pin above. CombatVehicleBVCalculator
inherits processStructure. `vehicleBV.structureParity.test.ts` enforces
Tamerlane's 15 structure BV and 141.75 defense, installed layouts, fractional
tonnage, source types, store fallback and Blue Shield. The 1,419-row comparison
checks Java internals and structure BV, equality of every unrelated output,
and explains each total moving farther from Java. Whole-unit parity remains
separate.

## Armor BV

`vehicleBVDefensive.ts` owns original, undamaged armor BV. It reuses the shared
armor multiplier table after normalizing native codes and converter names.
Pinned `BVCalculator.java:359-463,1489-1510` values uniform armor or patchwork
locations at 2.5 times type multiplier times BAR/10, without intermediate
rounding. Turret and rotor armor count normally; missing patchwork types fail.
Uniform support armor without a source BAR retains Java's zero BAR default.
Blue Shield adds 0.2 before local HarJel II/III factors 1.1/1.2. Each undamaged
modular mount adds 10 armor points. Adapters transport facts without pricing them.
Patchwork conversion follows `BLKTankFile.java:284-325` and
`BLKFile.java:484-529`, including support location BAR overriding its type tag.
The existing uniform total/legacy fallback remains the adapter's contract.

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
remains outside this term's parity claim.

## Turret weapon BV

`vehicleBVOffensive.ts` owns the turret weapon BV modifier. Single, Dual and
Chin and Sponson turrets receive no rotating-turret bonus. Ordinary Tank turret
weapons remain exempt from the rear-facing penalty. The BV dialog consumes
`turretModifier`, so it remains a compatibility breakdown field with value 1
for these turret kinds. Sponson equipment receives no separate 1.025 multiplier.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`CombatVehicleBVCalculator.java:126-129` excludes Tank's numeric turret indices
5/6 (`Tank.java:128-130`). On SuperHeavyTank and LargeSupportTank these indices
mean Rear Left/Rear, while physical turrets occupy 7/8
(`SuperHeavyTank.java:69-74`, `LargeSupportTank.java:68-72`). Their physical
turrets can therefore receive nominal-rear weighting when front BV is smaller
than rear BV (`BVCalculator.java:690-700`). The owner decides this exemption
once; weapon valuation applies the resulting half factor without another
physical-turret guard (`BVCalculator.java:834-837`).
`vehicleBV.superheavyRearParity.test.ts` enforces Destrier's Java 2551 BV,
both six-side turret locations, index exemptions, and front/rear ties.
Inherited `BVCalculator.java:803-907` applies weapon
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
The same owner reads native `(R)`, `(ST)`, `(PT)` and `:OMNI` mount decorators
for editor hydration; the shared equipment normalization owner strips these
decorators for ID lookup. VTOL turret mounts retain chin identity. Tank, VTOL
and support handlers share this policy with the editor mapper. Mount decorators
precede optional `:SIZE:` and `:Shots` qualifiers in the pinned BLK loader.
The contract BV adapter uses this same owner, translating `SPONSON` to a
sponson mount label while keeping its body location. Its boundary requires
cruise/flank or safe/max thrust and the applicable armor allocation map;
absence throws, while explicit zeros and empty maps remain valid source facts.

`turret.ts:getInstalledVehicleTurretType` projects the explicitly installed
primary/secondary configurations into a layout. A primary DUAL label without
an installed secondary projects as Single; an orphan secondary does not invent
a primary. These compatibility projections do not certify saved-state validity.
Both preview paths share a reactive store projection that passes the explicit
layout and distinct armor keys to printing; zero armor never removes a turret.
The printing location tuple owns its union, schema membership and ordering.

Pinned MegaMek [Tank.java:120-130](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Tank.java#L120)
defines primary as rear and secondary as front on dual-turret tanks. Printing
therefore binds `Turret` to TU and `Turret 2` to FT in the supported assets,
independently of array order. The checked mm-data asset revision is
`b67baa5ecc765435425fd8cb703a6da909478b7a`, separate from the unit-source pin;
these templates retain TU for rear while newer MegaMek code calls it RT.
Chin/primary VTOL armor uses TU independently of rotor RO. Extraction and
template selection reject dual VTOLs. Existing renderer fallback behavior,
font/raster fidelity and physical printing are outside this correction.

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

`mountedWeight.ts` owns resolved equipment grouping: primary mount flags,
secondary location identity, ammunition exclusion from mechanism mass,
qualifying amplifier energy mass, and independently rounded turret mechanisms.
The composition extends its state/result contracts and retains the
EquipmentResolver re-export. This extraction preserves unresolved items as
zero, resolver order and every numeric result; nullable mass remains separate.

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

## Support construction weight

`supportWeight.ts` composes structure, engine, armor, source fuel, payload and
transport terms. `supportPayload.ts` reuses equipment/ammo owners; its citations
cover weapons, misc, ammo, heat sinks, turrets and amplifiers. `supportTransport.ts`
owns bays and crew accommodations (controls). `supportRounding.ts` owns rounding.
The handler stores the total and warns about unresolved mounts/bays, including
missing small-SV infantry/clip metadata. Physical ammo aliases reuse the registry's
half-bin guard; legacy BV resolution stays unchanged. The status bar shares the
chassis owner; its remaining terms are independent.

MegaMek pin above: TestSupportVehicle.java:102-121 (base chassis), 258-294
(modifiers), 539-545 (tech), 754-797 (rounding, fuel and structure);
TestEntity.java:1011-1033 (sum); BLKSupportTankFile.java:96-97 (fuel tons),
Entity.java:13145-13167 (armor). Engine weight reuses `engine.ts`, including
shared size-class thresholds (EntityWeightClass.java:80-97). BAR weight reuses
`armor.ts`. Source fixtures and boundary tests enforce these rules.

## Offensive ammunition groups

`vehicleBVOffensive.ts` selects matching catalog-derived weapon and bin groups
before calling the shared `calculateAmmoBVWithExcessiveCap` owner. Its common
LB-X/Gauss/missile rules are shared with large craft in `battleValueAmmo.ts`;
the large-craft supported subset is unchanged. The shared family normalizer pairs
compact Arrow IV, rotary AC and Gauss ammo identities with their launchers,
MG full/half packaging with the corresponding MG weight class, and ATM/iATM
standard/ER/HE bins with the same rack. LB-X slug and cluster bins share one cap.
The cap uses listed weapon BV, before rear/guidance/TC modifiers. Explicit ammo
family/BV overrides and the existing fallback matching policy remain available.

Pinned MegaMek `BVCalculator.java:1045-1096,1190-1240` defines grouping and the
cap. `AmmoType.java:4117-4131,6183-6333,6582-6702,7051-7072,7182-7204,7311-7333`
defines the represented identities. The source-parity tests cover native Alacorn,
MG APC, Chaparral and Bandit E inputs, plus mixed-bin caps and overrides.
Catalog BV values, missing bins, shot quantities, support fire-control factors
and the deferred vehicle-flamer mapping remain separate concerns. No bin value
is inferred from its packaging or substituted for missing catalog data.

## Support fire control, targeting computers and assembled BV movement

Vehicle mount partitioning uses the shared native ammunition classifier,
including registry identities without "ammo" in their names. Explicit saved
mount kinds still take precedence. C3 remote sensors enter the existing capped
ammo owner with their launcher in C3_REMOTE_SENSOR:1, rather than miscellaneous
equipment. Pin 48fcb2f64: AmmoType.java:13376-13386;
BVCalculator.java:1045-1086. Missing launchers contribute no ammo BV.

`vehicleBVOffensive.ts` applies support basic FCS 0.9 (before advanced),
advanced FCS 1, or absent FCS 0.8 to non-infantry WeaponType mounts and capped
ammo. Resolved miscellaneous equipment receives neither FCS nor TC scaling.
Direct-fire TC 1.25 replaces weapon FCS scaling; ammo still receives FCS.
Weight and offensive equipment are not scaled. Mounted Targeting catalog
entries activate TC. The shared generated native flag owner supplies F_INFANTRY
for resolved weapons; only unrepresented legacy mounts use the caller's fact.
InfantryWeapon.java:83-87 sets this inherited flag. Native same-name BA guns
remain distinct; missing identities remain a catalog boundary gap.
The shared weapon owner retains the existing Mech direct-fire classifier.
Pin: BVCalculator.java:880-887,966-976,1076-1086 at 48fcb2f64a1b.

`vehicleBVMovement.ts:getVehicleBVMovement` assembles undamaged Tank/VTOL
run/jump for defense and offense. Active MASC/supercharger/VTOL jet boosters
use twice cruise; hydrofoil rounds cruise x1.25, dune buggy subtracts one,
and installed vehicle jump jets contribute one MP each. Modular armor is
ignored by BV settings. Trains use adjusted cruise for offensive speed;
original zero-run trailers use one. Jump/2 retains shared Java-style rounding.
Legacy public TMM/effective-MP helpers and submarine override are preserved.
Pin: Tank.java:387-418,1570-1575,2034-2042; Entity.java:4004-4016;
CombatVehicleBVCalculator.java:147-163; MPCalculationSetting.java:123-136.

## Explicit combat Omni mechanism mass

`turret.ts:computeVehicleTurretMechanismWeight` owns assigned versus required
mechanism mass. Explicit nonnegative Omni allowances charge half-ton ceilings
independently, even without installed turrets; absence makes the requirement
zero. Absent/negative allowances derive ordinary mass; non-Omni ignores them.
Compare the rounded requirement to the raw allowance, preserving zero.
Unknown requirements remain unknown even when an assigned charge is known.
Nonfinite, invalid and unsupported Omni support/sponson contexts diagnose
unavailability. Existing support totals and ordinary sponsons remain separate.

`vehicleValidation.ts` exposes dependent completeness and keeps independent
errors while skipping comparisons with unknown operands. `isValid` requires
completeness. Pinned TestTank.java:178-226,237-239,841-888 at 48fcb2f supplies the
rule; richer armor-mount classification and complete parity remain separate.

## Unavailable mounted and represented weight

`mountedWeight.ts` resolves each instance once and retains independent groups.
Missing/invalid mass is null; zero and empty groups stay known. Ammunition and
amplifier classification remain with existing owners. `weightComposition.ts`
preserves current engine/support chassis branches and propagates unavailable
amplifier/remaining terms. Its isComplete flag means represented mass is known,
not full source parity or construction legality. Validation transports that
flag while retaining known errors. The status boundary uses null-safe units;
it does not invent a turret capacity denominator. Projected Java fixtures retain
their 48fcb2f provenance and establish only the documented mechanism terms.

## Imported Combat Turret Installation

The shared equipment-mount owner materializes imported turret configuration.
An accepted armor layout preserves an installed empty primary, secondary or
VTOL chin turret even with zero armor. Only the accepted second slot creates a
separate secondary object; a legacy Dual label alone does not create one.
Existing explicit and nonempty-equipment chin compatibility remains supported.
Raw allowance parsing stays in `projectCombatVehicleTurretSource`; both combat
handlers carry its independent facts and messages without altering the document.
Allowances do not install turrets or make incomplete combat totals available.

## Armor editor subtype projection

`editorArmor.ts` owns the installed location list, labels, editor limits and
summary figures. Six-side hulls reuse BLK_SUPERHEAVY_ARMOR_LOCATIONS
(SuperHeavyTank.java:66-74; LargeSupportTank.java:65-72 at the pin above).
Dual turrets use Tank.java:127-130: Turret is rear, Turret 2 front.
`armor.ts` totals the union of canonical installed locations once, excluding
Body and uninstalled turrets. Six-side controls use the existing tank/support
global armor limit owners; legacy ordinary editor limits remain unchanged.
The four-side auto-allocation action is not exposed for a six-side layout.

## Linked PPC capacitors

Vehicle offense uses equipmentBV/weaponLinks.ts for the first unlinked
compatible PPC at the same location. Capacitors add no flat weapon BV.
The linked native addition follows drone scaling and precedes TC scaling
(BVCalculator.java:845-882; MiscType.java:1322-1347, pin 48fcb2f64).
Contract and editor adapters carry the year for the shared Clan PPC gate.

## Native six-side rear weighting

CombatVehicleBVCalculator.java:123-125 (48fcb2f64) excludes Tank turret
indices 5/6 even on SuperHeavyTank and LargeSupportTank. Those indices are
Rear Left/Rear on the six-side layouts, so their weapons keep full BV.
This preserves the pinned inherited index check, not a physical turret claim.
The existing construction owner supplies the hull classification.

Vehicles call weaponLinks.linkAerospaceMachineGunArrayBVWeapons, the shared
AERO-RES2 owner, for source-order/location/caliber selection and derived array
BV. The vehicle consumer projects that value before its direction/fire-control
modifiers; arrays receive no TC bonus. BVCalculator.java:807-816 and
MekFileParser.java:928-944 at pin48fcb2f64. No second MGA rule is introduced.

Vehicle and ordinary aerospace summaries use calculateBaseBV followed by
calculateAdjustedBV. Chassis/cockpit factors precede the base integer round;
crew skill follows it and receives a final round. Vehicle skill lookup uses
the existing shared table with the same floor and clamp. BVCalculator.java:
1253,167 at MegaMek pin 48fcb2f64 owns this order.

## VTOL jet-booster mass

The shared variable owner maps native vtoljetbooster to the existing registry's
supercharger engine-weight formula. Its generic and mounted consumers delegate
to that same accessory rule; no second 10% calculation is defined. The engine
owner supplies installed mass to total and turret figures, with the existing
small-support rounding preserved. Missing engine context is unavailable.
Pin 48fcb2f64: MiscType.java:518-527; RoundWeight.java:58-68.
This enables the native accessory independently of the held sized-editor work.
