## Why

Pinned MTF parser outputs fail the existing unit contract because source OmniMek,
Clan XL and light/heavy ferro vocabulary differs from wire vocabulary. Other
armor identities silently collapse to standard armor or generic ferro armor.

## What Changes

- Repair vocabulary in the existing MTF adapter only; preserve original source text.
- Map supported armor identities explicitly and retain unsupported armor/configuration
  facts in rejected definitions rather than inventing standard construction.
- Verify pinned original bytes through MTFParserService, UnitContract and loadUnitDefinition.

## Impact

- Affected spec: serialization-formats.
- Owned code: MTFParserService, MTFParserHelpers and MTFParser.mapping; focused tests.
- No schema weakening, BLK, catalog, persistence, direct importer, UI or BV changes.
- FrankenMek and armor kinds absent from the existing schema remain unsupported.
