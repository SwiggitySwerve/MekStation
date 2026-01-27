# Skills Expansion

> **✅ COMPLETED** — Implemented, merged, and archived. PR #173.

## Context

### Original Request
Expand MekStation's skill system from 2 skills (gunnery, piloting) to 40+ skill types matching MekHQ. Add a skill catalog, skill check resolution, and skill cost tables. Skills like Administration, Negotiation, Leadership, Medicine, and Tech are used by other campaign systems (turnover, repair, financial, medical).

### Interview Summary
**Key Discussions**:
- Current ISkillType and ISkill interfaces are well-designed — extend, don't replace
- Existing getSkillValue() function is correct — keep
- Need skill catalog (constant data object defining all 40+ skills)
- Skill check: 2d6 vs TN (skill value + modifiers), injectable RandomFn
- Skill costs: base cost per level × multipliers (XP cost multiplier, trait modifiers)
- Many other plans depend on this: Plan 2 (turnover needs skills), Plan 3 (repair needs Tech), Plan 4 (financial needs Admin), Plan 8 (medical needs Medicine)
- TDD approach

**Research Findings**:
- `ISkillType` (97 lines): id, name, description, targetNumber, costs[10], linkedAttribute
- `ISkill` (134 lines): level 0-10, bonus, xpProgress, typeId
- `IAttributes` (72 lines): 8 attributes with getAttributeModifier()
- `ExperienceLevel` (63 lines): Green/Regular/Veteran/Elite with thresholds
- `getSkillValue(skill, skillType, attributes)` already implemented
- Only 2 skill types populated: gunnery and piloting (hardcoded in person creation)

### Metis Review
**Identified Gaps** (addressed):
- Skill check resolution needs injectable random for testing
- Default skill values for new personnel based on experience level
- Skill cost formula must account for attribute modifier
- Some skills are "countable" (# of kills = skill level) vs "trainable" (XP spend)
- Personnel with no skill use TN 10+ (unskilled penalty, not auto-fail)
- Skill prerequisites (e.g., Tech/Mech requires basic Tech)

---

## Work Objectives

### Core Objective
Build a comprehensive skill catalog with 40+ skill types, skill check resolution, and XP-based progression that other campaign systems can query for modifier values.

### Concrete Deliverables
- `src/types/campaign/skills/skillCatalog.ts` — All 40+ skill type definitions
- `src/lib/campaign/skills/skillCheck.ts` — Skill check resolution
- `src/lib/campaign/skills/skillProgression.ts` — XP costs and level-up
- `src/lib/campaign/skills/defaultSkills.ts` — Default skill assignment by role/level
- Updated person creation with role-appropriate skills

### Definition of Done
- [x] 40+ skill types defined in catalog with costs, linked attributes, target numbers
- [x] Skill check: 2d6 vs TN with modifiers, injectable random
- [x] Skill progression: XP cost table per level with trait multipliers
- [x] Default skill assignment: new personnel get role-appropriate skills at experience level
- [x] Helper functions: getSkillForPerson(), hasSkill(), getEffectiveSkillLevel()

### Must Have
- Skill catalog with 40+ types (see list below)
- Skill check resolution (2d6 vs TN)
- XP cost per level (10-element cost array per skill type)
- Default skills by CampaignPersonnelRole
- Unskilled penalty (TN 10+ for missing skill)
- Skill-based modifier helpers for other plans

### Must NOT Have (Guardrails)
- Skill training day processor (defer to Plan 10: Personnel Progression)
- Aging effects on skills (defer to Plan 10)
- SPA/ability prerequisites (defer to Plan 10)
- Skill specializations/sub-skills beyond basic catalog
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
7.1 (Skill catalog) → 7.2 (Skill check) → 7.3 (Skill progression) → 7.4 (Default skills) → 7.5 (Helper functions) → 7.6 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 7.1 | Foundation — all others depend on catalog |
| B | 7.2, 7.3 | Check and progression are independent once catalog exists |

| Task | Depends On | Reason |
|------|------------|--------|
| 7.2 | 7.1 | Check needs skill types |
| 7.3 | 7.1 | Progression needs cost arrays |
| 7.4 | 7.1 | Default assignment needs catalog |
| 7.5 | 7.1, 7.2 | Helpers need catalog + check |
| 7.6 | 7.5 | UI needs everything |

---

## TODOs

- [x] 7.1 Define Skill Catalog with 40+ Skill Types

  **What to do**:
  - Create `src/types/campaign/skills/skillCatalog.ts`
  - Define all skill types using the existing `ISkillType` interface:
    ```typescript
    export const SKILL_CATALOG: Record<string, ISkillType> = {
      // Combat Skills
      'gunnery': { id: 'gunnery', name: 'Gunnery', description: 'Ranged weapon accuracy', targetNumber: 7, costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120], linkedAttribute: 'REF' },
      'piloting': { id: 'piloting', name: 'Piloting', description: 'BattleMech/vehicle handling', targetNumber: 7, costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120], linkedAttribute: 'DEX' },
      'gunnery-aerospace': { id: 'gunnery-aerospace', name: 'Gunnery/Aerospace', description: 'Aerospace weapon systems', targetNumber: 7, costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120], linkedAttribute: 'REF' },
      'piloting-aerospace': { id: 'piloting-aerospace', name: 'Piloting/Aerospace', description: 'Aerospace craft handling', targetNumber: 7, costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120], linkedAttribute: 'DEX' },
      'gunnery-vehicle': { id: 'gunnery-vehicle', name: 'Gunnery/Vehicle', description: 'Vehicle weapon systems', targetNumber: 7, costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120], linkedAttribute: 'REF' },
      'driving': { id: 'driving', name: 'Driving', description: 'Ground vehicle operation', targetNumber: 7, costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120], linkedAttribute: 'DEX' },
      'gunnery-ba': { id: 'gunnery-ba', name: 'Gunnery/Battle Armor', description: 'Battle armor weapons', targetNumber: 7, costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120], linkedAttribute: 'REF' },
      'anti-mek': { id: 'anti-mek', name: 'Anti-Mech', description: 'Infantry anti-Mech tactics', targetNumber: 7, costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120], linkedAttribute: 'DEX' },
      'small-arms': { id: 'small-arms', name: 'Small Arms', description: 'Personal firearms', targetNumber: 7, costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60], linkedAttribute: 'REF' },
      'artillery': { id: 'artillery', name: 'Artillery', description: 'Long-range artillery systems', targetNumber: 7, costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120], linkedAttribute: 'INT' },
      'tactics': { id: 'tactics', name: 'Tactics', description: 'Combat tactics and strategy', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'INT' },

      // Technical Skills
      'tech-mech': { id: 'tech-mech', name: 'Tech/Mech', description: 'BattleMech maintenance and repair', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'DEX' },
      'tech-aero': { id: 'tech-aero', name: 'Tech/Aero', description: 'Aerospace maintenance', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'DEX' },
      'tech-mechanic': { id: 'tech-mechanic', name: 'Tech/Mechanic', description: 'Vehicle maintenance', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'DEX' },
      'tech-ba': { id: 'tech-ba', name: 'Tech/BA', description: 'Battle armor maintenance', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'DEX' },
      'tech-vessel': { id: 'tech-vessel', name: 'Tech/Vessel', description: 'DropShip/JumpShip maintenance', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'DEX' },
      'astech': { id: 'astech', name: 'AsTech', description: 'Technical assistant work', targetNumber: 7, costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60], linkedAttribute: 'DEX' },

      // Medical Skills
      'medicine': { id: 'medicine', name: 'Medicine', description: 'Medical treatment and surgery', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'INT' },
      'medtech': { id: 'medtech', name: 'MedTech', description: 'Field medical assistance', targetNumber: 7, costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60], linkedAttribute: 'INT' },
      'veterinary': { id: 'veterinary', name: 'Veterinary Medicine', description: 'Animal care (beast-mounted infantry)', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'INT' },

      // Administrative Skills
      'administration': { id: 'administration', name: 'Administration', description: 'Organizational management and logistics', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'INT' },
      'negotiation': { id: 'negotiation', name: 'Negotiation', description: 'Contract and deal negotiation', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'CHA' },
      'leadership': { id: 'leadership', name: 'Leadership', description: 'Unit command and morale management', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'CHA' },
      'strategy': { id: 'strategy', name: 'Strategy', description: 'Long-term strategic planning', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'INT' },
      'communications': { id: 'communications', name: 'Communications', description: 'Electronic warfare and signals', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'INT' },

      // Physical Skills
      'melee': { id: 'melee', name: 'Melee Combat', description: 'Hand-to-hand and melee weapons', targetNumber: 7, costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60], linkedAttribute: 'STR' },
      'stealth': { id: 'stealth', name: 'Stealth', description: 'Covert movement and concealment', targetNumber: 7, costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60], linkedAttribute: 'DEX' },
      'survival': { id: 'survival', name: 'Survival', description: 'Wilderness survival', targetNumber: 7, costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60], linkedAttribute: 'BOD' },
      'tracking': { id: 'tracking', name: 'Tracking', description: 'Target tracking and pursuit', targetNumber: 7, costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60], linkedAttribute: 'INT' },
      'demolitions': { id: 'demolitions', name: 'Demolitions', description: 'Explosives handling', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'INT' },
      'zero-g': { id: 'zero-g', name: 'Zero-G Operations', description: 'Microgravity maneuvers', targetNumber: 7, costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60], linkedAttribute: 'DEX' },

      // Knowledge Skills
      'computers': { id: 'computers', name: 'Computers', description: 'Computer systems and hacking', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'INT' },
      'navigation': { id: 'navigation', name: 'Navigation', description: 'Interstellar and planetary navigation', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'INT' },
      'sensor-operations': { id: 'sensor-operations', name: 'Sensor Operations', description: 'Sensor and scanning systems', targetNumber: 7, costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60], linkedAttribute: 'INT' },
      'protocol': { id: 'protocol', name: 'Protocol/Etiquette', description: 'Formal diplomatic conduct', targetNumber: 7, costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60], linkedAttribute: 'CHA' },
      'interest': { id: 'interest', name: 'Interest', description: 'Hobby or academic knowledge', targetNumber: 7, costs: [0, 2, 4, 6, 8, 10, 14, 18, 24, 32, 40], linkedAttribute: 'INT' },
      'language': { id: 'language', name: 'Language', description: 'Foreign language proficiency', targetNumber: 7, costs: [0, 2, 4, 6, 8, 10, 14, 18, 24, 32, 40], linkedAttribute: 'INT' },
      'training': { id: 'training', name: 'Training', description: 'Ability to train others', targetNumber: 7, costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150], linkedAttribute: 'CHA' },
      'scrounge': { id: 'scrounge', name: 'Scrounge', description: 'Finding and acquiring supplies', targetNumber: 7, costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60], linkedAttribute: 'CHA' },
    };
    ```
  - Export helper functions:
    ```typescript
    export function getSkillType(id: string): ISkillType | undefined;
    export function getSkillsByCategory(category: string): ISkillType[];
    export function getAllSkillTypes(): ISkillType[];
    export const SKILL_CATEGORIES = ['combat', 'technical', 'medical', 'administrative', 'physical', 'knowledge'] as const;
    ```

  **Must NOT do**:
  - Modify existing ISkillType interface
  - Add skill specialization trees
  - Implement training logic (that's Plan 10)

  **Parallelizable**: YES (foundation task)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\skills\ISkillType.ts` — Existing ISkillType interface
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\SkillType.java` — MekHQ skill type definitions
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\DefaultSkills.java` — MekHQ default skills

   **Acceptance Criteria**:
   - [x] RED: Test catalog has 40+ skill types
   - [x] RED: Test every skill type has valid costs[10] array
   - [x] RED: Test every skill type has valid linkedAttribute
   - [x] RED: Test getSkillType('gunnery') returns correct definition
   - [x] RED: Test getSkillsByCategory('combat') returns 11 skills
   - [x] GREEN: All tests pass
   - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define 40+ skill types in skill catalog`
  - Files: `src/types/campaign/skills/skillCatalog.ts`

---

- [x] 7.2 Implement Skill Check Resolution

  **What to do**:
  - Create `src/lib/campaign/skills/skillCheck.ts`:
    ```typescript
    export type RandomFn = () => number;

    export interface SkillCheckResult {
      readonly roll: number;             // 2d6 result
      readonly targetNumber: number;     // TN to meet/exceed
      readonly margin: number;           // roll - TN
      readonly success: boolean;         // roll >= TN
      readonly criticalSuccess: boolean; // margin >= 4
      readonly criticalFailure: boolean; // margin <= -4
      readonly modifiers: readonly { name: string; value: number }[];
    }

    export function performSkillCheck(
      person: IPerson,
      skillId: string,
      modifiers: readonly { name: string; value: number }[],
      random: RandomFn
    ): SkillCheckResult;

    export function getEffectiveSkillTN(
      person: IPerson,
      skillId: string,
      modifiers?: readonly { name: string; value: number }[]
    ): number;
    ```
  - Logic:
    1. Look up skill on person: `person.skills[skillId]`
    2. If missing: use unskilled TN (base TN + 4 penalty = typically 11)
    3. Calculate effective TN: `getSkillValue(skill, skillType, person.attributes) + sum(modifiers)`
    4. Roll 2d6
    5. Success if roll >= TN
  - Note: Lower TN is better (skilled person has lower TN)

  **Must NOT do**:
  - Edge point spending (defer)
  - Opposed skill checks (defer)

  **Parallelizable**: YES (with 7.3)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\skills\ISkill.ts:106-133` — getSkillValue()
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\Skill.java` — MekHQ skill check
  - `E:\Projects\MekStation\src\lib\campaign\contractMarket.ts:114` — RandomFn pattern

   **Acceptance Criteria**:
   - [x] RED: Test skilled person (gunnery 4) has lower TN than unskilled
   - [x] RED: Test unskilled penalty adds +4 to base TN
   - [x] RED: Test modifiers add/subtract from TN
   - [x] RED: Test critical success at margin >= 4
   - [x] RED: Test deterministic with seeded random
   - [x] GREEN: All tests pass
   - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement skill check resolution with 2d6 vs TN`
  - Files: `src/lib/campaign/skills/skillCheck.ts`

---

- [x] 7.3 Implement Skill Progression and XP Costs

  **What to do**:
  - Create `src/lib/campaign/skills/skillProgression.ts`:
    ```typescript
    export function getSkillImprovementCost(
      skillId: string,
      currentLevel: number,
      person: IPerson,
      options: ICampaignOptions
    ): number {
      const skillType = getSkillType(skillId);
      if (!skillType) return Infinity;
      const baseCost = skillType.costs[currentLevel + 1] ?? Infinity;
      const xpMultiplier = options.xpCostMultiplier ?? 1.0;
      const attrMod = getAttributeModifier(person.attributes[skillType.linkedAttribute]);
      // MekHQ: cost adjusted by attribute modifier
      return Math.max(1, Math.round(baseCost * xpMultiplier * (1 - attrMod * 0.05)));
    }

    export function canImproveSkill(person: IPerson, skillId: string, options: ICampaignOptions): boolean;
    export function improveSkill(person: IPerson, skillId: string, options: ICampaignOptions): IPerson;
    export function addSkill(person: IPerson, skillId: string, initialLevel: number): IPerson;
    ```

  **Must NOT do**:
  - Trait modifiers (Fast Learner, Slow Learner) — defer to Plan 10
  - Aging-based skill decay — defer to Plan 10

  **Parallelizable**: YES (with 7.2)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:437-452` — Skill cost formula
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\Skill.java` — MekHQ costs

   **Acceptance Criteria**:
   - [x] RED: Test gunnery level 3→4 costs 16 XP (from catalog)
   - [x] RED: Test high attribute reduces cost (DEX 8 for piloting)
   - [x] RED: Test can't improve beyond level 10
   - [x] RED: Test can't improve without enough XP
   - [x] RED: Test improveSkill deducts XP and increments level
   - [x] GREEN: All tests pass
   - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement skill progression with XP costs`
  - Files: `src/lib/campaign/skills/skillProgression.ts`

---

- [x] 7.4 Define Default Skills by Role and Experience Level

  **What to do**:
  - Create `src/lib/campaign/skills/defaultSkills.ts`:
    ```typescript
    export interface IDefaultSkillSet {
      readonly skills: Record<string, number>; // skillId → level
    }

    export const DEFAULT_SKILLS_BY_ROLE: Record<CampaignPersonnelRole, IDefaultSkillSet> = {
      [CampaignPersonnelRole.PILOT]: { skills: { 'gunnery': 4, 'piloting': 5 } },
      [CampaignPersonnelRole.AEROSPACE_PILOT]: { skills: { 'gunnery-aerospace': 4, 'piloting-aerospace': 5 } },
      [CampaignPersonnelRole.VEHICLE_DRIVER]: { skills: { 'gunnery-vehicle': 4, 'driving': 5 } },
      [CampaignPersonnelRole.TECH]: { skills: { 'tech-mech': 5 } },
      [CampaignPersonnelRole.DOCTOR]: { skills: { 'medicine': 5 } },
      [CampaignPersonnelRole.ADMIN]: { skills: { 'administration': 5 } },
      [CampaignPersonnelRole.MEDIC]: { skills: { 'medtech': 5 } },
      [CampaignPersonnelRole.SUPPORT]: { skills: { 'astech': 5, 'administration': 7 } },
      [CampaignPersonnelRole.SOLDIER]: { skills: { 'small-arms': 5, 'anti-mek': 7 } },
      [CampaignPersonnelRole.UNASSIGNED]: { skills: {} },
    };

    // Experience level adjusts default skill levels
    export const EXPERIENCE_SKILL_MODIFIER: Record<ExperienceLevel, number> = {
      [ExperienceLevel.GREEN]: +1,    // Worse (higher TN)
      [ExperienceLevel.REGULAR]: 0,   // Default
      [ExperienceLevel.VETERAN]: -1,  // Better (lower TN)
      [ExperienceLevel.ELITE]: -2,    // Best
    };

    export function createDefaultSkills(role: CampaignPersonnelRole, level: ExperienceLevel): Record<string, ISkill>;
    ```

  **Parallelizable**: NO (depends on 7.1)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\enums\CampaignPersonnelRole.ts` — 10 roles
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\DefaultSkills.java` — MekHQ defaults

   **Acceptance Criteria**:
   - [x] RED: Test PILOT gets gunnery + piloting at default levels
   - [x] RED: Test TECH gets tech-mech skill
   - [x] RED: Test GREEN experience adds +1 to skill values
   - [x] RED: Test ELITE experience subtracts -2 from skill values
   - [x] GREEN: All tests pass
   - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define default skills by role and experience level`
  - Files: `src/lib/campaign/skills/defaultSkills.ts`

---

- [x] 7.5 Create Skill Helper Functions for Other Plans

  **What to do**:
  - Create `src/lib/campaign/skills/skillHelpers.ts`:
    ```typescript
    // Used by Plan 2 (Turnover) — skill desirability modifier
    export function getSkillDesirabilityModifier(person: IPerson): number;

    // Used by Plan 3 (Repair) — tech skill value
    export function getTechSkillValue(person: IPerson): number;

    // Used by Plan 4 (Financial) — admin skill for HR
    export function getAdminSkillValue(person: IPerson): number;

    // Used by Plan 8 (Medical) — medicine skill value
    export function getMedicineSkillValue(person: IPerson): number;

    // Used by Plan 9 (Acquisition) — negotiation modifier
    export function getNegotiationModifier(person: IPerson): number;

    // Used by Plan 15 (Ranks) — leadership skill
    export function getLeadershipSkillValue(person: IPerson): number;

    // Generic helpers
    export function hasSkill(person: IPerson, skillId: string): boolean;
    export function getPersonSkillLevel(person: IPerson, skillId: string): number; // -1 if missing
    export function getPersonBestCombatSkill(person: IPerson): { skillId: string; level: number } | null;
    ```

  **Parallelizable**: NO (depends on 7.1, 7.2)

  **References**:
  - Plans 2, 3, 4, 8, 9, 15 — cross-plan skill dependencies
  - `E:\Projects\MekStation\src\types\campaign\Person.ts` — IPerson.skills

   **Acceptance Criteria**:
   - [x] RED: Test getTechSkillValue returns skill value for person with Tech skill
   - [x] RED: Test getTechSkillValue returns 10 (unskilled) for person without Tech
   - [x] RED: Test hasSkill returns true/false correctly
   - [x] RED: Test getPersonBestCombatSkill finds highest combat skill
   - [x] GREEN: All tests pass
   - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add skill helper functions for cross-plan integration`
  - Files: `src/lib/campaign/skills/skillHelpers.ts`

---

- [x] 7.6 Create Skills Management UI

  **What to do**:
  - Create `src/components/campaign/SkillsPanel.tsx` — Skills display for personnel detail view:
    - List all skills with level, TN, XP to next level
    - Group by category (combat, technical, medical, etc.)
    - Improve button (spend XP to level up)
    - Add skill dropdown (learn new skill)
  - Create `src/components/campaign/SkillCheckDialog.tsx` — Manual skill check UI:
    - Select skill, add modifiers, roll, show result
  - Integrate into personnel detail page

  **Must NOT do**:
  - Skill training scheduler (defer)
  - Batch skill improvement
  - Skill tree visualization

  **Parallelizable**: NO (depends on 7.5)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard

   **Acceptance Criteria**:
   - [x] Skills panel shows all person's skills with levels
   - [x] Improve button deducts XP and shows new level
   - [x] Add skill dropdown shows available skills
   - [x] Skill check dialog shows roll result with modifiers
   - [x] Manual verification: dev server → personnel → skills → improve → verify

  **Commit**: YES
  - Message: `feat(ui): add skills management panel and check dialog`
  - Files: `src/components/campaign/SkillsPanel.tsx`, `src/components/campaign/SkillCheckDialog.tsx`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 7.1 | `feat(campaign): define 40+ skill types in catalog` | `npm test` |
| 7.2 | `feat(campaign): implement skill check with 2d6 vs TN` | `npm test` |
| 7.3 | `feat(campaign): implement skill progression with XP` | `npm test` |
| 7.4 | `feat(campaign): define default skills by role/level` | `npm test` |
| 7.5 | `feat(campaign): add skill helpers for cross-plan use` | `npm test` |
| 7.6 | `feat(ui): add skills management UI` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [x] 40+ skill types defined with costs and linked attributes
- [x] Skill check: 2d6 vs TN with modifiers
- [x] XP costs calculated with attribute adjustment
- [x] Default skills assigned by role and experience level
- [x] Helper functions available for Plans 2, 3, 4, 8, 9, 15
- [x] Skills UI shows levels, allows improvement

---

## Migration Notes

- Existing `gunnery` and `piloting` skills preserved (same IDs in catalog)
- New skills are OPTIONAL on IPerson — persons without them use unskilled TN
- Existing personnel keep their 2 skills, new skills added as they're used
- No migration needed for saved campaigns — new skills added organically

---

*Plan generated by Prometheus. Execute with `/start-work`.*
