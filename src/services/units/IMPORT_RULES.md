# Unit source import

`importMTFDefinition` owns MTF source-to-definition orchestration. It calls the
existing MTF parser and `loadUnitDefinition` admission contract; it owns no native
parsing, construction, equipment, legality or BV rule. Structural admission does
not establish construction validity. No new construction-validity gate applies.

`POST /api/units/import` accepts `{ sourceFormat: 'mtf', sourceText: string }`
alongside existing raw JSON and versioned JSON envelopes. Failed parsing and
unsupported contract fields return client diagnostics, retaining parser warnings.
Accepted definitions retain source text and parser metadata through repository
persistence; the repository allocates a distinct custom identity. Existing name
conflicts return 409 without overwriting saved units.

The API does not authenticate caller-declared provenance as a pinned source.
The source text is provenance of this import, not proof of upstream equivalence.
`importMTF.test.ts` verifies pinned original bytes separately and exercises real
SQLite persistence and shared definition reload. It does not establish complete
MTF semantic or numerical parity. BLK import, browser file selection and the
legacy `IMTFImporter` runtime-object interface remain separate work.
