## ADDED Requirements

### Requirement: Explicit Mixed Tech chassis context in MTF export

MTF export SHALL format a Mixed Tech unit from its explicitly supplied serialized
`componentTechBases.chassis`. The formatter SHALL accept typed Inner Sphere or
Clan chassis context, reject missing or invalid context without content, and
preserve pure Inner Sphere and Clan export bytes.

The pinned MegaMek `48fcb2f64` reader (`MtfFile.java:867-906`) requires the
qualified Mixed headers; its writer (`Mek.java:5184-5190`) selects the header
from the chassis technology family. MegaMekLab `62bf193` distinguishes that
family from Mixed mode in `BasicInfoView.java:638-655` and applies the choices
in `BMStructureTab.java:773-802`.

#### Scenario: Export either explicit Mixed chassis family

- **GIVEN** a Mixed Tech unit with explicit `componentTechBases.chassis`
- **WHEN** MTF export receives `INNER_SPHERE` or `CLAN`
- **THEN** its header SHALL be exactly `techbase:Mixed (IS Chassis)` or `techbase:Mixed (Clan Chassis)`, respectively
- **AND** component technologies and retained source text SHALL NOT override the supplied chassis

#### Scenario: Refuse unresolved Mixed chassis context

- **GIVEN** a Mixed Tech unit with missing or invalid chassis context
- **WHEN** MTF export is requested
- **THEN** it SHALL return a chassis-context diagnostic and no content
- **AND** it SHALL NOT infer the chassis from IDs, legacy unit lists, retained source text, other components or loader defaults
- **AND** independent unsupported-component diagnostics SHALL remain visible

#### Scenario: Preserve save and pure-tech behavior

- **GIVEN** a loaded Mixed Tech unit with explicit chassis context
- **WHEN** the unit is serialized, reopened and exported
- **THEN** its Mixed classification, chassis family and qualified output header SHALL be preserved
- **AND** full chassis identity on MTF re-import SHALL depend on the parser retaining the explicit header family
- **WHEN** an unchanged pure Inner Sphere or Clan unit is exported
- **THEN** its complete export bytes SHALL remain unchanged

### Requirement: Preserve binary technology facts at the BLK import boundary

The common BLK import boundary SHALL decode qualified Mixed headers once into
the existing binary chassis technology and rules level. `Mixed (Clan Chassis)`
SHALL select Clan and `Mixed (IS Chassis)` SHALL select Inner Sphere. An absent
suffix SHALL select Standard; Advanced and Experimental SHALL select their
existing rules levels. Explicit component identities, including `clan_engine`,
SHALL retain precedence over chassis defaults. This requirement adds no Mixed
mode field or exporter behavior.

MegaMek `48fcb2f64` owns these header facts in `BLKFile.java:654-742`;
`Entity.java:1971-1983` derives chassis family from the tech level, and
`BLKFile.java:908-917` writes an explicit engine flag when engine and chassis
families differ. Existing pure-source family parsing, including the historical
Level 5 fallback, SHALL remain unchanged.

#### Scenario: Import and reopen native qualified Mixed sources

- **GIVEN** a supported BLK source with a qualified Mixed header
- **WHEN** it passes through its family handler, import service and SQLite persistence
- **THEN** the definition, metadata and reopened definition SHALL retain the header's binary chassis family and representable rules level
- **AND** the exact source and explicit component identities SHALL be retained

#### Scenario: Refuse an unrepresentable qualified Unofficial level

- **GIVEN** a qualified Mixed header whose suffix is Unofficial
- **WHEN** the source is imported
- **THEN** import SHALL return an explicit diagnostic because RulesLevel has no Unofficial member
- **AND** the API SHALL refuse the source without a database write

#### Scenario: Preserve pure imports

- **GIVEN** an unchanged accepted pure IS or Clan source
- **WHEN** it is imported with the same dependencies and clock
- **THEN** its complete typed definition bytes SHALL remain unchanged
