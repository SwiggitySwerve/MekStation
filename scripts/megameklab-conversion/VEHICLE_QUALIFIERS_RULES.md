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
`enums/TechRating.java:42-48`. Tests embed six original BLKs and their hashes
from mm-data `50f7efef0c9f775b0258f8283525ed4f906e1985`.

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
continues to contain armor points. This slice does not change point ordering.

Armor code 7 is PATCHWORK; code 41 is AEROSPACE, never BAR. Support BAR codes
43 through 51 use the existing shared code range and emit type BAR. Only an
explicit `barrating` supplies `barRating`; absence remains absent. Its existing
schema range is 2 through 10. The schema describes, but does not enforce, the
relationship between BAR and barRating; consumers must not infer a rating from
the armor code. The incorrect BAR alias for code 42 is also removed; other
pre-existing armor mappings remain outside this correction.

Authority: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`, under
`megamek/src/megamek/common/`:

- `loaders/BLKAeroSpaceFighterFile.java:96-98,117-123,147-165,208-210`.
- `loaders/BLKFile.java:484-523,1548-1742` (support armor and transporters).
- `loaders/BLKFixedWingSupportFile.java:108-124,160-162`.
- `equipment/EquipmentType.java:92,126-136` (patchwork, aerospace, BAR codes).

Tests embed eight original BLKs with SHA-256 hashes from mm-data
`50f7efef0c9f775b0258f8283525ed4f906e1985`. Conversion/schema round trips do
not establish app hydration, construction, BV, export or gameplay parity.
