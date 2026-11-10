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
  `mapCockpitType`, `mapHeatSinkType` and `mapRulesLevel`. **The importer loads
  what the pinned loader loads.** MegaMek never refuses a file over an
  unrecognised gyro, cockpit or heat sink string, so neither does the importer:
  it applies Java's default and adds a parse warning (returned to the caller by
  the import route):
  - gyro: exact full or short name, else Standard (`MtfFile.java:252-259`);
  - cockpit: exact full or short name, else the first Java index whose full or
    short name is a prefix (`Mek.getCockpitTypeForString`, `Mek.java:4935-4950`;
    this is how the writer's ` (Adv. FCS)` suffix reads back, quirks included:
    `Primitive Industrial Cockpit (Adv. FCS)` reads as Primitive because the
    short name `Primitive` has the lower index), else Standard
    (`MtfFile.java:262-269`). The scan order is `cockpitOrder`, checked against
    `Mek.java:214-229`;
  - heat sink: exact name from the table, else by keyword in the loader's order,
    Laser, Double (Clan or IS from the text, else the unit's own tech base),
    Compact, otherwise Single (`MtfFile.java:566-598`).
    Every Java cockpit type has its own identity (the contract holds all 19), so
    nothing is rejected or folded into Standard except a string Java itself
    defaults. Unreadable rules levels keep their existing `STANDARD` fallback in
    both languages.

**Nothing is lost.** The importer keeps the declared text next to the derived
value, inside `mtfSource` (which is saved with the unit and passes through the
contract's `catchall`, like `mtfSource.text`):

- `mtfSource.gyro`, `mtfSource.cockpit`, `mtfSource.heatSinks`: the raw values,
  present when the line is present and non-blank;
- `mtfSource.diagnostics`: one `{ field, raw, applied, reason, javaRef }` entry for
  every field the loader defaulted (`reason: 'java-default'`). Absent when
  everything was recognised. Each entry mirrors one parse warning, so the import
  result and the saved unit agree. The editor does not display them yet.

Python is stricter on purpose: its converter output feeds the committed catalog,
so an unlisted name there is an error rather than a guess (the R1 contract).

The file is a converter input. `strict-provenance-inputs.json` lists it, so a
change here invalidates old strict-export receipts.

## Tripod and the other late cockpit types

Java's table has 19 cockpits (`Mek.java:214-230`). `Tripod Cockpit` / `Tripod`
is `COCKPIT_TRIPOD` (index 10, `Mek.java:202`), and `CockpitType.TRIPOD`, `DUAL`,
`SMALL_COMMAND_CONSOLE` and `SUPERHEAVY_COMMAND_CONSOLE` exist, so each name maps
to its own identity. The committed catalog may still hold `STANDARD` for the four
pinned Tripod Cockpit units until it is regenerated; that is a catalog decision,
not a vocabulary one.

## Adding an entry (for 4.1-g.2)

1. Add the exact source string and identity to the right table, citing the Java
   line in the commit.
2. Python: add the string to `NEW_EXACT` (or the frozen table) in
   `scripts/__tests__/test_mtf_component_vocabulary.py`.
3. TypeScript: add a row to `MTFParser.vocabulary.test.ts`; if the identity is
   new, extend `CockpitType` (or `GyroType`/`HeatSinkType`) and the contract enum
   in the same change. Every name in `cockpitOrder` must keep an identity.
4. Prove the converter export hash: a table-only edit that no corpus string uses
   must leave `sources.ndjson` identical; an edit the corpus uses is a catalog
   decision.

Bare `Double` is not a table entry: Java takes its tech base from the unit, so
the importer resolves it by keyword. The Python converter keeps it as a legacy
alias for the Inner Sphere double.

Known residual: Java takes the text after `gyro:` and `cockpit:` unchanged
(`substring(5)`, `substring(8)`), so `cockpit: Small Cockpit` with a space does
not match there, while the importer trims. No pinned source has the space.
