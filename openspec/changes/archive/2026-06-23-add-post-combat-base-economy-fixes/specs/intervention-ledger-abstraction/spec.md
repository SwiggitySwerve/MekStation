## ADDED Requirements

### Requirement: Campaign Domain Ledger Implementers

The intervention ledger SHALL allow campaign-domain implementers for `post-combat`, `economy`, `repair`, and `salvage` to share the same preview, apply, public projection, and private projection contract used by tactical combat interventions.

#### Scenario: Campaign implementer registers with ledger
- **GIVEN** a campaign intervention implementer for `economy`
- **WHEN** the implementer is registered with the intervention ledger
- **THEN** commands targeting the `economy` domain SHALL route through that implementer
- **AND** commands targeting unrelated domains SHALL NOT route through that implementer

#### Scenario: Campaign approval appends through shared action ledger
- **GIVEN** a ready campaign intervention preview and a shared action ledger
- **WHEN** the GM approves the preview
- **THEN** the intervention ledger SHALL append an approved campaign intervention record
- **AND** the action ledger SHALL append a GM intervention action after prior normal actions
- **AND** prior normal actions SHALL remain present

#### Scenario: Blocked campaign preview appends no action
- **GIVEN** a campaign preview is blocked, rejected, unsupported, deferred, or requires manual takeover
- **WHEN** the preview is not approved
- **THEN** the intervention ledger SHALL append no campaign intervention record
- **AND** the action ledger SHALL append no GM intervention action
