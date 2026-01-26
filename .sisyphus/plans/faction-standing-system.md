# Faction Standing System

## Context

### Original Request
Implement MekHQ's faction standing system: a 9-level regard system (-60 to +60) with 11 toggleable gameplay effects that reward or punish player behavior based on their relationship with each faction. Includes accolade/censure escalation mechanics.

### Interview Summary
**Key Discussions**:
- Exact MekHQ formulas for regard deltas and standing levels
- 11 gameplay effects return numeric MODIFIERS only — they don't implement the systems they modify
- Standing is per-faction as `Record<string, IFactionStanding>` on campaign (JSON-serializable)
- Effects are toggleable via campaign options
- Contract outcomes are the primary regard delta trigger
- TDD approach, injectable RandomFn not needed (standing is deterministic)

**Research Findings**:
- Campaign has `factionId: string` (player faction) — no faction registry
- Contract has `employerId` — this is the faction key for standing changes
- NO faction standing code anywhere in codebase
- NO reputation/regard system
- Event system exists with causality tracking — can emit standing change events
- Target: `src/types/campaign/Campaign.ts` ICampaign

### Metis Review
**Identified Gaps** (addressed):
- Starting standing: 0 for all factions (neutral), configurable
- Multiple employers: working for Davion against Liao reduces Liao standing
- Standing capped at ±60 (MekHQ behavior)
- Contract breach = standing loss with employer only (not all factions)
- 11 effects return modifiers — they don't implement recruitment, markets, etc.
- Daily regard degradation toward 0 (natural decay)
- Accolade/censure events surfaced in DayReport

---

## Work Objectives

### Core Objective
Implement a per-faction regard tracking system with 9 standing levels and 11 gameplay effect modifiers that create meaningful consequences for faction relationships.

### Concrete Deliverables
- `src/types/campaign/factionStanding/` — Standing types, levels, effects
- `src/lib/campaign/factionStanding/` — Standing calculation logic
- `src/lib/campaign/processors/factionStandingProcessor.ts` — Day pipeline processor
- Extended `ICampaign` with faction standings map
- Extended `ICampaignOptions` with standing options
- UI for standing display and effects

### Definition of Done
- [ ] 9 regard levels with correct thresholds
- [ ] Per-faction standing stored as `Record<string, IFactionStanding>` (JSON-serializable)
- [ ] Regard deltas from contract outcomes (success/failure/breach)
- [ ] 11 gameplay effects return numeric modifiers
- [ ] Effects toggleable via campaign options
- [ ] Accolade/censure escalation at threshold crossings
- [ ] Daily regard decay toward 0
- [ ] Day processor for standing updates
- [ ] Standing display UI

### Must Have
- `IFactionStanding` interface with regard, level, history
- 9 standing levels with thresholds (-60 to +60)
- 11 effect modifier functions
- Regard deltas for contract outcomes
- Daily decay toward neutral
- Accolade/censure escalation
- Day processor registration

### Must NOT Have (Guardrails)
- Full faction registry (use string faction IDs)
- Planetary ownership tracking
- Diplomatic event simulation
- Alliance/war state tracking
- Implement recruitment, markets, or other systems (return modifiers only)
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
5.1 (Standing types) → 5.2 (Standing logic) → 5.3 (Effect modifiers) → 5.4 (Accolade/censure) → 5.5 (Day processor) → 5.6 (Campaign integration) → 5.7 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 5.1 | Foundation types |
| B | 5.2, 5.3 | Logic and effects can be parallel once types exist |

| Task | Depends On | Reason |
|------|------------|--------|
| 5.2 | 5.1 | Logic needs types |
| 5.3 | 5.1 | Effects need types |
| 5.4 | 5.2 | Escalation needs standing logic |
| 5.5 | 5.2, 5.4 | Processor needs logic + escalation |
| 5.6 | 5.1 | Campaign integration needs types |
| 5.7 | 5.5, 5.6 | UI needs everything |

---

## TODOs

- [x] 5.1 Define Faction Standing Types

  **What to do**:
  - Create `src/types/campaign/factionStanding/IFactionStanding.ts`:
    ```typescript
    export enum FactionStandingLevel {
      LEVEL_0 = 0,  // Outlawed (-60 to -50)
      LEVEL_1 = 1,  // Hostile (-50 to -40)
      LEVEL_2 = 2,  // Unfriendly (-40 to -25)
      LEVEL_3 = 3,  // Cool (-25 to -10)
      LEVEL_4 = 4,  // Neutral (-10 to +10) — DEFAULT
      LEVEL_5 = 5,  // Warm (+10 to +25)
      LEVEL_6 = 6,  // Friendly (+25 to +40)
      LEVEL_7 = 7,  // Allied (+40 to +50)
      LEVEL_8 = 8,  // Honored (+50 to +60)
    }

    export interface IFactionStanding {
      readonly factionId: string;
      readonly regard: number;              // -60 to +60
      readonly level: FactionStandingLevel;
      readonly accoladeLevel: number;       // 0-4 (escalation)
      readonly censureLevel: number;        // 0-4 (escalation)
      readonly lastChangeDate?: Date;
      readonly history: readonly IRegardChangeEvent[];
    }

    export interface IRegardChangeEvent {
      readonly date: Date;
      readonly delta: number;
      readonly reason: string;
      readonly previousRegard: number;
      readonly newRegard: number;
      readonly previousLevel: FactionStandingLevel;
      readonly newLevel: FactionStandingLevel;
    }
    ```
  - Define standing level thresholds:
    ```typescript
    export const STANDING_LEVEL_THRESHOLDS: Record<FactionStandingLevel, { min: number; max: number }> = {
      [FactionStandingLevel.LEVEL_0]: { min: -60, max: -50 },
      [FactionStandingLevel.LEVEL_1]: { min: -50, max: -40 },
      [FactionStandingLevel.LEVEL_2]: { min: -40, max: -25 },
      [FactionStandingLevel.LEVEL_3]: { min: -25, max: -10 },
      [FactionStandingLevel.LEVEL_4]: { min: -10, max: 10 },
      [FactionStandingLevel.LEVEL_5]: { min: 10, max: 25 },
      [FactionStandingLevel.LEVEL_6]: { min: 25, max: 40 },
      [FactionStandingLevel.LEVEL_7]: { min: 40, max: 50 },
      [FactionStandingLevel.LEVEL_8]: { min: 50, max: 60 },
    };
    ```
  - Define regard deltas (exact MekHQ values):
    ```typescript
    export const REGARD_DELTAS = {
      CONTRACT_SUCCESS: +1.875,
      CONTRACT_PARTIAL: +0.625,
      CONTRACT_FAILURE: -1.875,
      CONTRACT_BREACH: -5.156,
      ACCEPT_ENEMY_CONTRACT: -1.875,
      REFUSE_BATCHALL: -10.3125,
      DAILY_DECAY: 0.375,  // Toward zero per day
    };
    ```

  **Must NOT do**:
  - Faction database (use string IDs)
  - Complex diplomatic state

  **Parallelizable**: YES (foundation)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:476-530` — Standing levels, effects, deltas
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\storyarc\enums\FactionStandingLevel.java` — MekHQ levels
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\FactionStandings.java` — MekHQ standing logic

  **Acceptance Criteria**:
  - [ ] RED: Test 9 standing levels with correct thresholds
  - [ ] RED: Test regard -55 maps to LEVEL_0
  - [ ] RED: Test regard 0 maps to LEVEL_4
  - [ ] RED: Test regard +45 maps to LEVEL_7
  - [ ] RED: Test regard clamped to -60/+60
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define faction standing types with 9 levels`
  - Files: `src/types/campaign/factionStanding/*.ts`

---

- [x] 5.2 Implement Standing Calculation Logic

  **What to do**:
  - Create `src/lib/campaign/factionStanding/standingService.ts`:
    ```typescript
    export function getStandingLevel(regard: number): FactionStandingLevel;
    
    export function adjustRegard(
      standing: IFactionStanding,
      delta: number,
      reason: string,
      date: Date,
      regardMultiplier?: number
    ): IFactionStanding;
    
    export function processContractOutcome(
      standings: Record<string, IFactionStanding>,
      employerFactionId: string,
      targetFactionId: string | undefined,
      outcome: 'success' | 'partial' | 'failure' | 'breach',
      date: Date
    ): Record<string, IFactionStanding>;
    
    export function processRegardDecay(
      standing: IFactionStanding,
      date: Date
    ): IFactionStanding;
    
    export function createDefaultStanding(factionId: string): IFactionStanding;
    ```
  - `adjustRegard()`:
    1. Apply `delta × regardMultiplier` to regard
    2. Clamp to [-60, +60]
    3. Recalculate level
    4. Record change event in history
    5. Return new standing
  - `processContractOutcome()`:
    1. Adjust employer standing by outcome delta
    2. If targetFactionId exists and different from employer: adjust target standing by negative delta (smaller magnitude)
    3. Return updated standings map
  - `processRegardDecay()`:
    1. Move regard toward 0 by DAILY_DECAY amount
    2. If regard > 0: subtract decay
    3. If regard < 0: add decay
    4. If abs(regard) < DAILY_DECAY: set to 0

  **Must NOT do**:
  - Faction relationship tracking between NPC factions
  - Auto-generate faction events based on standing changes

  **Parallelizable**: YES (with 5.3)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:479-525` — Regard formula and deltas
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\FactionStandings.java` — MekHQ standing logic
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\utilities\FactionStandingUtilities.java` — Utility functions

  **Acceptance Criteria**:
  - [ ] RED: Test contract success adds +1.875 regard
  - [ ] RED: Test contract breach subtracts -5.156 regard
  - [ ] RED: Test regard clamped to ±60
  - [ ] RED: Test daily decay moves toward 0
  - [ ] RED: Test level recalculates on regard change
  - [ ] RED: Test change event recorded in history
  - [ ] RED: Test target faction loses standing when working against them
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement faction standing calculation logic`
  - Files: `src/lib/campaign/factionStanding/standingService.ts`

---

- [x] 5.3 Implement 11 Gameplay Effect Modifiers

  **What to do**:
  - Create `src/lib/campaign/factionStanding/standingEffects.ts`:
  - Each effect is a pure function returning a numeric modifier:
    ```typescript
    // 1. Negotiation modifier: -4 to +4
    export function getNegotiationModifier(level: FactionStandingLevel): number;
    
    // 2. Resupply weight: 0.0 to 2.0
    export function getResupplyWeightModifier(level: FactionStandingLevel): number;
    
    // 3. Command circuit access: boolean
    export function hasCommandCircuitAccess(level: FactionStandingLevel): boolean;
    
    // 4. Outlawed status: boolean
    export function isOutlawed(level: FactionStandingLevel): boolean;
    
    // 5. Batchall disabled: boolean
    export function isBatchallDisabled(level: FactionStandingLevel): boolean;
    
    // 6. Recruitment modifier: { tickets: number, rollModifier: number }
    export function getRecruitmentModifier(level: FactionStandingLevel): { tickets: number; rollModifier: number };
    
    // 7. Barracks cost multiplier: 0.75 to 3.0
    export function getBarracksCostMultiplier(level: FactionStandingLevel): number;
    
    // 8. Unit market rarity modifier: -2 to +3
    export function getUnitMarketRarityModifier(level: FactionStandingLevel): number;
    
    // 9. Contract pay multiplier: 0.6 to 1.2
    export function getContractPayMultiplier(level: FactionStandingLevel): number;
    
    // 10. Support points (start): -3 to +3
    export function getStartSupportPointsModifier(level: FactionStandingLevel): number;
    
    // 11. Support points (periodic): -4 to +3
    export function getPeriodicSupportPointsModifier(level: FactionStandingLevel): number;
    ```
  - Each function uses a lookup table matching exact MekHQ values:
    ```typescript
    const NEGOTIATION_MODIFIER: Record<FactionStandingLevel, number> = {
      [FactionStandingLevel.LEVEL_0]: -4,
      [FactionStandingLevel.LEVEL_1]: -3,
      [FactionStandingLevel.LEVEL_2]: -2,
      [FactionStandingLevel.LEVEL_3]: -1,
      [FactionStandingLevel.LEVEL_4]: 0,
      [FactionStandingLevel.LEVEL_5]: +1,
      [FactionStandingLevel.LEVEL_6]: +2,
      [FactionStandingLevel.LEVEL_7]: +3,
      [FactionStandingLevel.LEVEL_8]: +4,
    };
    ```
  - Create aggregate function:
    ```typescript
    export interface FactionStandingEffects {
      readonly negotiation: number;
      readonly resupplyWeight: number;
      readonly commandCircuit: boolean;
      readonly outlawed: boolean;
      readonly batchallDisabled: boolean;
      readonly recruitment: { tickets: number; rollModifier: number };
      readonly barracksCost: number;
      readonly unitMarketRarity: number;
      readonly contractPay: number;
      readonly startSupportPoints: number;
      readonly periodicSupportPoints: number;
    }
    
    export function getAllEffects(level: FactionStandingLevel): FactionStandingEffects;
    ```

  **Must NOT do**:
  - Implement the systems these modifiers affect (recruitment, markets, etc.)
  - Complex interpolation between levels (use lookup tables)

  **Parallelizable**: YES (with 5.2)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:488-512` — All 11 effects with exact values per level
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\FactionStandings.java` — Effect implementations

  **Acceptance Criteria**:
  - [ ] RED: Test Level 0 negotiation = -4, Level 8 = +4
  - [ ] RED: Test Level 0 contract pay = 0.6, Level 8 = 1.2
  - [ ] RED: Test Level 0-1 are outlawed
  - [ ] RED: Test Level 7+ has command circuit access
  - [ ] RED: Test Level 0 barracks cost = 3.0, Level 8 = 0.75
  - [ ] RED: Test Level 0 recruitment tickets = 0, Level 8 = max
  - [ ] RED: Test `getAllEffects()` returns complete object
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement 11 faction standing gameplay effects`
  - Files: `src/lib/campaign/factionStanding/standingEffects.ts`

---

- [x] 5.4 Implement Accolade/Censure Escalation

  **What to do**:
  - Create `src/lib/campaign/factionStanding/escalation.ts`:
    ```typescript
    export enum AccoladeLevel {
      NONE = 0,
      TAKING_NOTICE = 1,
      PRESS_RECOGNITION = 2,
      CASH_BONUS = 3,
      ADOPTION = 4,
      STATUE = 5,
    }

    export enum CensureLevel {
      NONE = 0,
      FORMAL_WARNING = 1,
      NEWS_ARTICLE = 2,
      COMMANDER_RETIREMENT = 3,
      LEADERSHIP_REPLACEMENT = 4,
      DISBAND = 5,
    }

    export function checkAccoladeEscalation(standing: IFactionStanding): AccoladeLevel | null;
    export function checkCensureEscalation(standing: IFactionStanding): CensureLevel | null;
    export function applyAccolade(standing: IFactionStanding, level: AccoladeLevel): IFactionStanding;
    export function applyCensure(standing: IFactionStanding, level: CensureLevel): IFactionStanding;
    ```
  - Accolade triggers: when regard >= Level 5 threshold and accoladeLevel < max
  - Censure triggers: when regard < 0 and censureLevel < max
  - Each escalation level triggers at specific thresholds or time intervals
  - Cash bonus accolade adds money to campaign finances
  - Censure events are warnings (no gameplay effect beyond regard/notification)

  **Must NOT do**:
  - Commander retirement enforcement (just warn)
  - Disband campaign automatically (just event)
  - Complex event chains from accolades

  **Parallelizable**: NO (depends on 5.2)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:526-530` — Accolade/censure escalation
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\FactionStandings.java` — Escalation logic

  **Acceptance Criteria**:
  - [ ] RED: Test accolade triggers at Level 5+
  - [ ] RED: Test censure triggers at negative regard
  - [ ] RED: Test escalation increments (NONE → TAKING_NOTICE → PRESS_RECOGNITION)
  - [ ] RED: Test cash bonus accolade adds money
  - [ ] RED: Test max level can't be exceeded
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement accolade/censure escalation`
  - Files: `src/lib/campaign/factionStanding/escalation.ts`

---

- [x] 5.5 Create Faction Standing Day Processor

  **What to do**:
  - Create `src/lib/campaign/processors/factionStandingProcessor.ts`:
    ```typescript
    export const factionStandingProcessor: IDayProcessor = {
      id: 'faction-standing',
      phase: DayPhase.EVENTS,
      displayName: 'Faction Standing',
      process(campaign, date) {
        if (!campaign.options.trackFactionStanding) {
          return { events: [], campaign };
        }
        
        const events: IDayEvent[] = [];
        const standings = { ...(campaign.factionStandings ?? {}) };
        
        // Daily: regard decay for all factions
        for (const [factionId, standing] of Object.entries(standings)) {
          standings[factionId] = processRegardDecay(standing, date);
        }
        
        // Monthly (1st): check accolade/censure escalation
        if (isFirstOfMonth(date)) {
          for (const [factionId, standing] of Object.entries(standings)) {
            const accolade = checkAccoladeEscalation(standing);
            if (accolade) {
              events.push(createAccoladeEvent(factionId, accolade));
              standings[factionId] = applyAccolade(standing, accolade);
            }
            const censure = checkCensureEscalation(standing);
            if (censure) {
              events.push(createCensureEvent(factionId, censure));
              standings[factionId] = applyCensure(standing, censure);
            }
          }
        }
        
        return {
          events,
          campaign: { ...campaign, factionStandings: standings },
        };
      }
    };
    ```
  - Export registration function

  **Must NOT do**:
  - Process contract outcomes here (that happens in contract resolution, which calls `processContractOutcome()` directly)

  **Parallelizable**: NO (depends on 5.2, 5.4)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayPipeline.ts` — IDayProcessor interface (from Plan 1)
  - `.sisyphus/drafts/mekhq-modifier-systems.md:57` — Phase 21: Faction standing checks

  **Acceptance Criteria**:
  - [ ] RED: Test daily decay processes for all tracked factions
  - [ ] RED: Test accolade check on 1st of month
  - [ ] RED: Test censure check on 1st of month
  - [ ] RED: Test processor skipped when `trackFactionStanding` is false
  - [ ] RED: Test events returned for escalation
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add faction standing day processor`
  - Files: `src/lib/campaign/processors/factionStandingProcessor.ts`

---

- [x] 5.6 Integrate Standing into Campaign

  **What to do**:
  - Add to `ICampaign`:
    ```typescript
    // Use Record<> instead of Map<> for JSON serialization compatibility.
    // Convert to Map in service layer if needed for iteration performance.
    readonly factionStandings?: Record<string, IFactionStanding>;
    ```
  - Add to `ICampaignOptions`:
    ```typescript
    readonly trackFactionStanding: boolean;              // Enable standing (default: true)
    readonly factionStandingRegardMultiplier: number;    // Global multiplier (default: 1.0)
    readonly factionStandingDecayEnabled: boolean;       // Daily decay (default: true)
    readonly factionStandingDecayRate: number;           // Decay amount (default: 0.375)
    readonly factionStandingNegotiationEnabled: boolean; // Effect toggle (default: true)
    readonly factionStandingContractPayEnabled: boolean; // Effect toggle (default: true)
    readonly factionStandingRecruitmentEnabled: boolean; // Effect toggle (default: true)
    readonly factionStandingBarracksEnabled: boolean;    // Effect toggle (default: true)
    readonly factionStandingUnitMarketEnabled: boolean;  // Effect toggle (default: true)
    readonly factionStandingOutlawEnabled: boolean;      // Effect toggle (default: true)
    readonly factionStandingCommandCircuitEnabled: boolean; // Effect toggle (default: true)
    readonly factionStandingBatchallEnabled: boolean;    // Effect toggle (default: true)
    readonly factionStandingResupplyEnabled: boolean;    // Effect toggle (default: true)
    readonly factionStandingSupportStartEnabled: boolean; // Effect toggle (default: true)
    readonly factionStandingSupportPeriodicEnabled: boolean; // Effect toggle (default: true)
    ```
  - Update `createDefaultCampaignOptions()` with defaults
  - Hook into contract resolution to call `processContractOutcome()`:
    - When a contract completes, call standing service with employer faction and outcome
  - Serialization is automatic — `Record<string, IFactionStanding>` serializes to JSON natively (no Map conversion needed)
  - Add `getStanding(campaign, factionId)` helper that auto-creates neutral standing if faction not in record

  **Must NOT do**:
  - Full faction database
  - Alliance/enemy tracking
  - Modify existing contract resolution flow (just hook after)

  **Parallelizable**: YES (with 5.1 for type definitions)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts` — ICampaign interface
  - `E:\Projects\MekStation\src\types\campaign\Mission.ts:employerId` — Faction key on contracts
  - `E:\Projects\MekStation\src\stores\campaign\useCampaignStore.ts` — Serialization

  **Acceptance Criteria**:
  - [ ] `factionStandings` field added to ICampaign (optional `Record<string, IFactionStanding>`, defaults to `{}`)
  - [ ] 11 effect toggle options in ICampaignOptions
  - [ ] Contract completion triggers standing update
  - [ ] Serialization/deserialization works natively (Record is JSON-compatible)
  - [ ] Existing campaigns load without error (empty standings)
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): integrate faction standing into campaign aggregate`
  - Files: `src/types/campaign/Campaign.ts`, `src/stores/campaign/useCampaignStore.ts`

---

- [~] 5.7 Create Faction Standing UI (DEFERRED: delegation system issues with UI tasks)

  **What to do**:
  - Create `src/components/campaign/FactionStandingPanel.tsx`:
    - List of factions with standing bars (-60 to +60, color-coded)
    - Current level name and regard number
    - Active effects summary (what bonuses/penalties apply)
    - Accolade/censure indicators
  - Create `src/components/campaign/FactionStandingDetail.tsx`:
    - Detailed view for single faction:
      - Regard history (recent changes)
      - All 11 effects with current values
      - Accolade/censure level
  - Add standing events to day report:
    - Regard changes from contract outcomes
    - Accolade/censure notifications
  - Add standing options to campaign settings:
    - Global enable/disable
    - Per-effect toggles
    - Decay rate slider

  **Must NOT do**:
  - Interactive faction diplomacy
  - Faction relationship graphs

  **Parallelizable**: NO (depends on 5.5, 5.6)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard
  - `E:\Projects\mekhq\MekHQ\src\mekhq\gui\dialog\FactionStandingDialog.java` — MekHQ standing UI (11 dialog files)

  **Acceptance Criteria**:
  - [ ] Faction standing bars display with color coding
  - [ ] Effect summary shows active bonuses/penalties
  - [ ] Regard changes appear in day report
  - [ ] Accolade/censure events displayed
  - [ ] Standing options in campaign settings
  - [ ] Manual verification: complete contract → see standing change → verify effects

  **Commit**: YES
  - Message: `feat(ui): add faction standing panel and effects display`
  - Files: `src/components/campaign/FactionStandingPanel.tsx`, `src/components/campaign/FactionStandingDetail.tsx`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 5.1 | `feat(campaign): define faction standing types with 9 levels` | `npm test` |
| 5.2 | `feat(campaign): implement faction standing calculations` | `npm test` |
| 5.3 | `feat(campaign): implement 11 faction standing effects` | `npm test` |
| 5.4 | `feat(campaign): implement accolade/censure escalation` | `npm test` |
| 5.5 | `feat(campaign): add faction standing day processor` | `npm test` |
| 5.6 | `feat(campaign): integrate standing into campaign` | `npm test` |
| 5.7 | `feat(ui): add faction standing UI` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [ ] 9 standing levels with exact MekHQ thresholds
- [ ] Regard clamped to ±60
- [ ] 11 effects return correct modifiers per level
- [ ] Contract outcomes trigger regard changes
- [ ] Daily decay toward neutral works
- [ ] Accolade/censure escalation fires at thresholds
- [ ] Per-effect toggles in campaign options
- [ ] Standing display with color-coded bars

---

## Registration Snippet

```typescript
import { registerFactionStandingProcessor } from '@/lib/campaign/processors/factionStandingProcessor';
registerFactionStandingProcessor();
```

---

## Migration Notes

- `factionStandings` is optional on ICampaign (defaults to empty `{}` Record)
- Existing campaigns load with no standings (all neutral)
- New `ICampaignOptions` fields have sensible defaults
- Standing created lazily: first contract with a faction creates their standing entry

---

*Plan generated by Prometheus. Execute with `/start-work`.*
