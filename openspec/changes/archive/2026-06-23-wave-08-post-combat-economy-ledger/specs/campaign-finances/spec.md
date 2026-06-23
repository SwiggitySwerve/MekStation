## ADDED Requirements

### Requirement: GM Funds Transaction Correction Proof

Campaign finances SHALL remain covered by the Wave 8 campaign ledger QC proof for GM funds transaction corrections, including merchant reversal scenarios.

#### Scenario: Funds correction proof covers net balance and transaction history

- **GIVEN** a GM reverses or corrects a campaign funds transaction
- **WHEN** the campaign ledger QC validator runs
- **THEN** it SHALL validate focused test anchors proving the resulting balance and transaction history are projected before approval and applied only after approval
