## MODIFIED Requirements

### Requirement: Tactical map runtime movement controls are replayable and rules-backed

Movement projection state controls SHALL dispatch replayable runtime movement
state events that keep selected-unit command state, map projection, and
committed movement validation aligned with the represented tactical rules.

#### Scenario: AirMek-to-Mek conversion automatically grounds represented AirMek elevation

- **GIVEN** a represented LAM is selected in AirMek mode with positive
  `lamAirMekAltitude`
- **WHEN** the player chooses the Mek Mode conversion command
- **THEN** the conversion command SHALL dispatch `conversionMode: "mek"`,
  the source-backed AirMek-to-Mek conversion step metadata, and
  `lamAirMekAltitude: 0`
- **AND** replaying that conversion SHALL leave the unit in Mek mode with no
  stale AirMek altitude-control ground-projection blocker
- **AND** AirMek-to-Fighter conversion SHALL NOT implicitly clear represented
  AirMek elevation.
