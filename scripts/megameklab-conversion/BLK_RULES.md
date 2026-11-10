# Shared BLK conversion rules

`blk_common.py` owns parsing primitives and rules shared by BLK converters.
Converters keep their required-tag policies and compose the shared results.

## Aerospace cockpit source identities

`src/types/formats/blk-aerospace-cockpit.json` owns native Aero cockpit codes
0 STANDARD, 1 SMALL, 2 COMMAND_CONSOLE, 3 PRIMITIVE. Python aerospace tables and
the TypeScript ASF source reader consume that file; producer receipts inventory
it. Authority: MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587,
`Aero.java:106-109`, `BLKAeroSpaceFighterFile.java:128-130` and
`BLKFile.java:895-896`. MegaMekLab 62bf19360382049e2e6a1e8f24e859e27bdc5878
`UnitUtil.java:2004` delegates to that BLK writer.

Python aliases 4 STANDARD_AERO, 5 PRIMITIVE_AERO and 6 CLAN remain compatibility
values outside the native fact table. Omitted/unknown defaults, conventional
fighter compatibility and SmallCraft behavior retain their existing policies.
In particular, the separate conventional-fighter map is not an ASF code table;
the pinned conventional loader does not read cockpit_type. Regression coverage:
`AerospaceCockpitSource.test.ts` and `test_blk_aerospace_cockpit.py`, including
12 original-byte mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985 sources.
Only the existing BV owner interprets the resulting cockpit:
`battleValue/AeroBVCalculator.java:165-175` gives small/command-console 0.95,
with the separate drone condition retained. No formula is defined by the reader.

## Maximum thrust

`maximum_thrust` rounds safe thrust times 1.5 up, including odd values.
The aerospace caller retains its existing integer parsing and zero default.
The DropShip caller (added by #2444) requires its SafeThrust source tag first.
No clamping is added by this extraction.

Reference: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`Entity.java` base `getRunMP` and `Aero.java` `getRunMP`.
Regression coverage: `scripts/__tests__/test_blk_aerospace_si.py`.

## Fighter heat-sink source block

`blk_aerospace_converter.py` requires a heat-sink block for `Aero`,
`AeroSpaceFighter` and `ConvFighter`. A missing block raises `ValueError`
with the source filename and `<heatsinks>` tag. Explicit zero and supplied
counts retain their existing parsing; the existing `Heatsinks` alias remains
accepted. FixedWingSupport and SmallCraft policies are unchanged.

Authority: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`BLKAeroSpaceFighterFile.java:91-95` and `BLKConvFighterFile.java:86-89`.
Both native loaders reject a missing block with
`Could not find heatsinks block.` Regression coverage:
`scripts/__tests__/test_blk_aerospace_heatsinks.py`.

The same three fighter spellings require a sink-type block. Missing both
`sink_type` and its existing `heat_sinks` compatibility alias raises `ValueError`
with the source filename and `<sink_type>` tag. Explicit 0/1, heat-sink counts,
existing type interpretation, and FixedWingSupport/SmallCraft omission policies
remain unchanged. This is source admission, not construction-validity evidence.

Authority: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`BLKAeroSpaceFighterFile.java:99-102` and `BLKConvFighterFile.java:90-93`.
Both require `sink_type`; conventional-fighter heat-type interpretation is a
separate concern. MegaMekLab `62bf19360382049e2e6a1e8f24e859e27bdc5878`
`UnitUtil.java:2004` delegates to `BLKFile.getBlock`, whose lines 903-904
write both heat-sink blocks. The tests above cover the missing-block guard,
zero/positive counts, both explicit types, the alias and excluded families.

### Aerospace double identity

Pinned `Aero.java:102-103` defines only `HEAT_SINGLE = 0` and `HEAT_DOUBLE = 1`.
The aerospace and capital converters serialize those identities as `SINGLE` and
`DOUBLE`, independently of chassis technology. Clan chassis do not imply the
MTF equipment identity `DOUBLE_CLAN`. The native aerospace loaders read
`sink_type`; the similarly named `heatsinktype` tag neither overrides nor replaces
it. FixedWingSupport's pinned corpus has zero single sinks; this statement does
not extend its native loader to read tags it ignores.

Regression coverage: `test_blk_aerospace_heatsinks.py` locks original-byte
mm-data `50f7efe` Tyre Michiko (16 double sinks) and Jengiz A (27), chassis-tech
independence and tag precedence. `test_blk_capital_converter.py` locks the same
0/1 identity across IS, Clan and both Mixed chassis spellings. BV and print
consumers interpret `DOUBLE` as two points per sink; aerospace sink mass does not
depend on IS/Clan equipment critical-slot differences. `ConvFighter.java:83-90`
separately disables heat tracking, so its effective capacity sentinel is not a
sink-type identifier.

### Prototype ferro-aluminum armor

Pinned `EquipmentType.java:112` defines `T_ARMOR_FERRO_ALUM_PROTO = 27`.
`src/types/formats/blk-armor-codes.json` owns its schema identifier
`FERRO_ALUMINUM_PROTO`; `blk_common.BLK_ARMOR_CODE_MAP` loads that definition and
the aerospace tables import it. A missing literal key in the importing file is
not an unmapped code. The unit schema already accepts this identifier; ordinary
ferro-aluminum remains code 19, and unknown codes retain strict diagnostics.

`test_blk_aerospace_armor.py` locks the original-byte mm-data `50f7efe` Starfire
SF-1X (Prototype) at code 27 and 125 armor points, including schema acceptance.
The shared-table tests in `test_blk_converter_fidelity.py` also cover this code,
Mixed technology and the separate MTF `Double (Clan)` equipment alias. The
left/right and codes 19/20 tests remain the FU-30 regression seams. These facts
need no new armor identifier or catalog regeneration.

## DropShip input and motion (the DropShip converter arrives with #2444)

After family recognition, missing identity, year, tonnage or type is an error.
`validate_blk_tech_type` accepts the source spellings in `BLKFile.java:664-740`.
It validates membership in the shared BLK type table.
The shared motion owner is `blk_aerospace_tables.map_aerospace_motion`:
case-insensitive spheroid, otherwise aerodyne (`BLKDropshipFile.java:119-126`).

## Serialized tonnage

`public/data/equipment/_schema/unit-schema.json` owns the coarse family bounds:
250 t normally, 600 t for Support Vehicle (including its legacy spelling),
2,500,000 t for DropShip, JumpShip, WarShip and Space Station. The capital bound is
the largest `TestAero.getMaxTonnage` value (`TestAero.java:1234-1258`: Space Station
and non-subcompact WarShip 2,500,000; JumpShip 500,000; spheroid DropShip 100,000).
This is a document acceptance bound; construction rules narrow it per family.
Python validates that schema directly; Zod is generated from it. The generator
folds a sole applicable numeric alternative to preserve the mech object API.
The same rule supersedes UL-05's support-only alternative; retain one copy of
`foldNumericAlternative` when those branches sync.

Regression coverage: `unit.tonnage.contract.test.ts` and
`expand-unit-type-requirements.test.mjs` (the DropShip converter tests arrive with #2444).

## Capital source loading

The unit schema owns enum facts through local definitions. The generator
resolves those references and emits one shared declaration per enum.
Definitions are limited to string enums; unsupported references fail closed.

`blk_capital_tables.py` owns family spellings, source locations and armor codes;
`blk_capital_converter.py` owns required-tag policy and capital source facts.
The three Jumpship-derived loaders require passengers, force AERODYNE motion,
and load six armor entries: nose, front left, front right, aft, aft left, aft right.
WarShip broadside equipment has distinct locations but no armor (Java ARMOR_NA).
Modern and legacy equipment-location tags are additive, matching Java's calls.
JumpShip and Station ignore SafeThrust and use zero; WarShip requires it.
Missing design type defaults to civilian for JumpShip/Station, military otherwise.
All capital loaders retain Java's ICE runtime placeholder, not a decoded engine tag.

WarShip alone reads kf_core and jump_range (defaults compact/30 ly); JumpShip
defaults standard/30 ly, Station none/30 ly. Sail defaults present except Station.
Lithium-fusion and HPG use tag presence; Station ignores lithium-fusion.
Grav decks append legacy representative diameters (50/175/375 m) before explicit
diameters. Docking collars count transporter lines plus legacy docking_collar
for JumpShip/WarShip; Station ignores that legacy tag. Derived KF/sail integrity
and construction weights remain outside this serialized source-fact slice.

Authority: MegaMek 48fcb2f6 BLKJumpshipFile, BLKWarshipFile,
BLKSpaceStationFile and Jumpship/Warship/SpaceStation constructors.
Regression coverage: `test_blk_capital_extended.py` and pinned BLK fixtures.

## Vehicle and aerospace type and armor fidelity

`src/types/formats/blk-aerospace-armor.json` owns serialized fighter and
small-craft/DropShip armor order. `blk_aerospace_tables.py`, TypeScript fighter
and small-craft handlers, and the aerospace exporter read these facts;
index 1 is right and index 2 is left. Authority: MegaMek 48fcb2f6
`BLKAeroSpaceFighterFile.java:63-66,186-189`, `BLKConvFighterFile.java:146-149`,
`BLKSmallCraftFile.java:180-183`, `BLKDropshipFile.java:196-199`.

`blk_common.py` owns `BLK_TECH_TYPES`, `map_blk_tech_type`, and
`BLK_ARMOR_CODE_MAP`. The vehicle and aerospace tables re-export the same armor
table. Their converters use these BLK mappings instead of MTF aliases.

`BLKFile.java:669-735` at the pin above maps levels 1/2/3/4/5 to
Introductory/Standard/Advanced/Experimental/Unofficial (Clan starts at 2).
Bare `IS` is Introductory only for year 3025. Mixed chassis spellings retain
`MIXED` and use their explicit suffix for rules level. Unknown or empty type
text raises `ValueError`. Existing omitted-type policies remain with the callers
(vehicle: IS Level 1; aerospace: IS Level 2); required-tag policy is unchanged.

`EquipmentType.java:85-136` defines armor codes 0..51. In particular, 16 is
ferro-lamellor, 19/20/21 are ferro-aluminum variants, 22 is vehicle stealth,
26 is ballistic-reinforced, 27 is prototype ferro-aluminum, and 40 is primitive
aerospace. Codes 31..38 are battle armor, not Clan or industrial variants.
Armor technology remains separate from these codes. Strict decoding rejects
unknown, empty, malformed, and fractional codes; omitted armor retains STANDARD.
`typeByArc` preserves raw codes, including the unused fuselage's -1 sentinel;
`BLKAeroSpaceFighterFile.java:160-164` skips that last location. BAR rating
policies remain in `bar_armor_fields` and are unchanged.

`map_armor_code` has one decoding policy. Every production caller already used
strict decoding; the unused permissive mode and its `strict` option are retired.
The optional-field omission policy above is unchanged. `enum_mappings` is a
required co-located dependency: import errors propagate rather than installing
stub technology, rules, engine, armor or era mappings. This is an installation
failure, with no Java source-value default to reproduce.

Bomb bay identity follows `MiscType.java:12413-12419` and
`EquipmentTypeLookup.LAM_BOMB_BAY`: the registered name is `Bomb Bay`, with
case-insensitive lookup (`EquipmentType.java:880`). Count those equipment items;
Bombast Lasers and bomb weapons are not bays. Java's loaders do not read the
invented `bombcount`/`bombs` tags, so these do not create bays or capacity.

Small craft preserve `Hull Equipment` as location `HULL`:
`SmallCraft.java:75-78` names that location and `BLKSmallCraftFile.java:190-192`
loads equipment for every location. The six pinned craft contain 11 explicit
Hull entries. Side armor order is owned by follow-up 30 and is unchanged here.

Regression coverage: `test_blk_converter_fidelity.py`, including 21 pinned
source texts and synthetic boundary mutations of them. The unit schema owns
serialized enum values; generated Zod is refreshed through `npm run schema:gen`.
MTF aliases retain their existing policies; capital
armor keeps its separate loader-specific standard-to-aerospace rewrite.

## ProtoMek source loading

`blk_protomech_converter.py` owns ProtoMek source classification and output
composition. Required Name/year/type/tonnage/motion/
cruiseMP/armor fail closed. Numeric source facts use the shared finite/integer
parser, technology uses `map_blk_tech_type`, and armor uses the strict shared
`BLK_ARMOR_CODE_MAP`, with Java's standard 0/omission -> 42 rewrite.

MegaMek 48fcb2f6 `EntityWeightClass.protoWeightLimits` sets upper bounds
3/5/7/9, then superheavy (serialized ULTRAHEAVY). `EntityMovementMode` aliases
Glider to WIGE; Quad and WiGE set separate chassis flags. Five armor entries
mean no main gun; six mean present, even with zero armor/no weapon. Preserve
all six locations, explicit armor technology (modern tag before legacy), and
Main Gun equipment in the common list. `mainGun.weapons` is a compatibility
view of those same mounts, not additional equipment.

`BLKProtoMekFile` always creates fusion and reads original jumpingMP (default
zero only when absent). It never reads umuMP/UMUPM; UMU derives from resolved
F_UMU equipment. Equipment names/locations are source facts, including ammo
counts, rear/size suffixes and duplicates. Later loaders own alias resolution,
slotless/ammo relocation, implicit mounts and effective movement. The converter
ignores Main Gun equipment when the armor array says that location is absent.
Regression coverage: `test_blk_protomech.py` and 31 pinned source fixtures.
The ProtoMech unitType alternative accepts explicit armor sourceTechLevel;
the generic BattleMech alternative rejects it, preserving the strict 21-key
construction snapshot. BA mount annotations remain excluded from ProtoMechs.

## Conventional infantry

`blk_infantry_converter.py` requires Name, year, type, squad_size, squadn,
motion_type and Primary. Tech uses `map_blk_tech_type`; unsupported values and
malformed numbers fail. `blk_infantry_equipment.py` limits equipment names to
the reviewed mm-data 50f7efef corpus; new aliases require review.
Equipment order/duplicates, raw motive/mount text and per-squad counts survive.
Missing secondary count is zero; a count without Secondary is ignored.
`specializations` is Java's mask with its explicit override; kits imply no bits.
Presence flags are source facts; effective flags apply the selected kit.
`blk_infantry_armor.py` owns exact kit names, aliases, divisors and flags.
InfantryArmor is a custom divisor, overridden by armordivisor, never armor points.
Kit precedence, dermal/TSM and beast effects follow ConvInfantry.calcDamageDivisor.
JSON Schema validates each returned unit. Authority: MegaMek 48fcb2f6
BLKInfantryFile and its referenced infantry, equipment and pilot-option classes.
Regression coverage: `test_blk_infantry.py`, `unit.infantry.contract.test.ts`.

## Battle armor source fidelity

`blk_battlearmor_fields.py` owns BA source facts (MegaMek 48fcb2f6,
BLKBattleArmorFile, BattleArmor, EntityWeightClass). Name, year, type, trooper
count, weight class, chassis, motion, cruiseMP and one armor integer are required.
Unknown enum values, malformed numbers and equipment suffixes fail. Zero ground
MP survives. Optional Model/jumpingMP/armor_type use Java defaults: empty/0/28.
Weight codes are 0..4 (PAL..ASSAULT). Tonnage follows Java setWeight(squadSize)
(the abstract trooper-count weight, not physical suit mass). Tech/rules and armor use the shared strict
owners above; mixed chassis allegiance is retained separately as clanChassis.

`jumpMP` retains originalJumpMP; UMU/VTOL expose that same propulsion rating as
umuMP/vtolMP, never from an invented UMUPM tag. These ratings are alternatives.
Equipment retains both unitLocation (Point/Squad/trooper/NONE) and physical
location (NONE/BODY/arms/TURRET), plus DWP/SSWM/APM, shots and size. Manipulators
and AP/modular mounts remain equipment; dedicated manipulator fields summarize
the squad mounts. Armor sourceTechLevel preserves armor_tech_level before the
legacy armor_tech alias (including its -1 sentinel); Java normalization/defaulting is deferred. Slotless movement equipment retains duplicates explicitly in
source; Java's legacy propulsion fallback adds one only when absent. Turret and
exoskeleton source facts survive. Automatic one-shot ammo, resolved equipment
aliases and effective movement remain later loader/BV responsibilities.
Regression coverage: test_blk_battlearmor_fidelity.py and 22 pinned BLK texts.

BA root facts and propulsion declarations belong to the battle-armor unitType
alternative. Non-BA alternatives forbid BA armor and equipment annotations. The
generator folds those family exclusions into the existing BattleMech object API;
recorded combat retains exactly 21 construction keys. Regression coverage is
unit.battlearmor-scope.contract.test.ts and the unchanged customCombatDefinition
snapshot test.
