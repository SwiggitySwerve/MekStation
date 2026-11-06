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
