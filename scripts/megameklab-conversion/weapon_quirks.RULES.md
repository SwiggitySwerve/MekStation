# Conversion-time quirks

`weapon_quirks.py` owns native `QUIRK:LOCATION:SLOT:WEAPON_NAME` extraction.
`blk_unit_fields.parse_quirk_fields` combines it with the existing unit-quirk
owner for every BLK family. MTF delegates each native weaponquirk entry to the
same grammar before building SerializedUnit. Native keys match the TS source
parser: `LOCATION:SLOT:WEAPON_NAME`, preserving case and expected type name.

Retain source IDs, ordering, multiple quirks and duplicates. Omit absent fields.
Malformed native converter input fails explicitly; it must not silently lose
entries during catalog generation. Unit quirks are written at conversion time,
including valued strings such as `obsolete:3045`.

Authority: MegaMek 48fcb2f64 MtfFile.java:639-649, BLKFile.java:218-230 and
Entity.java:17256-17315. Regeneration may change only top-level `quirks` and
`weaponQuirks`; index, equipment and numerical fields retain their existing bytes.

The regeneration CLI finishes each generation with the repository-installed
oxfmt version and exact config/ignore bytes. A temporary mirror retains native
`public/data/units/<family>/...` paths, so formatter-exempt families stay exempt;
arbitrary external output paths cannot establish repository family policy.
Only changed unit files are offered to the formatter; manifests remain untouched.
The raw non-quirk byte gate still runs after formatting. Both independent outputs
must equal the committed candidate, and another formatting pass and normal hooks
must leave those bytes unchanged. Formatter version, policy and lock hashes are
recorded in the generation report. Parser grammar and mount keys are unchanged.
