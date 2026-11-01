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
