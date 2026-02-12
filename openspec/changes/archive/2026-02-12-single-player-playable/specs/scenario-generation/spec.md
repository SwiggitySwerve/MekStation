## ADDED Requirements

### Requirement: Scenario Output Applied to Encounter

The system SHALL apply generated scenario output (OpFor, template, modifiers) to the encounter for actual battle execution.

#### Scenario: Generated OpFor feeds into encounter forces

- **WHEN** scenario generation produces an opponent force
- **THEN** the generated units SHALL be assigned to the encounter's opponent force slot
- **AND** the encounter SHALL be launchable with both player and opponent forces populated

#### Scenario: Scenario template feeds into game configuration

- **WHEN** an encounter with a scenario template is launched
- **THEN** the template's victory conditions SHALL be passed to GameEngine as IGameConfig.victoryConditions
- **AND** the template's turn limit (if any) SHALL be passed as IGameConfig.turnLimit

#### Scenario: Campaign mission uses scenario generation

- **WHEN** a campaign generates a mission
- **THEN** the existing scenario generator SHALL be used to create the opponent force
- **AND** the opponent force SHALL be scaled to the campaign roster's BV using the existing difficulty multiplier and random variation
- **AND** a scenario template SHALL be randomly selected from the 6 available templates (Ambush, Breakthrough, Capture, Defend, Destroy, Skirmish)
