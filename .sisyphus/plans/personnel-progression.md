# Personnel Progression

## Context

### Original Request
Implement MekHQ's personnel progression system: 8 XP sources (scenario, kill, task, vocational, negotiation, admin, mission, education), skill cost formula with trait modifiers (Fast Learner, Slow Learner, Gremlins, Tech Empathy), aging milestones with attribute decay, SPA acquisition on veterancy and coming-of-age, and vocational training as a monthly day processor.

### Interview Summary
**Key Discussions**:
- 8 XP sources, each with configurable amounts in ICampaignOptions
- Skill cost formula: `baseCost × xpMultiplier × (1 - attrMod × 0.05) × traitMultiplier`
- Trait modifiers: Slow Learner +20%, Fast Learner -20%, Gremlins +10% (tech), Tech Empathy -10% (tech)
- Aging milestones at 25/31/41/51/61/71/81/91/101 with attribute modifiers
- At age 61+: Glass Jaw applied (unless Toughness), Slow Learner applied (unless Fast Learner)
- SPA acquisition: veterancy (on reaching Veteran level), coming-of-age (age 16), purchase (XP spend)
- Vocational training: monthly 2d6 vs TN (default 7), awards configurable XP
- This plan EXTENDS Plan 7's basic skill costs with trait modifiers
- TDD approach, injectable RandomFn

**Research Findings**:
- `Person.java` (lines 5563–5589): Skill cost with trait multiplier calculation
- `Aging.java` (lines 80–86): Attribute modifier = milestone value / 100
- `AgingMilestone.java`: 10 milestones with per-attribute modifiers (values divided by 100)
- `SingleSpecialAbilityGenerator.java` (lines 197–251): SPA roll with weighting and specialization
- `CampaignNewDayManager.java` (lines 1882–1915): Vocational XP monthly processing
- `ResolveScenarioTracker.java` (line 826): Scenario XP award
- `XPHandler.java` (line 75): Admin XP periodic award
- `InjuryUtil.java` (line 477): Task XP for medical personnel

### Metis Review
**Identified Gaps** (addressed):
- SPA system doesn't exist in MekStation yet — define ISpecialAbility interface
- Aging attribute modifiers are cumulative across milestones (not just current milestone)
- Vocational training timer needs tracking field on IPerson
- XP spending on skills should trigger veterancy SPA check
- Education XP is out of scope (no academy system) — stub the source
- Trait system (Fast Learner etc.) doesn't exist — define as simple flags on IPerson for now

---

## Work Objectives

### Core Objective
Build a complete personnel progression pipeline: XP award from 8 sources → skill cost calculation with trait modifiers → aging with attribute decay → SPA acquisition → vocational training day processor.

### Concrete Deliverables
- `src/types/campaign/progression/progressionTypes.ts` — XP source configs, aging milestones, SPA types
- `src/lib/campaign/progression/xpAwards.ts` — XP award functions for all 8 sources
- `src/lib/campaign/progression/skillCostTraits.ts` — Trait-modified skill cost formula
- `src/lib/campaign/progression/aging.ts` — Aging milestone processing
- `src/lib/campaign/progression/spaAcquisition.ts` — SPA roll and purchase
- `src/lib/campaign/processors/vocationalTrainingProcessor.ts` — Monthly training day processor
- `src/lib/campaign/processors/agingProcessor.ts` — Birthday aging day processor

### Definition of Done
- [ ] 8 XP sources with configurable amounts
- [ ] Skill cost formula with 4 trait modifiers (Fast/Slow Learner, Gremlins, Tech Empathy)
- [ ] Aging milestones with cumulative attribute decay at 10 age brackets
- [ ] SPA generation on veterancy (Veteran+ level) and coming-of-age (age 16)
- [ ] Vocational training day processor: monthly 2d6 vs TN
- [ ] Aging day processor: birthday check with milestone application

### Must Have
- XP award functions for scenario, kill, task, vocational, admin, mission sources
- Trait-modified skill cost extending Plan 7's getSkillImprovementCost()
- 10 aging milestones with per-attribute modifiers
- SPA auto-roll on veterancy
- Vocational training with configurable TN and XP amount
- Both processors registered in day pipeline

### Must NOT Have (Guardrails)
- Education/academy system (defer)
- Detailed SPA catalog (just the acquisition mechanic — define ~10 representative SPAs)
- Skill training scheduler (auto-assign skill to train)
- Family/genealogy system
- Import from `CampaignInterfaces.ts`

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: TDD
- **Framework**: Jest

---

## Task Flow

```
10.1 (Types) → 10.2 (XP awards) → 10.3 (Skill cost traits) → 10.4 (Aging) → 10.5 (Vocational processor) → 10.6 (SPA acquisition) → 10.7 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 10.1 | Foundation types |
| B | 10.2, 10.3, 10.4 | XP awards, skill costs, aging are independent once types exist |
| C | 10.5, 10.6 | Processors depend on earlier tasks |

| Task | Depends On | Reason |
|------|------------|--------|
| 10.2 | 10.1 | XP award needs source configs |
| 10.3 | 10.1 | Skill cost needs trait types |
| 10.4 | 10.1 | Aging needs milestone definitions |
| 10.5 | 10.2 | Vocational processor awards XP |
| 10.6 | 10.3 | SPA check happens on skill improvement |
| 10.7 | 10.5, 10.6 | UI needs everything |

---

## TODOs

- [x] 10.1 Define Progression Types and Configuration

  **What to do**:
  - Create `src/types/campaign/progression/progressionTypes.ts`:
    ```typescript
    export type XPSource = 'scenario' | 'kill' | 'task' | 'vocational' | 'admin' | 'mission' | 'education' | 'award';

    export interface IXPAwardEvent {
      readonly personId: string;
      readonly source: XPSource;
      readonly amount: number;
      readonly description: string;
    }

    export interface IAgingMilestone {
      readonly minAge: number;
      readonly maxAge: number;
      readonly label: string;
      readonly attributeModifiers: Record<string, number>; // attribute name → modifier (divided by 100)
      readonly appliesSlowLearner: boolean;
      readonly appliesGlassJaw: boolean;
    }

    export interface ISpecialAbility {
      readonly id: string;
      readonly name: string;
      readonly description: string;
      readonly xpCost: number;          // XP to purchase directly
      readonly isFlaw: boolean;         // Negative ability
      readonly isOriginOnly: boolean;   // Only at character creation
      readonly prerequisites?: readonly string[]; // Required skill IDs
    }

    // Trait flags on IPerson (extend IPerson)
    export interface IPersonTraits {
      readonly fastLearner?: boolean;
      readonly slowLearner?: boolean;
      readonly gremlins?: boolean;
      readonly techEmpathy?: boolean;
      readonly toughness?: boolean;
      readonly glassJaw?: boolean;
      readonly hasGainedVeterancySPA?: boolean;
      readonly vocationalXPTimer?: number; // days since last vocational check
    }
    ```
  - Add to ICampaignOptions (all optional):
    - `scenarioXP?: number` (default 1)
    - `killXPAward?: number` (default 1)
    - `killsForXP?: number` (default 1)
    - `taskXP?: number` (default 1)
    - `nTasksXP?: number` (default 1)
    - `vocationalXP?: number` (default 1)
    - `vocationalXPTargetNumber?: number` (default 7)
    - `vocationalXPCheckFrequency?: number` (default 30, days)
    - `adminXP?: number` (default 0)
    - `adminXPPeriod?: number` (default 7, days)
    - `missionFailXP?: number` (default 1)
    - `missionSuccessXP?: number` (default 3)
    - `missionOutstandingXP?: number` (default 5)
    - `useAgingEffects?: boolean` (default true)

  **Must NOT do**:
  - Define education configuration (no academy system)
  - Create exhaustive SPA catalog (just ~10 representative abilities)

  **Parallelizable**: YES (foundation)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Person.ts:268-411` — IPerson
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts` — ICampaignOptions
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\enums\AgingMilestone.java` — 10 milestones

  **Acceptance Criteria**:
  - [ ] RED: Test XPSource has 8 values
  - [ ] RED: Test IAgingMilestone has correct fields
  - [ ] RED: Test IPersonTraits has all 7 trait flags
  - [ ] GREEN: Types compile
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define personnel progression types and XP configuration`
  - Files: `src/types/campaign/progression/progressionTypes.ts`

---

- [x] 10.2 Implement XP Award Service

  **What to do**:
  - Create `src/lib/campaign/progression/xpAwards.ts`:
    ```typescript
    export function awardScenarioXP(person: IPerson, options: ICampaignOptions): IXPAwardEvent {
      const amount = options.scenarioXP ?? 1;
      return { personId: person.id, source: 'scenario', amount, description: 'Scenario participation' };
    }

    export function awardKillXP(person: IPerson, killCount: number, options: ICampaignOptions): IXPAwardEvent | null {
      const threshold = options.killsForXP ?? 1;
      const award = options.killXPAward ?? 1;
      if (killCount < threshold) return null;
      const amount = Math.floor(killCount / threshold) * award;
      return { personId: person.id, source: 'kill', amount, description: `${killCount} kills` };
    }

    export function awardTaskXP(person: IPerson, taskCount: number, options: ICampaignOptions): IXPAwardEvent | null {
      const threshold = options.nTasksXP ?? 1;
      if (taskCount < threshold) return null;
      const amount = options.taskXP ?? 1;
      return { personId: person.id, source: 'task', amount, description: `${taskCount} tasks completed` };
    }

    export function awardMissionXP(person: IPerson, outcome: 'fail' | 'success' | 'outstanding', options: ICampaignOptions): IXPAwardEvent {
      const amounts = { fail: options.missionFailXP ?? 1, success: options.missionSuccessXP ?? 3, outstanding: options.missionOutstandingXP ?? 5 };
      return { personId: person.id, source: 'mission', amount: amounts[outcome], description: `Mission ${outcome}` };
    }

    export function applyXPAward(person: IPerson, event: IXPAwardEvent): IPerson {
      return { ...person, xp: person.xp + event.amount, totalXpEarned: person.totalXpEarned + event.amount };
    }
    ```

  **Must NOT do**:
  - Implement education XP (no academy system)
  - Auto-spend XP on skills

  **Parallelizable**: YES (with 10.3, 10.4)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\ResolveScenarioTracker.java:826` — Scenario XP
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\handler\XPHandler.java:75` — Admin XP

  **Acceptance Criteria**:
  - [ ] RED: Test scenario XP awards configurable amount
  - [ ] RED: Test kill XP requires threshold kills
  - [ ] RED: Test mission XP varies by outcome (1/3/5)
  - [ ] RED: Test applyXPAward increments both xp and totalXpEarned
  - [ ] RED: Test kill count below threshold returns null
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement XP award service for 8 sources`
  - Files: `src/lib/campaign/progression/xpAwards.ts`

---

- [x] 10.3 Implement Skill Cost Formula with Trait Modifiers

  **What to do**:
  - Create `src/lib/campaign/progression/skillCostTraits.ts`:
    ```typescript
    export function calculateTraitMultiplier(person: IPerson, skillId: string): number {
      let multiplier = 1.0;

      // Slow Learner: +20% cost
      if (person.traits?.slowLearner) multiplier += 0.2;

      // Fast Learner: -20% cost
      if (person.traits?.fastLearner) multiplier -= 0.2;

      // Tech skill modifiers (only for tech-related skills)
      const skillType = getSkillType(skillId);
      if (skillType && isTechSkill(skillType)) {
        if (person.traits?.gremlins) multiplier += 0.1;
        if (person.traits?.techEmpathy) multiplier -= 0.1;
      }

      return Math.max(0.1, multiplier); // Floor at 10% cost
    }

    export function getSkillImprovementCostWithTraits(
      skillId: string,
      currentLevel: number,
      person: IPerson,
      options: ICampaignOptions
    ): number {
      // Get base cost from Plan 7's progression
      const baseCost = getSkillImprovementCost(skillId, currentLevel, person, options);
      const traitMultiplier = calculateTraitMultiplier(person, skillId);
      return Math.max(1, Math.round(baseCost * traitMultiplier));
    }

    export function isTechSkill(skillType: ISkillType): boolean {
      return ['tech-mech', 'tech-aero', 'tech-mechanic', 'tech-ba', 'tech-vessel', 'astech'].includes(skillType.id);
    }

    // Called after spending XP on skills — checks for veterancy SPA
    export function checkVeterancySPA(person: IPerson, skillId: string): boolean {
      if (person.traits?.hasGainedVeterancySPA) return false;
      // Check if any skill reached Veteran level
      // Returns true if SPA should be rolled
      return false; // Actual implementation checks ExperienceLevel
    }
    ```

  **Must NOT do**:
  - Change Plan 7's base skill cost function (extend, don't modify)
  - Implement reasoning attribute modifier (complex, defer)

  **Parallelizable**: YES (with 10.2, 10.4)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\Person.java:5563-5589` — Trait multipliers
  - `.sisyphus/plans/skills-expansion.md` — Plan 7 skill progression
  - `.sisyphus/drafts/mekhq-modifier-systems.md:437-452` — Skill cost formula

  **Acceptance Criteria**:
  - [ ] RED: Test Slow Learner adds +20% to cost
  - [ ] RED: Test Fast Learner subtracts -20% from cost
  - [ ] RED: Test Gremlins adds +10% to tech skills only
  - [ ] RED: Test Tech Empathy subtracts -10% from tech skills only
  - [ ] RED: Test combined traits stack (Slow Learner + Gremlins on tech = +30%)
  - [ ] RED: Test non-tech skills ignore Gremlins/Tech Empathy
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement skill cost with trait modifiers`
  - Files: `src/lib/campaign/progression/skillCostTraits.ts`

---

- [ ] 10.4 Implement Aging System

  **What to do**:
  - Create `src/lib/campaign/progression/aging.ts`:
    ```typescript
    export const AGING_MILESTONES: IAgingMilestone[] = [
      { minAge: 0,   maxAge: 24,  label: '<25',    attributeModifiers: { STR: 0, BOD: 0, DEX: 0, REF: 0, INT: 0, WIL: 0, CHA: 0 }, appliesSlowLearner: false, appliesGlassJaw: false },
      { minAge: 25,  maxAge: 30,  label: '25-30',  attributeModifiers: { STR: 0.5, BOD: 0.5, DEX: 0, REF: 0.5, INT: 0.5, WIL: 0.5, CHA: 0.5 }, appliesSlowLearner: false, appliesGlassJaw: false },
      { minAge: 31,  maxAge: 40,  label: '31-40',  attributeModifiers: { STR: 0.5, BOD: 0.5, DEX: 0, REF: 0.5, INT: 0.5, WIL: 0.5, CHA: 0 }, appliesSlowLearner: false, appliesGlassJaw: false },
      { minAge: 41,  maxAge: 50,  label: '41-50',  attributeModifiers: { STR: 0, BOD: 0, DEX: -0.5, REF: 0, INT: 0, WIL: 0, CHA: 0 }, appliesSlowLearner: false, appliesGlassJaw: false },
      { minAge: 51,  maxAge: 60,  label: '51-60',  attributeModifiers: { STR: 0, BOD: -1.0, DEX: 0, REF: -1.0, INT: 0, WIL: 0, CHA: -0.5 }, appliesSlowLearner: false, appliesGlassJaw: false },
      { minAge: 61,  maxAge: 70,  label: '61-70',  attributeModifiers: { STR: -1.0, BOD: -1.0, DEX: -1.0, REF: 0, INT: 0.5, WIL: 0, CHA: -0.5 }, appliesSlowLearner: true, appliesGlassJaw: true },
      { minAge: 71,  maxAge: 80,  label: '71-80',  attributeModifiers: { STR: -1.0, BOD: -1.25, DEX: 0, REF: -1.0, INT: 0, WIL: -0.5, CHA: -0.75 }, appliesSlowLearner: true, appliesGlassJaw: true },
      { minAge: 81,  maxAge: 90,  label: '81-90',  attributeModifiers: { STR: -1.5, BOD: -1.5, DEX: -1.0, REF: -1.0, INT: -1.0, WIL: -0.5, CHA: -1.0 }, appliesSlowLearner: true, appliesGlassJaw: true },
      { minAge: 91,  maxAge: 100, label: '91-100', attributeModifiers: { STR: -1.5, BOD: -1.75, DEX: -1.5, REF: -1.25, INT: -1.5, WIL: -1.0, CHA: -1.0 }, appliesSlowLearner: true, appliesGlassJaw: true },
      { minAge: 101, maxAge: 999, label: '101+',   attributeModifiers: { STR: -2.0, BOD: -2.0, DEX: -2.0, REF: -1.5, INT: -2.0, WIL: -1.0, CHA: -1.5 }, appliesSlowLearner: true, appliesGlassJaw: true },
    ];

    export function getMilestoneForAge(age: number): IAgingMilestone;
    export function getAgingAttributeModifier(age: number, attribute: string): number;

    export function processAging(
      person: IPerson,
      currentDate: string,
      options: ICampaignOptions
    ): { updatedPerson: IPerson; events: IAgingEvent[] } {
      if (!options.useAgingEffects) return { updatedPerson: person, events: [] };

      const age = calculateAge(person.birthDate, currentDate);
      if (!isBirthday(person.birthDate, currentDate)) return { updatedPerson: person, events: [] };

      const milestone = getMilestoneForAge(age);
      const previousMilestone = getMilestoneForAge(age - 1);

      // Only apply if crossing into new milestone
      if (milestone.label === previousMilestone.label) return { updatedPerson: person, events: [] };

      // Apply attribute modifiers
      let updated = applyAgingModifiers(person, milestone);

      // Apply SPAs at age 61+
      if (milestone.appliesGlassJaw && !person.traits?.toughness && !person.traits?.glassJaw) {
        updated = { ...updated, traits: { ...updated.traits, glassJaw: true } };
      }
      if (milestone.appliesSlowLearner && !person.traits?.fastLearner && !person.traits?.slowLearner) {
        updated = { ...updated, traits: { ...updated.traits, slowLearner: true } };
      }

      return { updatedPerson: updated, events: [{ type: 'aging', personId: person.id, milestone, age }] };
    }
    ```

  **Must NOT do**:
  - Implement death from old age (that's Plan 13 status transitions)
  - Clan aging differences (Clan enhanced imaging etc.)

  **Parallelizable**: YES (with 10.2, 10.3)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\Aging.java:80-86` — Attribute modifier calc
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\enums\AgingMilestone.java` — 10 milestones

  **Acceptance Criteria**:
  - [ ] RED: Test age 30 in milestone "25-30"
  - [ ] RED: Test age 65 applies STR -1.0 modifier
  - [ ] RED: Test age 61 applies Glass Jaw (unless has Toughness)
  - [ ] RED: Test age 61 applies Slow Learner (unless has Fast Learner)
  - [ ] RED: Test no modifiers applied if useAgingEffects is false
  - [ ] RED: Test modifiers only applied on birthday when crossing milestone boundary
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement aging system with milestone attribute decay`
  - Files: `src/lib/campaign/progression/aging.ts`

---

- [ ] 10.5 Implement Vocational Training Day Processor

  **What to do**:
  - Create `src/lib/campaign/processors/vocationalTrainingProcessor.ts`:
    ```typescript
    export function processVocationalTraining(
      campaign: ICampaign,
      random: RandomFn
    ): { updatedCampaign: ICampaign; events: IXPAwardEvent[] } {
      const events: IXPAwardEvent[] = [];
      const options = campaign.options;
      const vocationalXP = options.vocationalXP ?? 1;
      const targetNumber = options.vocationalXPTargetNumber ?? 7;
      const checkFrequency = options.vocationalXPCheckFrequency ?? 30;

      for (const person of campaign.personnel) {
        if (!isEligibleForVocational(person)) continue;

        const timer = (person.traits?.vocationalXPTimer ?? 0) + 1;
        if (timer >= checkFrequency) {
          // Roll 2d6 vs TN
          const roll = roll2d6(random);
          if (roll >= targetNumber) {
            events.push({
              personId: person.id,
              source: 'vocational',
              amount: vocationalXP,
              description: `Vocational training (rolled ${roll} vs TN ${targetNumber})`,
            });
          }
          // Reset timer regardless of success
          // (timer reset handled in campaign update)
        }
      }

      return { updatedCampaign: applyVocationalResults(campaign, events), events };
    }

    function isEligibleForVocational(person: IPerson): boolean {
      return person.status === PersonnelStatus.ACTIVE
        && !isChild(person)
        && !isDependent(person)
        && !isPrisoner(person);
    }
    ```

  **Must NOT do**:
  - Auto-assign XP to specific skills
  - Double XP for Clan personnel (defer — complex)

  **Parallelizable**: NO (depends on 10.2)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\CampaignNewDayManager.java:1882-1915` — Vocational XP
  - `E:\Projects\MekStation\src\lib\campaign\dayPipeline.ts` — IDayProcessor (Plan 1)

  **Acceptance Criteria**:
  - [ ] RED: Test eligible person gets roll after check frequency days
  - [ ] RED: Test roll >= TN awards vocational XP
  - [ ] RED: Test roll < TN awards nothing
  - [ ] RED: Test inactive/child/dependent/prisoner excluded
  - [ ] RED: Test timer resets after check
  - [ ] RED: Test deterministic with seeded random
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement vocational training day processor`
  - Files: `src/lib/campaign/processors/vocationalTrainingProcessor.ts`

---

- [ ] 10.6 Implement SPA Acquisition

  **What to do**:
  - Create `src/lib/campaign/progression/spaAcquisition.ts`:
    ```typescript
    // Representative SPA catalog (~10 abilities)
    export const SPA_CATALOG: Record<string, ISpecialAbility> = {
      'fast_learner': { id: 'fast_learner', name: 'Fast Learner', description: '-20% XP cost', xpCost: 30, isFlaw: false, isOriginOnly: false },
      'toughness': { id: 'toughness', name: 'Toughness', description: 'Absorb 1 additional hit', xpCost: 25, isFlaw: false, isOriginOnly: false },
      'pain_resistance': { id: 'pain_resistance', name: 'Pain Resistance', description: 'Ignore wound penalties', xpCost: 20, isFlaw: false, isOriginOnly: false },
      'weapon_specialist': { id: 'weapon_specialist', name: 'Weapon Specialist', description: '-1 TN with chosen weapon', xpCost: 15, isFlaw: false, isOriginOnly: false },
      'tactical_genius': { id: 'tactical_genius', name: 'Tactical Genius', description: '+1 initiative', xpCost: 35, isFlaw: false, isOriginOnly: false },
      'iron_man': { id: 'iron_man', name: 'Iron Man', description: 'No consciousness roll', xpCost: 40, isFlaw: false, isOriginOnly: false },
      'natural_aptitude': { id: 'natural_aptitude', name: 'Natural Aptitude', description: '-1 TN for chosen skill', xpCost: 25, isFlaw: false, isOriginOnly: true },
      'slow_learner': { id: 'slow_learner', name: 'Slow Learner', description: '+20% XP cost', xpCost: -10, isFlaw: true, isOriginOnly: false },
      'glass_jaw': { id: 'glass_jaw', name: 'Glass Jaw', description: '-1 consciousness threshold', xpCost: -10, isFlaw: true, isOriginOnly: false },
      'gremlins': { id: 'gremlins', name: 'Gremlins', description: '+10% tech skill XP cost', xpCost: -5, isFlaw: true, isOriginOnly: false },
    };

    export function rollVeterancySPA(
      person: IPerson,
      random: RandomFn
    ): ISpecialAbility | null {
      if (person.traits?.hasGainedVeterancySPA) return null;
      const eligible = Object.values(SPA_CATALOG).filter(spa =>
        !spa.isOriginOnly && !spa.isFlaw && !personHasSPA(person, spa.id)
      );
      if (eligible.length === 0) return null;
      // 1/40 chance of flaw instead
      const isFlaw = Math.floor(random() * 40) === 0;
      const pool = isFlaw
        ? Object.values(SPA_CATALOG).filter(spa => spa.isFlaw && !personHasSPA(person, spa.id))
        : eligible;
      if (pool.length === 0) return null;
      const index = Math.floor(random() * pool.length);
      return pool[index];
    }

    export function rollComingOfAgeSPA(person: IPerson, random: RandomFn): ISpecialAbility | null;
    export function purchaseSPA(person: IPerson, spaId: string): { updatedPerson: IPerson; success: boolean; reason?: string };
    export function personHasSPA(person: IPerson, spaId: string): boolean;
    ```
  - Add `specialAbilities?: string[]` to IPerson (list of SPA IDs)

  **Must NOT do**:
  - Implement full SPA effect processing in combat (just tracking who has what)
  - Create specialization selection UI (defer)

  **Parallelizable**: NO (depends on 10.3)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\generator\SingleSpecialAbilityGenerator.java:197-251` — SPA roll

  **Acceptance Criteria**:
  - [ ] RED: Test veterancy SPA only rolls once (hasGainedVeterancySPA flag)
  - [ ] RED: Test SPA roll excludes origin-only and already-held SPAs
  - [ ] RED: Test 1/40 chance of flaw
  - [ ] RED: Test purchaseSPA deducts XP and adds to person
  - [ ] RED: Test purchaseSPA fails if insufficient XP
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement SPA acquisition with veterancy and purchase`
  - Files: `src/lib/campaign/progression/spaAcquisition.ts`

---

- [ ] 10.7 Create Progression UI

  **What to do**:
  - Create `src/components/campaign/ProgressionPanel.tsx`:
    - XP history panel: source breakdown (scenario, kill, vocational, etc.)
    - Aging effects display: current milestone, attribute modifiers applied
    - SPA list: acquired abilities with descriptions
    - SPA acquisition: purchase button (spend XP) with cost display
    - Trait display: Fast Learner, Slow Learner, etc. with effects
  - Integrate into personnel detail page

  **Must NOT do**:
  - Skill training assignment UI
  - Aging timeline visualization

  **Parallelizable**: NO (depends on 10.5, 10.6)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard

  **Acceptance Criteria**:
  - [ ] XP history shows breakdown by source
  - [ ] Aging milestone displayed with current modifiers
  - [ ] SPA list shows acquired abilities
  - [ ] Purchase SPA button deducts XP
  - [ ] Manual verification: dev server → personnel → progression → purchase SPA → verify

  **Commit**: YES
  - Message: `feat(ui): add personnel progression panel with XP and SPA management`
  - Files: `src/components/campaign/ProgressionPanel.tsx`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 10.1 | `feat(campaign): define progression types and XP config` | `npm test` |
| 10.2 | `feat(campaign): implement XP award service` | `npm test` |
| 10.3 | `feat(campaign): implement skill cost with trait modifiers` | `npm test` |
| 10.4 | `feat(campaign): implement aging with milestone decay` | `npm test` |
| 10.5 | `feat(campaign): implement vocational training processor` | `npm test` |
| 10.6 | `feat(campaign): implement SPA acquisition` | `npm test` |
| 10.7 | `feat(ui): add progression panel` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [ ] 8 XP sources with configurable amounts
- [ ] Skill cost with 4 trait modifiers (stacking correctly)
- [ ] 10 aging milestones with cumulative attribute decay
- [ ] Glass Jaw + Slow Learner applied at 61+
- [ ] Vocational training monthly with 2d6 vs TN
- [ ] SPA veterancy roll + purchase system
- [ ] Both day processors registered

---

## Registration Snippets

```typescript
// Aging processor (daily — checks birthday internally)
registry.register({
  id: 'aging-processor',
  name: 'Aging & Attribute Decay',
  phase: 'personnel',
  frequency: 'daily',
  process: processAgingForAllPersonnel,
  optionGate: (opts) => opts.useAgingEffects !== false,
});

// Vocational training processor (tracks its own timer)
registry.register({
  id: 'vocational-training-processor',
  name: 'Vocational Training',
  phase: 'personnel',
  frequency: 'daily', // timer-based internally
  process: processVocationalTraining,
  optionGate: (opts) => (opts.vocationalXP ?? 0) > 0,
});
```

---

## Migration Notes

- New `traits` field on IPerson (optional IPersonTraits) — existing persons have no traits
- New `specialAbilities` field on IPerson (optional string[]) — existing persons have none
- All XP config options default to MekHQ values (scenarioXP=1, missionSuccessXP=3, etc.)
- Aging effects default to enabled — existing persons will start receiving aging effects
- Vocational XP defaults to 1 with TN 7 — opt-in via vocationalXP > 0
- Plan 7's getSkillImprovementCost() is NOT modified — this plan wraps it with trait multiplier
- No migration needed for saved campaigns — new fields are purely additive

---

*Plan generated by Prometheus. Execute with `/start-work`.*
