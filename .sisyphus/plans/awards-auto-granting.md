# Awards Auto-Granting

## Context

### Original Request
Implement MekHQ's auto-award system that automatically grants awards based on personnel achievements. MekHQ has 13 award categories checked monthly and after key events (mission completion, scenario resolution, promotion, graduation). MekStation already has 54 awards in 5 categories with criteria — this plan adds the auto-check engine and expands the catalog.

### Interview Summary
**Key Discussions**:
- 5 controller methods: Manual (monthly), PostMission, PostScenario, PostPromotion, PostGraduation
- 13 award categories: contract, faction hunter, injury, kill, scenario kill, rank, scenario, skill, theatre of war, time, training, misc
- Each category has enable/disable toggle in campaign options
- "Best Award Only" option: only grant highest qualifying award per category
- Existing MekStation awards use IAwardCriteria with TotalKills, MissionsCompleted, etc.
- Auto-check processes all eligible personnel (active, non-prisoner, non-civilian)
- Posthumous awards: if death date >= last mission end date

**Research Findings**:
- `AutoAwardsController.java`: Main orchestrator with buildAwardLists() and ProcessAwards()
- `KillAwards.java`: Kill awards with formation-level support (individual→army)
- `TimeAwards.java`: Service time with cumulative/stackable support
- `SkillAwards.java`: 30+ skill categories with level thresholds
- `RankAwards.java`: Promotion/Inclusive/Exclusive modes
- AwardsFactory loads from XML — MekStation uses TypeScript catalog
- Monthly trigger: CampaignNewDayManager.java line 436 (1st of month)

### Metis Review
**Identified Gaps** (addressed):
- MekStation's existing AwardCriteria types (TotalKills, MissionsCompleted, etc.) already cover most auto-grant logic
- Need to add: contract duration, faction-specific kills, injury threshold, rank-based, time-in-service
- Formation-level kills (lance/company) too complex for initial implementation — start with individual kills
- Theatre of War awards need active conflict data — stub this category
- Auto-awards should generate events for the day report

---

## Work Objectives

### Core Objective
Build an auto-award engine that checks personnel against award criteria on configurable triggers (monthly, post-mission, post-scenario) and grants qualifying awards automatically.

### Concrete Deliverables
- `src/types/campaign/awards/autoAwardTypes.ts` — Auto-award categories and configuration
- `src/lib/campaign/awards/autoAwardEngine.ts` — Main auto-award processing engine
- `src/lib/campaign/awards/categoryCheckers.ts` — Per-category eligibility checkers
- Extended `src/types/award/AwardCatalog.ts` — ~30 new awards for expanded categories
- `src/lib/campaign/processors/autoAwardsProcessor.ts` — Monthly day processor

### Definition of Done
- [ ] Auto-award engine processes all eligible personnel against all enabled categories
- [ ] 13 award category checkers (some stubbed for complex requirements)
- [ ] Monthly auto-check as day processor
- [ ] Post-mission and post-scenario hooks
- [ ] "Best Award Only" option per category
- [ ] ~30 new awards in expanded categories
- [ ] Enable/disable toggles per category

### Must Have
- Auto-award engine with multi-trigger support
- Kill awards (individual level)
- Scenario count awards
- Time-in-service awards
- Mission completion awards
- Skill level awards
- Rank-based awards
- Enable/disable per category
- "Best Award Only" mode

### Must NOT Have (Guardrails)
- Formation-level kill tracking (lance/company kills — defer)
- Theatre of War awards (need conflict database — stub)
- Training/graduation awards (no academy system — stub)
- Award ceremony UI with animation
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
14.1 (Types) → 14.2 (Eligibility) → 14.3 (Engine) → 14.4 (Catalog) → 14.5 (Processor) → 14.6 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 14.1 | Foundation types |
| B | 14.2, 14.4 | Checkers and catalog are independent |

| Task | Depends On | Reason |
|------|------------|--------|
| 14.2 | 14.1 | Checkers need category types |
| 14.3 | 14.1, 14.2 | Engine orchestrates checkers |
| 14.4 | 14.1 | Catalog uses category enum |
| 14.5 | 14.3 | Processor uses engine |
| 14.6 | 14.5 | UI needs everything |

---

## TODOs

- [ ] 14.1 Define Auto-Award Categories and Configuration

  **What to do**:
  - Create `src/types/campaign/awards/autoAwardTypes.ts`:
    ```typescript
    export enum AutoAwardCategory {
      CONTRACT = 'contract',
      FACTION_HUNTER = 'faction_hunter',
      INJURY = 'injury',
      KILL = 'kill',
      SCENARIO_KILL = 'scenario_kill',
      RANK = 'rank',
      SCENARIO = 'scenario',
      SKILL = 'skill',
      THEATRE_OF_WAR = 'theatre_of_war',
      TIME = 'time',
      TRAINING = 'training',
      MISC = 'misc',
      // MekStation's existing categories
      COMBAT = 'combat',
      SURVIVAL = 'survival',
      SERVICE = 'service',
      CAMPAIGN = 'campaign',
      SPECIAL = 'special',
    }

    export type AutoAwardTrigger = 'monthly' | 'post_mission' | 'post_scenario' | 'post_promotion' | 'manual';

    export interface IAutoAwardConfig {
      readonly enableAutoAwards: boolean;
      readonly bestAwardOnly: boolean;
      readonly enabledCategories: Record<AutoAwardCategory, boolean>;
      readonly enablePosthumous: boolean;
    }

    export interface IAwardGrantEvent {
      readonly personId: string;
      readonly awardId: string;
      readonly awardName: string;
      readonly category: AutoAwardCategory;
      readonly trigger: AutoAwardTrigger;
      readonly timestamp: string;
    }

    // Extension to IAward for auto-grant criteria
    export interface IAutoGrantCriteria {
      readonly category: AutoAwardCategory;
      readonly threshold: number;       // value to meet/exceed
      readonly thresholdType: string;   // what the threshold measures
      readonly stackable: boolean;      // can be earned multiple times
    }
    ```
  - Add `autoAwardConfig?: IAutoAwardConfig` to ICampaignOptions

  **Parallelizable**: YES (foundation)

  **References**:
  - `E:\Projects\MekStation\src\types\award\AwardInterfaces.ts` — IAward, IPilotAward
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\autoAwards\AutoAwardsController.java` — Categories

  **Acceptance Criteria**:
  - [ ] RED: Test AutoAwardCategory has 17 values (13 MekHQ + 4 existing MekStation + special)
  - [ ] RED: Test AutoAwardTrigger has 5 values
  - [ ] RED: Test IAutoAwardConfig has all fields
  - [ ] GREEN: Types compile
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define auto-award categories and configuration`
  - Files: `src/types/campaign/awards/autoAwardTypes.ts`

---

- [ ] 14.2 Implement Auto-Award Eligibility Checkers

  **What to do**:
  - Create `src/lib/campaign/awards/categoryCheckers.ts`:
    ```typescript
    export function checkKillAwards(person: IPerson, awards: IAward[]): IAward[] {
      return awards.filter(award => {
        const criteria = award.autoGrantCriteria;
        if (!criteria || criteria.category !== AutoAwardCategory.KILL) return false;
        return person.totalKills >= criteria.threshold;
      });
    }

    export function checkScenarioAwards(person: IPerson, awards: IAward[]): IAward[];
    export function checkTimeAwards(person: IPerson, currentDate: string, awards: IAward[]): IAward[];
    export function checkSkillAwards(person: IPerson, awards: IAward[]): IAward[];
    export function checkRankAwards(person: IPerson, awards: IAward[]): IAward[];
    export function checkInjuryAwards(person: IPerson, awards: IAward[]): IAward[];

    /** @stub Requires contract data. Plan 12 provides contract types. */
    export function checkContractAwards(person: IPerson, awards: IAward[]): IAward[] { return []; }

    /** @stub Requires faction kill tracking. */
    export function checkFactionHunterAwards(person: IPerson, awards: IAward[]): IAward[] { return []; }

    /** @stub Requires active conflict data. */
    export function checkTheatreOfWarAwards(person: IPerson, awards: IAward[]): IAward[] { return []; }

    /** @stub Requires academy system. */
    export function checkTrainingAwards(person: IPerson, awards: IAward[]): IAward[] { return []; }

    // Master dispatcher
    export function checkAwardsForCategory(
      category: AutoAwardCategory,
      person: IPerson,
      awards: IAward[],
      context: { currentDate: string }
    ): IAward[];
    ```

  **Parallelizable**: YES (with 14.4)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\autoAwards\KillAwards.java` — Kill logic
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\autoAwards\TimeAwards.java` — Time logic

  **Acceptance Criteria**:
  - [ ] RED: Test kill award granted when kills >= threshold
  - [ ] RED: Test kill award NOT granted when kills < threshold
  - [ ] RED: Test scenario award granted when missions >= threshold
  - [ ] RED: Test time award granted when years of service >= threshold
  - [ ] RED: Test stubbed categories return empty array
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement auto-award category checkers`
  - Files: `src/lib/campaign/awards/categoryCheckers.ts`

---

- [ ] 14.3 Implement Auto-Award Controller Engine

  **What to do**:
  - Create `src/lib/campaign/awards/autoAwardEngine.ts`:
    ```typescript
    export function processAutoAwards(
      campaign: ICampaign,
      trigger: AutoAwardTrigger,
      context?: { missionId?: string; scenarioId?: string }
    ): IAwardGrantEvent[] {
      const config = campaign.options.autoAwardConfig;
      if (!config?.enableAutoAwards) return [];

      const allAwards = getAutoGrantableAwards(); // Awards with autoGrantCriteria
      const events: IAwardGrantEvent[] = [];

      for (const person of getEligiblePersonnel(campaign, config)) {
        for (const [category, enabled] of Object.entries(config.enabledCategories)) {
          if (!enabled) continue;

          const qualifying = checkAwardsForCategory(
            category as AutoAwardCategory,
            person,
            allAwards.filter(a => a.autoGrantCriteria?.category === category),
            { currentDate: campaign.currentDate }
          );

          // Filter out already-earned (non-stackable) awards
          const newAwards = qualifying.filter(award =>
            award.autoGrantCriteria?.stackable || !personHasAward(person, award.id)
          );

          // Best award only: keep highest threshold
          const toGrant = config.bestAwardOnly
            ? [getBestAward(newAwards)]
            : newAwards;

          for (const award of toGrant.filter(Boolean)) {
            events.push({
              personId: person.id,
              awardId: award!.id,
              awardName: award!.name,
              category: category as AutoAwardCategory,
              trigger,
              timestamp: campaign.currentDate,
            });
          }
        }
      }

      return events;
    }

    function getEligiblePersonnel(campaign: ICampaign, config: IAutoAwardConfig): IPerson[] {
      return campaign.personnel.filter(p => {
        if (isDead(p.status) && !config.enablePosthumous) return false;
        if (isDead(p.status)) return true; // Posthumous
        return p.status === PersonnelStatus.ACTIVE && !isCivilianRole(p.primaryRole);
      });
    }
    ```

  **Parallelizable**: NO (depends on 14.1, 14.2)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\autoAwards\AutoAwardsController.java` — Processing logic

  **Acceptance Criteria**:
  - [ ] RED: Test no awards when autoAwards disabled
  - [ ] RED: Test only enabled categories are checked
  - [ ] RED: Test best-award-only returns single highest award
  - [ ] RED: Test non-stackable awards not re-granted
  - [ ] RED: Test posthumous awards only when enabled
  - [ ] RED: Test civilians excluded
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement auto-award controller engine`
  - Files: `src/lib/campaign/awards/autoAwardEngine.ts`

---

- [ ] 14.4 Extend Award Catalog with Auto-Grant Criteria

  **What to do**:
  - Add `autoGrantCriteria?: IAutoGrantCriteria` to existing IAward interface
  - Add ~30 new awards across expanded categories:
    ```typescript
    // Kill awards: 5, 10, 25, 50, 100, 250, 500 kills
    // Scenario awards: 5, 10, 25, 50, 100 scenarios
    // Time awards: 1, 2, 5, 10, 20, 30 years of service
    // Injury awards: 1, 3, 5, 10 injuries survived
    // Rank awards: Officer, Senior Officer, Command
    // Skill awards: Expert (level 4+), Master (level 2+), Elite (level 0+)
    ```
  - Each new award has autoGrantCriteria with category, threshold, stackable flag
  - Preserve all 54 existing awards (add autoGrantCriteria to applicable ones)

  **Must NOT do**:
  - Remove any existing awards
  - Change existing award IDs

  **Parallelizable**: YES (with 14.2)

  **References**:
  - `E:\Projects\MekStation\src\types\award\AwardCatalog.ts` — 54 existing awards

  **Acceptance Criteria**:
  - [ ] RED: Test ~30 new awards have autoGrantCriteria
  - [ ] RED: Test existing 54 awards preserved
  - [ ] RED: Test kill awards at 5/10/25/50/100/250/500 thresholds
  - [ ] RED: Test time awards at 1/2/5/10/20/30 year thresholds
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): extend award catalog with ~30 auto-grantable awards`
  - Files: `src/types/award/AwardCatalog.ts`

---

- [ ] 14.5 Register Auto-Awards Day Processor

  **What to do**:
  - Create `src/lib/campaign/processors/autoAwardsProcessor.ts`:
    ```typescript
    export function processMonthlyAutoAwards(
      campaign: ICampaign
    ): { updatedCampaign: ICampaign; events: IAwardGrantEvent[] } {
      const events = processAutoAwards(campaign, 'monthly');
      const updatedCampaign = applyAwardGrants(campaign, events);
      return { updatedCampaign, events };
    }
    ```
  - Also export hooks for other triggers:
    - `processPostMissionAwards(campaign, missionId)` — called by mission completion
    - `processPostScenarioAwards(campaign, scenarioId)` — called by scenario resolution

  **Parallelizable**: NO (depends on 14.3)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayPipeline.ts` — IDayProcessor (Plan 1)
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\CampaignNewDayManager.java:436-438` — Monthly trigger

  **Acceptance Criteria**:
  - [ ] RED: Test monthly processor runs on 1st of month
  - [ ] RED: Test awards granted are applied to persons
  - [ ] RED: Test IAwardGrantEvent generated for each grant
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): register auto-awards monthly processor`
  - Files: `src/lib/campaign/processors/autoAwardsProcessor.ts`

---

- [ ] 14.6 Create Auto-Awards UI

  **What to do**:
  - Award notification toast on grant (name, person, category)
  - Award history timeline on personnel detail page
  - Auto-award settings in campaign options:
    - Master enable/disable toggle
    - Per-category toggles
    - Best Award Only toggle
    - Posthumous awards toggle
  - Manual "Process Awards" button for testing

  **Parallelizable**: NO (depends on 14.5)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard

  **Acceptance Criteria**:
  - [ ] Award toast appears on grant
  - [ ] Award history shows all earned awards with dates
  - [ ] Category toggles work in settings
  - [ ] Manual process button triggers award check
  - [ ] Manual verification: dev server → advance month → verify auto-awards → check personnel

  **Commit**: YES
  - Message: `feat(ui): add auto-award notifications and settings`
  - Files: auto-award UI components

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 14.1 | `feat(campaign): define auto-award categories` | `npm test` |
| 14.2 | `feat(campaign): implement category checkers` | `npm test` |
| 14.3 | `feat(campaign): implement auto-award engine` | `npm test` |
| 14.4 | `feat(campaign): extend award catalog` | `npm test` |
| 14.5 | `feat(campaign): register auto-awards processor` | `npm test` |
| 14.6 | `feat(ui): add auto-award UI` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [ ] Auto-award engine with 5 trigger types
- [ ] 13 category checkers (4 stubbed)
- [ ] ~30 new awards with auto-grant criteria
- [ ] Monthly processor registered
- [ ] Best Award Only mode working
- [ ] Existing 54 awards preserved

---

## Registration Snippet

```typescript
registry.register({
  id: 'auto-awards-processor',
  name: 'Auto Awards',
  phase: 'personnel',
  frequency: 'monthly',
  process: processMonthlyAutoAwards,
  optionGate: (opts) => opts.autoAwardConfig?.enableAutoAwards === true,
});
```

---

## Migration Notes

- New `autoAwardConfig` on ICampaignOptions defaults to all categories enabled
- New `autoGrantCriteria` on IAward is optional — existing awards work without it
- Existing awards get autoGrantCriteria added where applicable (kill, scenario, service)
- ~30 new awards added to AwardCatalog — additive, no existing awards changed
- Monthly processor only runs if enableAutoAwards is true
- Stubbed categories (contract, faction hunter, theatre, training) return empty until dependencies built

---

*Plan generated by Prometheus. Execute with `/start-work`.*
