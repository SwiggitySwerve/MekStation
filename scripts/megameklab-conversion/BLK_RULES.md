# Shared BLK conversion rules

`blk_common.py` owns parsing primitives and rules shared by BLK converters.
Converters keep their required-tag policies and compose the shared results.

## Maximum thrust

`maximum_thrust` rounds safe thrust times 1.5 up, including odd values.
The aerospace caller retains its existing integer parsing and zero default.
The DropShip caller (added by #2444) requires its SafeThrust source tag first.
No clamping is added by this extraction.

Reference: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`Entity.java` base `getRunMP` and `Aero.java` `getRunMP`.
Regression coverage: `scripts/__tests__/test_blk_aerospace_si.py`.

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

The unit schema owns enum facts through local definitions. The generator
resolves those references and emits one shared declaration per enum.
Definitions are limited to string enums; unsupported references fail closed.

## Vehicle and aerospace type and armor fidelity

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
MTF aliases and the BA/ProtoMek converters retain their existing policies; capital
armor keeps its separate loader-specific standard-to-aerospace rewrite.
