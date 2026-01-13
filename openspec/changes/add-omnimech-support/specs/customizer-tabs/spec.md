# Customizer Tabs Specification Delta

## MODIFIED Requirements

### Requirement: OmniMech Checkbox Control

The Structure Tab SHALL provide a checkbox to toggle OmniMech status.

#### Scenario: OmniMech checkbox toggles isOmni state

- **Given** the Structure Tab is displayed
- **When** the user clicks the "OmniMech" checkbox
- **Then** the unit's `isOmni` state is toggled

#### Scenario: Enabling OmniMech shows additional controls

- **Given** the Structure Tab with OmniMech checkbox unchecked
- **When** the user checks the "OmniMech" checkbox
- **Then** the "Base Chassis Heat Sinks" spinner becomes visible
- **And** the "Reset Chassis" button becomes visible

#### Scenario: Disabling OmniMech hides additional controls

- **Given** the Structure Tab with OmniMech checkbox checked
- **When** the user unchecks the "OmniMech" checkbox
- **Then** the "Base Chassis Heat Sinks" spinner is hidden
- **And** the "Reset Chassis" button is hidden

---

### Requirement: Base Chassis Heat Sinks Control

The Structure Tab SHALL provide a spinner to set base chassis heat sinks for OmniMechs.

#### Scenario: Spinner visible only for OmniMechs

- **Given** a standard BattleMech (isOmni: false)
- **When** the Structure Tab is displayed
- **Then** the "Base Chassis Heat Sinks" spinner is NOT visible

#### Scenario: Spinner respects engine capacity maximum

- **Given** an OmniMech with engine capacity of 10 free heat sinks
- **When** the Structure Tab is displayed
- **Then** the spinner maximum value is 10

#### Scenario: Spinner updates baseChassisHeatSinks

- **Given** an OmniMech displayed in the Structure Tab
- **When** the user changes the spinner value to 8
- **Then** the unit's `baseChassisHeatSinks` is set to 8

---

### Requirement: Reset Chassis Button

The Structure Tab SHALL provide a button to reset the OmniMech chassis.

#### Scenario: Button visible only for OmniMechs

- **Given** a standard BattleMech (isOmni: false)
- **When** the Structure Tab is displayed
- **Then** the "Reset Chassis" button is NOT visible

#### Scenario: Button triggers reset chassis action

- **Given** an OmniMech displayed in the Structure Tab
- **When** the user clicks "Reset Chassis"
- **Then** a confirmation dialog is shown

#### Scenario: Confirming reset removes pod equipment

- **Given** an OmniMech with pod-mounted equipment
- **And** the user clicked "Reset Chassis"
- **When** the user confirms the dialog
- **Then** all pod-mounted equipment is removed
- **And** fixed equipment remains

#### Scenario: Canceling reset preserves equipment

- **Given** an OmniMech with pod-mounted equipment
- **And** the user clicked "Reset Chassis"
- **When** the user cancels the dialog
- **Then** all equipment (fixed and pod) remains unchanged

## Cross-References

- `omnimech-system` - OmniMech data model
- `unit-store-architecture` - State management
- `confirmation-dialogs` - Dialog patterns
