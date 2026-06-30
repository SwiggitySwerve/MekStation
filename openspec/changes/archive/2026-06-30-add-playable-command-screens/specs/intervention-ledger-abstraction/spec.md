## ADDED Requirements

### Requirement: Cross-domain command ledger metadata
The intervention ledger abstraction SHALL support command metadata for campaign, combat, customizer/refit, travel, and readiness domains, including authority, preview id, command id, subject ids, before/after summaries, redaction policy, and resulting-state summary.

#### Scenario: Ledger stores command provenance
- **WHEN** a command or intervention is committed through a playable command screen
- **THEN** the ledger record SHALL identify its domain, authority, subject ids, preview inputs, resulting-state summary, and public/private projection policy

### Requirement: Reversal and repair commands
The intervention ledger abstraction SHALL support reversal or repair actions that refer to prior ledger entries and show the net result of undoing, correcting, or superseding them.

#### Scenario: GM reverses merchant transaction
- **WHEN** a GM reverses a prior merchant transaction
- **THEN** the ledger SHALL identify the prior entry, preview net funds and inventory deltas, and commit a new corrective entry rather than deleting history
