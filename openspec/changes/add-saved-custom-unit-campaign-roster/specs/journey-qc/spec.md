## ADDED Requirements

### Requirement: Saved Custom Unit Campaign Handoff Trust Anchor Journey

Journey QC SHALL include a browser trust anchor that saves a customized canonical BattleMech, reads its server-issued custom-unit id, selects that exact saved design during campaign creation, and proves the same source identity and source kind through production wizard submission, campaign roster/root-force server persistence, and cold-reloaded campaign surfaces. Screenshots SHALL support layout and accessibility inspection but SHALL NOT substitute for API, store, persisted campaign/force, or reload evidence.

#### Scenario: Saved custom identity enters campaign creation

- **GIVEN** the browser customizes and saves a canonical BattleMech
- **WHEN** the custom-unit API returns `<customId>` and campaign creation loads Saved Designs
- **THEN** the roster step SHALL expose a named control for that exact saved design
- **AND** selecting it SHALL create a distinct roster-instance id whose `unitRef` equals `<customId>`
- **AND** the selected draft entry's `unitSource` SHALL equal `custom`

#### Scenario: Campaign and root force persist separate identities

- **WHEN** the campaign is submitted with the saved custom BattleMech through the production wizard path
- **THEN** the journey SHALL observe the wizard's real server PUT and accepted response without invoking a test-only persistence helper
- **AND** browser roster state and server-backed campaign persistence SHALL contain the same roster-instance id, `<customId>` source ref, and `custom` source kind
- **AND** root-force state SHALL contain the roster-instance id
- **AND** no stock-template fallback id or copied construction payload SHALL appear

#### Scenario: Cold reload preserves the handoff

- **WHEN** the journey cold reloads and visits the campaign dashboard, Forces, Mech Bay, and mission readiness
- **THEN** each applicable surface SHALL reconcile to the same roster-instance id and `<customId>` source ref
- **AND** the Mech Bay SHALL identify the saved design from custom metadata
- **AND** mission readiness SHALL include the custom roster instance without replacing it with a stock unit
- **AND** mission readiness SHALL name that instance's canonical-combat-unavailable reason and mark the custom row non-launchable
- **AND** the custom row SHALL remain unselected while canonical launch-capable rows remain selectable
- **AND** no force/encounter request or game session mutation SHALL occur for the custom row

#### Scenario: Visual and accessibility evidence is paired with authority proof

- **WHEN** the journey inspects the roster step at desktop width and 390×844
- **THEN** it SHALL capture the Stock Templates and Saved Designs groups, saved-unit control names, focus behavior, loading/empty/error recovery, and add/remove feedback
- **AND** the evidence receipt SHALL pair those screenshots with route, custom-unit API, browser store, persisted campaign/force, and post-reload assertions

#### Scenario: Authority evidence is synthetic and privacy-safe

- **GIVEN** the journey records screenshots, traces, videos, or JSON receipts
- **WHEN** evidence is attached
- **THEN** all campaign, pilot, and custom-unit fixtures SHALL be synthetic
- **AND** each wave SHALL write its named `.sisyphus/evidence/playtest/camp01*-<exact-main-sha>/authority-receipt.json` containing only the allowlisted ids, source kinds, equality/boolean results, route/status facts, counters, artifact names, and non-sensitive versions specified by its delivery matrix
- **AND** raw construction payloads, finance/narrative state, private store dumps, credentials, and real user data SHALL NOT be attached
