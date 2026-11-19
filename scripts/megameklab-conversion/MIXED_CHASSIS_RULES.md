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

## Mixed component sides (rows 2.1.3 and 2.1.5)

Every qualified Mixed source also states the component sides the pinned loaders
derive, so absence on a Mixed unit never has to be interpreted:

- **Mek engine.** `componentTechBases.engine` on every Mixed mek with an
  `engine:` line (`enum_mappings.map_mixed_engine_tech_base`): `MtfFile.java:387-392`
  with `Entity.itemOppositeTech:13668-13674`. An IS chassis is Clan when the line
  contains `(c)` or `clan`; a Clan chassis is IS when it contains `(is)` or
  `inner sphere`. The `XL`/`CLAN_XL` engine token must agree with the field;
  `test_mixed_tech_sides.py` pins both.
- **Vehicle and fighter armor.** `componentTechBases.armor`
  (`blk_unit_fields.mixed_armor_side`), after `chassis`: the level from
  `armor_tech_level`, else `armor_tech`, else the chassis side
  (`BLKFile.java:1951-1958`, `BLKTankFile.java:283-304`; support vehicles read only
  `armor_tech_level`, `BLKFile.java:505-524`), mapped by
  `clanTechLevels` in `src/types/formats/mtf-component-vocabulary.json`. Patchwork
  armor has one level per location, so no single side is emitted. Infantry and
  battle armor emit no armor side.
- **Vehicle and fighter engine.** The existing `clanEngine` carrier: the source
  tag when present, otherwise the loader's own rule
  (`blk_unit_fields.untagged_mixed_clan_engine`). Tank, VTOL, AeroSpaceFighter and
  ConvFighter take the chassis side (`BLKTankFile.java:144-151`,
  `BLKVTOLFile.java:94-102`, `BLKAeroSpaceFighterFile.java:115-123`,
  `BLKConvFighterFile.java:106-114`); LargeSupportTank always takes the chassis
  side (`BLKLargeSupportTankFile.java:98-101`); SupportTank, SupportVTOL,
  FixedWingSupport and SmallCraft never set `Engine.CLAN_ENGINE`. An unknown
  UnitType raises. Non-Mixed sources keep emitting `clanEngine` only from a tag.
