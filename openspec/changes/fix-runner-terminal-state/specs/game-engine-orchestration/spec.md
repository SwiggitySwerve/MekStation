## ADDED Requirements

### Requirement: Exhaustive Auto-resolve End-reason Conversion

The GameEngine auto-resolve adapter SHALL explicitly handle every member of the existing outcome-reason union and SHALL fail TypeScript checking when a new member is not handled. It SHALL preserve the current mappings exactly: `concede` to `concede`, `turn_limit` to `turn_limit`, `objective` to `objective`, and `elimination`, `mutual_destruction`, `aborted`, and `timeout` to `destruction`.

The legacy `aborted` and `timeout` mappings SHALL be documented as follow-ups rather than changed in this work. Seeded `runToCompletion`, QuickResolve, and campaign fast-forward outcomes, event streams, and digests SHALL remain unchanged.

#### Scenario: Every existing reason retains its mapping

- **GIVEN** any current outcome reason
- **WHEN** the auto-resolve session is finalized
- **THEN** its terminal event SHALL use the mapping stated above

#### Scenario: Future reason requires an explicit decision

- **GIVEN** a new member added to the outcome-reason union
- **WHEN** the adapter has no corresponding case
- **THEN** TypeScript checking SHALL fail at the exhaustive guard
