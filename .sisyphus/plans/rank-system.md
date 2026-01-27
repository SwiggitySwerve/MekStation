# Rank System

> **✅ COMPLETED** — Implemented, merged, and archived. PR #201.

## Context

### Original Request
Implement MekHQ's faction-specific rank system: 51 rank slots (21 enlisted, 10 warrant officer, 20 officer), faction-specific rank tables with profession-variant names, promotion rules, pay multipliers, time-in-rank tracking, and officer status effects on turnover and shares.

### Interview Summary
**Key Discussions**:
- 51 rank slots: E0-E20 (enlisted), WO1-WO10 (warrant officers), O1-O20 (officers)
- Each rank has: names per profession, officer boolean, payMultiplier double
- 9 professions: MekWarrior, Aerospace, Vehicle, Naval, Infantry, Tech, Medical, Administrator, Civilian
- 5 built-in rank systems: Mercenary, SLDF, Clan, ComStar, Generic House
- RankSystemType: DEFAULT (built-in), CUSTOM (user), CAMPAIGN (per-campaign)
- Officer status effects: -1 turnover modifier, additional shares
- Salary: `(primarySalary + secondarySalary) × rankPayMultiplier`
- Recent promotion: -1 turnover modifier within 6 months
- Time-in-rank tracked via lastRankChangeDate on IPerson

**Research Findings**:
- `Rank.java`: Properties include rankNames Map, officer boolean, payMultiplier double
- `RankSystem.java`: code, name, ranks[51], officerCut, useROMDesignation
- `RankValidator.java`: Must have exactly 51 ranks, index 0 cannot be empty
- `Person.java`: changeRank() updates lastRankChangeDate, logs to service history
- `RetirementDefectionTracker.java`: Officers get -1 turnover modifier
- Officer shares: base shares + 1 per rank above officer cut

### Metis Review
**Identified Gaps** (addressed):
- IPerson already has rank (string) and rankLevel (number) — but no numeric index
- Need to add rankIndex (numeric 0-50) to IPerson for rank system integration
- Not all 51 slots needed in every system — most faction systems use ~15-20 actual ranks
- Profession mapping needs CampaignPersonnelRole → Profession mapping from Plan 13
- Pay multiplier integration needs Plan 4 salary calculation update
- Turnover officer modifier needs Plan 2 integration

---

## Work Objectives

### Core Objective
Build a faction-specific rank system with structured rank tables, promotion/demotion service, pay multipliers, and officer status tracking that integrates with salary, turnover, and awards systems.

### Concrete Deliverables
- `src/types/campaign/ranks/rankTypes.ts` — Rank structure, system, profession types
- `src/lib/campaign/ranks/rankSystems.ts` — 5 built-in faction rank systems
- `src/lib/campaign/ranks/rankService.ts` — Promotion, demotion, name resolution, officer check
- `src/lib/campaign/ranks/rankPay.ts` — Pay multiplier integration
- Updated IPerson with rankIndex for numeric rank tracking

### Definition of Done
- [x] IRank and IRankSystem types defined
- [x] 5 built-in rank systems with ~15-20 populated ranks each
- [x] Promote/demote with validation and service logging
- [x] getRankName() resolves profession-specific name
- [x] isOfficer() computed from rank index vs officer cut
- [x] Pay multiplier integrated with salary calculation
- [x] Time-in-rank tracking

### Must Have
- 51 rank slots (most empty — only populated ranks used)
- 5 built-in rank systems
- Promote/demote functions with validation
- Officer status determination
- Pay multiplier per rank
- Time-in-rank display

### Must NOT Have (Guardrails)
- Custom rank system editor UI (defer — just data structure support)
- Automatic promotion logic (manual only)
- ROM designation support (ComStar specialty — defer)
- Manei Domini ranks (Word of Blake — defer)
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
15.1 (Types) → 15.2 (Built-in systems) → 15.3 (Rank service) → 15.4 (Pay multiplier) → 15.5 (Campaign integration) → 15.6 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 15.1 | Foundation types |
| B | 15.2, 15.3 | Systems and service can be developed in parallel once types exist |

| Task | Depends On | Reason |
|------|------------|--------|
| 15.2 | 15.1 | Systems use rank types |
| 15.3 | 15.1 | Service uses rank types |
| 15.4 | 15.3 | Pay needs rank service |
| 15.5 | 15.2, 15.4 | Integration needs systems and pay |
| 15.6 | 15.5 | UI needs everything |

---

## TODOs

- [x] 15.1 Define Rank Types and Structure

  **What to do**:
  - Create `src/types/campaign/ranks/rankTypes.ts`:
    ```typescript
    export enum Profession {
      MEKWARRIOR = 'mekwarrior',
      AEROSPACE = 'aerospace',
      VEHICLE = 'vehicle',
      NAVAL = 'naval',
      INFANTRY = 'infantry',
      TECH = 'tech',
      MEDICAL = 'medical',
      ADMINISTRATOR = 'administrator',
      CIVILIAN = 'civilian',
    }

    export interface IRank {
      readonly names: Partial<Record<Profession, string>>; // profession → display name
      readonly officer: boolean;
      readonly payMultiplier: number; // 1.0 = no bonus
    }

    export interface IRankSystem {
      readonly code: string;
      readonly name: string;
      readonly description: string;
      readonly type: 'default' | 'custom' | 'campaign';
      readonly ranks: readonly IRank[]; // exactly 51 entries (sparse — most names empty)
      readonly officerCut: number;      // index of first officer rank
    }

    // Rank tier boundaries
    export const RANK_TIERS = {
      ENLISTED_MIN: 0,   ENLISTED_MAX: 20,  // E0-E20
      WARRANT_MIN: 21,   WARRANT_MAX: 30,   // WO1-WO10
      OFFICER_MIN: 31,   OFFICER_MAX: 50,   // O1-O20
      TOTAL: 51,
    } as const;

    export type RankTier = 'enlisted' | 'warrant_officer' | 'officer';

    export function getRankTier(rankIndex: number): RankTier;
    ```
  - Add `rankIndex?: number` to IPerson (default 0 = no rank)

  **Parallelizable**: YES (foundation)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Person.ts` — rank, rankLevel fields
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\ranks\Rank.java` — 51 slots

  **Acceptance Criteria**:
  - [x] RED: Test RANK_TIERS.TOTAL === 51
  - [x] RED: Test Profession has 9 values
  - [x] RED: Test getRankTier(0) === 'enlisted'
  - [x] RED: Test getRankTier(25) === 'warrant_officer'
  - [x] RED: Test getRankTier(35) === 'officer'
  - [x] GREEN: Types compile
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define rank types with 51-slot structure`
  - Files: `src/types/campaign/ranks/rankTypes.ts`

---

- [x] 15.2 Define Built-In Rank Systems

  **What to do**:
  - Create `src/lib/campaign/ranks/rankSystems.ts`:
    ```typescript
    // Helper to create sparse 51-element rank array
    function createRankSystem(code: string, name: string, description: string, officerCut: number, populatedRanks: Record<number, IRank>): IRankSystem;

    export const RANK_SYSTEM_MERCENARY: IRankSystem = createRankSystem(
      'MERC', 'Mercenary', 'Generic mercenary ranks', 31,
      {
        0:  { names: { mekwarrior: 'None' }, officer: false, payMultiplier: 1.0 },
        1:  { names: { mekwarrior: 'Private' }, officer: false, payMultiplier: 1.0 },
        3:  { names: { mekwarrior: 'Corporal' }, officer: false, payMultiplier: 1.05 },
        5:  { names: { mekwarrior: 'Sergeant' }, officer: false, payMultiplier: 1.1 },
        8:  { names: { mekwarrior: 'Staff Sergeant' }, officer: false, payMultiplier: 1.15 },
        11: { names: { mekwarrior: 'Master Sergeant' }, officer: false, payMultiplier: 1.2 },
        21: { names: { mekwarrior: 'Warrant Officer' }, officer: false, payMultiplier: 1.25 },
        31: { names: { mekwarrior: 'Lieutenant' }, officer: true, payMultiplier: 1.4 },
        34: { names: { mekwarrior: 'Captain' }, officer: true, payMultiplier: 1.6 },
        37: { names: { mekwarrior: 'Major' }, officer: true, payMultiplier: 1.8 },
        40: { names: { mekwarrior: 'Colonel' }, officer: true, payMultiplier: 2.0 },
        45: { names: { mekwarrior: 'General' }, officer: true, payMultiplier: 2.5 },
      }
    );

    export const RANK_SYSTEM_SLDF: IRankSystem = createRankSystem('SLDF', 'Star League Defense Force', '...', 31, { ... });
    export const RANK_SYSTEM_CLAN: IRankSystem = createRankSystem('CLAN', 'Clan', '...', 31, {
      0:  { names: { mekwarrior: 'Warrior' }, officer: false, payMultiplier: 1.0 },
      5:  { names: { mekwarrior: 'Point Commander' }, officer: false, payMultiplier: 1.1 },
      10: { names: { mekwarrior: 'Star Commander' }, officer: false, payMultiplier: 1.2 },
      31: { names: { mekwarrior: 'Star Captain' }, officer: true, payMultiplier: 1.5 },
      35: { names: { mekwarrior: 'Star Colonel' }, officer: true, payMultiplier: 1.8 },
      40: { names: { mekwarrior: 'Galaxy Commander' }, officer: true, payMultiplier: 2.2 },
      45: { names: { mekwarrior: 'Khan' }, officer: true, payMultiplier: 3.0 },
    });
    export const RANK_SYSTEM_COMSTAR: IRankSystem = createRankSystem('COMSTAR', 'ComStar', '...', 31, { ... });
    export const RANK_SYSTEM_GENERIC_HOUSE: IRankSystem = createRankSystem('HOUSE', 'Great Houses', '...', 31, { ... });

    export const BUILT_IN_RANK_SYSTEMS: Record<string, IRankSystem> = {
      MERC: RANK_SYSTEM_MERCENARY,
      SLDF: RANK_SYSTEM_SLDF,
      CLAN: RANK_SYSTEM_CLAN,
      COMSTAR: RANK_SYSTEM_COMSTAR,
      HOUSE: RANK_SYSTEM_GENERIC_HOUSE,
    };

    export function getRankSystem(code: string): IRankSystem;
    ```

  **Parallelizable**: YES (with 15.3)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\ranks\RankSystem.java` — Faction tables

  **Acceptance Criteria**:
  - [x] RED: Test 5 built-in rank systems exist
  - [x] RED: Test MERCENARY has populated ranks at correct indices
  - [x] RED: Test CLAN has Star Commander, Galaxy Commander
  - [x] RED: Test each system has exactly 51 rank slots
  - [x] RED: Test officerCut is set correctly
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define 5 built-in faction rank systems`
  - Files: `src/lib/campaign/ranks/rankSystems.ts`

---

- [x] 15.3 Implement Rank Service

  **What to do**:
  - Create `src/lib/campaign/ranks/rankService.ts`:
    ```typescript
    export function getRankName(
      person: IPerson,
      rankSystem: IRankSystem
    ): string {
      const rankIndex = person.rankIndex ?? 0;
      const rank = rankSystem.ranks[rankIndex];
      if (!rank) return 'None';
      const profession = mapRoleToProfession(person.primaryRole);
      return rank.names[profession] ?? rank.names[Profession.MEKWARRIOR] ?? 'None';
    }

    export function isOfficer(person: IPerson, rankSystem: IRankSystem): boolean {
      const rankIndex = person.rankIndex ?? 0;
      return rankIndex >= rankSystem.officerCut;
    }

    export function promoteToRank(
      person: IPerson,
      newRankIndex: number,
      currentDate: string,
      rankSystem: IRankSystem
    ): { updatedPerson: IPerson; valid: boolean; reason?: string } {
      if (newRankIndex < 0 || newRankIndex >= RANK_TIERS.TOTAL) {
        return { updatedPerson: person, valid: false, reason: 'Rank index out of range' };
      }
      const isPromotion = newRankIndex > (person.rankIndex ?? 0);
      return {
        updatedPerson: {
          ...person,
          rankIndex: newRankIndex,
          rank: getRankNameByIndex(newRankIndex, person.primaryRole, rankSystem),
          lastRankChangeDate: currentDate,
        },
        valid: true,
      };
    }

    export function demoteToRank(person: IPerson, newRankIndex: number, currentDate: string, rankSystem: IRankSystem): { updatedPerson: IPerson; valid: boolean; reason?: string };

    export function getTimeInRank(person: IPerson, currentDate: string): string;

    export function mapRoleToProfession(role: CampaignPersonnelRole): Profession;
    ```

  **Parallelizable**: YES (with 15.2)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\ranks\RankValidator.java` — Validation
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\Person.java` — changeRank()

  **Acceptance Criteria**:
  - [x] RED: Test getRankName returns profession-specific name
  - [x] RED: Test getRankName falls back to mekwarrior name
  - [x] RED: Test isOfficer returns true for index >= officerCut
  - [x] RED: Test promoteToRank updates rankIndex and lastRankChangeDate
  - [x] RED: Test invalid rank index returns valid=false
  - [x] RED: Test getTimeInRank formats correctly
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement rank service with promotion and name resolution`
  - Files: `src/lib/campaign/ranks/rankService.ts`

---

- [x] 15.4 Implement Rank Pay Multiplier

  **What to do**:
  - Create `src/lib/campaign/ranks/rankPay.ts`:
    ```typescript
    export function getRankPayMultiplier(
      person: IPerson,
      rankSystem: IRankSystem
    ): number {
      const rankIndex = person.rankIndex ?? 0;
      const rank = rankSystem.ranks[rankIndex];
      if (!rank || rank.payMultiplier <= 0) return 1.0;
      return rank.payMultiplier;
    }

    // Updated salary formula (extends Plan 4)
    export function getPersonMonthlySalaryWithRank(
      person: IPerson,
      options: ICampaignOptions,
      rankSystem: IRankSystem
    ): number {
      const baseSalary = getRoleBaseSalary(person.primaryRole); // Plan 13
      const rankMultiplier = getRankPayMultiplier(person, rankSystem);
      return Math.round(baseSalary * rankMultiplier);
    }

    // Officer share calculation (extends Plan 2)
    export function getOfficerShares(
      person: IPerson,
      rankSystem: IRankSystem
    ): number {
      if (!isOfficer(person, rankSystem)) return 0;
      const rankIndex = person.rankIndex ?? 0;
      return rankIndex - rankSystem.officerCut + 1;
    }
    ```

  **Parallelizable**: NO (depends on 15.3)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\Person.java:4662-4739` — Salary with rank

  **Acceptance Criteria**:
  - [x] RED: Test rank index 0 (None) gives multiplier 1.0
  - [x] RED: Test Colonel (index 40, merc) gives multiplier 2.0
  - [x] RED: Test officer shares = rankIndex - officerCut + 1
  - [x] RED: Test non-officer gets 0 shares
  - [x] RED: Test salary = baseSalary × rankMultiplier
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement rank pay multiplier and officer shares`
  - Files: `src/lib/campaign/ranks/rankPay.ts`

---

- [x] 15.5 Integrate Rank System with Campaign

  **What to do**:
  - Add `rankSystemCode?: string` to ICampaignOptions (default 'MERC')
  - Create helper to get active rank system from campaign:
    ```typescript
    export function getCampaignRankSystem(campaign: ICampaign): IRankSystem {
      const code = campaign.options.rankSystemCode ?? 'MERC';
      return getRankSystem(code);
    }
    ```
  - Update Plan 4 salary calculation to use rank multiplier
  - Update Plan 2 turnover to use officer modifier
  - Map campaign type presets (Plan 6) to default rank systems

  **Parallelizable**: NO (depends on 15.2, 15.4)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts` — ICampaignOptions
  - `.sisyphus/plans/campaign-options-presets.md` — Plan 6 presets

  **Acceptance Criteria**:
  - [x] RED: Test getCampaignRankSystem returns correct system for code
  - [x] RED: Test default code 'MERC' returns Mercenary system
  - [x] RED: Test unknown code falls back to Mercenary
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): integrate rank system with campaign options`
  - Files: integration updates

---

- [x] 15.6 Create Rank Management UI

  **What to do**:
  - Rank display on personnel (with profession-specific name and tier badge)
  - Promote/Demote buttons with rank picker dropdown
  - Time-in-rank display (formatted duration)
  - Officer indicator icon
  - Rank system selector in campaign settings
  - Rank table viewer (shows all ranks in active system)

  **Parallelizable**: NO (depends on 15.5)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard

  **Acceptance Criteria**:
  - [x] Rank name shows with profession variant
  - [x] Promote/demote buttons work with validation
  - [x] Time-in-rank displayed correctly
  - [x] Officer badge shown for officer ranks
  - [x] Rank system selector in settings
  - [x] Manual verification: dev server → personnel → promote → verify rank name and pay change

  **Commit**: YES
  - Message: `feat(ui): add rank management with promotion and system selection`
  - Files: rank UI components

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 15.1 | `feat(campaign): define rank types` | `npm test` |
| 15.2 | `feat(campaign): define 5 built-in rank systems` | `npm test` |
| 15.3 | `feat(campaign): implement rank service` | `npm test` |
| 15.4 | `feat(campaign): implement rank pay multiplier` | `npm test` |
| 15.5 | `feat(campaign): integrate rank system with campaign` | `npm test` |
| 15.6 | `feat(ui): add rank management UI` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [x] 51-slot rank structure
- [x] 5 built-in rank systems with populated ranks
- [x] Promote/demote with validation
- [x] Profession-specific rank names
- [x] Pay multiplier integrated with salary
- [x] Officer status for turnover/shares
- [x] Time-in-rank tracking

---

## Migration Notes

- New `rankIndex` on IPerson (optional, default 0 = no rank)
- Existing `rank` string field preserved for display (updated on promotion)
- Existing `rankLevel` preserved (used for ComStar sub-levels if needed)
- Existing `lastRankChangeDate` already on IPerson — no change needed
- New `rankSystemCode` on ICampaignOptions defaults to 'MERC'
- Existing persons keep rank string — rankIndex=0 until first promotion
- No migration needed — rank system is purely additive

---

*Plan generated by Prometheus. Execute with `/start-work`.*
