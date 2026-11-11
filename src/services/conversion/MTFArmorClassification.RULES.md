# MTF armor coverage

`MTFVocabulary.ts` owns the native armor names used by the MTF reader and
writer. `MTFArmorClassification.ts` classifies the canonical loader identities
by export family; it contains no second spelling or code table.

The loader accepts `standardArmorType` from
`public/data/equipment/_schema/unit-schema.json` through generated
`UnitContract`. The coverage test compares the complete enum with the
classification, validates each value through that contract, and requires exact
equality between the classified mech identities and the MTF vocabulary.
Deliberate legacy export aliases remain separate from canonical identities.
An added loader identity must be classified before this test can pass.

MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:

- `Mek.java:5385-5403` writes mech armor names and Patchwork location records.
- `ArmorType.java:521,1051,1108,1139,2069` gives the prototype ferro,
  heat-dissipating, anti-penetrative, ballistic-reinforced and Patchwork names.
- `EquipmentType.java:94,1081-1089` defines prototype code 9 and resolves
  armor codes to names.
- `BLKFile.java:919-975,1060-1061` writes non-mech BLK armor fields;
  `BLKBattleArmorFile.java:141-146`,
  `BLKAeroSpaceFighterFile.java:148-164`, `BLKProtoMekFile.java:123-133` and
  `BLKFile.java:493-525` read the corresponding family fields.

## Patchwork boundary

Patchwork has a known MTF name. Writing that global name without each
location's points, armor identity and technology would lose construction data.
The frozen catalog's five Patchwork mechs have empty `armor.allocation` maps;
their numeric `typeByLocation` maps do not restore the missing points or carry
the full per-location technology context. `ISerializedArmor` exposes only the
global type and allocation. The exporter therefore refuses Patchwork with a
named context diagnostic and no content. A faithful location writer depends on
the separate typed representation and data repair; it must not infer values
from unit names, equipment, critical slots or source defaults.
