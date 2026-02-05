## MODIFIED Requirements

### Requirement: Preview Rendering

The system SHALL render a live preview of the record sheet in the browser.

**Rationale**: Users need to see changes immediately as they edit the unit.

**Priority**: High

**Status**: IMPLEMENTED

#### Scenario: Preview display

- **WHEN** PreviewTab is active
- **THEN** RecordSheetPreview component renders current unit via SVG template
- **AND** preview updates when unit configuration changes
- **AND** preview maintains aspect ratio of paper size

#### Scenario: Preview DPI and quality

- **WHEN** preview canvas renders
- **THEN** use 20x DPI multiplier for crisp text at all zoom levels
- **AND** support zoom range from 20% to 300%

#### Scenario: Preview BV calculation

- **WHEN** record sheet preview renders
- **THEN** BV is calculated using CalculationService.calculateBattleValue()
- **AND** BV is passed to unitConfig for template population
- **AND** BV updates reactively when unit configuration changes

#### Scenario: Preview updates on unit tab switch

- **GIVEN** multiple unit tabs are open
- **AND** user is on the Preview tab
- **WHEN** user switches to a different unit tab
- **THEN** the preview canvas SHALL re-render with the newly selected unit's data
- **AND** all displayed values (tonnage, name, armor, equipment) SHALL match the active unit
- **AND** no stale data from the previous unit SHALL appear in the preview
