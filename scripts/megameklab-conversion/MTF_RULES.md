# MTF source rules levels

`src/types/formats/mtf-component-vocabulary.json` (`rulesLevel`) owns source
rules-level numbering, shared with the TypeScript importer. It also owns the
gyro, cockpit and heat sink names (see `MTF_COMPONENT_VOCABULARY.md` there).
`enum_mapping_tables.RULES_LEVEL_MAP` spreads it and adds Python-only aliases;
`enum_mappings.map_rules_level` consumes that table for the MTF parser and shared
conversion callers. MTF source numbers are one-based: 1 Introductory, 2 Standard,
3 Advanced, 4 Experimental and 5 Unofficial. Clan and explicit Mixed chassis
sources start at 2 in the pinned loader. This correction changes decoded rules
metadata, not construction or BV arithmetic.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`MtfFile.java:828-902` loads these values; `Mek.java:5205-5207` writes the source
value from `TechConstants.T_SIMPLE_LEVEL` (`TechConstants.java:104-106`).
Pinned MegaMekLab `62bf19360382049e2e6a1e8f24e859e27bdc5878`,
`UnitUtil.java:2001-2002`, delegates MTF saving to that `Mek.getMtf()` writer.

The table's existing named aliases and zero alias retain their values. Zero is
legacy converter compatibility, not a newly accepted pinned MTF source code.
The existing fallback and default policies are outside this correction.
Shipped unit catalogs are not regenerated here. The strict converter census
compares source rows byte for byte after removing only each unit's `rulesLevel`.
