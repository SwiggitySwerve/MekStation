# Mixed Tech chassis source facts

MTF conversion preserves explicit `Mixed (Clan Chassis)` and `Mixed (IS Chassis)`
qualifiers in the existing `componentTechBases.chassis` contract while retaining
the global `MIXED` tech base. `enum_mappings.map_chassis_tech_base` owns qualifier
projection and reuses the existing tech-base mapping. Unqualified legacy sources
gain no inferred component selection. This projection alone changes no BV rule.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`MtfFile.java:867-902`, selects IS or Clan chassis tech before setting Mixed Tech.
The canonical contract was introduced by #2791; this converter uses it without
new schema fields. `test_mtf_chassis_tech.py` validates both qualifiers against
that contract and preserves the absence of unqualified selections.

BLK vehicle, aerospace and infantry conversion uses the same qualifier projection
through `blk_unit_fields.mixed_chassis_fields`. The strict BLK tech-type decoder
validates the header and its rules-level suffix before the shared qualifier
projection runs. These three converters append `componentTechBases` last, with
only `chassis`, reproducing the #3287 packet byte order. Non-Mixed headers add
nothing; battle armor retains its existing `clanChassis` contract. Capital
conversion remains a separate residual: its legacy `map_tech_base` does not
retain qualified Mixed identity.

`test_blk_mixed_chassis.py` pins LF-normalized source hashes and pre-change output
hashes for both vehicle/aerospace chassis allegiances and a Clan infantry source.
It covers all accepted Mixed suffixes, non-Mixed controls and battle armor.
