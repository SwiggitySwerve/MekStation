## ADDED Requirements

### Requirement: First Slice Defers Campaign Cascades

The first implementation slice SHALL limit runtime application to combat interventions and SHALL defer post-combat amendments, base/economy corrections, repair/salvage corrections, and accumulated time cascades until the combat authority/redaction/ledger pipeline is validated.

#### Scenario: Base economy intervention is not silently applied
- **GIVEN** a GM requests a merchant transaction reversal before the base/economy cascade phase is implemented
- **WHEN** the intervention pipeline evaluates the request
- **THEN** the system SHALL return an explicit unsupported or deferred result
- **AND** the system SHALL NOT silently mutate finances or inventory

#### Scenario: Time cascade intervention is not silently applied
- **GIVEN** a GM requests an accumulated time correction before the time cascade phase is implemented
- **WHEN** the intervention pipeline evaluates the request
- **THEN** the system SHALL return an explicit unsupported or deferred result
- **AND** the system SHALL NOT advance or rewind campaign time

### Requirement: Future Campaign Implementer Seams

The system SHALL document extension seams for future intervention ledger implementers that target post-combat, base/economy, repair, salvage, and accumulated time domains.

#### Scenario: Future domain declares required state roots
- **GIVEN** a future campaign-domain implementer is designed
- **WHEN** it declares its intervention domain
- **THEN** it SHALL identify the state roots it can mutate
- **AND** it SHALL identify the public projection fields that non-GM players may see

### Requirement: Deferred Domain Logging

The system SHALL log deferred domain intervention attempts so missing campaign support is visible during testing without applying unsupported state changes.

#### Scenario: Deferred request is logged safely
- **GIVEN** a GM requests a deferred time cascade intervention
- **WHEN** the intervention pipeline returns a deferred result
- **THEN** the system SHALL log the domain, actor, target refs, and deferred reason
- **AND** the log SHALL NOT include hidden scenario notes in any player-visible output
