## ADDED Requirements

### Requirement: Terminal Departure Lifecycle

The system SHALL set a retiring or deserting pilot's status to Retired or
Deserted alongside the departure reason. A terminal departure status or any
non-null departure reason SHALL exclude the pilot from salary, deployment,
further turnover rolls, and the medical bay's return-to-duty projection.

#### Scenario: Retirement settles once

- **GIVEN** an Active pilot with a failed retirement check
- **WHEN** the report is applied, repeated, or contains duplicate entries
- **THEN** the pilot has Retired status and the retired reason
- **AND** exactly one payout is debited and recorded

#### Scenario: Desertion excludes future activity

- **GIVEN** a pilot who deserts
- **WHEN** the next monthly turnover, payroll, and launch checks run
- **THEN** the pilot has Deserted status and the deserted reason
- **AND** no further turnover roll, departure event, or payout occurs
- **AND** both payroll modes exclude the pilot and assigned deployment is blocked

#### Scenario: Missing person cannot receive a settlement

- **GIVEN** a departure report whose person is absent from the live roster
- **WHEN** the report is applied
- **THEN** no payout or roster mutation occurs for that person

### Requirement: Legacy Departure Compatibility

The system SHALL normalize loaded Active pilots with known retired or deserted
departure reasons on both roster hydration and durable campaign restoration.
Unknown non-null reasons SHALL still exclude the pilot without guessing a status.
Loading SHALL NOT add payouts, issue refunds, or rewrite historical transactions.

#### Scenario: Legacy departure loads through either persistence path

- **GIVEN** a saved Active pilot with the retired or deserted departure reason
- **WHEN** either persistence path restores the roster
- **THEN** the matching terminal status and existing reason are present
- **AND** salary, deployment, and turnover exclude the pilot
- **AND** finances retain their saved balance and transactions

#### Scenario: Other saved personnel retain their status

- **GIVEN** saved Active, Wounded, Critical, MIA, and KIA pilots without departure reasons
- **WHEN** the roster is restored
- **THEN** their statuses and salary eligibility remain unchanged
