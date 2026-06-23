## ADDED Requirements

### Requirement: Long Campaign Stability Flow Linkage
The gameplay UI flow shell SHALL expose the long-campaign stability command and UI checkpoint evidence boundary for `campaign-long`. The long-campaign flow MUST link to the dedicated stability command, MUST preserve campaign/base through log review checkpoints, and MUST distinguish UI checkpoint linkage from browser-executed campaign signoff.

#### Scenario: Long campaign flow points at stability gate
- **WHEN** the UI flow registry is validated
- **THEN** the `campaign-long` flow exposes a QC command that runs `qc:campaign-long:stability`
- **AND** the flow still references the `campaign-long` journey ID

#### Scenario: Stability manifest records UI checkpoint boundary
- **WHEN** the long-campaign stability command writes its manifest
- **THEN** the manifest records the `campaign-long` UI flow checkpoints
- **AND** the manifest explicitly records that browser execution was not performed by this headless stability gate
