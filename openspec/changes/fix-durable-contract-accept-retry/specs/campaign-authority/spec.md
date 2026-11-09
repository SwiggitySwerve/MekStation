## ADDED Requirements

### Requirement: Durable Contract Accept Retry Recognition

After existing campaign-command admission gates pass, a durable `AcceptContract` whose command id already has a committed receipt SHALL return `{ kind: 'duplicate', commandId }` before reading the source contract offer. This result SHALL append no events, replace no receipt, and leave the source record's payload and version unchanged. Receipt recognition SHALL survive a database reopen. An uncommitted command SHALL still read and validate the source offer; the `offer-not-durable` response and its reasons SHALL remain unchanged.

#### Scenario: Retrying a committed acceptance after its offer was consumed

- **GIVEN** an acceptance committed and removed its offer from the saved market
- **WHEN** the same command id is retried after existing admission gates pass
- **THEN** the command SHALL return `duplicate` with that command id
- **AND** journal events, receipt, source payload and source version SHALL remain unchanged

#### Scenario: Retrying after reopening the database

- **GIVEN** a committed acceptance and a database that was closed and reopened
- **WHEN** the same command id is retried after existing admission gates pass
- **THEN** the durable receipt SHALL identify the retry as `duplicate`
- **AND** no second acceptance or source-record update SHALL occur

#### Scenario: A different command names the consumed offer

- **GIVEN** an acceptance removed its offer from the saved market
- **WHEN** a different uncommitted command id names that offer
- **THEN** the command SHALL return `offer-not-durable` with reason `offer-absent`
- **AND** no receipt or event SHALL be appended for the different command

#### Scenario: Retrying an acceptance whose append rolled back

- **GIVEN** an acceptance failed and rolled back its receipt and source changes
- **WHEN** that command id is retried with a usable durable offer
- **THEN** it SHALL read the offer and commit normally instead of returning `duplicate`
