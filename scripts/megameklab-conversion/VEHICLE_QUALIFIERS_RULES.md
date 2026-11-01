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
