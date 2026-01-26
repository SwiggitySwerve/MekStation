# Personnel Status & Role Expansion

## Context

### Original Request
Expand MekStation's 10 personnel statuses and 10 roles to match MekHQ's 37 statuses (with behavioral rules and valid transitions) and categorized roles (14 combat, 11 support, ~20 civilian). Define status behavioral helpers (salary eligibility, absence, departure) and role category classification.

### Interview Summary
**Key Discussions**:
- 37 statuses grouped into: Active/Employed (6), Absent (3), Departed (9), Dead (14 causes), Other (1)
- Status behavioral rules: isAbsent(), isSalaryEligible(), isDead(), isDepartedUnit()
- Valid status transitions with side effects (clear assignments, set dates, trigger events)
- 14 combat roles, 11 support roles, ~20 representative civilian roles (not all 270 from MekHQ)
- Role categories as helper functions, not separate enums
- Role-to-salary mapping with base salary per role
- Backward compatible — existing 10 statuses/roles still work

**Research Findings**:
- `PersonnelStatus.java`: 37 values with NotificationSeverity (NEGATIVE/WARNING/NEUTRAL/POSITIVE)
- `PersonnelRole.java`: 300+ roles in 3 categories (COMBAT, SUPPORT, CIVILIAN) with per-role attribute defaults
- `Person.java` (lines 1450–1678): Status transition logic with side effects
- Salary eligibility: ACTIVE, POW, ON_LEAVE, ON_MATERNITY_LEAVE, STUDENT
- Absent statuses: MIA, POW, ON_LEAVE, ON_MATERNITY_LEAVE, AWOL, STUDENT
- Death transitions: set dateOfDeath, trigger genealogy updates, remove from unit

### Metis Review
**Identified Gaps** (addressed):
- WOUNDED status in MekStation doesn't exist in MekHQ — MekHQ uses ACTIVE + injuries; keep WOUNDED for simplicity
- Not all 270 civilian roles needed — add ~20 representative ones + CIVILIAN_OTHER catchall
- Status transition validator prevents invalid transitions (e.g., KIA → ACTIVE)
- Role expansion must not break existing person creation flow
- isCombatRole()/isSupportRole() helpers already exist on IPerson — extend, don't duplicate

---

## Work Objectives

### Core Objective
Expand the personnel status and role enums to provide MekHQ-level granularity, with behavioral rule helpers and validated status transitions, while maintaining backward compatibility.

### Concrete Deliverables
- Updated `src/types/campaign/enums/PersonnelStatus.ts` — 37 status values
- Updated `src/types/campaign/enums/CampaignPersonnelRole.ts` — expanded roles with categories
- `src/lib/campaign/personnel/statusRules.ts` — Status behavioral helpers
- `src/lib/campaign/personnel/statusTransitions.ts` — Validated status transitions with side effects
- `src/lib/campaign/personnel/roleSalaries.ts` — Base salary mapping per role

### Definition of Done
- [ ] PersonnelStatus expanded from 10 → 37 values
- [ ] Status behavioral helpers: isAbsent, isSalaryEligible, isDead, isDepartedUnit
- [ ] Status transition validator with valid/invalid determination
- [ ] CampaignPersonnelRole expanded from 10 → ~45 values (14 combat + 11 support + ~20 civilian)
- [ ] Role category helpers: isCombatRole, isSupportRole, isCivilianRole
- [ ] Base salary per role for Plan 4 integration

### Must Have
- All 37 PersonnelStatus values
- Status behavioral rule functions (5 helpers)
- Status transition validation
- Expanded roles in 3 categories
- Role-to-salary base mapping
- Backward compatibility (existing 10 statuses/roles keep working)

### Must NOT Have (Guardrails)
- All 270 civilian roles from MekHQ (just ~20 representative ones)
- Family/genealogy system for death transitions
- Detailed role-to-attribute mapping per civilian profession
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
13.1 (Status enum) → 13.2 (Status rules) → 13.3 (Status transitions) → 13.4 (Role enum) → 13.5 (Role salaries) → 13.6 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 13.1, 13.4 | Status and role enums are independent |
| B | 13.2, 13.3 | Rules and transitions depend on status enum |

| Task | Depends On | Reason |
|------|------------|--------|
| 13.2 | 13.1 | Rules use status values |
| 13.3 | 13.1, 13.2 | Transitions use statuses and rules |
| 13.5 | 13.4 | Salaries need role enum |
| 13.6 | 13.3, 13.5 | UI needs everything |

---

## TODOs

- [ ] 13.1 Expand PersonnelStatus Enum to 37 Values

  **What to do**:
  - Update `src/types/campaign/enums/PersonnelStatus.ts`:
    ```typescript
    export enum PersonnelStatus {
      // Active/Employed (salary eligible)
      ACTIVE = 'Active',
      CAMP_FOLLOWER = 'Camp Follower',
      STUDENT = 'Student',
      POW = 'POW',
      ON_LEAVE = 'On Leave',
      ON_MATERNITY_LEAVE = 'On Maternity Leave',

      // Absent
      MIA = 'MIA',
      AWOL = 'AWOL',
      BACKGROUND_CHARACTER = 'Background Character',

      // Wounded (MekStation-specific, not in MekHQ)
      WOUNDED = 'Wounded',

      // Departed
      RETIRED = 'Retired',
      RESIGNED = 'Resigned',
      SACKED = 'Sacked',
      LEFT = 'Left',
      DESERTED = 'Deserted',
      DEFECTED = 'Defected',
      IMPRISONED = 'Imprisoned',
      ENEMY_BONDSMAN = 'Enemy Bondsman',
      DISHONORABLY_DISCHARGED = 'Dishonorably Discharged',

      // Dead (14 causes)
      KIA = 'KIA',
      HOMICIDE = 'Homicide',
      WOUNDS = 'Died of Wounds',
      DISEASE = 'Disease',
      CONTAGIOUS_DISEASE = 'Contagious Disease',
      ACCIDENTAL = 'Accidental Death',
      NATURAL_CAUSES = 'Natural Causes',
      OLD_AGE = 'Old Age',
      MEDICAL_COMPLICATIONS = 'Medical Complications',
      PREGNANCY_COMPLICATIONS = 'Pregnancy Complications',
      UNDETERMINED = 'Undetermined',
      SUICIDE = 'Suicide',
      BONDSREF = 'Bondsref',
      SEPPUKU = 'Seppuku',

      // Other
      MISSING = 'Missing',
    }

    export type StatusSeverity = 'positive' | 'neutral' | 'warning' | 'negative';

    export const STATUS_SEVERITY: Record<PersonnelStatus, StatusSeverity> = {
      [PersonnelStatus.ACTIVE]: 'positive',
      [PersonnelStatus.STUDENT]: 'positive',
      // ... all mappings
    };
    ```

  **Must NOT do**:
  - Remove existing WOUNDED status (MekStation-specific)
  - Change string values of existing 10 statuses

  **Parallelizable**: YES (with 13.4)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\enums\PersonnelStatus.ts` — Current 10 values
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\enums\PersonnelStatus.java` — 37 values

  **Acceptance Criteria**:
  - [ ] RED: Test PersonnelStatus has 37 values (36 MekHQ + WOUNDED)
  - [ ] RED: Test existing 10 values unchanged
  - [ ] RED: Test 14 death statuses exist
  - [ ] RED: Test STATUS_SEVERITY maps every status
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): expand PersonnelStatus to 37 values`
  - Files: `src/types/campaign/enums/PersonnelStatus.ts`

---

- [ ] 13.2 Implement Status Behavioral Rules

  **What to do**:
  - Create `src/lib/campaign/personnel/statusRules.ts`:
    ```typescript
    const ABSENT_STATUSES = new Set([
      PersonnelStatus.MIA, PersonnelStatus.POW, PersonnelStatus.ON_LEAVE,
      PersonnelStatus.ON_MATERNITY_LEAVE, PersonnelStatus.AWOL, PersonnelStatus.STUDENT,
      PersonnelStatus.WOUNDED,
    ]);

    const SALARY_ELIGIBLE = new Set([
      PersonnelStatus.ACTIVE, PersonnelStatus.POW, PersonnelStatus.ON_LEAVE,
      PersonnelStatus.ON_MATERNITY_LEAVE, PersonnelStatus.STUDENT,
    ]);

    const DEAD_STATUSES = new Set([
      PersonnelStatus.KIA, PersonnelStatus.HOMICIDE, PersonnelStatus.WOUNDS,
      PersonnelStatus.DISEASE, PersonnelStatus.CONTAGIOUS_DISEASE,
      PersonnelStatus.ACCIDENTAL, PersonnelStatus.NATURAL_CAUSES,
      PersonnelStatus.OLD_AGE, PersonnelStatus.MEDICAL_COMPLICATIONS,
      PersonnelStatus.PREGNANCY_COMPLICATIONS, PersonnelStatus.UNDETERMINED,
      PersonnelStatus.SUICIDE, PersonnelStatus.BONDSREF, PersonnelStatus.SEPPUKU,
    ]);

    export function isAbsent(status: PersonnelStatus): boolean { return ABSENT_STATUSES.has(status); }
    export function isSalaryEligible(status: PersonnelStatus): boolean { return SALARY_ELIGIBLE.has(status); }
    export function isDead(status: PersonnelStatus): boolean { return DEAD_STATUSES.has(status); }
    export function isDepartedUnit(status: PersonnelStatus): boolean { return isDead(status) || DEPARTED_STATUSES.has(status); }
    export function isActiveFlexible(status: PersonnelStatus): boolean { return status === PersonnelStatus.ACTIVE || status === PersonnelStatus.CAMP_FOLLOWER; }
    ```

  **Parallelizable**: NO (depends on 13.1)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\enums\PersonnelStatus.java` — Behavioral methods

  **Acceptance Criteria**:
  - [ ] RED: Test ACTIVE is salary eligible
  - [ ] RED: Test POW is both absent AND salary eligible
  - [ ] RED: Test all 14 death statuses return isDead=true
  - [ ] RED: Test MIA is absent but NOT salary eligible
  - [ ] RED: Test RETIRED is departed but NOT dead
  - [ ] RED: Test WOUNDED is absent (MekStation-specific)
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement status behavioral rules`
  - Files: `src/lib/campaign/personnel/statusRules.ts`

---

- [ ] 13.3 Implement Status Transition Validator

  **What to do**:
  - Create `src/lib/campaign/personnel/statusTransitions.ts`:
    ```typescript
    export interface IStatusTransitionResult {
      readonly valid: boolean;
      readonly reason?: string;
      readonly sideEffects: readonly IStatusTransitionEffect[];
    }

    export type IStatusTransitionEffect =
      | { type: 'clear_unit_assignment' }
      | { type: 'clear_doctor_assignment' }
      | { type: 'clear_tech_jobs' }
      | { type: 'set_death_date'; date: string }
      | { type: 'set_retirement_date'; date: string }
      | { type: 'clear_retirement_date' }
      | { type: 'release_commander_flag' };

    export function validateStatusTransition(
      from: PersonnelStatus,
      to: PersonnelStatus
    ): IStatusTransitionResult;

    export function applyStatusTransition(
      person: IPerson,
      newStatus: PersonnelStatus,
      currentDate: string
    ): IPerson;
    ```
  - Key transition rules:
    - Dead → any active status: INVALID
    - Any → Dead: set dateOfDeath, clear assignments
    - Departed → Active: clear retirement date
    - Any → Departed: set retirement date, release commander flag
    - Active → any: VALID (most permissive)

  **Parallelizable**: NO (depends on 13.1, 13.2)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\Person.java:1450-1678` — Transition logic

  **Acceptance Criteria**:
  - [ ] RED: Test KIA → ACTIVE is invalid
  - [ ] RED: Test ACTIVE → KIA sets death date
  - [ ] RED: Test ACTIVE → RETIRED sets retirement date
  - [ ] RED: Test RETIRED → ACTIVE clears retirement date
  - [ ] RED: Test departure releases commander flag
  - [ ] RED: Test death clears all assignments
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement status transition validator with side effects`
  - Files: `src/lib/campaign/personnel/statusTransitions.ts`

---

- [ ] 13.4 Expand CampaignPersonnelRole Enum

  **What to do**:
  - Update `src/types/campaign/enums/CampaignPersonnelRole.ts`:
    ```typescript
    export enum CampaignPersonnelRole {
      // Combat (14)
      PILOT = 'Pilot',
      LAM_PILOT = 'LAM Pilot',
      AEROSPACE_PILOT = 'Aerospace Pilot',
      VEHICLE_DRIVER = 'Vehicle Driver',
      VEHICLE_CREW_NAVAL = 'Naval Vehicle Crew',
      VEHICLE_CREW_VTOL = 'VTOL Pilot',
      CONVENTIONAL_AIRCRAFT_PILOT = 'Conv. Aircraft Pilot',
      PROTOMEK_PILOT = 'ProtoMech Pilot',
      BATTLE_ARMOUR = 'Battle Armor',
      SOLDIER = 'Soldier',
      VESSEL_PILOT = 'Vessel Pilot',
      VESSEL_GUNNER = 'Vessel Gunner',
      VESSEL_CREW = 'Vessel Crew',
      VESSEL_NAVIGATOR = 'Vessel Navigator',

      // Support (11)
      TECH = 'Technician',          // legacy: Mech Tech
      MEK_TECH = 'Mech Tech',
      MECHANIC = 'Mechanic',
      AERO_TEK = 'Aero Tech',
      BA_TECH = 'BA Tech',
      ASTECH = 'AsTech',
      DOCTOR = 'Doctor',
      MEDIC = 'Medic',
      ADMIN_COMMAND = 'Admin (Command)',
      ADMIN_LOGISTICS = 'Admin (Logistics)',
      ADMIN_TRANSPORT = 'Admin (Transport)',
      ADMIN_HR = 'Admin (HR)',

      // Civilian (~20)
      NONE = 'None',
      DEPENDENT = 'Dependent',
      CIVILIAN_OTHER = 'Civilian',
      MERCHANT = 'Merchant',
      TEACHER = 'Teacher',
      LAWYER = 'Lawyer',
      MUSICIAN = 'Musician',
      CHEF = 'Chef',
      BARTENDER = 'Bartender',
      FIREFIGHTER = 'Firefighter',
      FARMER = 'Farmer',
      MINER = 'Miner',
      FACTORY_WORKER = 'Factory Worker',
      COURIER = 'Courier',
      GAMBLER = 'Gambler',
      HISTORIAN = 'Historian',
      PAINTER = 'Painter',
      RELIGIOUS_LEADER = 'Religious Leader',
      PSYCHOLOGIST = 'Psychologist',
      NOBLE = 'Noble',

      // Legacy
      ADMIN = 'Administrator',     // maps to ADMIN_COMMAND
      SUPPORT = 'Support Staff',   // maps to ASTECH
      UNASSIGNED = 'Unassigned',   // maps to NONE
    }

    export type RoleCategory = 'combat' | 'support' | 'civilian';

    export function getRoleCategory(role: CampaignPersonnelRole): RoleCategory;
    export function isCombatRole(role: CampaignPersonnelRole): boolean;
    export function isSupportRole(role: CampaignPersonnelRole): boolean;
    export function isCivilianRole(role: CampaignPersonnelRole): boolean;
    export function getRolesByCategory(category: RoleCategory): CampaignPersonnelRole[];
    ```

  **Must NOT do**:
  - Remove existing enum values (preserve backward compatibility)
  - Change string values of existing 10 roles

  **Parallelizable**: YES (with 13.1)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\enums\CampaignPersonnelRole.ts` — Current 10 values
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\enums\PersonnelRole.java` — 300+ roles

  **Acceptance Criteria**:
  - [ ] RED: Test 14 combat roles
  - [ ] RED: Test 11 support roles (+ legacy ADMIN/SUPPORT)
  - [ ] RED: Test ~20 civilian roles
  - [ ] RED: Test getRoleCategory returns correct category
  - [ ] RED: Test existing 10 roles still valid
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): expand CampaignPersonnelRole with categories`
  - Files: `src/types/campaign/enums/CampaignPersonnelRole.ts`

---

- [ ] 13.5 Implement Role-to-Salary Base Mapping

  **What to do**:
  - Create `src/lib/campaign/personnel/roleSalaries.ts`:
    ```typescript
    // Monthly base salary in C-bills per role (MekHQ defaults)
    export const BASE_SALARY_BY_ROLE: Record<CampaignPersonnelRole, number> = {
      [CampaignPersonnelRole.PILOT]: 1500,
      [CampaignPersonnelRole.AEROSPACE_PILOT]: 1500,
      [CampaignPersonnelRole.VEHICLE_DRIVER]: 900,
      [CampaignPersonnelRole.TECH]: 800,
      [CampaignPersonnelRole.MEK_TECH]: 800,
      [CampaignPersonnelRole.DOCTOR]: 1200,
      [CampaignPersonnelRole.MEDIC]: 600,
      [CampaignPersonnelRole.ADMIN_COMMAND]: 700,
      [CampaignPersonnelRole.ADMIN_HR]: 700,
      [CampaignPersonnelRole.SOLDIER]: 600,
      [CampaignPersonnelRole.DEPENDENT]: 0,
      [CampaignPersonnelRole.NONE]: 0,
      // ... all roles
    };

    export function getRoleBaseSalary(role: CampaignPersonnelRole): number {
      return BASE_SALARY_BY_ROLE[role] ?? 500; // Default fallback
    }
    ```
  - Integrate with Plan 4's salary calculation (replace flat DEFAULT_DAILY_SALARY)

  **Parallelizable**: NO (depends on 13.4)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\Person.java:4662-4739` — Salary calculation

  **Acceptance Criteria**:
  - [ ] RED: Test Pilot base salary = 1500
  - [ ] RED: Test Dependent salary = 0
  - [ ] RED: Test unknown role returns fallback
  - [ ] RED: Test every role has a defined salary
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement role-based salary mapping`
  - Files: `src/lib/campaign/personnel/roleSalaries.ts`

---

- [ ] 13.6 Update Personnel UI for Expanded Statuses and Roles

  **What to do**:
  - Update status display with color coding by severity (green/yellow/red/gray)
  - Role selection dropdown grouped by category (Combat/Support/Civilian)
  - Status transition actions in personnel context menu (with validation)
  - Death cause selection when transitioning to dead status
  - Salary display updated to use role-based amounts

  **Parallelizable**: NO (depends on 13.3, 13.5)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard

  **Acceptance Criteria**:
  - [ ] Status shows with severity color
  - [ ] Role dropdown grouped by category
  - [ ] Status transition validates before applying
  - [ ] Death cause selection works
  - [ ] Manual verification: dev server → personnel → change status → verify transition

  **Commit**: YES
  - Message: `feat(ui): update personnel view for expanded statuses and roles`
  - Files: updated personnel components

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 13.1 | `feat(campaign): expand PersonnelStatus to 37 values` | `npm test` |
| 13.2 | `feat(campaign): implement status behavioral rules` | `npm test` |
| 13.3 | `feat(campaign): implement status transition validator` | `npm test` |
| 13.4 | `feat(campaign): expand CampaignPersonnelRole with categories` | `npm test` |
| 13.5 | `feat(campaign): implement role-based salary mapping` | `npm test` |
| 13.6 | `feat(ui): update personnel view` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [ ] 37 status values (36 MekHQ + WOUNDED)
- [ ] 5 status behavioral helpers
- [ ] Status transition validation with side effects
- [ ] ~45 role values in 3 categories
- [ ] Role-to-salary mapping
- [ ] Existing 10 statuses/roles still work
- [ ] All existing tests pass

---

## Migration Notes

- New statuses are additive — existing ACTIVE/MIA/KIA/etc. string values unchanged
- New roles are additive — existing PILOT/TECH/DOCTOR/etc. string values unchanged
- Legacy roles (ADMIN, SUPPORT, UNASSIGNED) preserved for backward compatibility
- Existing persons with old statuses/roles continue working without migration
- New behavioral helpers (isAbsent, isSalaryEligible, etc.) can be used by Plans 2, 4, 13 immediately
- Status transition validator is optional — callers can set status directly if needed
- WOUNDED is MekStation-specific (not in MekHQ) — kept for simplicity

---

*Plan generated by Prometheus. Execute with `/start-work`.*
