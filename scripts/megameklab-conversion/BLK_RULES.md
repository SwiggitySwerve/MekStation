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
It validates membership; existing technology-to-output mappings are unchanged.
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
