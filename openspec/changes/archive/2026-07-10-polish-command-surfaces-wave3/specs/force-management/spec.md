# force-management — Delta for polish-command-surfaces-wave3

## ADDED Requirements

### Requirement: Custom Unit Name Resolution in Force Display

Force display surfaces — the force detail page and the pre-battle force review — SHALL resolve every assigned unit's display name through the merged canonical + custom unit lookup, so that custom units (ids `custom-*`) render their `${chassis} ${variant}` name and their assignment state. A custom unit assigned to a slot SHALL NOT render as a `Slot N` placeholder or as an empty "+ Select Unit" slot, and custom units SHALL be selectable in the assignable-unit picker. When the custom-unit source cannot be loaded, the surface SHALL degrade to the existing placeholder rather than fail.

**Rationale**: Custom units live outside the static canonical index; force display surfaces that resolve names from the canonical index alone show a placeholder for a custom unit, and one surface renders an assigned custom unit as an empty slot — misrepresenting assignment state.

**Priority**: Medium

#### Scenario: Custom unit shows its real name on a pre-battle force card

- **GIVEN** a force with a slot assigned to a custom unit (id `custom-…`)
- **WHEN** the pre-battle force card renders that assignment
- **THEN** the card SHALL display the custom unit's `${chassis} ${variant}` name
- **AND** it SHALL NOT display the `Slot N` placeholder for that assignment

#### Scenario: Custom unit renders as assigned on the force detail page

- **GIVEN** the force detail page for a force with a slot assigned to a custom unit
- **WHEN** the page derives its unit map from the merged canonical + custom lookup
- **THEN** the assigned custom unit SHALL render as an assigned slot showing its name
- **AND** it SHALL NOT render as an empty "+ Select Unit" slot
- **AND** the custom unit SHALL appear among the assignable units in the picker

#### Scenario: Canonical unit behavior is preserved

- **GIVEN** a force with a slot assigned to a canonical unit
- **WHEN** the force display surfaces render that assignment
- **THEN** the canonical unit's name SHALL resolve exactly as before this change

#### Scenario: Custom-unit source failure degrades to placeholder

- **GIVEN** a force display surface whose custom-unit source fails to load
- **WHEN** the surface resolves an assigned unit name
- **THEN** it SHALL degrade to the existing placeholder for the unresolved unit
- **AND** it SHALL NOT crash the surface
