## ADDED Requirements

### Requirement: GM Repair Ticket Correction Proof

Repair maintenance SHALL remain covered by the Wave 8 campaign ledger QC proof for GM repair ticket corrections.

#### Scenario: Repair ticket correction proof covers restoration and removal

- **GIVEN** a GM corrects a repair ticket after post-combat damage or repair state was recorded incorrectly
- **WHEN** the campaign ledger QC validator runs
- **THEN** it SHALL validate source and test anchors proving repair tickets can be restored, patched, or removed through approved projected effects
