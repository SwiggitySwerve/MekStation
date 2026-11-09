# MTF source rules levels

`enum_mapping_tables.RULES_LEVEL_MAP` owns source rules-level numbering;
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

# Critical weapon recovery

`mtf_source_equipment.py` adapts native critical weapons into existing serialized
equipment fields. It consumes `sourceWeaponMountProfiles.json`,
`physicalWeaponFormulas.json`, name mappings, tech routes and the catalogs named
in `strict-provenance-inputs.json`. Catalog values and physical divisors are not
copied into Python. Each consumed input is fingerprinted in strict receipts.

MegaMek `48fcb2f64`, `MtfFile.java:545-548,1053-1068,1086-1175`, supplies reverse
location traversal, shared Talons, adjacent split weapons and sized criticals.
`Mek.java:3484-3492` converts superheavy demand into physical entries once.
The Python adapter mirrors the existing TS source-mount contract; per-source
native comparisons and cross-language cases enforce that contract.

Summary entries consume one complete native mount each, retaining their original
fields. Only unrepresented mounts are appended, including rear/Omni flags and
primary positions. Split/spread positions remain recoverable from criticals.
Ammo cannot become a weapon even when its catalog id overlaps. Unknown and
incomplete groups remain in the grid; recognized incomplete groups warn.
Existing Chaff Pod recovery stays separate and unchanged. Fixed miscellaneous
recovery and variable industrial sizing beyond these weapon profiles remain
with PR-D; no catalog output is rewritten by this adapter.
