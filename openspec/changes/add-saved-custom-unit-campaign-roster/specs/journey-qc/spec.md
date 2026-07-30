## ADDED Requirements

### Requirement: Saved Custom Unit Campaign Handoff Trust Anchor Journey

Journey QC SHALL include a browser trust anchor that saves a customized canonical BattleMech, reads its server-issued custom-unit id, selects that exact saved design during campaign creation, and proves the same source identity through campaign roster/root-force persistence and cold-reloaded campaign surfaces. Screenshots SHALL support layout and accessibility inspection but SHALL NOT substitute for API, store, persisted campaign/force, or reload evidence.

#### Scenario: Saved custom identity enters campaign creation

- **GIVEN** the browser customizes and saves a canonical BattleMech
- **WHEN** the custom-unit API returns `<customId>` and campaign creation loads Saved Designs
- **THEN** the roster step SHALL expose a named control for that exact saved design
- **AND** selecting it SHALL create a distinct roster-instance id whose `unitRef` equals `<customId>`

#### Scenario: Campaign and root force persist separate identities

- **WHEN** the campaign is submitted with the saved custom BattleMech
- **THEN** browser roster state and server-backed campaign persistence SHALL contain the same roster-instance id and `<customId>` source ref
- **AND** root-force state SHALL contain the roster-instance id
- **AND** no stock-template fallback id or copied construction payload SHALL appear

#### Scenario: Cold reload preserves the handoff

- **WHEN** the journey cold reloads and visits the campaign dashboard, Forces, Mech Bay, and mission readiness
- **THEN** each applicable surface SHALL reconcile to the same roster-instance id and `<customId>` source ref
- **AND** the Mech Bay SHALL identify the saved design from custom metadata
- **AND** mission readiness SHALL include the custom roster instance without replacing it with a stock unit

#### Scenario: Visual and accessibility evidence is paired with authority proof

- **WHEN** the journey inspects the roster step at desktop width and 390×844
- **THEN** it SHALL capture the Stock Templates and Saved Designs groups, saved-unit control names, focus behavior, loading/empty/error recovery, and add/remove feedback
- **AND** the evidence receipt SHALL pair those screenshots with route, custom-unit API, browser store, persisted campaign/force, and post-reload assertions
