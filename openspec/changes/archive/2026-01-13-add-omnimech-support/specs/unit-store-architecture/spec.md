# Unit Store Architecture Specification Delta

## ADDED Requirements

### Requirement: OmniMech State Fields

The unit store SHALL maintain OmniMech-specific state fields.

#### Scenario: Store tracks isOmni flag

- **Given** a unit store instance
- **When** `setIsOmni(true)` is called
- **Then** the store's `isOmni` state is `true`

#### Scenario: Store tracks base chassis heat sinks

- **Given** a unit store instance
- **When** `setBaseChassisHeatSinks(15)` is called
- **Then** the store's `baseChassisHeatSinks` state is `15`

#### Scenario: Store tracks clan name

- **Given** a unit store instance
- **When** `setClanName("Timber Wolf")` is called
- **Then** the store's `clanName` state is `"Timber Wolf"`

---

### Requirement: Equipment Pod Mounting Status

The unit store SHALL track pod mounting status for each equipment item.

#### Scenario: Equipment has isOmniPodMounted flag

- **Given** a unit store with mounted equipment
- **When** equipment is added with `isOmniPodMounted: true`
- **Then** the equipment instance in the store has `isOmniPodMounted: true`

#### Scenario: Default isOmniPodMounted for non-OmniMech

- **Given** a unit store where `isOmni: false`
- **When** equipment is added
- **Then** the equipment's `isOmniPodMounted` defaults to `false`

---

### Requirement: Reset Chassis Action

The unit store SHALL provide an action to reset the chassis by removing pod equipment.

#### Scenario: Reset chassis clears pod equipment

- **Given** an OmniMech unit with 3 fixed items and 5 pod items
- **When** `resetChassis()` is called
- **Then** the store contains only the 3 fixed items
- **And** all 5 pod items are removed

#### Scenario: Reset chassis marks unit as modified

- **Given** an OmniMech unit
- **When** `resetChassis()` is called
- **Then** the store's `isModified` flag is `true`

---

### Requirement: OmniMech State Serialization

The unit store SHALL serialize OmniMech state when exporting unit data.

#### Scenario: Export includes OmniMech fields

- **Given** an OmniMech unit with `baseChassisHeatSinks: 12` and `clanName: "Dire Wolf"`
- **When** the unit state is exported
- **Then** the export includes `baseChassisHeatSinks: 12`
- **And** the export includes `clanName: "Dire Wolf"`

#### Scenario: Export includes equipment pod status

- **Given** an OmniMech unit with equipment having `isOmniPodMounted` flags
- **When** the unit state is exported
- **Then** each equipment item includes its `isOmniPodMounted` status

## Cross-References

- `omnimech-system` - OmniMech data model definitions
- `persistence-services` - Save/load operations
