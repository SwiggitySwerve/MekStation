# Equipment category and lookup rules

`scripts/equipment-catalog/` adds pinned Java registry identities with the
lowercase kebab-case internal name plus `-registry`. It rejects ID collisions and
preserves every existing catalog item. Java lookup results
decide shared alias ownership. Both registry lookup and BV use the catalog's
existing name-mappings owner. The five approved Q1 reroutes are declared in
`public/data/equipment/registry-routing.json`; other aliases retain their values.
That file also preserves canonical IDs required by existing consumers. Identity
resolution does not establish legality.
The generator records variable Java sentinels in `special`; numeric zero is
the catalog's existing variable-value convention, not a calculated mass/BV.
`kgPerShot` and infantry kit `damageDivisor` are intrinsic Java facts; the
ProtoMech and infantry BV stopgap consumers remain until a separate migration.
Ammo compatibility keeps the extractor's platform/technology priority because
some existing BV readers use the first compatible weapon as their pool key.
`protected-aliases.json` freezes existing resolver results and explicit alias
owner targets; generation preserves them alongside the unchanged alias map.

`EquipmentParsers` owns conversion of catalog category strings to equipment
enums. The miscellaneous parser explicitly maps Heat Sink, Jump Jet, Movement
Enhancement, Defensive, Myomer, Industrial and Miscellaneous. Unrecognized
strings become `MiscEquipmentCategory.UNKNOWN`; inherited object properties
are not category mappings. This preserves the parser's permissive loading
policy without assigning an unrelated category.

`EquipmentLookupService` retains Miscellaneous and Unknown definitions for ID
lookup, category queries and search. This establishes identity, not construction
legality or unit compatibility.

Heat Sink and Jump Jet definitions remain excluded from this lookup because
the BattleMech Structure tab configures them through dedicated equipment
utilities. The underlying loader still exposes them to configuration callers.

`getAllEquipment()` preserves the existing BattleMech browser inventory.
Miscellaneous and Unknown records are lookup-only until browser support is
separately defined. Exclude those records by identity, since physical weapons
can share their IDs. Preserve order, fields and physical weapon definitions.
Rebuilding the source cache also rebuilds the browser exclusions.

The official-corpus regression suite in
`__tests__/EquipmentLookupService.categories.test.ts` enforces category
conversion, unknown retention, configuration exclusions and shared-ID browser
preservation. Corpus-wide list and normalization comparisons are lane evidence,
not a permanent CI gate.
