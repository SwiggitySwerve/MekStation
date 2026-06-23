## ADDED Requirements

### Requirement: GM Inventory Lot Correction Proof

Market and base inventory state SHALL remain covered by the Wave 8 campaign ledger QC proof for GM inventory lot corrections that repair merchant or acquisition mistakes.

#### Scenario: Inventory correction proof covers replacement, patch, quantity delta, and removal roots

- **GIVEN** a GM corrects a base inventory lot after a merchant or acquisition mistake
- **WHEN** the campaign ledger QC validator runs
- **THEN** it SHALL validate source and test anchors proving inventory lots can be replaced, patched, quantity-adjusted, or removed through approved projected effects
