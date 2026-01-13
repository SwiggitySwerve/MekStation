# Serialization Formats Specification Delta

## ADDED Requirements

### Requirement: MTF Parser OmniMech Fields

The MTF parser SHALL support OmniMech-specific fields.

#### Scenario: Parse Base Chassis Heat Sinks field

- **Given** an MTF file containing `Base Chassis Heat Sinks:15`
- **When** the file is parsed
- **Then** the result includes `baseChassisHeatSinks: 15`

#### Scenario: Parse clanname field

- **Given** an MTF file containing `clanname:Timber Wolf`
- **When** the file is parsed
- **Then** the result includes `clanName: "Timber Wolf"`

#### Scenario: Parse omnipod equipment marker

- **Given** an MTF equipment line `CLERLargeLaser (omnipod)`
- **When** the line is parsed
- **Then** the equipment name is `CLERLargeLaser`
- **And** `isOmniPodMounted` is `true`

#### Scenario: Parse equipment without omnipod marker

- **Given** an MTF equipment line `CLDoubleHeatSink`
- **And** the unit is an OmniMech
- **When** the line is parsed
- **Then** the equipment name is `CLDoubleHeatSink`
- **And** `isOmniPodMounted` is `false`

---

### Requirement: MTF Exporter OmniMech Fields

The MTF exporter SHALL output OmniMech-specific fields when applicable.

#### Scenario: Export Base Chassis Heat Sinks

- **Given** an OmniMech unit with `baseChassisHeatSinks: 12`
- **When** the unit is exported to MTF
- **Then** the output contains the line `Base Chassis Heat Sinks:12`
- **And** the line appears after `Heat Sinks:` line

#### Scenario: Export clanname

- **Given** an OmniMech unit with `clanName: "Dire Wolf"`
- **When** the unit is exported to MTF
- **Then** the output contains the line `clanname:Dire Wolf`
- **And** the line appears after the `chassis:` line

#### Scenario: Export pod equipment with marker

- **Given** an OmniMech unit with equipment `{ name: "ER Large Laser", isOmniPodMounted: true }`
- **When** the unit is exported to MTF
- **Then** the equipment line is `CLERLargeLaser (omnipod)`

#### Scenario: Export fixed equipment without marker

- **Given** an OmniMech unit with equipment `{ name: "Double Heat Sink", isOmniPodMounted: false }`
- **When** the unit is exported to MTF
- **Then** the equipment line is `CLDoubleHeatSink` (no omnipod suffix)

#### Scenario: Do not export OmniMech fields for standard mechs

- **Given** a standard BattleMech (not OmniMech)
- **When** the unit is exported to MTF
- **Then** the output does NOT contain `Base Chassis Heat Sinks:` line
- **And** the output does NOT contain `clanname:` line
- **And** equipment lines do NOT have `(omnipod)` suffix

## Cross-References

- `omnimech-system` - Defines OmniMech data model
- `equipment-database` - Equipment name mappings
