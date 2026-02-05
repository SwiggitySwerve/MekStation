## Implementation Tasks

### 1. Foundation Types

- [ ] 1.1 Define IRank interface (index, names per profession, officer boolean, payMultiplier)
- [ ] 1.2 Define IRankSystem interface (code, name, ranks[51], officerCut, useROMDesignation)
- [ ] 1.3 Define Profession enum (9 values)
- [ ] 1.4 Define RankSystemType enum (DEFAULT, CUSTOM, CAMPAIGN)
- [ ] 1.5 Add rankIndex field to IPerson (numeric 0-50)
- [ ] 1.6 Add lastRankChangeDate field to IPerson

### 2. Built-in Rank Systems

- [ ] 2.1 Implement Mercenary rank system (~15 ranks)
- [ ] 2.2 Implement SLDF rank system (~18 ranks)
- [ ] 2.3 Implement Clan rank system (~12 ranks)
- [ ] 2.4 Implement ComStar rank system (~16 ranks)
- [ ] 2.5 Implement Generic House rank system (~15 ranks)
- [ ] 2.6 Write tests for rank system data

### 3. Rank Service

- [ ] 3.1 Implement promotePersonnel with validation
- [ ] 3.2 Implement demotePersonnel with validation
- [ ] 3.3 Implement getRankName (profession-specific name resolution)
- [ ] 3.4 Implement isOfficer (rank index >= officer cut)
- [ ] 3.5 Implement getTimeInRank calculation
- [ ] 3.6 Log rank changes to service history
- [ ] 3.7 Write tests for rank service

### 4. Pay Integration

- [ ] 4.1 Update salary service to apply rank pay multiplier
- [ ] 4.2 Implement getRankPayMultiplier
- [ ] 4.3 Write tests for pay integration

### 5. Officer Effects

- [ ] 5.1 Update turnover modifiers to include officer status (-1)
- [ ] 5.2 Update turnover modifiers to include recent promotion (-1 within 6 months)
- [ ] 5.3 Implement officer shares calculation (base + 1 per rank above officer cut)
- [ ] 5.4 Write tests for officer effects

### 6. UI Components

- [ ] 6.1 Add rank system selector to campaign options
- [ ] 6.2 Add promotion/demotion buttons to personnel view
- [ ] 6.3 Display rank name with profession variant
- [ ] 6.4 Show officer status badge
- [ ] 6.5 Display time-in-rank
