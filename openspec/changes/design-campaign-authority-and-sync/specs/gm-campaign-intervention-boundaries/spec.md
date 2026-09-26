# GM Campaign Intervention Boundaries (Delta)

## ADDED Requirements

### Requirement: Co-op GM Funds Corrections Reach the Campaign Record's Intervention History

When a co-op host's GM funds correction commits through the live campaign host as the host-only `ApplyGmIntervention` command, the host SHALL append one entry for it to the saved campaign record's `gmInterventionEvents` through the record rewrite the host already runs inside that command's append transaction, with no second writer and no new campaign event type. The entry SHALL hold the correction's public summary, its signed C-bill delta, its intervention id and the commit sequence of the `FundsChanged` event that applied it, and SHALL hold no GM-private metadata. A resend of an already committed command and a refused command SHALL add no entry. The guest SHALL never receive the entry: the guest's frames and the campaign its mirror projects carry the committed `FundsChanged` only. A solo campaign's approval SHALL keep writing its entry through the owner's own campaign save.

#### Scenario: A co-op funds approval is listed in the record's intervention history

- **GIVEN** a journal-native co-op campaign with a live host
- **WHEN** the GM's `ApplyGmIntervention` for a funds correction commits a `FundsChanged` at sequence N
- **THEN** the saved record's `gmInterventionEvents` SHALL end with one `funds-transaction` entry whose `publicSummary` is the correction's summary, whose `after.transaction.amountCents` is the signed delta in cents, whose `interventionId` is the command's intervention id and whose `transactionId` is `campaign-event:<campaignId>:<N>`
- **AND** the entry SHALL carry no GM rationale, hidden notes, default outcome or manual-takeover notes
- **AND** the GM's own ledger SHALL list the entry after the page reloads the record

#### Scenario: A resend or a refusal adds no entry

- **GIVEN** a co-op funds correction already committed under one intent id
- **WHEN** the same intent is resent, or a correction is refused by the host
- **THEN** the saved record's `gmInterventionEvents` SHALL gain no entry

#### Scenario: The guest mirror never receives the history

- **GIVEN** a guest joined to the same co-op campaign
- **WHEN** the GM's funds correction commits
- **THEN** the guest's frame for it SHALL be the committed `FundsChanged` with only its delta, reason and resulting balance
- **AND** no frame the guest receives and no campaign its mirror projects SHALL carry an intervention history entry or the intervention id

#### Scenario: A solo approval's entry is unchanged

- **GIVEN** a single-player campaign with no co-op session
- **WHEN** the owner approves a funds correction
- **THEN** the approval's projected effect SHALL be appended to `gmInterventionEvents` by the owner's own campaign save
- **AND** no campaign command SHALL be sent
