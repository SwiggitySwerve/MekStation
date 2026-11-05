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
