# Equipment category and lookup rules

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

Native Java lookup corrections are owned by
`utils/construction/equipmentBV/sourceLookupAliases.ts` through
`nativeIdentityId`. Exact catalog IDs remain stable. Proven native names
precede fuzzy aliases and unit-tech preferences across loading, conversion, BV,
hydration and printing. Missing Java identities require catalog generation;
never substitute a related technology or unit-family variant. FU-79's pinned
identity review supplies the corrections and defers unrepresented identities.
