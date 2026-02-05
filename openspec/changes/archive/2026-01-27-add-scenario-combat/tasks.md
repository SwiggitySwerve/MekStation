## Implementation Tasks

### 1. Foundation Types

- [ ] 1.1 Define CombatRole enum (7 values: Maneuver, Frontline, Patrol, Training, Cadre, Auxiliary, Reserve)
- [ ] 1.2 Define AtBMoraleLevel enum (7 values: Routed through Overwhelming)
- [ ] 1.3 Define AtBScenarioType enum (9+ scenario types)
- [ ] 1.4 Define ICombatTeam interface
- [ ] 1.5 Define IScenarioConditions interface
- [ ] 1.6 Add moraleLevel field to IContract
- [ ] 1.7 Add combatTeams field to ICampaign
- [ ] 1.8 Add conditions field to IScenario
- [ ] 1.9 Add useAtBScenarios option to ICampaignOptions

### 2. Battle Chance System

- [ ] 2.1 Implement BASE_BATTLE_CHANCE constants per role
- [ ] 2.2 Implement calculateBattleTypeMod function
- [ ] 2.3 Implement checkForBattle function with RandomFn
- [ ] 2.4 Write tests for battle chance calculations

### 3. Scenario Type Selection

- [ ] 3.1 Implement selectManeuverScenario table (d40)
- [ ] 3.2 Implement selectPatrolScenario table (d60)
- [ ] 3.3 Implement selectFrontlineScenario table (d20)
- [ ] 3.4 Implement selectTrainingScenario table (d10)
- [ ] 3.5 Implement selectScenarioType dispatcher
- [ ] 3.6 Write tests for scenario type selection

### 4. OpFor Generation

- [ ] 4.1 Implement calculateOpForBV with 75-125% variation
- [ ] 4.2 Define LANCE_SIZE constants (IS=4, Clan=5, ComStar=6)
- [ ] 4.3 Implement calculateForceComposition
- [ ] 4.4 Write tests for OpFor BV matching

### 5. Scenario Conditions

- [ ] 5.1 Implement generateRandomConditions
- [ ] 5.2 Implement getConditionEffects (force composition restrictions)
- [ ] 5.3 Write tests for condition effects

### 6. Morale Tracking

- [ ] 6.1 Implement updateMorale function (victory/defeat/draw)
- [ ] 6.2 Implement getMoraleLevelFromValue
- [ ] 6.3 Implement getMoraleDisplayInfo
- [ ] 6.4 Write tests for morale updates

### 7. Scenario Generation Processor

- [ ] 7.1 Implement processScenarioGeneration day processor
- [ ] 7.2 Add Monday check (weekly frequency)
- [ ] 7.3 Integrate battle chance, type selection, OpFor, conditions
- [ ] 7.4 Register processor in pipeline
- [ ] 7.5 Write tests for processor

### 8. UI Components

- [ ] 8.1 Enhance scenario detail view with conditions display
- [ ] 8.2 Add OpFor description with BV and composition
- [ ] 8.3 Add morale indicator to contract view
- [ ] 8.4 Create combat team assignment UI
