# firing-arc-calculation Specification Delta

## MODIFIED Requirements

### Requirement: Per-Hex Arc Classification For UI

The firing arc system SHALL expose a per-hex classifier that returns
`front | left-side | right-side | rear | out-of-arc` so the UI can
shade a unit's arcs without reimplementing the arc math.

#### Scenario: Arc classifier returns front for forward wedge

- **GIVEN** a unit at position (0,0) facing 0 (north)
- **WHEN** classifying the hex directly in front
- **THEN** the classifier SHALL return `front`

#### Scenario: Arc classifier returns rear for opposite wedge

- **GIVEN** a unit facing 0
- **WHEN** classifying a hex in the rear 180-degree wedge
- **THEN** the classifier SHALL return `rear`

#### Scenario: Side arcs distinguish left from right

- **GIVEN** a unit facing 0
- **WHEN** classifying a hex to the unit's left side
- **THEN** the classifier SHALL return `left-side`
- **AND** a hex to the right SHALL return `right-side`

#### Scenario: Out-of-map hex returns out-of-arc

- **GIVEN** a target hex outside map bounds
- **WHEN** classifying
- **THEN** the classifier SHALL return `out-of-arc`
