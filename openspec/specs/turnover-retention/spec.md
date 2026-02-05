# turnover-retention Specification

## Purpose

TBD - created by archiving change add-turnover-retention. Update Purpose after archive.

## Requirements

### Requirement: 19-Modifier Turnover Check System

The system SHALL implement a turnover check system using 19 additive modifiers that determine a target number for personnel retention, matching MekHQ's exact formula.

#### Scenario: Calculate target number from all modifiers

- **GIVEN** an ACTIVE personnel member eligible for turnover check
- **WHEN** turnover check is executed
- **THEN** all 19 modifiers are calculated and summed to produce target number
- **AND** modifier breakdown is available for reporting

#### Scenario: Real modifiers use campaign data

- **GIVEN** a founder personnel member with 2 permanent injuries
- **WHEN** turnover modifiers are calculated
- **THEN** founder modifier returns -2
- **AND** injury modifier returns +2 (1 per permanent injury)
- **AND** all 9 real modifiers use actual campaign data

#### Scenario: Stub modifiers return neutral

- **GIVEN** any personnel member
- **WHEN** stub modifiers are calculated (fatigue, loyalty, shares, etc.)
- **THEN** each stub modifier returns 0 (neutral)
- **AND** stub modifiers are marked with @stub JSDoc tag
- **AND** stub modifiers activate when their systems are built

### Requirement: 2d6 Roll vs Target Number

The system SHALL execute a 2d6 dice roll against the calculated target number to determine if personnel passes or fails the turnover check.

#### Scenario: Personnel passes turnover check

- **GIVEN** a personnel member with target number 8
- **WHEN** turnover check executes and rolls 9 or higher
- **THEN** check result is "passed"
- **AND** personnel remains ACTIVE
- **AND** no departure is recorded

#### Scenario: Personnel fails turnover check

- **GIVEN** a personnel member with target number 8
- **WHEN** turnover check executes and rolls 7 or lower
- **THEN** check result is "failed"
- **AND** departure type is determined (retired or deserted)
- **AND** personnel status transitions accordingly

#### Scenario: Deterministic testing with injectable random

- **GIVEN** a turnover check with seeded RandomFn
- **WHEN** check is executed multiple times with same seed
- **THEN** results are deterministic and reproducible
- **AND** tests can verify exact outcomes

### Requirement: Departure Type Determination

The system SHALL determine departure type based on how badly the personnel member failed the turnover check, with severe failures resulting in desertion.

#### Scenario: Voluntary retirement

- **GIVEN** a personnel member with target number 8
- **WHEN** turnover check rolls 5 (TN - 3)
- **THEN** departure type is "retired"
- **AND** personnel status transitions to RETIRED

#### Scenario: Desertion

- **GIVEN** a personnel member with target number 8
- **WHEN** turnover check rolls 3 or lower (TN - 5 or worse)
- **THEN** departure type is "deserted"
- **AND** personnel status transitions to DESERTED

### Requirement: Payout Calculation

The system SHALL calculate departure payout as monthly salary multiplied by a configurable multiplier, recording the transaction in campaign finances.

#### Scenario: Calculate departure payout

- **GIVEN** a personnel member with monthly salary 1000 C-bills
- **AND** campaign payout multiplier of 12
- **WHEN** personnel departs
- **THEN** payout is calculated as 12,000 C-bills
- **AND** payout is recorded as financial transaction
- **AND** payout amount is included in turnover report

#### Scenario: Stub salary calculation

- **GIVEN** a personnel member before Plan 4 (Financial System) is implemented
- **WHEN** monthly salary is calculated
- **THEN** stub function returns default 1000 C-bills
- **AND** stub is marked with @stub JSDoc tag
- **AND** stub will be replaced by role-based salary in Plan 4

### Requirement: Commander Immunity

The system SHALL optionally exempt commanders from turnover checks when commander immunity is enabled in campaign options.

#### Scenario: Commander immune to turnover

- **GIVEN** a campaign with turnoverCommanderImmune set to true
- **AND** a personnel member who is the campaign commander
- **WHEN** turnover checks are executed
- **THEN** commander is skipped
- **AND** no turnover check is performed for commander

#### Scenario: Commander not immune

- **GIVEN** a campaign with turnoverCommanderImmune set to false
- **AND** a personnel member who is the campaign commander
- **WHEN** turnover checks are executed
- **THEN** commander is included in checks
- **AND** commander can potentially leave the campaign

### Requirement: Eligibility Filtering

The system SHALL only perform turnover checks on eligible personnel, excluding non-ACTIVE personnel, prisoners, MIA, and students.

#### Scenario: Skip non-ACTIVE personnel

- **GIVEN** personnel members with status RETIRED, DESERTED, KIA, or MIA
- **WHEN** turnover checks are executed
- **THEN** non-ACTIVE personnel are skipped
- **AND** no turnover check is performed

#### Scenario: Skip prisoners and students

- **GIVEN** personnel members who are prisoners or students
- **WHEN** turnover checks are executed
- **THEN** prisoners and students are skipped
- **AND** no turnover check is performed

#### Scenario: Check only eligible personnel

- **GIVEN** a campaign with 10 ACTIVE personnel and 5 non-ACTIVE
- **WHEN** turnover checks are executed
- **THEN** exactly 10 checks are performed
- **AND** only ACTIVE, non-prisoner, non-student personnel are checked

### Requirement: Turnover Report Generation

The system SHALL generate detailed turnover reports showing all departures with modifier breakdowns, roll results, and payout amounts.

#### Scenario: Generate turnover report with departures

- **GIVEN** a turnover check execution with 3 departures
- **WHEN** turnover report is generated
- **THEN** report includes all 3 departed personnel
- **AND** each departure shows person name, role, departure type
- **AND** each departure includes full modifier breakdown (all 19 modifiers)
- **AND** each departure shows roll result vs target number
- **AND** each departure shows payout amount

#### Scenario: Generate turnover report with no departures

- **GIVEN** a turnover check execution where all personnel pass
- **WHEN** turnover report is generated
- **THEN** report indicates no departures occurred
- **AND** report shows total personnel checked

### Requirement: Modifier Breakdown Visibility

The system SHALL provide detailed visibility into all 19 modifier values for each turnover check, supporting transparency and debugging.

#### Scenario: View modifier breakdown

- **GIVEN** a completed turnover check
- **WHEN** viewing turnover report
- **THEN** all 19 modifiers are listed with their values
- **AND** each modifier shows its ID, display name, and numeric value
- **AND** stub modifiers are clearly marked
- **AND** total target number is shown as sum of all modifiers

### Requirement: Configurable Turnover Options

The system SHALL support comprehensive configuration of turnover behavior through campaign options, including enable/disable, frequency, target number, and modifier toggles.

#### Scenario: Disable turnover system

- **GIVEN** a campaign with useTurnover set to false
- **WHEN** day advancement occurs
- **THEN** turnover processor does not execute
- **AND** no turnover checks are performed

#### Scenario: Adjust base target number

- **GIVEN** a campaign with turnoverFixedTargetNumber set to 5
- **WHEN** turnover check calculates target number
- **THEN** base modifier contributes +5 to target number
- **AND** other modifiers are added to this base

#### Scenario: Toggle skill modifiers

- **GIVEN** a campaign with turnoverUseSkillModifiers set to false
- **WHEN** turnover check calculates modifiers
- **THEN** skill desirability modifier returns 0
- **AND** other modifiers are calculated normally

#### Scenario: Configure payout multiplier

- **GIVEN** a campaign with turnoverPayoutMultiplier set to 6
- **WHEN** personnel departs with monthly salary 1000 C-bills
- **THEN** payout is calculated as 6,000 C-bills
- **AND** payout is recorded in campaign finances
