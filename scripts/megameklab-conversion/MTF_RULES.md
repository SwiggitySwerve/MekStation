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

# MTF source configuration

`enum_mappings.map_mech_config` is the only owner of the `Config:` mapping; it has
no table. The converter SHALL select the contract `configuration` the way pinned
MegaMek `48fcb2f64` does, `MtfFile.java:283-310`: test `chassisConfig.contains(...)`
in the order QuadVee, Quad, LAM, Tripod, and build a `BipedMek` for everything else.
`QuadVee` is tested before `Quad` because it contains it. The `OmniMek` and
`FrankenMek` suffixes never change the geometry: `Tripod OmniMek` is a Tripod
(`:307-308`); omni-ness is the separate `chassisConfig.contains("Omni")` test
(`:358-359`), and `Biped FrankenMek` is a Biped.

An unmatched or empty `Config:` value is converted to `Biped`, because that is the
pinned loader's own `else` branch. This is a deliberate match of Java, not a
project default: the 4,263 pinned BattleMech sources hold only the ten values
`Biped`, `Biped OmniMek`, `Biped FrankenMek`, `Quad`, `Quad OmniMek`, `QuadVee`,
`QuadVee OmniMek`, `LAM`, `Tripod` and `Tripod OmniMek`, all of which match. The
converter has no per-record diagnostics channel, so a string that matches no token
is not reported; adding one is a separate change. Matching is case-sensitive, like
`String.contains`.

Before this change `Tripod OmniMek` fell through a lookup table to `Biped`. The
shipped catalogs are not regenerated here; the six Ares sources are the only
converter outputs that move.

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
