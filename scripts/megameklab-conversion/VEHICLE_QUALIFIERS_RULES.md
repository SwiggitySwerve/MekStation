# Vehicle source qualifiers (UL-06a)

`blk_vehicle_qualifiers.py` owns vehicle-only source extraction and calls the
shared `parse_source_qualifiers` owner in `blk_unit_fields.py` for Omni, Clan-engine
and transporter facts. `unit-schema.json` owns
the JSON contract; regenerate its TypeScript reader with `npm run schema:gen`.
The converter calls this owner once. Hydration and construction rules are separate.

| Source tag                     | JSON field           | Meaning                                                        |
| ------------------------------ | -------------------- | -------------------------------------------------------------- |
| omni                           | isOmni               | Presence marker                                                |
| baseChassisTurretWeight        | same                 | Tons                                                           |
| baseChassisTurret2Weight       | same                 | Tons                                                           |
| baseChassisSponsonPintleWeight | same                 | Tons                                                           |
| baseChassisFireConWeight       | same                 | Tons                                                           |
| transporters                   | same                 | Ordered original nonempty records, including colon qualifiers  |
| fuel                           | same                 | Source quantity; support-vehicle tons                          |
| fuelType                       | same                 | Explicit source fuel identifier                                |
| trailer                        | isTrailer            | Presence marker                                                |
| clan_engine                    | clanEngine           | Independent explicit boolean, never inferred from chassis tech |
| structural_tech_rating         | structuralTechRating | Source tech index 0 through 5                                  |
| engine_tech_rating             | engineTechRating     | Source tech index 0 through 5                                  |
| armor_tech_rating              | armorTechRating      | Source tech index 0 through 5                                  |
| internal_type                  | internalType         | Source structure code, including -1                            |

All fields are optional: absence stays absent, distinct from zero or false.
Presence markers follow the upstream loader's `exists` checks. Numeric and
boolean parse errors identify the source tag; quantities are never defaulted.
Transporters retain their full syntax rather than guessing bay relationships.
Source-code interpretation and transporter hydration belong to later adapters.
No construction calculations, catalog generation or type discovery happen here.

Authority: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`megamek/src/megamek/common/loaders/BLKTankFile.java:139-170,240-273`,
`BLKSupportTankFile.java:95-100,137-157,167-199`,
`BLKFile.java:1257-1302,1548-1742` (writer and transporters), and
`enums/TechRating.java:42-48`. Tests embed six BLKs from mm-data
`50f7efef0c9f775b0258f8283525ed4f906e1985` as bytes of the pinned read-only
export, which uses CRLF line endings. Their SHA-256 values identify those
export bytes, not the LF Git blobs; the content is identical after line-ending
normalisation.

## Aerospace source qualifiers (UL-06b)

`blk_aerospace_qualifiers.py` owns aerospace qualifier and armor extraction.
The shared source-field owner in `blk_unit_fields.py` supplies `isOmni`,
`clanEngine` and `transporters` to both vehicle and aerospace converters.
`unit-schema.json` owns their single JSON definition; regenerate the reader
with `npm run schema:gen`.

| Source tag              | JSON field                | Meaning                                                      |
| ----------------------- | ------------------------- | ------------------------------------------------------------ |
| omni                    | isOmni                    | Tag presence, regardless of its text                         |
| omnipodheatsinks        | omniPodHeatSinks          | Explicit nonnegative integer pod heat-sink count             |
| transporters            | transporters              | Ordered nonempty source records, all colon qualifiers intact |
| clan_engine             | clanEngine                | Explicit boolean, independent of chassis technology          |
| `<location>_armor_type` | armor.typeByArc[LOCATION] | Original integer armor code, including sentinel -1           |

Missing qualifiers remain absent; zero, false and empty transporter lists survive.
The per-arc map preserves explicit tags only, including Wings and Fuselage when
present. Keys uppercase the source location and replace spaces with underscores;
small craft retain LEFT_SIDE/RIGHT_SIDE. Codes remain source facts, like
`internalType`, rather than an incomplete second enum interpretation. `armor.byArc`
contains armor points in BLK order: NOSE, RIGHT_WING, LEFT_WING, AFT for
fighters, conventional fighters and FixedWingSupport; small craft use RIGHT_SIDE
then LEFT_SIDE. Named patchwork codes stay attached to their named arcs.

`blk_aerospace_tables.py` owns these orders and the aerospace armor-code map.
Its large-craft definitions are also consumed by the capital converter. The map
uses pinned `EquipmentType` values: 19 FERRO_ALUMINUM, 20 HEAVY_FERRO_ALUMINUM,
40 PRIMITIVE_AERO, 16 FERRO_LAMELLOR and 22 STEALTH. Commercial, industrial,
heavy industrial and impact-resistant armor use 10, 14, 15 and 25 respectively;
31 through 34 are Battle Armor codes, not aliases for those types. Small craft
normalize missing or zero armor codes to AEROSPACE; fighters retain STANDARD.
Codes 21 (light ferro-aluminum) and 27 (prototype ferro-aluminum) have no schema
name and retain the existing STANDARD fallback. The one pinned code-27 source,
Starfire SF-1X (Prototype), therefore remains an explicit armor-type parity gap.

Armor code 7 is PATCHWORK; code 41 is AEROSPACE, never BAR. Support BAR codes
43 through 51 use the existing shared code range and emit type BAR. Only an
explicit positive `barrating` supplies `barRating`; absence remains absent. One owner,
`blk_unit_fields.bar_armor_fields`, implements this for vehicles and aerospace. Its existing
schema range is 2 through 10. The schema describes, but does not enforce, the
relationship between BAR and barRating; consumers must not infer a rating from
the armor code. The incorrect BAR alias for code 42 is also removed.

Authority: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`, under
`megamek/src/megamek/common/`:

- `loaders/BLKAeroSpaceFighterFile.java:96-98,117-123,147-165,208-210`.
- `loaders/BLKAeroSpaceFighterFile.java:63-66,186-189` (BLK right/left order).
- `loaders/BLKConvFighterFile.java:146-149` and
  `loaders/BLKFixedWingSupportFile.java:126-129` (same point order).
- `loaders/BLKSmallCraftFile.java:154-161,180-183` (default and side order).
- `loaders/BLKFile.java:484-523,1548-1742` (support armor and transporters).
- `loaders/BLKFixedWingSupportFile.java:108-124,160-162`.
- `equipment/EquipmentType.java:85-136` (armor codes).

Tests embed eight BLKs from mm-data `50f7efef0c9f775b0258f8283525ed4f906e1985`
as bytes of the pinned read-only export, which uses CRLF line endings. Their
SHA-256 values identify those export bytes, not the LF Git blobs; the content is
identical after line-ending normalisation. Conversion/schema round trips do not
establish app hydration, construction, BV, export or gameplay parity.
