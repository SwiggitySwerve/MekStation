# Aerospace source qualifiers (UL-06b)

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
