## ADDED Requirements

### Requirement: Launched Campaign Sessions Start Battle-Ready

A campaign-launched interactive session SHALL start with every deployed unit carrying its full canonical armor and structure values, and advancing out of the Initiative phase SHALL NOT produce a terminal battle outcome unless combat or withdrawal events justify it.

#### Scenario: Fresh campaign battle survives the initiative roll

- **GIVEN** a freshly launched campaign mission with four player units and four opponent units
- **WHEN** the player activates the Initiative-phase progression control once
- **THEN** the session SHALL advance to the Movement phase with all eight units alive
- **AND** no terminal outcome (victory, defeat, or draw) SHALL be recorded
- **AND** every unit's armor and structure SHALL match its canonical record (no zero-HP units at battle start)

#### Scenario: Terminal outcomes require justifying events

- **WHEN** an interactive session records a terminal outcome
- **THEN** the session event log SHALL contain the combat, withdrawal, or concession events that produced that outcome (a terminal outcome with no preceding combat events is a defect)
