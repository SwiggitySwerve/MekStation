## ADDED Requirements

### Requirement: Canonical SPA ownership identity

The SPA domain SHALL own compatibility identity queries for stored pilot ability
ids. Consumers SHALL use its public `hasSPA` or `canonicalizeSPAIds` contract
instead of duplicating the alias table. Identity queries SHALL preserve stored
references, acquisition metadata, designation and recorded XP.

#### Scenario: Legacy identity resolves to a canonical target

- **GIVEN** a saved reference uses `iron-man`, `iron-will` or `iron_will`
- **WHEN** a consumer queries ownership of canonical `iron_man`
- **THEN** the SPA domain SHALL report ownership without rewriting the reference

#### Scenario: Existing exact-id membership remains compatible

- **GIVEN** the existing gameplay membership helper is queried with an exact id
  already present in the input list, including an unknown saved id
- **WHEN** that helper delegates to the SPA domain
- **THEN** the query SHALL remain true
- **AND** unrelated unknown ids SHALL NOT match one another
- **AND** canonical projection SHALL omit unknown ids without changing its input

#### Scenario: Legacy saved ownership rejects duplicate purchase before writes

- **GIVEN** a pilot owns a unified SPA under a compatibility alias
- **WHEN** purchase is requested using the alias or its canonical id
- **THEN** the purchase owner SHALL reject it as already owned before spending
  or refunding XP or inserting an ability
- **AND** all saved references and their metadata SHALL remain unchanged

#### Scenario: New alias purchase keeps canonical storage

- **GIVEN** a pilot does not own the requested SPA and purchase guards pass
- **WHEN** purchase is requested using a recognized compatibility alias
- **THEN** the existing purchase owner SHALL store its canonical id
- **AND** unrelated unknown saved references SHALL remain unchanged
