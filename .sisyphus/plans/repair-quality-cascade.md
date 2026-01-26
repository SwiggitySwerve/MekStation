# Repair Quality Cascade System

## Context

### Original Request
Implement MekHQ's equipment quality grade system (A-F) and maintenance failure cascade. Quality grades affect repair target numbers, creating a feedback loop: bad quality → harder maintenance → more failures → worse quality. This makes maintenance meaningful rather than cosmetic.

### Interview Summary
**Key Discussions**:
- Exact MekHQ formulas for repair TN and maintenance checks
- Quality grades A-F are SEPARATE from existing condition (0-1.0) — condition = current damage, quality = maintenance grade
- Existing repair system is fully built (698 lines of types, 645 lines of store) — extend, don't replace
- No tech skill checks exist yet — add tech skill modifier to repair TN
- Maintenance cycle is configurable (days between checks)
- TDD approach, injectable RandomFn for maintenance rolls

**Research Findings**:
- `src/types/repair/RepairInterfaces.ts` — 698 lines, complete repair system with jobs, bays, salvage
- `src/stores/useRepairStore.ts` — 645 lines, Zustand store with job queue
- `src/types/campaign/skills/ISkill.ts` — Skill system exists but no "Tech" skill type defined
- `src/types/campaign/Person.ts` — `CampaignPersonnelRole.TECH` exists, `techUnitIds` assignment field exists
- NO quality grades (A-F) anywhere in codebase
- NO maintenance skill checks
- Existing repair costs use armor/structure type modifiers but not quality modifiers
- Target: `src/types/campaign/Campaign.ts` ICampaign

### Metis Review
**Identified Gaps** (addressed):
- Quality grades OPTIONAL on existing types (backward compatible, default to 'D')
- Don't replace condition (0-1.0) field — quality is separate concept
- Quality floor is A (worst — can't degrade further; critical failures cause additional damage)
- Quality ceiling is F (best — can't improve further)
- Quality improvement possible via successful maintenance (move toward F)
- New units start at quality D (standard), salvaged at C (below average)
- Multiple consecutive failures cascade one grade at a time (no skipping)
- MRMS priority order preserved

---

## Work Objectives

### Core Objective
Add equipment quality grades (A-F) to the campaign system with maintenance skill checks that create a meaningful feedback loop: poor maintenance degrades quality, making future maintenance harder.

### Concrete Deliverables
- `src/types/campaign/quality/` — Quality types and enums
- `src/lib/campaign/maintenance/` — Maintenance check logic
- `src/lib/campaign/processors/maintenanceProcessor.ts` — Day pipeline processor
- Updated repair interfaces with quality modifiers
- Updated Person/Skills with Tech skill type
- UI for quality indicators and maintenance reports

### Definition of Done
- [ ] Quality enum A-F with TN modifiers (+3 to -2)
- [ ] Maintenance check: 2d6 >= TN (tech skill + quality + modifiers)
- [ ] Failed check degrades quality by one grade
- [ ] Successful check can improve quality by one grade (margin >= threshold)
- [ ] Quality affects repair TN (cascade effect)
- [ ] Tech skill type defined and usable
- [ ] Day processor runs maintenance on configurable cycle
- [ ] Existing repair jobs still work unchanged

### Must Have
- PartQuality enum: A, B, C, D, E, F with TN modifiers
- Maintenance check with 2d6 vs TN
- Quality degradation on failure, improvement on high success
- Tech skill integration with repair TN
- Maintenance day processor
- Quality display on unit cards

### Must NOT Have (Guardrails)
- New parts inventory system (quality attaches to existing units)
- Parts marketplace
- Complex tech specialization trees (stub with single "Tech" skill)
- MRMS rewrite (extend, don't replace)
- Replace condition (0-1.0) field (quality is separate)
- Import from `CampaignInterfaces.ts`
- Modification of existing RepairInterfaces core types (extend only)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: TDD
- **Framework**: Jest

---

## Task Flow

```
3.1 (Quality types) → 3.2 (Maintenance check) → 3.3 (Tech skill) → 3.4 (Quality integration) → 3.5 (Day processor) → 3.6 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 3.1, 3.3 | Quality enum and Tech skill are independent |

| Task | Depends On | Reason |
|------|------------|--------|
| 3.2 | 3.1 | Maintenance check needs quality enum |
| 3.4 | 3.2, 3.3 | Integration needs check + tech skill |
| 3.5 | 3.4 | Processor needs integrated system |
| 3.6 | 3.5 | UI needs everything working |

---

## TODOs

- [ ] 3.1 Define Quality Types and Enum

  **What to do**:
  - Create `src/types/campaign/quality/PartQuality.ts`:
    ```typescript
    export enum PartQuality {
      A = 'A',  // Worst quality (hardest to maintain, TN +3)
      B = 'B',  // Poor quality
      C = 'C',  // Below average
      D = 'D',  // Standard/default
      E = 'E',  // Good quality
      F = 'F',  // Best quality (easiest to maintain, TN -2)
    }

    export const QUALITY_TN_MODIFIER: Record<PartQuality, number> = {
      [PartQuality.A]: +3,  // Worst quality = hardest maintenance (feedback loop!)
      [PartQuality.B]: +2,
      [PartQuality.C]: +1,
      [PartQuality.D]: 0,   // Standard = no modifier
      [PartQuality.E]: -1,
      [PartQuality.F]: -2,  // Best quality = easiest maintenance
    };

    export const QUALITY_ORDER: readonly PartQuality[] = [
      PartQuality.A, PartQuality.B, PartQuality.C,
      PartQuality.D, PartQuality.E, PartQuality.F,
    ];

    export function degradeQuality(quality: PartQuality): PartQuality;
    export function improveQuality(quality: PartQuality): PartQuality;
    export function getQualityDisplayName(quality: PartQuality): string;
    export function getQualityColor(quality: PartQuality): string;
    ```
  - Create `src/types/campaign/quality/IUnitQuality.ts`:
    ```typescript
    export interface IUnitQuality {
      readonly unitId: string;
      readonly quality: PartQuality;
      readonly lastMaintenanceDate?: Date;
      readonly maintenanceHistory: readonly IMaintenanceRecord[];
    }

    export interface IMaintenanceRecord {
      readonly date: Date;
      readonly techId?: string;
      readonly roll: number;
      readonly targetNumber: number;
      readonly margin: number;
      readonly outcome: 'success' | 'failure' | 'critical_success' | 'critical_failure';
      readonly qualityBefore: PartQuality;
      readonly qualityAfter: PartQuality;
    }
    ```
  - Define maintenance TN thresholds:
    ```typescript
    export const MAINTENANCE_THRESHOLDS = {
      QUALITY_IMPROVE_MARGIN: 4,    // Margin >= 4 = improve quality
      QUALITY_DEGRADE_MARGIN: -3,   // Margin <= -3 = degrade quality
      CRITICAL_FAILURE_MARGIN: -6,  // Margin <= -6 = additional damage
    };
    ```

  **CRITICAL NOTE — Quality Direction**:
  In MekHQ, **A is WORST quality, F is BEST quality**. This is counterintuitive but matches MekHQ's
  `PartQuality.java` enum (ordinal 0=A through 5=F, higher = better). The feedback loop works because:
  - Equipment degrades TOWARD A (worst) — harder maintenance TN (+3) — more failures — more degradation
  - Equipment improves TOWARD F (best) — easier maintenance TN (-2) — more successes — stays good
  - `degradeQuality()` moves toward A (lower ordinal)
  - `improveQuality()` moves toward F (higher ordinal)

  **Must NOT do**:
  - Per-part quality tracking (apply to whole unit for simplicity)
  - Complex damage tables for critical failures

  **Parallelizable**: YES (with 3.3)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:122-168` — Repair/maintenance modifier formulas
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\parts\enums\PartQuality.java` — MekHQ quality enum (A=0 worst, F=5 best)
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\Maintenance.java:267-496` — Maintenance check logic

  **Acceptance Criteria**:
  - [ ] RED: Test `PartQuality.A` has TN modifier +3 (worst quality, hardest maintenance)
  - [ ] RED: Test `degradeQuality(PartQuality.D)` returns `PartQuality.C` (toward A/worst)
  - [ ] RED: Test `degradeQuality(PartQuality.A)` returns `PartQuality.A` (floor — already worst)
  - [ ] RED: Test `improveQuality(PartQuality.D)` returns `PartQuality.E` (toward F/best)
  - [ ] RED: Test `improveQuality(PartQuality.F)` returns `PartQuality.F` (ceiling — already best)
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define part quality grades A-F with maintenance thresholds`
  - Files: `src/types/campaign/quality/*.ts`

---

- [ ] 3.2 Implement Maintenance Check Logic

  **What to do**:
  - Create `src/lib/campaign/maintenance/maintenanceCheck.ts`:
    ```typescript
    export interface MaintenanceCheckInput {
      readonly unitId: string;
      readonly quality: PartQuality;
      readonly techSkillValue: number;     // Tech's effective skill value
      readonly modePenalty: number;         // Rush=+1, Normal=0, Extra Time=-1
      readonly quirksModifier: number;     // Unit quirks modifier
      readonly overtimeModifier: number;   // +3 if overtime
      readonly shorthandedModifier: number; // Based on available AsTech support
    }

    export interface MaintenanceCheckResult {
      readonly unitId: string;
      readonly roll: number;
      readonly targetNumber: number;
      readonly margin: number;             // roll - targetNumber
      readonly outcome: 'success' | 'failure' | 'critical_success' | 'critical_failure';
      readonly qualityBefore: PartQuality;
      readonly qualityAfter: PartQuality;
      readonly modifierBreakdown: readonly { name: string; value: number }[];
    }

    export function calculateMaintenanceTN(input: MaintenanceCheckInput): number;
    export function performMaintenanceCheck(
      input: MaintenanceCheckInput,
      random: RandomFn
    ): MaintenanceCheckResult;
    ```
  - TN Formula (exact MekHQ):
    ```
    TN = techSkillValue + QUALITY_TN_MODIFIER[quality] + modePenalty + quirksModifier + overtimeModifier + shorthandedModifier
    ```
  - Stub modifiers (not yet available):
    ```typescript
    /** @stub Returns 0. Needs era system. */
    export function getEraModifier(_campaign: ICampaign): number { return 0; }
    /** @stub Returns 0. Needs planetary system. */
    export function getPlanetaryModifier(_campaign: ICampaign): number { return 0; }
    /** @stub Returns 0. Needs tech specialization system. */
    export function getTechSpecialtiesModifier(_tech: IPerson): number { return 0; }
    ```
  - Outcome determination:
    - `margin >= QUALITY_IMPROVE_MARGIN(4)` → quality improves toward F (better), `critical_success`
    - `margin >= 0` → quality unchanged, `success`
    - `margin > QUALITY_DEGRADE_MARGIN(-3)` → quality unchanged, `failure`
    - `margin <= QUALITY_DEGRADE_MARGIN(-3)` → quality degrades toward A (worse), `failure`
    - `margin <= CRITICAL_FAILURE_MARGIN(-6)` → quality degrades toward A + additional damage, `critical_failure`

  **Must NOT do**:
  - Implement actual era/planetary/specialty modifiers (stub only)
  - Apply damage on critical failure (just degrade quality for now)

  **Parallelizable**: NO (depends on 3.1)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:127-142` — TN formula components
  - `.sisyphus/drafts/mekhq-modifier-systems.md:155-159` — Maintenance failure cascade rules
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\Maintenance.java:267-496` — MekHQ maintenance check
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\parts\Part.java:953` — Part TN calculation

  **Acceptance Criteria**:
  - [ ] RED: Test TN = techSkill(5) + qualityD(0) + normal(0) = 5
  - [ ] RED: Test TN = techSkill(5) + qualityA(+3) + rush(+1) = 9
  - [ ] RED: Test margin >= 4 improves quality
  - [ ] RED: Test margin < -3 degrades quality
  - [ ] RED: Test quality F doesn't degrade further
  - [ ] RED: Test deterministic with seeded random
  - [ ] RED: Test modifier breakdown includes all components
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement maintenance check with quality cascade`
  - Files: `src/lib/campaign/maintenance/maintenanceCheck.ts`

---

- [ ] 3.3 Define Tech Skill Type

  **What to do**:
  - Add Tech skill type to the skill system in `src/types/campaign/skills/`:
    ```typescript
    export const TECH_SKILL_TYPE: ISkillType = {
      id: 'tech-general',
      name: 'Tech',
      description: 'General technical maintenance and repair ability',
      targetNumber: 7,
      costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],  // XP per level
      linkedAttribute: 'DEX',
    };
    ```
  - Add to skill type registry/catalog (wherever skill types are defined)
  - Create helper:
    ```typescript
    export function getTechSkillValue(person: IPerson): number {
      const techSkill = person.skills['tech-general'];
      if (!techSkill) return 10;  // Unskilled default (very hard)
      return getSkillValue(techSkill, TECH_SKILL_TYPE, person.attributes);
    }
    ```
  - Default tech skill value for new tech personnel: level 5 (Regular)
  - Unskilled tech attempt penalty: use value 10 (very high TN)

  **Must NOT do**:
  - Full tech specialization trees (Mech Tech, Aero Tech, etc.)
  - Detailed skill progression system overhaul

  **Parallelizable**: YES (with 3.1)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\skills\ISkillType.ts` — Existing ISkillType interface
  - `E:\Projects\MekStation\src\types\campaign\skills\ISkill.ts` — Existing ISkill interface with getSkillValue()
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\Skill.java` — MekHQ skill system

  **Acceptance Criteria**:
  - [ ] RED: Test `TECH_SKILL_TYPE` has correct id, costs, linked attribute
  - [ ] RED: Test `getTechSkillValue()` returns correct value for skilled tech
  - [ ] RED: Test unskilled person returns 10 (penalty)
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define Tech skill type for maintenance checks`
  - Files: `src/types/campaign/skills/techSkill.ts`

---

- [ ] 3.4 Integrate Quality with Existing Repair System

  **What to do**:
  - Add quality field to unit tracking:
    - Extend the campaign unit instance with quality: `readonly quality?: PartQuality` (defaults to `PartQuality.D`)
    - Add `unitQualities: Map<string, IUnitQuality>` to campaign state (or as optional field on existing unit tracking)
  - Modify repair cost calculation to include quality modifier:
    ```typescript
    // In repair cost calculation:
    const qualityMultiplier = getQualityRepairCostMultiplier(unitQuality);
    // A = 0.8x (good parts = cheaper), F = 1.5x (bad parts = expensive)
    ```
  - Modify repair TN to include tech skill:
    ```typescript
    // When creating repair job:
    const techTN = getTechSkillValue(assignedTech);
    const qualityMod = QUALITY_TN_MODIFIER[unitQuality];
    const repairTN = techTN + qualityMod + otherMods;
    ```
  - Add `assignedTechId?: string` to `IRepairJob` interface
   - Update salvage starting quality: salvaged equipment starts at `PartQuality.C` (below average — toward A/worst)
  - New units start at `PartQuality.D` (standard)

  **Must NOT do**:
  - Rewrite repair store (extend only)
  - Change existing repair job flow (add quality as optional modifier)
  - Per-part quality (whole-unit quality for simplicity)

  **Parallelizable**: NO (depends on 3.2, 3.3)

  **References**:
  - `E:\Projects\MekStation\src\types\repair\RepairInterfaces.ts` — Current repair types (698 lines)
  - `E:\Projects\MekStation\src\stores\useRepairStore.ts` — Current repair store (645 lines)
  - `.sisyphus/drafts/mekhq-modifier-systems.md:155-167` — MRMS priority and quality integration

  **Acceptance Criteria**:
  - [ ] RED: Test new unit defaults to quality D
  - [ ] RED: Test salvaged unit starts at quality C (below average, toward worst)
  - [ ] RED: Test repair cost includes quality multiplier
  - [ ] RED: Test repair TN includes tech skill + quality modifier
  - [ ] RED: Test existing repair jobs work without quality (backward compatible)
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): integrate quality grades with repair system`
  - Files: `src/types/repair/RepairInterfaces.ts`, quality-related updates

---

- [ ] 3.5 Create Maintenance Day Processor

  **What to do**:
  - Create `src/lib/campaign/processors/maintenanceProcessor.ts`:
    ```typescript
    export const maintenanceProcessor: IDayProcessor = {
      id: 'maintenance',
      phase: DayPhase.UNITS,
      displayName: 'Unit Maintenance',
      process(campaign, date) {
        // Check if maintenance day (configurable cycle)
        if (!isMaintenanceDay(campaign, date)) {
          return { events: [], campaign };
        }
        
        // For each unit with an assigned tech:
        // 1. Get tech's skill value
        // 2. Get unit's current quality
        // 3. Perform maintenance check
        // 4. Apply quality change if needed
        // 5. Record maintenance history
        
        return { events: maintenanceEvents, campaign: updatedCampaign };
      }
    };
    ```
  - `isMaintenanceDay()` checks `campaign.options.maintenanceCycleDays` (default: 7 = weekly)
  - For units WITHOUT an assigned tech: auto-degrade quality (unmaintained)
  - Export registration function

  **Must NOT do**:
  - Auto-assign techs to units (manual assignment only)
  - Complex MRMS optimization (basic check per unit)

  **Parallelizable**: NO (depends on 3.4)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayPipeline.ts` — IDayProcessor interface (from Plan 1)
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\Maintenance.java` — MekHQ maintenance processing
  - `.sisyphus/drafts/mekhq-modifier-systems.md:155-167` — Maintenance failure cascade

  **Acceptance Criteria**:
  - [ ] RED: Test processor runs on maintenance day (every N days)
  - [ ] RED: Test processor skips on non-maintenance days
  - [ ] RED: Test quality degrades on failed check
  - [ ] RED: Test quality improves on high-margin success
  - [ ] RED: Test unmaintained unit auto-degrades
  - [ ] RED: Test maintenance events returned in IDayEvent format
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add maintenance day processor with quality cascade`
  - Files: `src/lib/campaign/processors/maintenanceProcessor.ts`

---

- [ ] 3.6 Create Quality Indicators UI

  **What to do**:
  - Create `src/components/campaign/QualityBadge.tsx` — Color-coded badge (A=green, D=gray, F=red)
  - Create `src/components/campaign/MaintenanceReportPanel.tsx` — Maintenance results in day report:
    - List of units checked with roll/TN/outcome
    - Quality changes highlighted (upgrades in green, downgrades in red)
    - Tech assignment status (unassigned units warned)
  - Add quality badge to unit cards in campaign view
  - Add tech assignment UI to repair bay or personnel page:
    - Assign tech to unit from dropdown
    - Show tech skill level and expected TN
  - Add maintenance options to campaign settings:
    - `maintenanceCycleDays` slider
    - `useQualityGrades` toggle
    - `qualityStartingGrade` dropdown (for new campaigns)

  **Must NOT do**:
  - Full MRMS optimization UI
  - Detailed maintenance history timeline

  **Parallelizable**: NO (depends on 3.5)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\repair\index.tsx` — Existing repair bay page (546 lines)
  - `E:\Projects\MekStation\src\components\repair\RepairQueue.tsx` — Existing repair queue component

  **Acceptance Criteria**:
  - [ ] Quality badge shows on unit cards with correct color
  - [ ] Maintenance events in day report show roll/TN/outcome
  - [ ] Tech assignment dropdown works
  - [ ] Campaign settings show maintenance options
  - [ ] Manual verification: dev server → assign tech → advance days → see quality changes

  **Commit**: YES
  - Message: `feat(ui): add quality badges, maintenance reports, and tech assignment`
  - Files: `src/components/campaign/QualityBadge.tsx`, `src/components/campaign/MaintenanceReportPanel.tsx`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 3.1 | `feat(campaign): define part quality grades A-F` | `npm test` |
| 3.2 | `feat(campaign): implement maintenance check with quality cascade` | `npm test` |
| 3.3 | `feat(campaign): define Tech skill type` | `npm test` |
| 3.4 | `feat(campaign): integrate quality with repair system` | `npm test` |
| 3.5 | `feat(campaign): add maintenance day processor` | `npm test` |
| 3.6 | `feat(ui): add quality UI and maintenance reports` | Manual verify |

---

## Success Criteria

### Verification Commands
```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [ ] Quality grades A-F defined with correct TN modifiers
- [ ] Maintenance check uses exact MekHQ formula
- [ ] Quality cascade: failure degrades, high success improves
- [ ] Tech skill affects maintenance TN
- [ ] Existing repair system unchanged (backward compatible)
- [ ] Day processor runs on configurable cycle
- [ ] UI shows quality badges and maintenance reports

---

## Registration Snippet

```typescript
import { registerMaintenanceProcessor } from '@/lib/campaign/processors/maintenanceProcessor';
registerMaintenanceProcessor();
```

---

## Migration Notes

- Quality field is OPTIONAL on existing types (defaults to PartQuality.D = standard)
- Quality direction: A=worst(TN+3), F=best(TN-2). Degrade→A, Improve→F.
- Existing repair jobs work without quality modifier
- New `ICampaignOptions` fields: `useQualityGrades`, `maintenanceCycleDays` with defaults
- Existing campaigns deserialize without error

---

*Plan generated by Prometheus. Execute with `/start-work`.*
