## ADDED Requirements

### Requirement: Campaign Streams Use the Shared Journal Authority
Each journal-backed campaign SHALL own one durable stream for transactional campaign facts. Existing snapshot-only campaigns SHALL begin from an explicit imported baseline, and each campaign SHALL have exactly one write authority at every migration phase.

#### Scenario: Campaign restarts after multi-event command
- **WHEN** a campaign command commits funds, roster, and personnel facts and the process restarts
- **THEN** the journal SHALL recover the complete batch and identical campaign projection
- **AND** no partial subset SHALL become authoritative

#### Scenario: Shadow projection disagrees
- **WHEN** legacy snapshot and journal projection digests differ before cutover
- **THEN** the campaign SHALL remain on its existing authority
- **AND** cutover SHALL stop with retained mismatch evidence
