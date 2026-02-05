# faction-standing Specification Delta

## ADDED Requirements

### Requirement: Faction Standing Levels

The system SHALL define 9 faction standing levels from Outlawed (-60 to -50) to Honored (+50 to +60) with exact threshold ranges.

#### Scenario: Map regard to standing level

- **GIVEN** a faction with regard -55
- **WHEN** standing level is calculated
- **THEN** level is LEVEL_0 (Outlawed)

#### Scenario: Neutral standing at zero regard

- **GIVEN** a faction with regard 0
- **WHEN** standing level is calculated
- **THEN** level is LEVEL_4 (Neutral)

#### Scenario: Allied standing at high regard

- **GIVEN** a faction with regard +45
- **WHEN** standing level is calculated
- **THEN** level is LEVEL_7 (Allied)

#### Scenario: Regard clamped to maximum

- **GIVEN** a faction with regard +70
- **WHEN** regard is adjusted
- **THEN** regard is clamped to +60

#### Scenario: Regard clamped to minimum

- **GIVEN** a faction with regard -70
- **WHEN** regard is adjusted
- **THEN** regard is clamped to -60

### Requirement: Regard Adjustments

The system SHALL adjust faction regard based on contract outcomes with exact MekHQ delta values.

#### Scenario: Contract success increases regard

- **GIVEN** a faction with regard 0 and a successful contract
- **WHEN** contract outcome is processed
- **THEN** regard increases by +1.875 to 1.875

#### Scenario: Contract failure decreases regard

- **GIVEN** a faction with regard 0 and a failed contract
- **WHEN** contract outcome is processed
- **THEN** regard decreases by -1.875 to -1.875

#### Scenario: Contract breach severely decreases regard

- **GIVEN** a faction with regard 0 and a breached contract
- **WHEN** contract outcome is processed
- **THEN** regard decreases by -5.156 to -5.156

#### Scenario: Regard multiplier applies to deltas

- **GIVEN** a faction with regard 0, successful contract, and regard multiplier 2.0
- **WHEN** contract outcome is processed
- **THEN** regard increases by +1.875 × 2.0 = +3.75

#### Scenario: Change event recorded in history

- **GIVEN** a faction with regard 0
- **WHEN** regard is adjusted by +1.875
- **THEN** change event is added to history with date, delta, reason, previous/new regard, and previous/new level

### Requirement: Daily Regard Decay

The system SHALL decay regard toward neutral (0) by 0.375 per day.

#### Scenario: Positive regard decays toward zero

- **GIVEN** a faction with regard +10
- **WHEN** daily decay is processed
- **THEN** regard decreases by 0.375 to +9.625

#### Scenario: Negative regard decays toward zero

- **GIVEN** a faction with regard -10
- **WHEN** daily decay is processed
- **THEN** regard increases by 0.375 to -9.625

#### Scenario: Small regard decays to zero

- **GIVEN** a faction with regard +0.2
- **WHEN** daily decay is processed
- **THEN** regard becomes 0 (decay amount exceeds remaining regard)

#### Scenario: Decay respects campaign option

- **GIVEN** a campaign with factionStandingDecayEnabled set to false
- **WHEN** daily decay is processed
- **THEN** regard remains unchanged

### Requirement: Negotiation Effect

The system SHALL provide negotiation modifiers from -4 (Outlawed) to +4 (Honored) based on standing level.

#### Scenario: Outlawed faction has -4 negotiation

- **GIVEN** a faction at LEVEL_0 (Outlawed)
- **WHEN** negotiation modifier is calculated
- **THEN** modifier is -4

#### Scenario: Honored faction has +4 negotiation

- **GIVEN** a faction at LEVEL_8 (Honored)
- **WHEN** negotiation modifier is calculated
- **THEN** modifier is +4

#### Scenario: Neutral faction has 0 negotiation

- **GIVEN** a faction at LEVEL_4 (Neutral)
- **WHEN** negotiation modifier is calculated
- **THEN** modifier is 0

### Requirement: Contract Pay Effect

The system SHALL provide contract pay multipliers from 0.6 (Outlawed) to 1.2 (Honored) based on standing level.

#### Scenario: Outlawed faction pays 60% of base

- **GIVEN** a faction at LEVEL_0 (Outlawed)
- **WHEN** contract pay multiplier is calculated
- **THEN** multiplier is 0.6

#### Scenario: Honored faction pays 120% of base

- **GIVEN** a faction at LEVEL_8 (Honored)
- **WHEN** contract pay multiplier is calculated
- **THEN** multiplier is 1.2

#### Scenario: Neutral faction pays 100% of base

- **GIVEN** a faction at LEVEL_4 (Neutral)
- **WHEN** contract pay multiplier is calculated
- **THEN** multiplier is 1.0

### Requirement: Recruitment Effect

The system SHALL provide recruitment modifiers with ticket count and roll modifier based on standing level.

#### Scenario: Outlawed faction has no recruitment tickets

- **GIVEN** a faction at LEVEL_0 (Outlawed)
- **WHEN** recruitment modifier is calculated
- **THEN** tickets is 0 and roll modifier is -4

#### Scenario: Honored faction has maximum recruitment tickets

- **GIVEN** a faction at LEVEL_8 (Honored)
- **WHEN** recruitment modifier is calculated
- **THEN** tickets is 3 and roll modifier is +4

### Requirement: Barracks Cost Effect

The system SHALL provide barracks cost multipliers from 0.75 (Honored) to 3.0 (Outlawed) based on standing level.

#### Scenario: Outlawed faction has 3x barracks cost

- **GIVEN** a faction at LEVEL_0 (Outlawed)
- **WHEN** barracks cost multiplier is calculated
- **THEN** multiplier is 3.0

#### Scenario: Honored faction has 0.75x barracks cost

- **GIVEN** a faction at LEVEL_8 (Honored)
- **WHEN** barracks cost multiplier is calculated
- **THEN** multiplier is 0.75

### Requirement: Unit Market Rarity Effect

The system SHALL provide unit market rarity modifiers from -2 (Outlawed) to +3 (Honored) based on standing level.

#### Scenario: Outlawed faction has -2 rarity modifier

- **GIVEN** a faction at LEVEL_0 (Outlawed)
- **WHEN** unit market rarity modifier is calculated
- **THEN** modifier is -2

#### Scenario: Honored faction has +3 rarity modifier

- **GIVEN** a faction at LEVEL_8 (Honored)
- **WHEN** unit market rarity modifier is calculated
- **THEN** modifier is +3

### Requirement: Support Points Effects

The system SHALL provide support point modifiers for both start and periodic allocation based on standing level.

#### Scenario: Outlawed faction has -3 start support points

- **GIVEN** a faction at LEVEL_0 (Outlawed)
- **WHEN** start support points modifier is calculated
- **THEN** modifier is -3

#### Scenario: Honored faction has +3 start support points

- **GIVEN** a faction at LEVEL_8 (Honored)
- **WHEN** start support points modifier is calculated
- **THEN** modifier is +3

#### Scenario: Outlawed faction has -4 periodic support points

- **GIVEN** a faction at LEVEL_0 (Outlawed)
- **WHEN** periodic support points modifier is calculated
- **THEN** modifier is -4

#### Scenario: Honored faction has +3 periodic support points

- **GIVEN** a faction at LEVEL_8 (Honored)
- **WHEN** periodic support points modifier is calculated
- **THEN** modifier is +3

### Requirement: Outlaw Status Effect

The system SHALL mark factions at LEVEL_0 and LEVEL_1 as outlawed.

#### Scenario: Outlawed faction is marked

- **GIVEN** a faction at LEVEL_0 (Outlawed)
- **WHEN** outlaw status is checked
- **THEN** isOutlawed returns true

#### Scenario: Hostile faction is marked as outlawed

- **GIVEN** a faction at LEVEL_1 (Hostile)
- **WHEN** outlaw status is checked
- **THEN** isOutlawed returns true

#### Scenario: Unfriendly faction is not outlawed

- **GIVEN** a faction at LEVEL_2 (Unfriendly)
- **WHEN** outlaw status is checked
- **THEN** isOutlawed returns false

### Requirement: Command Circuit Access Effect

The system SHALL grant command circuit access at LEVEL_7 (Allied) and above.

#### Scenario: Allied faction has command circuit access

- **GIVEN** a faction at LEVEL_7 (Allied)
- **WHEN** command circuit access is checked
- **THEN** hasCommandCircuitAccess returns true

#### Scenario: Honored faction has command circuit access

- **GIVEN** a faction at LEVEL_8 (Honored)
- **WHEN** command circuit access is checked
- **THEN** hasCommandCircuitAccess returns true

#### Scenario: Friendly faction has no command circuit access

- **GIVEN** a faction at LEVEL_6 (Friendly)
- **WHEN** command circuit access is checked
- **THEN** hasCommandCircuitAccess returns false

### Requirement: Accolade Escalation

The system SHALL escalate accolades through 5 levels when regard reaches positive thresholds.

#### Scenario: Accolade triggers at Level 5

- **GIVEN** a faction at LEVEL_5 (Warm) with accolade level 0
- **WHEN** accolade escalation is checked
- **THEN** accolade escalates to TAKING_NOTICE (level 1)

#### Scenario: Accolade escalates to cash bonus

- **GIVEN** a faction at LEVEL_7 (Allied) with accolade level 2
- **WHEN** accolade escalation is checked
- **THEN** accolade escalates to CASH_BONUS (level 3) and money is added to campaign

#### Scenario: Maximum accolade level cannot be exceeded

- **GIVEN** a faction at LEVEL_8 (Honored) with accolade level 5
- **WHEN** accolade escalation is checked
- **THEN** accolade level remains 5

### Requirement: Censure Escalation

The system SHALL escalate censures through 5 levels when regard is negative.

#### Scenario: Censure triggers at negative regard

- **GIVEN** a faction with regard -5 and censure level 0
- **WHEN** censure escalation is checked
- **THEN** censure escalates to FORMAL_WARNING (level 1)

#### Scenario: Censure escalates with worsening regard

- **GIVEN** a faction at LEVEL_1 (Hostile) with censure level 1
- **WHEN** censure escalation is checked
- **THEN** censure escalates to NEWS_ARTICLE (level 2)

#### Scenario: Maximum censure level cannot be exceeded

- **GIVEN** a faction at LEVEL_0 (Outlawed) with censure level 5
- **WHEN** censure escalation is checked
- **THEN** censure level remains 5

### Requirement: Faction Standing Day Processor

The system SHALL process daily regard decay and monthly accolade/censure escalation via day pipeline.

#### Scenario: Daily decay processes for all factions

- **GIVEN** a campaign with 3 factions having positive regard
- **WHEN** faction standing processor executes
- **THEN** all 3 factions have regard decreased by decay amount

#### Scenario: Accolade check on 1st of month

- **GIVEN** a campaign on the 1st of the month with faction at LEVEL_5
- **WHEN** faction standing processor executes
- **THEN** accolade escalation is checked and event is generated if triggered

#### Scenario: Censure check on 1st of month

- **GIVEN** a campaign on the 1st of the month with faction at negative regard
- **WHEN** faction standing processor executes
- **THEN** censure escalation is checked and event is generated if triggered

#### Scenario: Processor skipped when disabled

- **GIVEN** a campaign with trackFactionStanding set to false
- **WHEN** faction standing processor executes
- **THEN** no processing occurs and campaign is returned unchanged
