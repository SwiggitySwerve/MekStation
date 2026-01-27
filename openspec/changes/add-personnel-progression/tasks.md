## 1. Implementation

- [ ] 1.1 Define progression types and XP configuration
  - Create `src/types/campaign/progression/progressionTypes.ts`
  - Define XPSource, IXPAwardEvent, IAgingMilestone, ISpecialAbility, IPersonTraits
  - Add 14 XP-related options to ICampaignOptions
  - Add trait fields to IPerson interface

- [ ] 1.2 Implement XP award service
  - Create `src/lib/campaign/progression/xpAwards.ts`
  - Implement award functions for 8 XP sources
  - Implement applyXPAward to update person XP totals
  - Write comprehensive tests (threshold logic, null returns, outcome variations)

- [ ] 1.3 Implement skill cost formula with trait modifiers
  - Create `src/lib/campaign/progression/skillCostTraits.ts`
  - Implement calculateTraitMultiplier with 4 trait modifiers
  - Implement getSkillImprovementCostWithTraits extending Plan 7
  - Implement isTechSkill helper
  - Write tests for trait stacking and tech-specific modifiers

- [ ] 1.4 Implement aging system
  - Create `src/lib/campaign/progression/aging.ts`
  - Define AGING_MILESTONES constant (10 milestones)
  - Implement getMilestoneForAge and getAgingAttributeModifier
  - Implement processAging with birthday check and milestone crossing
  - Write tests for milestone boundaries, attribute decay, auto-traits

- [ ] 1.5 Implement vocational training day processor
  - Create `src/lib/campaign/processors/vocationalTrainingProcessor.ts`
  - Implement monthly 2d6 vs TN check
  - Implement timer tracking and reset
  - Register processor in day pipeline
  - Write tests for roll mechanics, timer, eligibility

- [ ] 1.6 Implement SPA acquisition system
  - Create `src/lib/campaign/progression/spaAcquisition.ts`
  - Define ~10 representative SPAs
  - Implement veterancy SPA check
  - Implement coming-of-age SPA check
  - Implement purchase SPA function
  - Write tests for acquisition triggers and prerequisites

- [ ] 1.7 Create progression UI components (DEFERRED)
  - XP award history panel
  - Trait management interface
  - Aging milestone display
  - SPA selection modal
  - Vocational training status

## 2. Testing

- [ ] 2.1 Unit tests for all progression functions
- [ ] 2.2 Integration tests for day processors
- [ ] 2.3 Verify backward compatibility with existing campaigns

## 3. Documentation

- [ ] 3.1 Update personnel management documentation
- [ ] 3.2 Document XP source configuration
- [ ] 3.3 Document trait effects on skill costs
