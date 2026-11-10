# Combat-vehicle construction rules

## Native Tank complete-weight transport

`vehicleHandlerWeight.ts` projects parsed Tank construction facts into the
existing `weightComposition.ts` owner. It uses the public BLK armor/engine
decoders and equipment resolver; no component formula or catalog override is
duplicated. Resolved mounts retain native identity/size and ammunition kind.
The existing parsed `armorTechLevel` selects armor side independently of chassis:
levels 2, 6, 8 and 10 select Clan; absent or unknown (-1) falls back to chassis.
This follows `Entity.isClanArmor:1985-1999`, whose concrete-level test differs
from `TechConstants.isClan` used for introduction/slot diagnostics (which also
accepts ALL_CLAN=12). Those separate native contracts are unchanged. Mixed IS
Zephyr EC/Yumi therefore use the existing Clan ferro density of 19.2 points/t,
yielding 7.5/8.5 t armor; no formula, catalog, parser or type changes are needed.
The `hasNoControlSystems` tag transports presence, including a false payload
(MegaMek48fcb2f6 BLKTankFile.java:268-269).

Only a complete finite result replaces the common declared-tonnage placeholder
and populates remaining tonnage before the existing overweight validator runs.
Unsupported native structure/armor, rejected armor layout and unresolved mass
remain unavailable, with no fabricated zero or partial total. The legacy
number-only combat-weight API retains its explicit unavailable error; VTOL and
support handlers are unchanged. Construction-invalid Tanks still parse for
inspection. Complete native family mass parity is a separate claim.

The validation correction requires paired pinned-source acceptance: exactly the
three known genuine overweight corrections, no new native-valid rejection or
lost load, and byte-identical all-family BV under blocking reference trust.
Additional rejection or unsupported weight fidelity stops the slice rather than
being tuned away. MegaMek48fcb2f6 TestTank/TestEntity component quantities and the
original source hashes are retained in `VehicleWeightValidity.pinned.test.ts`.

## Native equipment introduction validation

`equipmentIntroduction.ts` owns the existing shared five-year margin and
equipment-date loop. Aerospace retains its family admission and source-tag
projection. Vehicle `introYear.ts` supplies native mount identities, the existing
tech route and source/build years; combat and support handlers call that owner.
Resolved catalog introduction dates remain authoritative. Ammo, unavailable
dates and inapplicable technology sides preserve the existing aerospace guards.
No validator-side date override table is introduced.

Both native vehicle handlers preserve an explicit `originalBuildYear` and report
equipment that postdates every applicable source year plus the margin. Repeated
mounts report a resolved equipment identity once. Native construction-invalid
designs still parse successfully with validation diagnostics; validity is not
inferred from their loadability or BV.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`TestEntity.java:1487-1512,1611-1618`, `TestTank.java:426-428` and
`TestSupportVehicle.java:1221-1223` define these checks.

## Support engine validation routing

`engine.ts:validateVehicleEngine` takes optional family and engine technology
context. Construction validation and the status bar transport those facts to
the existing effective-rating and installed-engine mass owners. Support
engines use their own rating cap of 500, fractional tonnage and technology
table; the combat 400-rating error remains combat-only. The default context
preserves combat callers. No engine formula, support structure or heat rule,
catalog data, BV arithmetic or complete-weight validity gate changes here.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`Engine.java:396-404,453-474,601-603` defines these support quantities.

## Computer mass and shared reactive armor

`mountedWeight.ts` computes the computer basis from native direct-fire weapons
except tasers, plus RISC modules, and calls the existing variable-formula owner.
Computer mass enters equipment and turret mass before mechanism rounding.
Sources: MegaMek 48fcb2f6, WeaponType.java:2925-2926,
MiscType.java:614-616,12532-12543, TestTank.java:178-226.

`ArmorType.ts` owns the density table and the loader compatibility policy.
Reactive uses the default 16 points/t (ArmorType.java:61,226,301-302,788-826).
The old 14-point density cancels missing computer mass on Hadur LRM; both
corrections must ship together. Heavy/light ferro retain their previous
construction and loader densities until a separate no-regression proof permits
their correction. No authoritative complete vehicle weight check is enabled.

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

The editor and turret panel call the weight owner with installed engine and
weapon mass before resolving variable mounts. Source size uses the shared
unchanged-identity guard. Armored motive systems add 10% Clan or 15% IS mass
with standard component rounding (MiscType.java:607-613). MASH Small has
Java's 4.5 t equipment term; its carrying-space term remains a separate change.

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

## Vehicle-flamer amplifier eligibility

At pin 48fcb2f64 TestTank.java:744-750 excludes VehicleFlamerWeapon from
the power-amplifier basis, independently of display Requires-ammo metadata.
Its three native classes are ISVehicleFlamer.java:52, ISHeavyFlamer.java:54
and CLHeavyFlamer.java:54. The amplifier owner classifies their resolved IDs;
heat-only inputs without IDs use the native type name. Thermal and support
consumers call that same classifier. Ordinary and infantry flamers retain
their separate classification. No catalog values change.

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

## Standard smart robotic control mass

The shared vehicle variable resolver charges standard SRCS at rounded 5% of
unit tonnage from 10 t upward, and zero below 10 t. It owns the formula for
the editor and support consumers; the catalog sentinel stays zero. Improved
and shielded variants are separate rules. Pin 48fcb2f64: MiscType.java:745-767.

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

## Sized liquid-storage mass

Liquid storage shares the existing sized cargo/communications rule in the
variable-mass resolver. Charge component-rounded source size, including
kilogram rounding for small support. No second formula or catalog value is
introduced. Pin 48fcb2f64: MiscType.java:839-840; RoundWeight.java:58-68.

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

Native launcher identities reach the shared cap owner unchanged. Its native
type/rack keys are grouping results, not equipment IDs to parse again:
`GAUSS_LIGHT:0` and `GAUSS_HEAVY:0` must not become `GAUSS:0`. The existing
vehicle group fallback remains for launchers without represented native keys.
Regular Gauss bins therefore cannot borrow a light/heavy launcher's cap.
Pinned MegaMek 48fcb2f64 `BVCalculator.java:1189-1242` supplies separate pools;
`ISGaussRifle.java:75,83`, `ISLGaussRifle.java:73,81` and
`ISHGaussRifle.java:76,87` supply types and listed BV 320/159/346.
`vehicleBV.gaussAmmoPools.test.ts` enforces mixed-caliber separation, duplicate
launcher accumulation and standalone caliber caps. Synthetic Java component
references do not establish source quantities, defensive caps or full parity.

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

## Native sponson mechanism mass

At pin 48fcb2f64, MiscType.java:563-591 rounds 10% of all qualifying
sponson-mounted equipment once, then divides it among installed mechanism
records. Ammo, heat sinks and ArmorType records are excluded from the basis.
The turret owner reuses its 10% mechanism formula; small support uses the
shared component rounding owner. An Omni's explicit baseChassisSponsonPintleWeight
is already an assigned total: divide it without re-rounding. Unknown inputs
remain unavailable. Native mechanisms enter the equipment term (TestEntity.java:631-665).
Legacy configured left/right turret figures retain their separate per-side contract.

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

## Native miscellaneous heat-neutral load

At pin 48fcb2f64, TestEntity.java:971-979 adds MiscType.getHeat() after all
weapon and linked-equipment heat. MiscType.java:1423-1435 returns 20 for the
ground-mobile HPG and 12 for either RISC viral jammer. The mounted thermal
owner applies these native identities after the weapon running-total guard,
then the existing engine allowance decides paid sinks. These are native code
rules; no equipment catalog heat or weight values are edited.

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

## Combat superheavy structure mass

The structure owner uses the existing native superheavy classifier shared with
loading and BV layout. Standard non-naval superheavies use tonnage/5; naval and
submarine standard hulls retain tonnage/10. Superheavy endo doubles its normal
basis; composite retains tonnage/20. Both total composition and validation pass
the installed motion type. Pin 48fcb2f64: TestTank.java:88-95;
Structure.java:75-108; BLKTankFile.java:94-123.

## VTOL jet-booster mass

The shared variable owner maps native vtoljetbooster to the existing registry's
supercharger engine-weight formula. Its generic and mounted consumers delegate
to that same accessory rule; no second 10% calculation is defined. The engine
owner supplies installed mass to total and turret figures, with the existing
small-support rounding preserved. Missing engine context is unavailable.
Pin 48fcb2f64: MiscType.java:518-527; RoundWeight.java:58-68.
This enables the native accessory independently of the held sized-editor work.

## Vehicle jump-jet mass

Vehicle jump jets reuse calculateJumpJetWeight in movementCalculations.ts for the
standard jet tier, through resolveVehicleAccessoryMass. MegaMek 48fcb2f64
MiscType.java:496-497,867-889,2004-2012 charges each mounted jet 0.5 t
through 55 t, 1 t through 85 t, and 2 t above 85 t. The catalog zero remains
a variable sentinel; jet count for BV movement retains its existing owner.

## Vehicle chassis modification mass

The shared variable owner charges rounded tonnage/25 for limited amphibious
chassis and tonnage/10 for fully amphibious or environmentally sealed combat
chassis, using one divisor table and component rounding. Environmental sealing
adds no equipment mass on support vehicles: their structure owner charges it.
Mounted figures consume that same rule before
summing equipment and turret mass, independently of the held sized-equipment
editor integration. Missing context is unavailable, not a fixed zero.
Pin 48fcb2f64: MiscType.java:660-666,702-705; RoundWeight.java:58-68.

## Native VTOL structure mass

Pin 48fcb2f64 VTOL.java:729-730 defines superheavy VTOL mass above 30 t.
TestTank.java:87-95 passes that fact to Structure.java:76-87,102-107:
standard structure doubles; Endo-Steel follows its native superheavy rule,
and Composite retains its existing multiplier. This changes structure mass
only. The Tank layout classifier, rotor locations and BV structure points
remain independent of this mass threshold.

## Support ammunition accounting

`supportPayload.ts` classifies ammunition before weapon categories. Artillery
ammunition uses the Artillery category but enters only the ammo sum, excluding
weapon-dependent fire-control, heat and amplifier bases. Pin48fcb2f6:
TestEntity.java:716-724,753-769. Existing support validity consumes this total;
the combat-vehicle overweight reservation is unchanged.

## Environmental sealing registry mass

`variableEquipmentMass.ts:resolveVehicleAccessoryMass` routes
`environmental-sealed-chassis-registry` through the existing
`environmental-sealed-chassis` rule before both the divisor lookup and the
support guard. Both identities therefore use one mass rule: combat sealing
weighs 10% of vehicle tonnage, rounded upward to a half ton; support sealing
adds zero mounted mass because its chassis structure already accounts for it.
Missing construction context remains unavailable. Catalog records and native
mount identities are unchanged.

At MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`MiscType.java:10270-10281` defines the combat chassis modification and
`MiscType.java:660-666` computes its mass. `RoundWeight.java:56-68` owns
standard rounding, and `TestEntity.java:631-667` sums miscellaneous mounts.
`Tank.java:1878-1879` includes inherent submarine sealing;
`TestTank.java:469-471` rejects an additional sealing mount on a submarine.
This identity fix adds no inherent-sealing equipment charge or legality rule.

`environmentalSealingMass.pinned.test.ts` covers both catalog identities,
rounding, missing context and the support guard, plus the mounted masses
independently probed for the 19 frozen sealing gaps at mm-data `50f7efe`.
The two armor-density gaps and one sponson gap remain separate follow-ups.

## Native Tank armor technology and decorated array identity

At MegaMek 48fcb2f64, construction armor weight uses `ArmorType.forEntity`
(:96-101), which selects with `TechConstants.isClan` (:394-398). Only an absent
BLK armor technology tag inherits the chassis side. Explicit `-1` selects IS,
even on a Clan chassis; Clan levels are 2, 6, 8, 10 and 12. The shared armor
owner supplies this decision to weight, introduction-year and slot callers.
`Entity.isClanArmor` is a different API and is not the weight selection rule.
The base and Bombast Chalchiuhtotolin sources therefore carry 7 and 7.5 tons
of armor, respectively (`TestEntity.java:584-604`; `BLKTankFile.java:284-304`).

Native Tank weight transport reuses the guarded lookup-token owner only for
decorated Inner Sphere arrays (`ISLMGA(ST)` and its `:OMNI` form here; the
whole family is in "Decorated array weight token" below), selecting the ISLMGA identity and 0.5-ton
mass for construction. Public equipment lookup identities remain unchanged,
including the legacy `lmga` target for these decorated inputs. The native
weight selection matches plain
ISLMGA and converted islmgast (`ISLightMGA.java:67-83`). Source tokens, sponson
flags and existing catalog IDs are retained. Clan arrays remain 0.25 tons.

The frozen Myrmidon P (Tate) deficit was two misidentified arrays, not its
sponson mechanism. Its mechanism already weighs 0.5 tons under the aggregate
rule above (`MiscType.java:563-591`). Correcting the arrays makes its equipment
term 11.5 tons and complete weight 40 tons without changing mechanism arithmetic.

## Combat engine heat-sink allowances (pinned)

At pin 48fcb2f64, `TestTank.getWeightHeatSinks` (TestTank.java:264-270)
subtracts `Engine.getWeightFreeEngineHeatSinks` (Engine.java:480-493) from the
heat-neutral requirement (TestEntity.java:945-984) and clamps at zero. The
allowance is 10 for every fusion-class engine (Fusion, XL, Light, XXL, Compact,
Large and the Clan variants), 5 for fission, 1 for fuel cell, and 0 for ICE or
no engine. `weightComposition.ts` matches this table, and a Java sweep over all
1,444 mobile corpus vehicles found no disagreement on count or mass for the
1,150 vehicles that have a complete combat weight. `heatSinkEngines.pinned.test.ts`
pins one real row per engine family, the clamp, non-patchwork stealth (+10),
a PPC capacitor (+5) and a laser insulator (-1).

The only source path into this term is the mount's catalog id, resolved from
its source identity. The sweep found no mount with an unresolved heat value, so
the path loses nothing. Support vehicles are outside this term: Java gives them
no free sinks (TestSupportVehicle.java:917-931), and the support heat term
depends on the 2.2-d support weight model.

## Unknown native Tank structure type (pinned)

Fifty-six Tank sources carry `<internal_type>-1</internal_type>`, which is
MegaMek's `T_STRUCTURE_UNKNOWN` (`EquipmentType.java:138`, 48fcb2f64).
`BLKTankFile.java:169-172` stores the tag verbatim, and
`TestTank.getStructure` (:87-95) maps only `1` to Endo Steel. Every other value,
including `-1`, therefore weighs through the Standard branch of
`Structure.getWeightStructure` (:65-103): tonnage / 10, rounded up to a half ton.

`computeNativeTankWeight` accepts `0` and `-1` as Standard structure. Any other
`internal_type` stays unavailable instead of being approximated: Java weighs `1`
as Endo Steel (a 45 t Bellona: 2.5 t against 4.5 t), and the corpus has no Tank
with any other value. The 56 rows' totals equal the pinned verifier's
`calculateWeightExact` with every component equal, and no validity result moves.
`VehicleStructureUnknown.pinned.test.ts` pins six of them.

## IS Mech Mortar-8 native identity (pinned)

`IS Mech Mortar-8` is the internal name of `ISMekMortar8` (10 t, 5 slots;
`ISMekMortar8.java`, 48fcb2f64). The general normalizer shortens the name to
"is mech mortar", which matches nothing, so Mortar Carrier's three front mortars
had no mass and its complete total was unavailable. The exact-identity table in
`sourceLookupAliases.ts` now maps it to the catalog record `mech-mortar-8`, which
holds Java's values. Being an exact identity, it holds on a Clan unit too, where
unit tech base would otherwise swap the legacy record for the 5 t Clan one.

With it Mortar Carrier weighs 60 t (engine 8.5, structure 6, controls 3, armor
4.5, equipment 38), equal to the pinned verifier's `calculateWeightExact`.
`IS Mech Mortar-4` has the same gap, but only owner-excluded `ge` sources use it,
so it is left unmapped. `VehicleIsMechMortar.pinned.test.ts` pins the unit.

## Support ammo slot boundary and independent fire-control placement

At MegaMek `48fcb2f64`, `TestSupportVehicle.getAmmoSlots` (:1618-1640)
shares ammo with weapons only for small support vehicles. Small means strictly
below 5 tons (`EntityWeightClass.java:80-97`); at exactly 5 tons, distinct
non-one-shot ammo types require slots. `itemSlots.ts` starts its existing
conservative ammo grouping at this boundary. Native ammo identity, armor and
other lower bounds described by that owner remain separate work.

`TestTank.isValidTankLocation` (:979-980) and `isBodyEquipment` (:1079-1093)
require Basic and Advanced Fire Control in Body. `vehicleValidation.ts` owns
this placement check independently of slot accounting. Missing, variable or
unit-dependent slot costs on another mount cannot suppress a known placement
error. Equipment identities and names use the public catalog resolver, including
the native `:OMNI` qualifier. The Tank, VTOL and support handlers retain their
existing validation entrypoints, CASE checks and motive compatibility checks.

`vehicleEquipmentValidation.pinned.test.ts` loads synthetic BLKs through the real
handlers for the 5-ton ammo overrun and misplaced fire control beside variable
cargo. Boundary and placement controls also cover unknown costs, Blue Shield's
unit-dependent slots, Body placement, CASE and independent motive errors.

## Correction: miscellaneous heat for RISC, Nova CEWS and Spot Welder

The earlier MiscType citation ending at line 1435 is incomplete. At pin
48fcb2f64, `MiscType.getHeat` spans MiscType.java:1423-1441; lines 1436-1439
return 2 for RISC Laser Pulse Module, Nova CEWS and Spot Welder. Resolve this
heat by catalog id for non-weapon, non-ammunition items: Nova is cataloged as
ECM, yet is a native MiscType. Weapon and ammunition categories never receive
miscellaneous heat, even if their id matches a miscellaneous device.

`TestEntity.java:974-977` skips Spot Welder heat for fusion-class and fission
engines. Other known engines count its 2 heat. An unknown engine leaves the
welder heat unresolved rather than guessing an exclusion. Miscellaneous heat
is still added after linked-weapon heat so the laser-insulator zero guard
keeps its existing ordering.

Thirty synthetic Scorpion Light Tank BLKs pin six engine types against no
added item, each individual device and all three together. Fusion, XL, Light
and fission give counts 0/0/2/2/4 and paid mass 0 throughout. ICE gives counts
and mass 0/2/2/2/6. Fuel cell gives those same counts and paid mass 0/1/1/1/5.
Existing catalog masses already match Java (RISC 1 t, Nova 1.5 t, welder 2 t).
No corpus vehicle mounts these devices; the 1,444-source heat sweep remains
1,150 matching complete combat weights with the same 294 unavailable. Support
vehicle sink mass remains the separate 2.2-d obligation.

## Pinned vehicle armor editor limits and allocation (4.1-i)

`armorLimits.ts` owns installed armored locations, the rotor limit and the
class-total ceiling. `armor.ts` retains its public facade for existing total
callers. `editorArmor.ts` projects the same limits into editor figures and
performs automatic allocation; stores and components transport those results.

At MML 62bf193, `UnitUtil.getMaxArmor` (UnitUtil.java:900-916) returns null for
vehicle locations except the VTOL rotor, which has maximum 2. Null means no
individual maximum (`ArmorLocationView.setMaxPoints`). This applies to hull
faces and installed turrets, including six-side superheavy and large-support
layouts. Body is not an armored location; absent turrets and unknown locations
remain unavailable. Structure points do not limit vehicle armor.

The total is separate: `UnitUtil.getMaximumArmorPoints` (UnitUtil.java:769-795)
uses `floor(tonnage * 3.5 + 40)` for combat vehicles, VTOLs and superheavy tanks,
matching MegaMek 48fcb2f64 `TestTank.java:338`. Support vehicles instead use
`TestSupportVehicle.maxArmorFactor` (TestSupportVehicle.java:585-617):
`4 + trunc(tonnage * movement factor)`. The existing support-total helper owns
the factors and large-naval size boundary; BAR does not alter the point ceiling.

`ArmorAllocationView.java:209-276` and `TestEntity.java:1148-1152` distinguish
raw purchased points from available points: available is the smaller of the
raw points and the class total. Waste is the difference. Numeric location
inputs have no maximum for ordinary armored locations, so a saved invalid
design remains inspectable; diagnostics report purchased-point and class-total
over-allocation without inventing a location cap. The rotor remains bounded.

Automatic allocation follows MML `CVStructureTab.java:877-940` and
`SVArmorTab.java:286-364`. Clear the old allocation; reserve up to two available
points for a rotor; exclude Body and Rotor from the remaining location count.
Every other location receives a share of `1 / count`; split the combined
front/rear share 60/40, floor each result and put the rounding remainder on
Front. Both installed turrets and all six hull faces participate. Purchased
points use the actual armor type or BAR table and never exceed the class total.
Zero- and one-point rotor budgets cannot create negative hull armor.

The editor, store allocator and status diagnostics share these owners. Handler
validity continues to use its source-handler path and is checked independently;
changing an editor diagnostic must not silently change catalog validity or BV.

## Body presentation in the pinned vehicle armor editor (4.1-i clarification)

Pinned MML 62bf193 does not expose a Body armor control for support vehicles.
ArmorAllocationView.java:91-110 defines Tank, superheavy/large-support and VTOL
layouts without LOC_BODY; :321-343 selects those layouts for support tanks,
large support tanks and support VTOLs. SVArmorTab.java:304 discounts Body as
unarmored, and :329 skips it during automatic allocation. This is independent
of BAR and armor tech rating. UnitUtil.getMaxArmor returning null does not
create an editor location that is absent from the layout.

The shared editor layout therefore omits Body entirely, including four-side
support vehicles, instead of rendering a disabled Body armor input. Body
remains unavailable to manual armor edits and zero in automatic allocation;
its equipment-location role is unchanged. This clarifies the earlier
'remain unavailable' wording: the pinned armor UI has no Body field.

## Diagnostic identities and native loading fixtures (4.1-i)

The archived vehicle construction scenario based on twice the structure does
not define the pinned armor rule. UnitUtil.java:900-916 at MML 62bf193 gives
installed hull/turret locations no maximum. TestTank.java:338 at MegaMek
48fcb2f64 supplies the separate total ceiling. VAL-VEHICLE-ARMOR-LOC therefore
checks the rotor and unavailable locations; VAL-VEHICLE-ARMOR-TOTAL checks
the class budget. The root vehicle-construction tests retain the former
Front-30 example as a legal allocation, and check Front-216 against the
50-ton Tank's 215-point total without an independent Front error.

Whole-shell loading tests use native geometry as well as the armor-tab tests.
A tracked superheavy or large-support fixture must carry an appropriate
weight, rather than setting a six-side flag on a 50-ton hull. The shared
construction classifier owns the threshold. Support loading diagrams expose
Front and other armored locations, with no Body armor control, matching the
pinned layouts cited above.

## Implicit infantry clip diagnostics

`vehicleAmmoPools.ts` owns fresh support-vehicle clip initialization and the
vehicle diagnostic pool projection. It consumes independent pinned equipment
facts through the existing catalog identity resolver. It does not install
persisted mounts or change offensive/defensive ammunition arithmetic.

MegaMek 48fcb2f64 `Entity.java:5120-5123,5142-5182` creates linked generic
Infantry Ammo only after native admission. Native weapon shots initialize the
clip at mounted size 1; `BLKFile.java:377-385` subsequently adjusts source sizes
above 1 using Java's saturating double-to-int conversion and signed int32
multiplication. Nonpositive overflowed shot counts have no usable ammunition.
Sizes at or below 1 retain the initial clip.
Empty alternate inferno clips are not counted. `Mounted.java:986-990` supplies
usable shots; `AmmoMounted.java:144-159` excludes intrinsic one-shot links.

`BVCalculator.java:1147-1153,1194-1207` admits positive usable clips and groups
them through the shared ammo accumulator. Generic ammo has type INFANTRY,
rack 0 and BV 0 (`AmmoType.java:2033,16257-16268`; `EquipmentType.java:186`).
Multiple clips therefore add one zero-valued availability group. Infantry
weapons never supply its launcher cap (`BVCalculator.java:1230-1232`), and
`processAmmo:1058-1063` skips it. No arithmetic input acquires this diagnostic.

Combat vehicles, BA weapons, unresolved identities, native NA/empty clips and
intrinsic one-shot ammo stay absent. A caller-supplied infantry flag cannot
supply the missing native admission facts. Missing admission context remains
unknown and is not projected; the 23 pinned vehicle sources all have proven
admission, independently checked on their 43 actual infantry mounts.

## Support-vehicle heat sinks (pinned)

At pin 48fcb2f64, `TestSupportVehicle.getWeightHeatSinks` is the heat-neutral
count itself: support vehicles get no free engine sinks, whatever the engine
(TestSupportVehicle.java:917-931). `getCountHeatSinks` is
`TestEntity.calcHeatNeutralHSRequirement` (TestEntity.java:945-984), except that
a small support vehicle (under 5 t) needs none and Java never iterates its
weapons. Both support paths, the editor (`weightComposition.ts`) and the
handler total (`supportPayload.ts`), now take the same linked raw heat as the
combat path, so a laser insulator (-1, with the running-total minimum of one) and
a PPC capacitor (+5) apply to a support chassis exactly as to a combat one. The
previous handler sum skipped both links, and the editor reported no support
heat at all.

This supersedes the closing note of the previous section ("the support heat
term depends on the 2.2-d support weight model"). `supportHeat.pinned.test.ts`
pins the 19 corpus support rows that carry heat (15 SupportTank, 2
LargeSupportTank, 2 SupportVTOL), two under-5-t rows whose Java heat is zero,
and seven synthetic Jifty-chassis cases probed in the pinned Java. The
editor `remaining` for a support vehicle now falls by the sink mass. It still
omits source fuel, so it is not a Java total; the handler total is.

## Support torpedo launcher identity (pinned)

The support handler hands the payload the raw BLK token (`LRT 10`, `SRT 2`).
`getEquipmentEntry` matches those by name to the legacy stubs `lrtorpedoN` and
`srtN`, which are unofficial, tagged Clan and weigh half the pinned launcher
(`lrtorpedo10` 2.5 t against Java 5 t; `srt2` 0.5 against 1). The unit loader
resolves the same token to the Java-derived registry entries (`lrt-10-registry`
5 t, `lrt-15-registry` 7, `srt-2-registry` 1, `srt-4-registry` 2), which is why
the editor was already right and only the handler total was short.

The payload rule stays pure: `computeSupportPayloadWeights` takes an optional
injected `SupportRegistryMass` lookup and uses its answer for a non-ammunition
mount, otherwise the BV entry's. The service layer supplies the lookup
(`services/units/handlers/supportRegistryMass.ts`, built from
`resolveEquipmentId` and `isRegistryEquipment`) and `SupportVehicleUnitHandler`
passes it; the editor never calls the payload and already resolves registry ids
through its own resolver. Ammunition keeps its own path. The registry-only rule matters:
the loader also answers for the wrecking ball and flail (weight 0 against Java 4
and 5 t) and for cargo (weight 1, variable by size). Pinned MegaMek 48fcb2f64,
`TestSupportVehicle` verifier: LRT 5/10/15/20 weigh 2/5/7/10 t and SRT 2/4/6
weigh 1/2/3 t. Corpus: Seahorse Cargo Sub 245 to 250 t, Silverfin Coastal Cutter
39 to 40 t, White Tip Submarine 236.5 to 249.5 t, each now equal to Java.

Residual, left for the catalog lane: the 42 legacy stubs (`lrtorpedo1..20`,
`srt1..6` and their OS/IOS variants in `weapons/missile-other.json`) keep their
half weights. Registry mass supersedes the applicable stub mass; other stub
metadata is still read (`supportPayload` still calls `getEquipmentEntry` and
overrides only the weight of the catalog entry it spreads). The 42 stubs remain a
catalog residual.

## Native combat VTOL weight transport (2.2-g)

`computeNativeVTOLWeight` transports native VTOL fields into the same construction
owner as `computeNativeTankWeight` and returns the unchanged
`VehicleWeightBreakdown` type. `chinTurret` is the primary turret; no secondary
turret is installed (`BLKVTOLFile.java:132-133,164-172`, MegaMek 48fcb2f64).
`TestTank.java:178-226` owns the ordinary and fixed Omni mechanism mass.

Rotor mass is already `controlsLift.ts`'s `lift` term, rounded up to half tons
from 10% of chassis mass (`TestTank.java:229-239`). It is counted once. VTOLs over
30 tons use the existing superheavy structure owner (`VTOL.java:729-731`,
`TestTank.java:87-95`, `Structure.java:65-108`). Engine, suspension, armor, heat,
power amplifier, variable accessory and carrying-space rules retain their
existing owners. Jet boosters use installed engine mass through the existing
accessory rule (`MiscType.java:518-527`).

Tank's loader reads the no-controls tag by presence; `BLKVTOLFile.java:64-199`
never reads it, so VTOL transport keeps controls enabled. Source engine flags
use `isClanBlkEngine`; armor-tech integer parsing is shared unchanged with the
Tank handler. Complete parses publish computed mass and remaining tonnage;
unsupported or unresolved breakdowns remain unavailable. The number-only legacy
handler API retains its explicit incomplete-weight failure.

Explicit residual outside the 131-source corpus: with Skadi's pure-Clan chassis
and a conflicting IS armor-tech tag, Java normalizes ferro-fibrous armor back to
Clan (4.5 tons); the existing local armor owner retains the explicit IS choice
(5 tons). The mixed-Clan counterpart retains IS armor in Java. Authority:
`BLKFile.java:1950-1994` at the same pin; independent synthetic verifier probes
record totals 30 and 30.5 respectively. This transport does not change the shared
armor-normalization rule or any catalog value.

## Small support vehicles: weapons, clip ammunition, Omni fire control (pinned)

At pin 48fcb2f64, a support vehicle under 5 t weighs its weapons at their type
tonnage in the verifier's sum (`TestEntity.getWeightWeapon`, kilogram rounding for
the total, `TestSupportVehicle.java:760-770`). The payload used to mark every
weapon on such a chassis unresolved ("infantry metadata is not in this catalog")
although the catalog weight already equals the Java tonnage for 20 of the 21
weapon ids the corpus mounts; that guard is removed. Eighteen small support
sources become exactly Java (193 to 211 of 227 totals equal), none moves away.

Three things stay reported rather than guessed:

- **Clip ammunition.** A small vehicle's weapon beyond its first clip adds
  `nextKg((size - 1) x InfantryWeapon.getAmmoWeight())`
  (`TestSupportVehicle.java:980-988`). The ammunition weight is a Java constant
  the catalog does not carry (Java: Auto-Rifle 0.00048 t, Support Laser 0.003 t).
  A small-vehicle weapon with `:SIZE:` above 1 is reported unresolved, three
  sources: Limpet Half-Track and Rock Rover RRV and RRV (Speed). Needs a catalog
  field (catalog lane).
- **Misidentified weapon.** `Machine Gun (Light)(PT)` reaches the battle-armor
  `balightmg` (0.075 t) through the shared native name `Machine Gun (Light)`,
  where Java loads the infantry support gun (`machine-gun-light-registry`,
  0.007 t). A weapon whose catalog `allowedUnitTypes` names neither
  "Support Vehicle" nor "Infantry" is not a support-vehicle weapon, so it is
  reported, not charged. Across all 317 weapon mounts of the 227 support sources
  this flags exactly that one mount type (Ibex RV Militarized MG). The identity
  itself is routed by `registry-routing.json` (`techRoutes`) and the protected
  alias `Machine Gun (Light)`, which are catalog data.
- **Pintle and sponson mechanisms, ladders, dumpers, manipulators** are d3 and d4.

`MiscType.java:707-711`: an Omni support chassis carries a fixed fire-control mass
(`baseChassisFireConWeight`) that wins over the 5% or 10% of weapon mass when
positive. `resolveVehicleVariableMass` owns the rule and takes the value in its
context; the support handler reads the BLK tag. Three sources are Omni with a
positive value (the Boreas Cavalry Hovercraft A, B and Prime, 0.01 t); they are
now exact. The editor path does not read the tag yet (it needs the field plumbed
through the vehicle store, registry, persistence and snapshot contract), so for an
Omni support chassis the editor still shows the weapon-based fire-control mass.
The basis also excludes non-support infantry weapons (`F_INFANTRY` without
`F_INF_SUPPORT`) and anti-missile systems; see "Support miscellaneous masses and
the fire-control basis" below.

`internal_type -1` (MegaMek `T_STRUCTURE_UNKNOWN`) never reaches a support
structure mass, which ignores the structure type
(`TestSupportVehicle.java:778-797`); `supportSmallVehicle.pinned.test.ts` pins
13.5 t and 59.5 t for -1, 0 and absent alike.

No small-vehicle mount in the corpus is DWP-mounted or a squad support weapon,
so `Mounted.getTonnage` x0.75 and x0.5/0.4 (`Mounted.java:729-746`) are not
implemented; nothing here measures them.

## Support pintle and sponson mechanisms (pinned)

`MiscType.getTonnage` (MiscType.java:563-603 at 48fcb2f64) weighs the two turret
mechanisms from their neighbours, not from a catalog value:

- **Sponson pair:** 10% of the sponson-mounted equipment (not ammunition, heat
  sinks or armor), rounded up, split between the sponsons. This is the
  aggregate rule above, now applied to support vehicles as well.
- **Pintle:** 5% of the weapons that are pintle-mounted in the pintle's own
  location, rounded up. A fixed chassis weight (`baseChassisSponsonPintleWeight`,
  MegaMek's `Tank.getBaseChassisSponsonPintleWeight`, -1 when unassigned) wins,
  even when zero, and is split over the pintles.
- Rounding is kilograms on a support vehicle under 5 t, half tons otherwise.

`applyVehicleMountMechanismWeights` in `turret.ts` is the single owner: the editor
(`mountedWeight.ts`, which previously held the sponson block inline) and the
support payload (`supportPayload.ts`) both call it, with
`computeVehiclePintleMechanismWeight` beside the existing sponson function. The
sponson payload predicate (`isSponsonMechanismPayload`) moved with it. The support
handler reads the BLK tag `baseChassisSponsonPintleWeight` into the new
`ISupportVehicle` field. Other copies: none of the rule remains elsewhere; the
combat Tank path (`vehicleHandlerWeight.ts`) already reaches the sponson through
the editor owner.

A mechanism whose weapons or payload have an unresolved mass is itself
unresolved, never charged as if they weighed nothing. A mount the catalog cannot
identify counts as a possible pintle weapon (unidentified ammunition does not).
The Ibex RV (Militarized MG) pintles therefore stay unresolved while its
battle-armor gun misidentification stands (Java 0.001 t each).

Verified against the pinned verifier (`supportMechanisms.pinned.{json,test.ts}`):
Apocalypse World Rover, Heavy Combat ATV, Ibex RV (Militarized LDGR) and Outrider
equal Java in weapons, miscellaneous equipment and total. The Dreadnought Mk II
Land Train's sponsons (0.25 t each) equal Java. Its `ISMGA(ST)` arrays reached
the 0.25 t `mga` entry where Java's ISMGA weighs 0.5 t, which left its total 0.5 t
short until the "Decorated array weight token" section below; the row now equals
Java at 200 t.

Not modelled: the sponson Omni branch has no corpus source and the support unit
does not expose `isOmni`; clip ammunition mass and the `Machine Gun (Light)`
identity stay as listed in the small-vehicle section above.

## Decorated array weight token (pinned)

MegaMek loads `ISMGA`, `ISLMGA` and `ISHMGA` as 0.5 t each (`ISMGA.java:70-83`,
`ISLightMGA.java:69-82`, `ISHeavyMGA.java:70-83` at 48fcb2f64). The BV catalog
matches the decorated source tokens (`(ST)` sponson, `:OMNI`) by name to the
0.25 t `mga`, `lmga` and `hmga` stubs, so a decorated Inner Sphere array weighed
half its Java mass wherever the weight owners did not step around it.

`getNativeWeightLookupToken` in `equipmentBV/normalization.ts` is the one owner of
that step. It returns the plain array token for the decorated Inner Sphere
arrays (`ISMGA`, `ISLMGA`, `ISHMGA` with `(ST)`, `(ST):OMNI` or `:OMNI`) and every
other source token unchanged. Both weight owners resolve through it: the combat
Tank/VTOL transport (`vehicleHandlerWeight.ts`, which held the `ISLMGA(ST)`
predicate inline) and the support registry mass (`supportRegistryMass.ts`).
Public equipment lookup identities are unchanged. Clan arrays (`CLMGA`, `CLLMGA`,
`CLHMGA`) resolve to the same 0.25 t entry with or without the decorator and stay
outside the guard. Plain `ISMGA`, `ISLMGA` and `ISHMGA`, and `ISLMGA:OMNI`, already
reached the 0.5 t registry entry directly.

Corpus effect: the combat Tank and VTOL breakdowns are unchanged (the only
combat source with a decorated array is Myrmidon P, `ISLMGA(ST)`, already 0.5 t),
and the Dreadnought Mk II Land Train's two `ISMGA(ST)` arrays now weigh 0.5 t, so
its weapons (32 t), miscellaneous equipment (10 t) and total (200 t) equal Java.

## Support miscellaneous masses and the fire-control basis (pinned)

Pinned with 74 synthetic support sources (a 50 t and a 1 t tank and a 60 t VTOL
built from corpus excerpts) through the original MegaMek 48fcb2f64 verifier:

- **Ladder:** `RoundWeight.nearestKg(size / 200)` whatever the vehicle
  (`MiscType.java:841-843`); fractional sizes confirm nearest, not next, kg.
- **Fluid Suction System (Standard):** a fixed 1 t, assigned after the variable
  placeholder (`MiscType.java:7578-7583`). The catalog tags it "Variable weight"
  without a rule, which left the owner reporting it unresolved while charging 1 t.
- **Dumper:** `RoundWeight.STANDARD(0.05 x linked cargo size)` (`Mounted.java:729-738`):
  next kg under the small-support standard, next half ton otherwise. The link is
  the first unlinked variable `Cargo` in the dumper's own location, whatever the
  order (`MekFileParser.java:854-885`). A second dumper, a cargo in another
  location, no cargo, or only Liquid Storage gives zero.
- **Fire-control basis** (`MiscType.java:714-722`): weapon tonnage except
  anti-missile systems and non-support infantry weapons.

`variableEquipmentMass.ts` owns all of it: the ladder and fluid rules in
`resolveVehicleVariableMass`, `applyVehicleDumperWeights` (one pass, like the
sponson and pintle pass in `turret.ts`) and `isFireControlBasisWeapon`. The
support payload and the editor (`mountedWeight.ts`) call the same functions. The
support split reads the Java class from the registry: `isInfantrySupportWeapon`
(`ammunitionCompatibility.ts`, beside `isFireWeaponCategory`) matches
`InfantrySupport*` and `InfantryGrenade*`, which equals `F_INF_SUPPORT` on all 104
infantry-only registry weapons (static read of the pinned weapon classes). The BV
catalog carries the class as `subType`; the editor's items only in their `special`
source reference, so the predicate reads either. The AMS ids are the one
`AMS_WEAPON_IDS` in `equipmentConstants.ts`, shared with the equipment browser.

Not modelled: a dumper's `DWP`/squad adjustments and a cargo whose own mass is
unresolved (no corpus source), and the editor's Omni fire-control mass.

## Manipulator and Nova CEWS spellings (pinned)

The BLK files name the manipulator `Manipulator (Non-Mech/Non-Battle Armor)`,
MegaMek's internal name (`EquipmentTypeLookup.java:342`); the catalog entry, 0.01 t
as `MiscType.java:7694-7703`, is named `...Non-BattleArmor)`. The unit loader
resolved the BLK spelling, the BV lookup the support payload uses did not, so the
eight sources that mount it reported the manipulator unresolved. `Nova CEWS` is a
registered lookup name of NovaCEWS (`MiscType.java:6192-6193`) that resolved
nowhere; every corpus file mounts `NovaCEWS`, so this affects only hand-written
and exported display names. Both are lines in `NATIVE_IDENTITY_CORRECTIONS`
(`equipmentBV/sourceLookupAliases.ts`), the native-name owner where `novacews`
already lives, so the loader, registry, BV and printing paths agree. No catalog
entry changed. A Nova CEWS tank weighs 3.5 t more than the same tank without it:
1.5 t of equipment and 2 t of heat sinks (pinned sweep rows).
