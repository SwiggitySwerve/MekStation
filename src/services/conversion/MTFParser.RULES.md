# FrankenMek structure import

`MTFParser.components.ts` owns structure extraction for the API importer;
`mtf_parser_builders.py` is its Python converter counterpart. Both delegate
structure identities to their existing mapping owners.

Pinned MegaMek `48fcb2f64`, `MtfFile.java:669-720`, separates each donor's
native type from its mass at the last colon. Explicit IS/Clan qualifiers win;
unqualified names use the chassis tech base. Unknown native names fail at the
import boundary. Canonical JSON identifiers are not native MTF spellings.

`structure.typeByLocation` is optional. Importing a FrankenMek emits a map,
including an empty map when no explicit donor types exist. Missing and scalar
Hybrid entries retain Java's Standard default. Non-Hybrid scalar entries use
the global native type. Existing donor-tonnage payloads remain unchanged.

Old documents without this map retain global structure behavior. Do not infer
donor types from critical slots or rewrite old saves/catalogs. The unit JSON
Schema owns canonical structure and location identities; generated Zod is
produced by `scripts/generate-zod-schemas.mjs`.
