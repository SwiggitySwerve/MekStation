# Contract Types Expansion

> **✅ COMPLETED** — Implemented, merged, and archived. PR #197.

## Audit Corrections

> Applied 2026-01-27 — corrections align this plan with MekHQ Java source code.

| # | Old Value | New Value | MekHQ Source |
|---|-----------|-----------|--------------|
| 1 | PIRATE_HUNTING combat role: PATROL | Correct to: FRONTLINE | `AtBContractType.java:270` |
| 2 | "10 event types" | "11 event types" — add SPORADIC_UPRISINGS | `AtBEventType.java:39` |
| 3 | "special" contract group | Tag as `[MekStation Enhancement]` — MekHQ doesn't formalize this grouping | MekHQ source — not found |

## Context

### Original Request
Expand MekStation's 5 contract types (Garrison, Recon, Raid, Extraction, Escort) to MekHQ's 19 AtB contract types, each with type-specific rules: constant lengths, operations tempo multipliers, combat role assignments, parts availability modifiers, and contract negotiation mechanics with 4 clause types.

### Interview Summary
**Key Discussions**:
- 19 contract types grouped into Garrison, Raid, and Guerrilla categories
- Each type has: constant length (months), ops tempo multiplier, default combat role, parts availability modifier
- Variable length formula: `round(constantLength × 0.75) + randomInt(round(constantLength × 0.5))`
- 4 negotiation clause types: Command, Salvage, Support, Transport
- Contract events checked monthly (11 event types <!-- AUDIT: Corrected from '10'. Source: AtBEventType.java:39 (same correction as random-events.md) --> including SPORADIC_UPRISINGS with gameplay effects)
- Ops tempo affects scenario generation frequency
- Parts availability modifier affects acquisition TN (Plan 9)
- Payment scales with contract type risk

**Research Findings**:
- `AtBContractType.java`: All 19 types with constantLength, opsTempo values
- `AtBContract.java`: Contract event checking with 11 event types <!-- AUDIT: Missed in initial correction. Source: AtBEventType.java:39 -->
- Contract groupings: Garrison (5 types), Raid (6 types), Guerrilla (4 types), [MekStation Enhancement] <!-- AUDIT: MekHQ doesn't formalize 'special' contract grouping --> Special (4 types)
- Ops tempo ranges from 0.8× (Cadre) to 2.4× (Espionage/Sabotage)
- Contract events: BONUS_ROLL, SPECIAL_SCENARIO, CIVIL_DISTURBANCE, REBELLION, BETRAYAL (6 sub-types), TREACHERY, LOGISTICS_FAILURE, REINFORCEMENTS, SPECIAL_EVENTS (6 sub-types), BIG_BATTLE

### Metis Review
**Identified Gaps** (addressed):
- Existing IContract has basic fields — extend with atbContractType and type-specific data
- Contract negotiation needs negotiation skill from Plan 7 and faction standing from Plan 5
- Ops tempo multiplier feeds into Plan 11's scenario generation frequency
- Parts availability modifier feeds into Plan 9's acquisition TN
- Contract events overlap with Plan 16 (Random Events) — Plan 12 defines contract-specific events, Plan 16 references them

---

## Work Objectives

### Core Objective
Define 19 contract types with type-specific rules, implement variable-length contracts, add 4-clause negotiation system, and integrate contract events that affect morale, logistics, and scenario generation.

### Concrete Deliverables
- `src/types/campaign/contracts/contractTypes.ts` — 19 type enum, definitions, clause types
- `src/lib/campaign/contracts/contractLength.ts` — Variable length calculation
- `src/lib/campaign/contracts/contractNegotiation.ts` — 4-clause negotiation with skill/standing modifiers
- `src/lib/campaign/contracts/contractEvents.ts` — 10 monthly event types
- Updated contract market generation for 19 types

### Definition of Done
- [x] AtBContractType enum with 19 values
- [x] IContractTypeDefinition constant data with length, ops tempo, combat role, parts mod
- [x] Variable length formula matches MekHQ
- [x] 4-clause negotiation system with skill + faction standing modifiers
- [x] 10 contract event types with gameplay effects
- [x] Contract market generates all 19 types

### Must Have
- 19 contract types with correct MekHQ values
- Variable contract length formula
- Ops tempo multiplier per type
- Default combat role per type
- Parts availability modifier per type
- 4 negotiation clause types
- 10 contract event types

### Must NOT Have (Guardrails)
- Full contract negotiation AI (just modifier-based rolls)
- Multiple simultaneous contracts (keep single active)
- Contract subcontracting
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
12.1 (Types) → 12.2 (Length calc) → 12.3 (Negotiation) → 12.4 (Events) → 12.5 (Market update) → 12.6 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 12.1 | Foundation |
| B | 12.2, 12.3, 12.4 | Length, negotiation, events are independent |

| Task | Depends On | Reason |
|------|------------|--------|
| 12.2 | 12.1 | Length needs type definitions |
| 12.3 | 12.1 | Negotiation needs clause types |
| 12.4 | 12.1 | Events need contract type context |
| 12.5 | 12.1, 12.2 | Market needs types and length |
| 12.6 | 12.5 | UI needs everything |

---

## TODOs

- [x] 12.1 Define 19 Contract Types and Definitions

  **What to do**:
  - Create `src/types/campaign/contracts/contractTypes.ts`:
    ```typescript
    export enum AtBContractType {
      GARRISON_DUTY = 'garrison_duty',
      CADRE_DUTY = 'cadre_duty',
      SECURITY_DUTY = 'security_duty',
      RIOT_DUTY = 'riot_duty',
      PLANETARY_ASSAULT = 'planetary_assault',
      RELIEF_DUTY = 'relief_duty',
      GUERRILLA_WARFARE = 'guerrilla_warfare',
      PIRATE_HUNTING = 'pirate_hunting',
      DIVERSIONARY_RAID = 'diversionary_raid',
      OBJECTIVE_RAID = 'objective_raid',
      RECON_RAID = 'recon_raid',
      EXTRACTION_RAID = 'extraction_raid',
      ASSASSINATION = 'assassination',
      ESPIONAGE = 'espionage',
      MOLE_HUNTING = 'mole_hunting',
      OBSERVATION_RAID = 'observation_raid',
      RETAINER = 'retainer',
      SABOTAGE = 'sabotage',
      TERRORISM = 'terrorism',
    }

    export type ContractGroup = 'garrison' | 'raid' | 'guerrilla' | 'special';

    export interface IContractTypeDefinition {
      readonly type: AtBContractType;
      readonly name: string;
      readonly group: ContractGroup;
      readonly constantLengthMonths: number;
      readonly opsTempo: number;         // scenario frequency multiplier
      readonly defaultCombatRole: CombatRole; // from Plan 11
      readonly partsAvailabilityMod: number;
      readonly description: string;
    }

    export const CONTRACT_TYPE_DEFINITIONS: Record<AtBContractType, IContractTypeDefinition> = {
      garrison_duty:      { type: AtBContractType.GARRISON_DUTY,      name: 'Garrison Duty',      group: 'garrison',  constantLengthMonths: 18, opsTempo: 1.0, defaultCombatRole: CombatRole.MANEUVER, partsAvailabilityMod: -2, description: 'Long-term garrison assignment' },
      cadre_duty:         { type: AtBContractType.CADRE_DUTY,         name: 'Cadre Duty',         group: 'garrison',  constantLengthMonths: 12, opsTempo: 0.8, defaultCombatRole: CombatRole.CADRE,    partsAvailabilityMod: -2, description: 'Train local forces' },
      security_duty:      { type: AtBContractType.SECURITY_DUTY,      name: 'Security Duty',      group: 'garrison',  constantLengthMonths: 6,  opsTempo: 1.2, defaultCombatRole: CombatRole.MANEUVER, partsAvailabilityMod: -2, description: 'Protect assets and facilities' },
      riot_duty:          { type: AtBContractType.RIOT_DUTY,          name: 'Riot Duty',          group: 'garrison',  constantLengthMonths: 4,  opsTempo: 1.0, defaultCombatRole: CombatRole.MANEUVER, partsAvailabilityMod: -2, description: 'Suppress civil unrest' },
      planetary_assault:  { type: AtBContractType.PLANETARY_ASSAULT,  name: 'Planetary Assault',  group: 'special',   constantLengthMonths: 9,  opsTempo: 1.5, defaultCombatRole: CombatRole.FRONTLINE, partsAvailabilityMod: 0, description: 'Full-scale planetary invasion' },
      relief_duty:        { type: AtBContractType.RELIEF_DUTY,        name: 'Relief Duty',        group: 'special',   constantLengthMonths: 9,  opsTempo: 1.4, defaultCombatRole: CombatRole.FRONTLINE, partsAvailabilityMod: 0, description: 'Reinforce or relieve besieged forces' },
      guerrilla_warfare:  { type: AtBContractType.GUERRILLA_WARFARE,  name: 'Guerrilla Warfare',  group: 'guerrilla', constantLengthMonths: 24, opsTempo: 2.1, defaultCombatRole: CombatRole.FRONTLINE, partsAvailabilityMod: 2, description: 'Conduct guerrilla operations' },
       pirate_hunting:     { type: AtBContractType.PIRATE_HUNTING,     name: 'Pirate Hunting',     group: 'special',   constantLengthMonths: 6,  opsTempo: 1.0, defaultCombatRole: CombatRole.FRONTLINE, <!-- AUDIT: Corrected from PATROL. Source: AtBContractType.java:270 --> partsAvailabilityMod: -1, description: 'Hunt and eliminate pirate bands' },
      diversionary_raid:  { type: AtBContractType.DIVERSIONARY_RAID,  name: 'Diversionary Raid',  group: 'raid',      constantLengthMonths: 3,  opsTempo: 1.8, defaultCombatRole: CombatRole.PATROL,   partsAvailabilityMod: 1, description: 'Create a diversion for main force' },
      objective_raid:     { type: AtBContractType.OBJECTIVE_RAID,     name: 'Objective Raid',     group: 'raid',      constantLengthMonths: 3,  opsTempo: 1.6, defaultCombatRole: CombatRole.PATROL,   partsAvailabilityMod: 1, description: 'Strike and destroy specific targets' },
      recon_raid:         { type: AtBContractType.RECON_RAID,         name: 'Recon Raid',         group: 'raid',      constantLengthMonths: 3,  opsTempo: 1.6, defaultCombatRole: CombatRole.PATROL,   partsAvailabilityMod: 1, description: 'Gather intelligence behind enemy lines' },
      extraction_raid:    { type: AtBContractType.EXTRACTION_RAID,    name: 'Extraction Raid',    group: 'raid',      constantLengthMonths: 3,  opsTempo: 1.6, defaultCombatRole: CombatRole.PATROL,   partsAvailabilityMod: 1, description: 'Extract personnel or assets' },
      assassination:      { type: AtBContractType.ASSASSINATION,      name: 'Assassination',      group: 'raid',      constantLengthMonths: 3,  opsTempo: 1.9, defaultCombatRole: CombatRole.MANEUVER, partsAvailabilityMod: 1, description: 'Eliminate a high-value target' },
      espionage:          { type: AtBContractType.ESPIONAGE,          name: 'Espionage',          group: 'guerrilla', constantLengthMonths: 12, opsTempo: 2.4, defaultCombatRole: CombatRole.PATROL,   partsAvailabilityMod: 2, description: 'Conduct covert intelligence operations' },
      mole_hunting:       { type: AtBContractType.MOLE_HUNTING,       name: 'Mole Hunting',       group: 'special',   constantLengthMonths: 6,  opsTempo: 1.2, defaultCombatRole: CombatRole.PATROL,   partsAvailabilityMod: 0, description: 'Identify and neutralize infiltrators' },
      observation_raid:   { type: AtBContractType.OBSERVATION_RAID,   name: 'Observation Raid',   group: 'raid',      constantLengthMonths: 3,  opsTempo: 1.6, defaultCombatRole: CombatRole.PATROL,   partsAvailabilityMod: 1, description: 'Observe and report enemy activity' },
      retainer:           { type: AtBContractType.RETAINER,           name: 'Retainer',           group: 'garrison',  constantLengthMonths: 12, opsTempo: 1.3, defaultCombatRole: CombatRole.MANEUVER, partsAvailabilityMod: -2, description: 'On retainer for employer' },
      sabotage:           { type: AtBContractType.SABOTAGE,           name: 'Sabotage',           group: 'guerrilla', constantLengthMonths: 24, opsTempo: 2.4, defaultCombatRole: CombatRole.MANEUVER, partsAvailabilityMod: 2, description: 'Sabotage enemy infrastructure' },
      terrorism:          { type: AtBContractType.TERRORISM,          name: 'Terrorism',          group: 'guerrilla', constantLengthMonths: 3,  opsTempo: 1.9, defaultCombatRole: CombatRole.MANEUVER, partsAvailabilityMod: 1, description: 'Conduct terror operations' },
    };

    // Negotiation clause types
    export enum ContractClauseType {
      COMMAND = 'command',
      SALVAGE = 'salvage',
      SUPPORT = 'support',
      TRANSPORT = 'transport',
    }

    export interface IContractClause {
      readonly type: ContractClauseType;
      readonly level: number;  // 0-3 (higher = better for player)
      readonly description: string;
    }
    ```
  - Add `atbContractType?: AtBContractType` to IContract

  **Parallelizable**: YES (foundation)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Mission.ts:128-146` — IContract
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\enums\AtBContractType.java` — 19 types

  **Acceptance Criteria**:
  - [x] RED: Test AtBContractType has 19 values
  - [x] RED: Test CONTRACT_TYPE_DEFINITIONS has entry for every type
  - [x] RED: Test garrison group contains 5 types
  - [x] RED: Test raid group contains 6 types
  - [x] RED: Test ops tempo ranges from 0.8 to 2.4
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define 19 AtB contract types with definitions`
  - Files: `src/types/campaign/contracts/contractTypes.ts`

---

- [x] 12.2 Implement Contract Length Calculation

  **What to do**:
  - Create `src/lib/campaign/contracts/contractLength.ts`:
    ```typescript
    export function calculateContractLength(
      contractType: AtBContractType,
      random: RandomFn
    ): number {
      const def = CONTRACT_TYPE_DEFINITIONS[contractType];
      const base = def.constantLengthMonths;
      const minLength = Math.round(base * 0.75);
      const variance = Math.round(base * 0.5);
      const roll = Math.floor(random() * variance);
      return minLength + roll; // in months
    }

    export function contractLengthToDays(months: number): number {
      return months * 30; // simplified 30-day months
    }
    ```

  **Parallelizable**: YES (with 12.3, 12.4)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\enums\AtBContractType.java` — Length formula

  **Acceptance Criteria**:
  - [x] RED: Test garrison (18 months): range 14-22 months
  - [x] RED: Test diversionary raid (3 months): range 2-4 months
  - [x] RED: Test guerrilla warfare (24 months): range 18-30 months
  - [x] RED: Test deterministic with seeded random
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement variable contract length calculation`
  - Files: `src/lib/campaign/contracts/contractLength.ts`

---

- [x] 12.3 Implement Contract Negotiation System

  **What to do**:
  - Create `src/lib/campaign/contracts/contractNegotiation.ts`:
    ```typescript
    export const CLAUSE_LEVELS: Record<ContractClauseType, readonly { level: number; name: string; description: string }[]> = {
      command:   [{ level: 0, name: 'Integrated', description: 'Employer controls' }, { level: 1, name: 'House', description: 'Shared command' }, { level: 2, name: 'Liaison', description: 'Employer advisor only' }, { level: 3, name: 'Independent', description: 'Full autonomy' }],
      salvage:   [{ level: 0, name: 'None', description: 'No salvage rights' }, { level: 1, name: 'Exchange', description: 'Buy at discount' }, { level: 2, name: 'Employer', description: 'Employer picks first' }, { level: 3, name: 'Integrated', description: 'Full salvage rights' }],
      support:   [{ level: 0, name: 'None', description: 'Self-support' }, { level: 1, name: 'Supplies Only', description: 'Ammo and consumables' }, { level: 2, name: 'Partial', description: 'Battle loss replacement' }, { level: 3, name: 'Full', description: 'Complete support' }],
      transport: [{ level: 0, name: 'None', description: 'Self-transport' }, { level: 1, name: 'Limited', description: 'One-way transport' }, { level: 2, name: 'Partial', description: 'Round trip' }, { level: 3, name: 'Full', description: 'Full transport provided' }],
    };

    export function negotiateClause(
      clauseType: ContractClauseType,
      negotiatorSkill: number,    // from Plan 7 getNegotiationModifier()
      factionStandingMod: number, // from Plan 5 getNegotiationModifier()
      random: RandomFn
    ): IContractClause {
      const roll = roll2d6(random);
      const totalMod = negotiatorSkill + factionStandingMod;
      const result = roll + totalMod;
      // Higher result = better clause level
      const level = Math.min(3, Math.max(0, Math.floor((result - 4) / 3)));
      const levelDef = CLAUSE_LEVELS[clauseType][level];
      return { type: clauseType, level, description: levelDef.description };
    }

    export function negotiateFullContract(
      campaign: ICampaign,
      random: RandomFn
    ): IContractClause[] {
      const negotiator = getBestNegotiator(campaign);
      const skill = getNegotiationModifier(negotiator); // Plan 7 stub
      const standing = getFactionStandingNegotiationMod(campaign); // Plan 5 stub
      return Object.values(ContractClauseType).map(type =>
        negotiateClause(type, skill, standing, random)
      );
    }
    ```

  **Must NOT do**:
  - Re-negotiation after acceptance
  - Multiple negotiation rounds

  **Parallelizable**: YES (with 12.2, 12.4)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\market\contractMarket\AbstractContractMarket.java` — Clause management

  **Acceptance Criteria**:
  - [x] RED: Test low roll + low skill → level 0 clause
  - [x] RED: Test high roll + high skill → level 3 clause
  - [x] RED: Test faction standing modifier affects result
  - [x] RED: Test level clamped between 0-3
  - [x] RED: Test negotiateFullContract returns 4 clauses
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement contract negotiation with 4 clause types`
  - Files: `src/lib/campaign/contracts/contractNegotiation.ts`

---

- [x] 12.4 Implement Contract Events System

  **What to do**:
  - Create `src/lib/campaign/contracts/contractEvents.ts`:
    ```typescript
    export enum ContractEventType {
      BONUS_ROLL = 'bonus_roll',
      SPECIAL_SCENARIO = 'special_scenario',
      CIVIL_DISTURBANCE = 'civil_disturbance',
      REBELLION = 'rebellion',
      BETRAYAL = 'betrayal',
      TREACHERY = 'treachery',
      LOGISTICS_FAILURE = 'logistics_failure',
      REINFORCEMENTS = 'reinforcements',
      SPECIAL_EVENTS = 'special_events',
      BIG_BATTLE = 'big_battle',
    }

    export interface IContractEvent {
      readonly type: ContractEventType;
      readonly contractId: string;
      readonly description: string;
      readonly effects: readonly IContractEventEffect[];
    }

    export type IContractEventEffect =
      | { type: 'morale_change'; value: number }
      | { type: 'parts_modifier'; value: number }
      | { type: 'scenario_trigger'; scenarioType: string }
      | { type: 'payment_modifier'; multiplier: number };

    export function checkContractEvents(
      contract: IContract,
      campaign: ICampaign,
      random: RandomFn
    ): IContractEvent[];
    ```

  **Parallelizable**: YES (with 12.2, 12.3)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\AtBContract.java` — Contract event checking

  **Acceptance Criteria**:
  - [x] RED: Test CIVIL_DISTURBANCE adds +1 enemy morale
  - [x] RED: Test LOGISTICS_FAILURE adds -1 parts availability
  - [x] RED: Test REINFORCEMENTS adds -1 enemy morale
  - [x] RED: Test BETRAYAL has 6 sub-types
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement contract event system with 11 event types` <!-- AUDIT: Missed in initial correction -->
  - Files: `src/lib/campaign/contracts/contractEvents.ts`

---

- [x] 12.5 Update Contract Market for 19 Types

  **What to do**:
  - Update `src/lib/campaign/contractMarket.ts`:
    - Replace 5 hardcoded types with 19 AtBContractType values
    - Weight contract type selection by group and campaign context
    - Use calculateContractLength() for variable duration
    - Apply type-specific payment formulas (ops tempo affects risk premium)
    - Generate negotiated clauses for each contract offer

  **Must NOT do**:
  - Break existing contract generation (additive changes)
  - Remove existing CONTRACT_TYPES constant (deprecate gracefully)

  **Parallelizable**: NO (depends on 12.1, 12.2)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\contractMarket.ts` — Current 5-type market

  **Acceptance Criteria**:
  - [x] RED: Test generateContracts can produce all 19 types
  - [x] RED: Test contract length uses variable formula
  - [x] RED: Test garrison types weighted more heavily than guerrilla
  - [x] RED: Test generated contracts have negotiated clauses
  - [x] GREEN: All tests pass
  - [x] Existing contract market tests still pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): expand contract market to 19 AtB types`
  - Files: `src/lib/campaign/contractMarket.ts`

---

- [x] 12.6 Create Contract Types UI

  **What to do**:
  - Enhanced contract detail view:
    - Contract type badge with group color coding
    - Type-specific info (ops tempo, parts mod, default combat role)
    - Clause display with negotiation results
    - Contract event log
  - Contract negotiation dialog:
    - Show 4 clause rolls with modifiers breakdown
    - Accept/decline contract

  **Parallelizable**: NO (depends on 12.5)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard

  **Acceptance Criteria**:
  - [x] Contract type shown with description and stats
  - [x] Clause negotiation results displayed
  - [x] Contract events shown in event log
  - [x] Manual verification: dev server → contract market → accept → verify type details

  **Commit**: YES
  - Message: `feat(ui): enhance contract view with 19 types and negotiation`
  - Files: updated contract components

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 12.1 | `feat(campaign): define 19 AtB contract types` | `npm test` |
| 12.2 | `feat(campaign): implement variable contract length` | `npm test` |
| 12.3 | `feat(campaign): implement contract negotiation` | `npm test` |
| 12.4 | `feat(campaign): implement contract events` | `npm test` |
| 12.5 | `feat(campaign): expand contract market to 19 types` | `npm test` |
| 12.6 | `feat(ui): enhance contract view with types and negotiation` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [x] 19 contract types with correct MekHQ values
- [x] Variable length formula working
- [x] 4-clause negotiation with skill/standing modifiers
- [x] 10 contract event types with effects
- [x] Contract market generates all 19 types
- [x] Existing contract tests unbroken

---

## Migration Notes

- New `atbContractType` on IContract is optional — existing contracts keep working with legacy types
- Existing 5 types map to: Garrison→GARRISON_DUTY, Recon→RECON_RAID, Raid→OBJECTIVE_RAID, Extraction→EXTRACTION_RAID, Escort→SECURITY_DUTY
- Old CONTRACT_TYPES constant deprecated but preserved for backward compatibility
- New `contractClauses` optional field on IContract — existing contracts have no clauses
- Contract events checked monthly (Plan 16 integration point)
- No migration needed — new types are additive

---

*Plan generated by Prometheus. Execute with `/start-work`.*
