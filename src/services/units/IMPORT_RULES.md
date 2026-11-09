# Unit source import

`importBLKDefinition` admits `protomechs` and `vehicles` through the existing BLK
parser, family handlers and shared definition validator. Vehicles dispatch to the
combat-vehicle, VTOL or support handler using the parser's discriminator, including
LargeSupportTank and SupportVTOL. Other BLK families are explicitly unsupported
until their serial import slices land; capital import will remain read-only under
owner ruling O2. Construction-invalid but structurally representable
records remain loadable; handler diagnostics are retained, not used as a new gate.
No handler serializer is called. `blkSource` retains exact text, the full parsed
document, the complete handler unit and diagnostics. The definition projects
armor, movement and ordered equipment into the shared shape; native syntax,
original mount IDs/blocks and source-only fields remain in the snapshot.
`src/types/formats/blk-armor-codes.json` owns native armor-code-to-contract tags
for Python conversion and direct BLK import, including BAR. The editor-specific
encoder/decoder retains its existing supported subset and compatibility aliases.
ProtoMech import retains its existing `PROTO_ARMOR_CODES` admission subset.
Shared schema defaults do not certify native mount effects. Blank native model names
remain blank. This API does not promise new editor admission or native parity;
other BLK families, browser BLK selection and the legacy importer remain open.

`importMTFDefinition` owns MTF source-to-definition orchestration. It calls the
existing MTF parser and `loadUnitDefinition` admission contract; it owns no native
parsing, construction, equipment, legality or BV rule. Structural admission does
not establish construction validity. No new construction-validity gate applies.

`POST /api/units/import` accepts `{ sourceFormat: 'mtf' | 'blk', sourceText: string }`
alongside existing raw JSON and versioned JSON envelopes. Failed parsing and
unsupported contract fields return client diagnostics, retaining parser warnings.
Accepted definitions retain source text and parser metadata through repository
persistence; the repository allocates a distinct custom identity. Existing name
conflicts return 409 without overwriting saved units.

The API does not authenticate caller-declared provenance as a pinned source.
The source text is provenance of this import, not proof of upstream equivalence.
`importMTF.test.ts` verifies pinned original bytes separately and exercises real
SQLite persistence and shared definition reload. It does not establish complete
MTF semantic or numerical parity. `importBLK.test.ts` verifies eight pinned
original-byte vehicle fixtures through real SQLite, the saved-unit API/client and
shared definition reload, including retained construction diagnostics. Other BLK
families, browser BLK selection and the legacy `IMTFImporter` runtime-object
interface remain separate work.
