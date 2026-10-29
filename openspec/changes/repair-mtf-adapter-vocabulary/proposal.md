## Why

Pinned MTF parser outputs fail the existing unit contract because source OmniMek,
Clan XL and light/heavy ferro vocabulary differs from wire vocabulary. Other
armor identities silently collapse to standard armor or generic ferro armor.

## What Changes

- Repair vocabulary in the existing MTF adapter only; preserve original source text.
- Map supported armor identities explicitly and retain unsupported armor/configuration
  facts in rejected definitions rather than inventing standard construction.
- Verify pinned original bytes through MTFParserService, UnitContract and loadUnitDefinition.
- Preserve supported engine/armor names on export and reject unsupported identities
  or unresolved MIXED chassis context with diagnostics and no content.

## Impact

- Affected spec: serialization-formats.
- Owned code: MTFParserService, MTFParserHelpers, MTFParser.mapping, the shared
  MTFVocabulary owner, MTFExportHelpers and MTFExportService; focused tests.
- No schema weakening, BLK, catalog, persistence, direct importer, UI or BV changes.
- FrankenMek and armor kinds absent from the existing schema remain unsupported.

## Bounded export continuation

The shared vocabulary extraction and five-identity export compatibility repair
are already merged. This continuation extends that owner with faithful output
for the remaining supported engine/armor identities and explicit export failures.
Parser normalization and deliberate legacy export aliases remain unchanged.

Sources: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`MtfFile.java:387-466,867-905` and `Engine.java:317-346`; original mm-data
`50f7efef0c9f775b0258f8283525ed4f906e1985` fixtures.

The guarantee is local component vocabulary, engine rating and armor allocation
preservation. Pure Clan unmarked XL still parses as XL; a Clan suffix cannot
override pure IS chassis context upstream. No contextual conflict guard is added.
Editor import, domain enum mappings, upstream contextual identity, other component
fields and numerical parity remain follow-ups. Original source text is evidence,
not authority for current edited chassis context. No broader loading/editor/save
or reload requirement is completed by this continuation.
