# MTF component vocabulary

`mtf-component-vocabulary.json` owns the exact source strings an MTF file uses
for four mech components, and the serialized identity each one resolves to:

| Table        | MTF line                | Identities                                                                                               |
| ------------ | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `gyro`       | `gyro:`                 | `STANDARD`, `XL`, `COMPACT`, `HEAVY_DUTY`, `NONE`, `SUPERHEAVY`                                          |
| `cockpit`    | `cockpit:`              | the `CockpitType` values the committed catalog uses, plus the industrial identities Python already emits |
| `heatSink`   | `heat sinks:<n> <type>` | `SINGLE`, `DOUBLE`, `DOUBLE_CLAN`, `LASER`, `COMPACT`                                                    |
| `rulesLevel` | `rules level:`          | one-based levels 1-5                                                                                     |

The authority is MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:

- `Mek.java:185-229` declares `GYRO_STRING`, `GYRO_SHORT_STRING`,
  `COCKPIT_STRING` and `COCKPIT_SHORT_STRING`; `MtfFile.java:252-272` reads
  them (a blank or absent line is Standard).
- `Mek.getMtf()` (`Mek.java:5141-5372`) is the pinned writer. It emits the full
  gyro and cockpit names, appends ` (Adv. FCS)` to industrial cockpits
  (`Mek.java:4879-4894`), and writes heat sinks as `Single`, `Laser`, `Compact`,
  `IS Double` or `Clan Double` (`Mek.java:5351-5362`).
- `MtfFile.java:828-902` decodes one-based rules levels.

Both consumers read this one file:

- `scripts/megameklab-conversion/enum_mapping_tables.py` spreads each table into
  its `*_MAP` and adds only Python-only legacy aliases. `enum_mappings.py` looks
  names up exactly and **raises** `UNSUPPORTED_GYRO`, `UNSUPPORTED_COCKPIT` or
  `UNSUPPORTED_HEAT_SINK` for an unlisted name, the same contract as
  `map_armor_type`. Only a blank value means Standard/Single.
- `src/services/conversion/MTFVocabulary.ts` exposes `mapGyroType`,
  `mapCockpitType`, `mapHeatSinkType` and `mapRulesLevel`. An unlisted name
  becomes `UNSUPPORTED_GYRO:<raw>` (and the cockpit and heat sink equivalents)
  with a parse warning; the unit contract then rejects it. Unreadable rules
  levels keep their existing `STANDARD` fallback in both languages.

The file is a converter input. `strict-provenance-inputs.json` lists it, so a
change here invalidates old strict-export receipts.

## Catalog parity: `Tripod Cockpit`

Java has a real tripod cockpit, but the committed catalog and `CockpitType` do
not, so the converter has always emitted `STANDARD` for it (4 corpus units).
The table keeps `Tripod Cockpit` and `Tripod` as explicit `STANDARD` entries so
the importer matches the catalog. 4.1-g.2 changes this together with the
converter and `CockpitType`.

## Adding an entry (for 4.1-g.2)

1. Add the exact source string and identity to the right table, citing the Java
   line in the commit.
2. Python: add the string to `NEW_EXACT` (or the frozen table) in
   `scripts/__tests__/test_mtf_component_vocabulary.py`.
3. TypeScript: add a row to `MTFParser.vocabulary.test.ts`; if the identity is
   new, extend `CockpitType` (or `GyroType`/`HeatSinkType`) and the contract enum
   in the same change.
4. Prove the converter export hash: a table-only edit that no corpus string uses
   must leave `sources.ndjson` identical; an edit the corpus uses is a catalog
   decision.

Not in the table on purpose, so they stay unsupported: `Dual Cockpit`,
`Small Command Console`, `Superheavy Command Console` and their short names,
and Python's old guess-by-substring spellings.
