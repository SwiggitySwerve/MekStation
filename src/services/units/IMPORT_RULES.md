# Unit source import

`importBLKDefinition` admits `protomechs`, `vehicles` and `aerospace` through the existing BLK
parser, family handlers and shared definition validator. Vehicles dispatch to the
combat-vehicle, VTOL or support handler using the parser's discriminator, including
LargeSupportTank and SupportVTOL. Aerospace uses the fighter, conventional-fighter,
small-craft and dedicated FixedWingSupport handlers; the support handler's public
`canHandle` contract selects that subtype, including sources in the vehicle folder.
Aerospace armor retains the handler's arcs in `armor.byArc`, and movement retains
safe/max thrust. Heat sinks retain their count and use the native BV adapter's
shared `resolveBlkAerospaceHeatSinkType` mapping for the contract identity.
Full native facts and construction diagnostics remain in `blkSource`.
Other BLK families are explicitly unsupported until their serial slices land.
Capital remains unsupported in this slice; its eventual import will be read-only
under owner ruling O2.
Construction-invalid but structurally representable
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
other BLK families and browser BLK selection remain open.

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
original-byte vehicle fixtures and eight aerospace sources through real SQLite,
the saved-unit API/client and shared definition reload, including pinned invalid
designs with retained construction diagnostics. Aerospace covers fighters,
conventional fighters, aerodyne/spheroid small craft and small/large FixedWingSupport.
Other BLK families and browser BLK selection remain separate work.

The legacy `IMTFImporter` runtime-object interface and `MTFImportService` are
retired under owner ruling O2. Their exports, singleton factories and
`services.conversion.importer` registry entry are removed. No live caller used
the service or its JSON helpers. MTF source import uses `importMTFDefinition`
through `POST /api/units/import`; retirement changes no saved format or native
import rule.
