## Implementation Tasks

### 1. Foundation Types
- [ ] 1.1 Define AutoAwardCategory enum (13 categories)
- [ ] 1.2 Define AutoAwardTrigger enum (Manual, PostMission, PostScenario, PostPromotion, PostGraduation)
- [ ] 1.3 Define IAutoAwardConfig interface
- [ ] 1.4 Add auto-award options to ICampaignOptions (enable/disable per category, bestAwardOnly flags)

### 2. Eligibility Checkers
- [ ] 2.1 Implement checkKillAwards (individual kills)
- [ ] 2.2 Implement checkScenarioAwards (scenario count)
- [ ] 2.3 Implement checkTimeAwards (time-in-service)
- [ ] 2.4 Implement checkMissionAwards (mission completion)
- [ ] 2.5 Implement checkSkillAwards (skill level thresholds)
- [ ] 2.6 Implement checkRankAwards (rank-based)
- [ ] 2.7 Implement checkContractAwards (contract duration)
- [ ] 2.8 Implement checkInjuryAwards (injury threshold)
- [ ] 2.9 Stub checkFactionHunterAwards (faction-specific kills)
- [ ] 2.10 Stub checkTheatreOfWarAwards (needs conflict database)
- [ ] 2.11 Stub checkTrainingAwards (no academy system)
- [ ] 2.12 Implement checkMiscAwards (miscellaneous criteria)
- [ ] 2.13 Write tests for all checkers

### 3. Auto-Award Engine
- [ ] 3.1 Implement processAutoAwards main orchestrator
- [ ] 3.2 Implement getEligiblePersonnel filter (active, non-prisoner, non-civilian)
- [ ] 3.3 Implement checkPersonAgainstCategory
- [ ] 3.4 Implement "Best Award Only" logic per category
- [ ] 3.5 Implement posthumous award support (death date >= last mission end)
- [ ] 3.6 Generate IAwardGrantedEvent for day report
- [ ] 3.7 Write tests for engine

### 4. Award Catalog Expansion
- [ ] 4.1 Add ~10 kill awards (Bronze Star, Silver Star, etc.)
- [ ] 4.2 Add ~5 time-in-service awards (1 year, 5 years, 10 years, etc.)
- [ ] 4.3 Add ~5 mission completion awards (10 missions, 50 missions, etc.)
- [ ] 4.4 Add ~5 skill awards (Expert Pilot, Master Gunner, etc.)
- [ ] 4.5 Add ~5 rank awards (promotion-based)

### 5. Monthly Processor
- [ ] 5.1 Implement autoAwardsProcessor day processor
- [ ] 5.2 Add 1st-of-month check
- [ ] 5.3 Integrate with auto-award engine
- [ ] 5.4 Register processor in pipeline
- [ ] 5.5 Write tests for processor

### 6. UI Components
- [ ] 6.1 Add auto-award configuration panel to campaign options
- [ ] 6.2 Enhance day report to show auto-granted awards
- [ ] 6.3 Add award history view per person
