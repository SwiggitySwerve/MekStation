## ADDED Requirements

### Requirement: Reselecting the current technology mode preserves the editor draft

The unit editor SHALL treat selecting its current technology mode as a no-op
before any state, selection memory, equipment, persistence, timestamp, dirty flag
or undo/redo write. Subscribers SHALL receive no state-change notification.

#### Scenario: Reselect Mixed after opening a library design

- **GIVEN** a Mixed design with legal component selections, with or without explicit chassis context
- **WHEN** the user selects the already-selected Mixed mode
- **THEN** state identity and every selection and component technology remain unchanged
- **AND** saving and reopening preserves selection fields independently of equipment-ID preservation

#### Scenario: Reselect a pure mode with existing edit history

- **GIVEN** an Inner Sphere or Clan draft with undo/redo history
- **WHEN** the current mode is selected again
- **THEN** the draft identity, metadata, history and notifications remain unchanged

### Requirement: Mixed validation permits each component's legal technology

Full selection validation SHALL accept a Mixed unit's component selection when
it is legal for either recognized component technology. Its physical chassis
family SHALL NOT exclude an opposite-tech structure. Unknown selections SHALL
still use the existing component fallback. Genuine global Inner Sphere or Clan
switches and explicit component technology switches SHALL retain their existing
normalization, memory precedence and equipment resynchronization behavior.

#### Scenario: Opposite-tech structure on a Mixed chassis

- **GIVEN** a legal Inner Sphere structure on a Clan chassis, or the converse
- **WHEN** full selection validation receives explicit Mixed mode context
- **THEN** the installed structure and other legal component selections are retained

#### Scenario: Deliberate switch to a pure technology

- **GIVEN** a Mixed design with opposite-tech components
- **WHEN** the user switches globally to Inner Sphere or Clan
- **THEN** existing fixed-mode defaults and remembered selections still apply

Pinned intent: MegaMekLab `62bf19360382049e2e6a1e8f24e859e27bdc5878`,
`BasicInfoView.java:638-655,842-844` separates family from Mixed mode;
`BMStructureTab.java:772-784` enters its mutation body only when those flags differ.
MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`TestEntity.java:1266-1269,1320-1323,1346-1349,1373-1376,1432-1435` gates
opposite-tech equipment, cockpit, gyro, engine and armor rejection on
`!getEntity().isMixedTech()`; rules-level checks still apply. `MtfFile.java:374-382`
reads Mixed structure by its named component type. C2's pinned reference rows
classify all 16 newly flagged structures Java-valid; this change claims no new
Java probe.
