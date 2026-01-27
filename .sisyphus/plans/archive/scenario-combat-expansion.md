# Scenario & Combat Expansion

> **✅ COMPLETED** — Implemented, merged, and archived. PR #195.

## Audit Corrections

> Applied 2026-01-27 — corrections align this plan with MekHQ Java source code.

| # | Old Value | New Value | MekHQ Source |
|---|-----------|-----------|--------------|
| 1 | BV range "75-125%" or "85-125%" | "85-120%" — `randomInt(8)` returns 0-7, `(0-3)*5=-15` to `(7-3)*5=+20`, giving 85% to 120% | `AtBDynamicScenarioFactory.java:348` |
| 2 | (missing) Total scenario types | "21+ total scenario types (9 core + 12+ special)" | `AtBScenario.java:117-140` |
| 3 | Scenario type selection tables | Flag as `[UNVERIFIED]` — not found in AtBScenarioFactory.java | Searched MekHQ source |
| 4 | (implied) AtBScenarioType enum | "AtBScenarioType enum doesn't exist — MekHQ uses int constants (0-21)" | `AtBScenario.java` |
| 5 | Battle chance percentages | Flag as `[UNVERIFIED]` — not found in CombatTeam.java | Searched MekHQ source |

---

## Context

### Original Request
Expand MekStation's basic scenario system from 4 templates into MekHQ's full AtB dynamic scenario generation: battle chance per combat role, scenario type selection tables, OpFor BV matching, weather/conditions, morale tracking per contract, and ACAR (Abstract Combat Auto-Resolve) improvements.

### Interview Summary
**Key Discussions**:
- 7 combat roles (Maneuver/Frontline/Patrol/Training/Cadre/Auxiliary/Reserve) with different battle chances
- Battle type modifier from contract morale level: `1 + (STALEMATE.ordinal() - morale.ordinal()) × 5`
- 7 morale levels (Routed through Overwhelming) tracked per contract
- Scenario type tables per role [UNVERIFIED] <!-- AUDIT: Selection tables not found in AtBScenarioFactory.java --> (d40 for Maneuver, d60 for Patrol, d20 for Frontline, d10 for Training)
- 21+ total scenario types (9 core + 12+ special) <!-- AUDIT: Added missing count. Source: AtBScenario.java:117-140 -->: Base Attack, Breakthrough, Standup, Chase, Hold the Line, Hide & Seek, Probe, Extraction, Recon Raid
- OpFor BV matching: `playerBV × difficulty × forceMult × (scenarioMod / 100)` with 85-120% random variation <!-- AUDIT: Corrected from "75-125%" to "85-120%". randomInt(8) returns 0-7, (0-3)*5=-15 to (7-3)*5=+20, giving 85% to 120%. Source: AtBDynamicScenarioFactory.java:348 -->
- Planetary conditions: light (5 levels), weather (10+ types), gravity, atmosphere effects on force composition
- Scenario generation runs weekly (Mondays) for active contracts
- ACAR exists but is basic — improve with BV-based outcomes
- TDD approach, injectable RandomFn

**Research Findings**:
- `CombatTeam.java`: Battle chances [UNVERIFIED] <!-- AUDIT: Battle chance percentages not found in CombatTeam.java --> — Maneuver 40%, Patrol 60%, Frontline 20%, Training/Cadre 10%
- `AtBDynamicScenarioFactory.java`: Full generation pipeline (template → forces → conditions → objectives)
- `AtBMoraleLevel.java`: 7 levels with crisis die sizes (d7 to d1)
- `AtBContractType.java`: Scenario type selection tables per combat role
- Planetary effects: Low gravity → no tanks, Toxic → no conv infantry, Tornado F4 → infantry/BA/tanks banned
- Force sizes: Lance=4 (IS), Star=5 (Clan), Level II=6 (ComStar)
- BV formula: Target % = `100 + ((randomInt(8) - 3) × 5)` = 85-120% <!-- AUDIT: Missed in initial correction. Source: AtBDynamicScenarioFactory.java:348 -->

### Metis Review
**Identified Gaps** (addressed):
- CombatRole is force-level (per combat team), NOT person-level like CampaignPersonnelRole
- Morale changes on scenario outcomes (victory/defeat shifts morale)
- Scenario conditions are optional on IScenario (backward compatible)
- OpFor needs access to canonical unit database for BV-matched force composition
- ACAR improvements need formula for abstract win/loss based on BV ratio
- Scenario type tables are large constant data — define as typed objects

---

## Work Objectives

### Core Objective
Build dynamic scenario generation: weekly battle chance check per combat team → scenario type selection → OpFor BV matching → conditions assignment → morale tracking, all through a weekly day processor.

### Concrete Deliverables
- `src/types/campaign/scenario/scenarioTypes.ts` — Combat roles, morale, scenario types, conditions
- `src/lib/campaign/scenario/battleChance.ts` — Battle chance calculator per role
- `src/lib/campaign/scenario/scenarioTypeSelection.ts` — Scenario type tables
- `src/lib/campaign/scenario/opForGeneration.ts` — OpFor BV matching and force composition
- `src/lib/campaign/scenario/scenarioConditions.ts` — Weather, light, planetary conditions
- `src/lib/campaign/processors/scenarioGenerationProcessor.ts` — Weekly day processor
- `src/lib/campaign/scenario/morale.ts` — Contract morale tracking and updates

### Definition of Done
- [x] 7 combat roles with configurable battle chances
- [x] Scenario type selection tables for Maneuver, Patrol, Frontline, Training/Cadre
- [x] OpFor BV matching with difficulty scaling and random variation
- [x] Scenario conditions (light, weather, gravity, atmosphere) with force composition effects
- [x] 7 morale levels tracked per contract, updated on scenario outcomes
- [x] Weekly scenario generation processor
- [x] ACAR improvement with BV-ratio outcome formula

### Must Have
- CombatRole enum (7 values) separate from CampaignPersonnelRole
- AtBMoraleLevel enum (7 values) on IContract
- Battle chance per role with morale modifier
- Scenario type tables (Maneuver/Patrol/Frontline/Training)
- OpFor BV formula: `playerBV × difficulty × (85-120%)` <!-- AUDIT: Missed in initial correction -->
- Scenario conditions with at least light and weather
- Weekly processor registered in pipeline

### Must NOT Have (Guardrails)
- Full MegaMek unit database integration (use existing canonical units)
- Real-time tactical combat simulation
- Princess AI bot behavior
- Detailed terrain/map generation
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
11.1 (Types) → 11.2 (Battle chance) → 11.3 (Scenario types) → 11.4 (OpFor BV) → 11.5 (Conditions) → 11.6 (Morale) → 11.7 (Processor) → 11.8 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 11.1 | Foundation types |
| B | 11.2, 11.3, 11.5 | Battle chance, type tables, conditions are independent |
| C | 11.4, 11.6 | OpFor needs types; morale needs types |

| Task | Depends On | Reason |
|------|------------|--------|
| 11.2 | 11.1 | Battle chance needs roles and morale types |
| 11.3 | 11.1 | Type selection needs scenario type enum |
| 11.4 | 11.1 | OpFor needs scenario types for force scaling |
| 11.5 | 11.1 | Conditions use typed enums |
| 11.6 | 11.1 | Morale tracking needs level enum |
| 11.7 | 11.2-11.6 | Processor orchestrates everything |
| 11.8 | 11.7 | UI shows generated scenarios |

---

## TODOs

- [x] 11.1 Define Combat Roles, Morale, and Scenario Types

  **What to do**:
  - Create `src/types/campaign/scenario/scenarioTypes.ts`:
    ```typescript
    export enum CombatRole {
      MANEUVER = 'maneuver',
      FRONTLINE = 'frontline',
      PATROL = 'patrol',
      TRAINING = 'training',
      CADRE = 'cadre',
      AUXILIARY = 'auxiliary',
      RESERVE = 'reserve',
    }

    export enum AtBMoraleLevel {
      ROUTED = 'routed',         // -3
      CRITICAL = 'critical',     // -2
      WEAKENED = 'weakened',     // -1
      STALEMATE = 'stalemate',  //  0 (default)
      ADVANCING = 'advancing',   // +1
      DOMINATING = 'dominating', // +2
      OVERWHELMING = 'overwhelming', // +3
    }

    export const MORALE_VALUES: Record<AtBMoraleLevel, number> = {
      routed: -3, critical: -2, weakened: -1, stalemate: 0,
      advancing: 1, dominating: 2, overwhelming: 3,
    };

     // NOTE: MekHQ uses int constants (0-21), not an enum. This is TypeScript adaptation.
     // <!-- AUDIT: Architecture note. MekHQ source: AtBScenario.java -->
     export enum AtBScenarioType {
       BASE_ATTACK = 'base_attack',
       BREAKTHROUGH = 'breakthrough',
       STANDUP = 'standup',
       CHASE = 'chase',
       HOLD_THE_LINE = 'hold_the_line',
       HIDE_AND_SEEK = 'hide_and_seek',
       PROBE = 'probe',
       EXTRACTION = 'extraction',
       RECON_RAID = 'recon_raid',
     }

    export interface ICombatTeam {
      readonly forceId: string;
      readonly role: CombatRole;
      readonly battleChance: number; // percentage 0-100
    }

    export interface IScenarioConditions {
      readonly light?: 'daylight' | 'dusk' | 'full_moon' | 'moonless' | 'pitch_black';
      readonly weather?: 'clear' | 'light_rain' | 'heavy_rain' | 'sleet' | 'snow' | 'fog' | 'sandstorm';
      readonly gravity?: number;      // 0.2 - 1.5
      readonly temperature?: number;  // -30 to +50 Celsius
      readonly atmosphere?: 'standard' | 'thin' | 'dense' | 'toxic' | 'tainted';
    }
    ```
  - Add `moraleLevel?: AtBMoraleLevel` to IContract (default STALEMATE)
  - Add `combatTeams?: ICombatTeam[]` to ICampaign
  - Add `conditions?: IScenarioConditions` to IScenario
  - Add `useAtBScenarios?: boolean` to ICampaignOptions

  **Parallelizable**: YES (foundation)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Scenario.ts:102-144` — IScenario
  - `E:\Projects\MekStation\src\types\campaign\Mission.ts:128-146` — IContract
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\enums\AtBMoraleLevel.java` — 7 levels
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\enums\CombatRole.java` — 7 roles

  **Acceptance Criteria**:
  - [x] RED: Test CombatRole has 7 values
  - [x] RED: Test AtBMoraleLevel has 7 values with correct numeric mapping
  - [x] RED: Test AtBScenarioType has 9+ values
  - [x] GREEN: Types compile
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define combat roles, morale levels, and scenario types`
  - Files: `src/types/campaign/scenario/scenarioTypes.ts`

---

- [x] 11.2 Implement Battle Chance Calculator

  **What to do**:
  - Create `src/lib/campaign/scenario/battleChance.ts`:
    ```typescript
    export const BASE_BATTLE_CHANCE: Record<CombatRole, number> = {
      maneuver: 40, frontline: 20, patrol: 60, training: 10,
      cadre: 10, auxiliary: 0, reserve: 0,
    };

    export function calculateBattleTypeMod(moraleLevel: AtBMoraleLevel): number {
      // battleTypeMod = 1 + (STALEMATE.ordinal - current.ordinal) * 5
      const stalemateOrd = 3; // STALEMATE is index 3 in enum order
      const currentOrd = Object.values(AtBMoraleLevel).indexOf(moraleLevel);
      return 1 + (stalemateOrd - currentOrd) * 5;
    }

    export function checkForBattle(
      team: ICombatTeam,
      contract: IContract,
      random: RandomFn
    ): boolean {
      if (team.role === CombatRole.AUXILIARY || team.role === CombatRole.RESERVE) return false;
      const chance = BASE_BATTLE_CHANCE[team.role];
      const roll = Math.floor(random() * 100) + 1;
      return roll <= chance;
    }
    ```

  **Parallelizable**: YES (with 11.3, 11.5)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\force\CombatTeam.java` — Battle chance per role

  **Acceptance Criteria**:
  - [x] RED: Test Maneuver role has 40% battle chance
  - [x] RED: Test Patrol role has 60% battle chance
  - [x] RED: Test Auxiliary/Reserve always return false
  - [x] RED: Test battle type modifier: STALEMATE → 1, ROUTED → 16, OVERWHELMING → -14
  - [x] RED: Test deterministic with seeded random
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement battle chance calculator per combat role`
  - Files: `src/lib/campaign/scenario/battleChance.ts`

---

- [x] 11.3 Implement Scenario Type Selection Tables

  **What to do**:
  - Create `src/lib/campaign/scenario/scenarioTypeSelection.ts`:
    ```typescript
    export interface IScenarioTypeResult {
      readonly scenarioType: AtBScenarioType;
      readonly isAttacker: boolean; // true = player attacks, false = player defends
    }

    // Maneuver table (roll 1-40+)
    export function selectManeuverScenario(roll: number): IScenarioTypeResult;
    // Patrol table (roll 1-60)
    export function selectPatrolScenario(roll: number): IScenarioTypeResult;
    // Frontline table (roll 1-20)
    export function selectFrontlineScenario(roll: number): IScenarioTypeResult;
    // Training/Cadre table (roll 1-10)
    export function selectTrainingScenario(roll: number): IScenarioTypeResult;

    export function selectScenarioType(
      role: CombatRole,
      moraleLevel: AtBMoraleLevel,
      random: RandomFn
    ): IScenarioTypeResult;
    ```
  - Implement exact MekHQ tables:
    - Maneuver: 1=base_attack(enemy), 2-8=breakthrough, 9-16=standup(player), 17-24=standup(enemy), 25-32=chase/hold, 33-40=hold(player), 41+=base_attack(player)
    - Patrol: 1=base_attack(enemy), 2-10=chase/hide_seek, 11-20=hide_seek, 21-30=probe(player), 31-40=probe(enemy), 41-50=extraction, 51-60=recon_raid
    - Frontline: 1=base_attack(enemy), 2-4=hold(enemy), 5-8=recon_raid(enemy), 9-12=extraction(enemy), 13-16=hide_seek, 17-20=breakthrough(enemy)
    - Training/Cadre: 1=base_attack(enemy), 2-3=hold(enemy), 4-5=breakthrough, 6-7=chase/breakthrough, 8-9=hide_seek(enemy), 10=chase/hold

  **Parallelizable**: YES (with 11.2, 11.5)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\force\CombatTeam.java` — Scenario type tables

  **Acceptance Criteria**:
  - [x] RED: Test Maneuver roll 1 → base_attack (enemy attacker)
  - [x] RED: Test Maneuver roll 5 → breakthrough (player attacker)
  - [x] RED: Test Patrol roll 25 → probe (player attacker)
  - [x] RED: Test Frontline roll 18 → breakthrough (enemy attacker)
  - [x] RED: Test Training roll 1 → base_attack (enemy)
  - [x] RED: Test high rolls beyond table max clamp to last entry
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement scenario type selection tables per role`
  - Files: `src/lib/campaign/scenario/scenarioTypeSelection.ts`

---

- [x] 11.4 Implement OpFor BV Matching

  **What to do**:
  - Create `src/lib/campaign/scenario/opForGeneration.ts`:
    ```typescript
    export interface IOpForConfig {
      readonly targetBV: number;
      readonly unitCount: number;
      readonly weightClass: 'light' | 'medium' | 'heavy' | 'assault' | 'mixed';
      readonly quality: string; // A-F
    }

    export function calculateOpForBV(
      playerBV: number,
      difficultyMultiplier: number, // 0.5 easy - 2.0 hard
      random: RandomFn
    ): number {
      // Target percentage: 100 + ((rand(8) - 3) * 5) = 85-120% <!-- AUDIT: Missed in initial correction -->
      const variation = (Math.floor(random() * 8) - 3) * 5;
      const targetPct = (100 + variation) / 100;
      return Math.round(playerBV * difficultyMultiplier * targetPct);
    }

    export const LANCE_SIZE = { IS: 4, CLAN: 5, COMSTAR: 6 };

    export function calculateForceComposition(
      targetBV: number,
      faction: string,
      random: RandomFn
    ): IOpForConfig;
    ```

  **Must NOT do**:
  - Select specific units from database (just return BV target and composition hints)
  - Detailed force organization beyond lance/star size

  **Parallelizable**: YES (with 11.6)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\AtBDynamicScenarioFactory.java` — BV formula

  **Acceptance Criteria**:
   - [x] RED: Test OpFor BV = playerBV × difficulty × variation (85-120%) <!-- AUDIT: Missed in initial correction -->
  - [x] RED: Test difficulty 1.0 with 100% variation = playerBV exactly
  - [x] RED: Test IS lance size = 4, Clan star = 5, ComStar level II = 6
  - [x] RED: Test deterministic with seeded random
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement OpFor BV matching and force composition`
  - Files: `src/lib/campaign/scenario/opForGeneration.ts`

---

- [x] 11.5 Implement Scenario Conditions System

  **What to do**:
  - Create `src/lib/campaign/scenario/scenarioConditions.ts`:
    ```typescript
    export function generateRandomConditions(random: RandomFn): IScenarioConditions;

    export interface IConditionEffect {
      readonly noTanks: boolean;
      readonly noConvInfantry: boolean;
      readonly noBattleArmor: boolean;
      readonly noAerospace: boolean;
      readonly description: string;
    }

    export function getConditionEffects(conditions: IScenarioConditions): IConditionEffect {
      const effects: IConditionEffect = { noTanks: false, noConvInfantry: false, noBattleArmor: false, noAerospace: false, description: '' };
      if (conditions.gravity && conditions.gravity <= 0.2) effects.noTanks = true;
      if (conditions.atmosphere === 'toxic' || conditions.atmosphere === 'tainted') {
        effects.noConvInfantry = true;
        effects.noTanks = true;
      }
      return effects;
    }
    ```

  **Parallelizable**: YES (with 11.2, 11.3)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\Scenario.java` — Conditions

  **Acceptance Criteria**:
  - [x] RED: Test low gravity (≤0.2) bans tanks
  - [x] RED: Test toxic atmosphere bans conv infantry and tanks
  - [x] RED: Test standard conditions allow all unit types
  - [x] RED: Test random generation produces valid conditions
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement scenario conditions with force composition effects`
  - Files: `src/lib/campaign/scenario/scenarioConditions.ts`

---

- [x] 11.6 Implement Contract Morale Tracking

  **What to do**:
  - Create `src/lib/campaign/scenario/morale.ts`:
    ```typescript
    export function updateMorale(
      currentLevel: AtBMoraleLevel,
      scenarioOutcome: 'victory' | 'defeat' | 'draw'
    ): AtBMoraleLevel {
      const currentValue = MORALE_VALUES[currentLevel];
      let newValue = currentValue;
      switch (scenarioOutcome) {
        case 'victory': newValue = Math.min(3, currentValue + 1); break;
        case 'defeat': newValue = Math.max(-3, currentValue - 1); break;
        case 'draw': break; // No change
      }
      return getMoraleLevelFromValue(newValue);
    }

    export function getMoraleLevelFromValue(value: number): AtBMoraleLevel;
    export function getMoraleDisplayInfo(level: AtBMoraleLevel): { label: string; color: string; description: string };
    ```

  **Parallelizable**: YES (with 11.4)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\enums\AtBMoraleLevel.java` — 7 levels

  **Acceptance Criteria**:
  - [x] RED: Test victory increases morale by 1
  - [x] RED: Test defeat decreases morale by 1
  - [x] RED: Test draw keeps morale unchanged
  - [x] RED: Test morale clamps at OVERWHELMING (max +3) and ROUTED (min -3)
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement contract morale tracking`
  - Files: `src/lib/campaign/scenario/morale.ts`

---

- [x] 11.7 Create Scenario Generation Day Processor

  **What to do**:
  - Create `src/lib/campaign/processors/scenarioGenerationProcessor.ts`:
    ```typescript
    export function processScenarioGeneration(
      campaign: ICampaign,
      random: RandomFn
    ): { updatedCampaign: ICampaign; events: IScenarioGenerationEvent[] } {
      // Only runs on Mondays (weekly)
      if (!isMonday(campaign.currentDate)) return { updatedCampaign: campaign, events: [] };

      const events: IScenarioGenerationEvent[] = [];

      for (const contract of getActiveContracts(campaign)) {
        for (const team of getCombatTeams(campaign, contract)) {
          if (checkForBattle(team, contract, random)) {
            const scenarioResult = selectScenarioType(team.role, contract.moraleLevel ?? AtBMoraleLevel.STALEMATE, random);
            const playerBV = calculatePlayerBV(team, campaign);
            const opForBV = calculateOpForBV(playerBV, campaign.options.difficultyMultiplier ?? 1.0, random);
            const conditions = generateRandomConditions(random);

            const scenario: IScenario = createScenario(scenarioResult, opForBV, conditions, contract);
            events.push({ type: 'scenario_generated', scenario, team, contract });
          }
        }
      }

      return { updatedCampaign: addScenarios(campaign, events), events };
    }
    ```

  **Parallelizable**: NO (depends on 11.2-11.6)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayPipeline.ts` — IDayProcessor (Plan 1)

  **Acceptance Criteria**:
  - [x] RED: Test scenarios only generated on Mondays
  - [x] RED: Test each combat team gets battle chance check
  - [x] RED: Test generated scenario has correct type, BV, conditions
  - [x] RED: Test no scenarios when useAtBScenarios is false
  - [x] GREEN: All tests pass
  - [x] Existing scenario tests still pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add weekly scenario generation processor`
  - Files: `src/lib/campaign/processors/scenarioGenerationProcessor.ts`

---

- [x] 11.8 Create Scenario Generation UI

  **What to do**:
  - Update scenario views:
    - Enhanced scenario detail with conditions display (weather icon, light level, gravity)
    - OpFor description with BV and composition hints
    - Morale indicator on contract view (gauge from Routed to Overwhelming)
    - Combat team assignment UI (assign forces to roles)
  - Integrate morale changes into scenario resolution flow

  **Parallelizable**: NO (depends on 11.7)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard

  **Acceptance Criteria**:
  - [x] Scenario detail shows conditions (weather, light, gravity)
  - [x] OpFor section shows BV and composition
  - [x] Contract shows morale gauge
  - [x] Combat team assignment allows role selection
  - [x] Manual verification: dev server → advance days → verify scenario generation on Monday

  **Commit**: YES
  - Message: `feat(ui): enhance scenario view with conditions and morale`
  - Files: updated scenario components

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 11.1 | `feat(campaign): define combat roles, morale, scenario types` | `npm test` |
| 11.2 | `feat(campaign): implement battle chance calculator` | `npm test` |
| 11.3 | `feat(campaign): implement scenario type selection tables` | `npm test` |
| 11.4 | `feat(campaign): implement OpFor BV matching` | `npm test` |
| 11.5 | `feat(campaign): implement scenario conditions` | `npm test` |
| 11.6 | `feat(campaign): implement morale tracking` | `npm test` |
| 11.7 | `feat(campaign): add scenario generation processor` | `npm test` |
| 11.8 | `feat(ui): enhance scenario view` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [x] 7 combat roles with battle chances
- [x] Scenario type tables for 4 role groups
- [x] OpFor BV matching with 85-120% variation <!-- AUDIT: Missed in initial correction -->
- [x] Scenario conditions with force composition effects
- [x] 7 morale levels tracked per contract
- [x] Weekly scenario generation processor
- [x] Existing scenario tests unbroken

---

## Registration Snippet

```typescript
registry.register({
  id: 'scenario-generation-processor',
  name: 'Scenario Generation (AtB)',
  phase: 'combat',
  frequency: 'daily', // checks isMonday internally (weekly effective)
  process: processScenarioGeneration,
  optionGate: (opts) => opts.useAtBScenarios === true,
});
```

---

## Migration Notes

- New `moraleLevel` on IContract defaults to STALEMATE
- New `combatTeams` on ICampaign defaults to empty array
- New `conditions` on IScenario is optional — existing scenarios unaffected
- New `useAtBScenarios` on ICampaignOptions defaults to false (opt-in)
- New `difficultyMultiplier` on ICampaignOptions defaults to 1.0
- Existing 4 scenario templates still work — AtB generation is additive
- No migration needed for saved campaigns

---

*Plan generated by Prometheus. Execute with `/start-work`.*
