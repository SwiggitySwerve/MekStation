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
