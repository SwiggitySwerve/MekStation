## MODIFIED Requirements

### Requirement: UI Integration

The system SHALL provide React hooks for integrating validation into the customizer UI.

#### Scenario: useUnitValidation hook provides validation state

- **WHEN** the useUnitValidation hook is called within a UnitStoreProvider
- **THEN** hook SHALL return validation status ('valid', 'warning', 'error', 'info')
- **AND** hook SHALL return errorCount (number of errors)
- **AND** hook SHALL return warningCount (number of warnings)
- **AND** hook SHALL return isValid boolean
- **AND** hook SHALL return hasCriticalErrors boolean

#### Scenario: Hook reads from Zustand store

- **WHEN** useUnitValidation hook executes
- **THEN** hook SHALL read unit state from useUnitStore
- **AND** hook SHALL convert store state to IValidatableUnit format
- **AND** hook SHALL derive era from year using getEraForYear

#### Scenario: Hook memoizes validation results

- **WHEN** unit state has not changed
- **THEN** hook SHALL return cached validation result
- **AND** validation SHALL not re-run unnecessarily

#### Scenario: Hook auto-initializes validation rules

- **WHEN** useUnitValidation is first called
- **THEN** hook SHALL call initializeUnitValidationRules() if not already initialized
- **AND** all universal and category rules SHALL be registered

#### Scenario: ValidationSummary is sole validation display in header

- **WHEN** UnitEditorWithRouting renders
- **THEN** UnitInfoBanner SHALL contain ValidationSummary component
- **AND** ValidationSummary SHALL display compact badge with error/warning counts
- **AND** clicking ValidationSummary badge SHALL expand dropdown with issue details
- **AND** dropdown items SHALL be clickable to navigate to relevant tab
- **AND** no separate ValidationPanel SHALL render in the header area

#### Scenario: ValidationTabBadge provides per-tab indicators

- **WHEN** CustomizerTabs renders
- **THEN** each tab SHALL display ValidationTabBadge if issues exist for that tab
- **AND** badge SHALL show error count (red) or warning count (amber)
- **AND** badge SHALL be compact (18px circular)

#### Scenario: Validation updates in real-time

- **WHEN** user modifies unit in customizer
- **THEN** validation SHALL re-run automatically
- **AND** ValidationSummary SHALL update to reflect new validation state
- **AND** status SHALL change from 'valid' to 'error' when errors exist
