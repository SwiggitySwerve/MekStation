## ADDED Requirements

### Requirement: Damage Types
The system SHALL support multiple damage types.

#### Scenario: Damage classification
- **WHEN** resolving damage
- **THEN** damage type SHALL be Standard, Cluster, Pulse, Streak, Explosive, Heat, or Special
- **AND** damage resolution SHALL vary by type

### Requirement: Hit Location Tables
The system SHALL support direction-based hit location tables per TechManual p.109.

#### Scenario: Front attack hit location (2d6)
- **WHEN** attacking from front arc
- **THEN** roll 2=CT(TAC), 3-4=RA, 5=RL, 6=RT, 7=CT, 8=LT, 9=LL, 10-11=LA, 12=Head

#### Scenario: Rear attack hit location (2d6)
- **WHEN** attacking from rear arc
- **THEN** roll distribution same as front but hits rear armor

#### Scenario: Left side attack hit location (2d6)
- **WHEN** attacking from left arc
- **THEN** roll 2=LT(TAC), 3=LL, 4-5=LA, 6=LL, 7=LT, 8=CT, 9=RT, 10=RA, 11=RL, 12=Head
- **AND** left-side locations SHALL be more probable

#### Scenario: Right side attack hit location (2d6)
- **WHEN** attacking from right arc
- **THEN** roll 2=RT(TAC), 3=RL, 4-5=RA, 6=RL, 7=RT, 8=CT, 9=LT, 10=LA, 11=LL, 12=Head
- **AND** right-side locations SHALL be more probable

#### Scenario: Punch attack hit location (1d6)
- **WHEN** resolving punch attack
- **THEN** roll 1=LA, 2=LT, 3=CT, 4=RT, 5=RA, 6=Head

#### Scenario: Kick attack hit location (1d6)
- **WHEN** resolving kick attack
- **THEN** roll 1-3=RL, 4-6=LL

### Requirement: Through Armor Critical (TAC)
Roll of 2 on hit location SHALL trigger TAC check.

#### Scenario: TAC by attack direction
- **WHEN** hit location roll is 2
- **THEN** Front/Rear attack TAC location SHALL be CT
- **AND** Left side attack TAC location SHALL be LT
- **AND** Right side attack TAC location SHALL be RT

### Requirement: Attack Direction Determination
The system SHALL determine attack direction from hex positions.

#### Scenario: Direction calculation
- **WHEN** calculating attack arc
- **THEN** relative direction from target's facing SHALL determine table
- **AND** 0,1,5 = Front, 2 = Right, 3 = Rear, 4 = Left

### Requirement: Cluster Hit Table
The system SHALL support cluster damage resolution per TechManual.

#### Scenario: Cluster hit determination
- **WHEN** resolving cluster weapons (LRMs, SRMs, etc.)
- **THEN** 2d6 roll against cluster table determines hits
- **AND** hits SHALL vary by launcher size (2, 4, 5, 6, 10, 15, 20)

### Requirement: Damage Resolution
Damage SHALL be resolved against armor then structure.

#### Scenario: Damage application
- **WHEN** applying damage to location
- **THEN** armor SHALL absorb damage first
- **AND** excess damage SHALL transfer to structure
- **AND** structure destruction SHALL destroy location

