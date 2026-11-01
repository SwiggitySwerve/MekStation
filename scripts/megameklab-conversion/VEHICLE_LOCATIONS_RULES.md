# Vehicle converter locations (UL-05)

The Python layout in `blk_vehicle_tables.py` mirrors the authoritative TS
resolver `src/services/conversion/blkVehicleArmorLayout.ts` and the
`BLK_VEHICLE_ARMOR_LOCATIONS`, `BLK_SUPERHEAVY_ARMOR_LOCATIONS`, and
`BLK_VTOL_ARMOR_LOCATIONS` arrays in `src/types/formats/BlkFormat.ts`.
Python document keys use uppercase words joined by underscores.

| Source class                                                      | Armor order                                                                   | Accepted lengths |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------- |
| Tank/Naval below or at its motion limit; SupportTank              | Front, Right, Left, Rear, Turret, Turret 2                                    | 4–6              |
| Tank/Naval above its motion limit; LargeSupportTank at any weight | Front, Front Right, Front Left, Rear Right, Rear Left, Rear, Turret, Turret 2 | 6–8              |
| VTOL/SupportVTOL                                                  | Front, Right, Left, Rear, Rotor, chin Turret                                  | 5–6              |

The Tank/Naval limits are Hover 50 t, Wheeled/WiGE 80 t, Tracked 100 t,
and Naval/Submarine 300 t. Glider aliases WiGE. Other motion values do not
promote a Tank. Layout selection precedes the length check; an invalid
length raises `ValueError` instead of dropping or guessing armor locations.
SupportTank never promotes on weight; LargeSupportTank always has six sides.
Absent turrets stay absent. Zero armor remains an explicit zero.

Equipment uses matching side/Rotor keys. For dual turrets, Rear Turret is
`TURRET` and Front Turret is `TURRET_2`, matching Java's armor indices.
Legacy Secondary Turret tags retain `TURRET_2`.

LargeSupportTank emits `Support Vehicle`. Its engine rating is zero, as
loaded by Java; existing support propulsion calculations remain separate.
The document schema accepts support tonnage through 600 t (the pinned
Adelante source), retaining the existing 250 t bound for other families.
These are document storage bounds, not construction legality rules.

The aerospace runner also scans `vehicles/`; its existing type gate selects
FixedWingSupport and leaves ground sources to the vehicle runner. All 33
FixedWingSupport sources retain that subtype under `Conventional Fighter`.
BAR vocabulary comes from the shared `blk_common.parse_blk_armor_type`
owner rather than another copy of the support armor rule.

Authority: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`BLKTankFile.java:94-123,181-200`, `BLKLargeSupportTankFile.java:107,122-141`,
`BLKSupportTankFile.java:119-126`, `BLKVTOLFile.java:127-139`,
`SuperHeavyTank.java:66-74`, and `Tank.java:122-130`.
Acceptance compares pinned mm-data `50f7efef0c9f775b0258f8283525ed4f906e1985`
to `UL-16/coord-r3/oracle/full.jsonl`; Body and the unarmored aerospace
Wings/Body pseudo-locations are omitted, with their Java zero values checked.
