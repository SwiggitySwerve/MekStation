## ADDED Requirements

### Requirement: GM Ledger Command Tab Is Authority-Gated

The campaign command navigation SHALL expose the GM Ledger tab only when the local viewer has campaign GM authority. Single-player campaigns and co-op host campaigns SHALL have campaign GM authority. Co-op guest campaign mirrors SHALL not render the GM Ledger tab.

#### Scenario: Single-player campaign shows GM Ledger

- **GIVEN** a single-player campaign with no `coopSession`
- **WHEN** campaign navigation renders
- **THEN** the Command group SHALL include the GM Ledger tab

#### Scenario: Co-op guest campaign hides GM Ledger

- **GIVEN** a co-op campaign with `coopSession.mode === 'guest'`
- **WHEN** campaign navigation renders
- **THEN** the Command group SHALL not include the GM Ledger tab
