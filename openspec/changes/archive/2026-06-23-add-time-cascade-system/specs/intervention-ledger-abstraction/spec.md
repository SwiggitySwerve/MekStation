## ADDED Requirements

### Requirement: Time Cascade Ledger Implementer

The intervention ledger SHALL allow a `time` campaign-domain implementer to share the same preview, apply, public projection, and private projection contract used by tactical combat and campaign correction interventions.

#### Scenario: Time implementer registers with ledger
- **GIVEN** a time-cascade intervention implementer
- **WHEN** the implementer is registered with the intervention ledger
- **THEN** commands targeting the `time` domain SHALL route through that implementer
- **AND** commands targeting unrelated domains SHALL NOT route through that implementer

#### Scenario: Time approval appends through shared action ledger
- **GIVEN** a ready time cascade preview and a shared action ledger
- **WHEN** the GM approves the preview
- **THEN** the intervention ledger SHALL append an approved time-cascade record
- **AND** the action ledger SHALL append a GM intervention action after prior normal actions
- **AND** prior normal actions SHALL remain present

#### Scenario: Blocked time preview appends no action
- **GIVEN** a time preview is blocked, rejected, unsupported, deferred, stale, or requires manual takeover
- **WHEN** the preview is not approved
- **THEN** the intervention ledger SHALL append no time-cascade record
- **AND** the action ledger SHALL append no GM intervention action
