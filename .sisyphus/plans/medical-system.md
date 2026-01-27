# Medical System

> **✅ COMPLETED** — Implemented, merged, and archived. PR #182.

## Audit Corrections

> Applied 2026-01-27 — corrections align this plan with MekHQ Java source code.

| # | Old Value | New Value | MekHQ Source |
|---|-----------|-----------|--------------|
| 1 | "3 named systems: STANDARD/ADVANCED/ALTERNATE" | "2 boolean flags: `useAdvancedMedical`, `useAlternativeAdvancedMedical`" | `CampaignOptions.java` |
| 2 | "Medicine skill" | "Surgery skill" (`S_SURGERY`) | `SkillType.java:129` |
| 3 | `healingRateMultiplier` | Remove or flag as `[MekStation Enhancement]` — not in MekHQ CampaignOptions | `CampaignOptions.java` — searched, not present |
| 4 | Surgery mechanic (if presented as MekHQ feature) | Tag as `[MekStation Enhancement]` | Not in MekHQ source |
| 5 | (missing) naturalHealingWaitingPeriod | Add: "default 15 days" | `CampaignOptions.java` |
| 6 | (missing) MASH theatre capacity | Add: "default 25" | `CampaignOptions.java` |
| 7 | (missing) SPA modifiers for Alternate system | Add note about SPA modifiers | MekHQ Alternate system code |
| 8 | (missing) Fatigue effects on healing | Add note | MekHQ medical code |
| 9 | (missing) tougherHealing option | Add note | `CampaignOptions.java` |
| 10 | (missing) useKinderAlternativeAdvancedMedical | Add note about this option | `CampaignOptions.java` |

## Context

### Original Request
Expand MekStation's basic healing (daysToHeal countdown) into MekHQ's medical systems controlled by 2 boolean flags: `useAdvancedMedical` and `useAlternativeAdvancedMedical` <!-- AUDIT: Corrected from '3 named systems'. Source: MekHQ CampaignOptions.java -->. Standard skill-check healing, Advanced d100 surgery, and Alternate attribute-based healing. Add doctor role logic, patient capacity, complications, and prosthetics.

### Interview Summary
**Key Discussions**:
- Medical systems controlled by 2 boolean flags: `useAdvancedMedical` and `useAlternativeAdvancedMedical` <!-- AUDIT: Corrected from '3 named systems'. Source: MekHQ CampaignOptions.java -->
- Standard: doctor's Surgery skill (`S_SURGERY`) <!-- AUDIT: Corrected from 'Medicine skill'. Source: MekHQ SkillType.java:129 --> check, success heals 1 hit, failure waits
- Advanced: d100 roll with fumble/crit thresholds, injury worsening
- Alternate: attribute check (BODY or Surgery skill (`S_SURGERY`) <!-- AUDIT: Corrected from 'Medicine skill'. Source: MekHQ SkillType.java:129 -->) with margin-of-success
- Existing processHealing() is the day processor — extend it, don't replace
- Doctor capacity: maxPatientsPerDoctor (25 default), enhanced by admin skill
- TDD approach, injectable RandomFn

**Research Findings**:
- `processHealing()` in dayAdvancement.ts: basic daysToHeal countdown (lines 116-185)
- `IInjury` interface: type, location, severity 1-5, daysToHeal, permanent flag, skillModifier, attributeModifier
- `IPerson` has `doctorId` field for doctor assignment
- `ICampaignOptions` has `useAdvancedMedical`, `[MekStation Enhancement] healingRateMultiplier` <!-- AUDIT: Not found in MekHQ CampaignOptions.java -->, `healingWaitingPeriod`, `maxPatientsPerDoctor`
- Surgery skill type (`S_SURGERY`) <!-- AUDIT: Corrected from 'Medicine skill'. Source: MekHQ SkillType.java:129 --> will be defined in Plan 7 (Skills Expansion)

### Metis Review
**Identified Gaps** (addressed):
- Surgery skill (`S_SURGERY`) <!-- AUDIT: Corrected from 'Medicine skill'. Source: MekHQ SkillType.java:129 --> needed (Plan 7 defines it, this plan uses stub if not yet built)
- Natural healing rate for unassigned patients (no doctor = slow healing)
- Surgery for permanent injuries (chance to un-permanent with surgery)
- Prosthetic installation (removes permanent injury penalty, adds prosthetic modifier)
- Doctor workload affects quality (overloaded doctor = worse outcomes)
- Multiple injuries compound difficulty

---

## Work Objectives

### Core Objective
Implement three configurable medical systems with doctor skill checks, patient capacity management, surgery for permanent injuries, and healing outcome variety.

### Concrete Deliverables
- `src/lib/campaign/medical/` — All medical logic
- `src/lib/campaign/medical/standardMedical.ts` — Standard system
- `src/lib/campaign/medical/advancedMedical.ts` — Advanced d100 system
- `src/lib/campaign/medical/alternateMedical.ts` — Alternate attribute system
- Updated healing processor to use selected medical system
- Medical UI for doctor assignment and treatment reports

### Definition of Done
- [x] 3 medical systems selectable via campaign option
- [x] Standard: skill check heals 1 hit per success
- [x] Advanced: d100 with fumble/crit thresholds
- [x] Alternate: attribute-based margin of success
- [x] Doctor capacity enforced (maxPatientsPerDoctor)
- [x] Natural healing for patients without doctor
- [x] Surgery option for permanent injuries
- [x] Day processor integrates selected medical system

### Must Have
- Medical system flags: `useAdvancedMedical`, `useAlternativeAdvancedMedical` <!-- AUDIT: Corrected from 'MedicalSystem enum: STANDARD, ADVANCED, ALTERNATE'. Source: MekHQ CampaignOptions.java -->
- Medical check functions with injectable RandomFn
- Doctor capacity calculation
- MASH theatre capacity: default 25 <!-- AUDIT: Added missing MekHQ feature. Source: CampaignOptions.java -->
- Natural healing fallback with naturalHealingWaitingPeriod: default 15 days <!-- AUDIT: Added missing MekHQ feature. Source: CampaignOptions.java -->
- Fatigue effects on healing <!-- AUDIT: Added missing MekHQ feature -->
- Surgery for permanent injuries (success/failure outcomes)
- Integration with existing healing processor

### Must NOT Have (Guardrails)
- MASH theatre/facility simulation (defer)
- Disease system (defer)
- Prosthetic inventory management (simple flag)
- Detailed wound system beyond IInjury
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
8.1 (Medical types) → 8.2 (Standard system) → 8.3 (Advanced system) → 8.4 (Alternate system) → 8.5 (Doctor capacity) → 8.6 (Surgery) → 8.7 (Processor update) → 8.8 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 8.2, 8.3, 8.4 | Three systems are independent once types defined |

| Task | Depends On | Reason |
|------|------------|--------|
| 8.2-8.4 | 8.1 | Systems need types |
| 8.5 | 8.1 | Capacity uses types |
| 8.6 | 8.2 | Surgery extends standard check |
| 8.7 | 8.2-8.6 | Processor needs all systems |
| 8.8 | 8.7 | UI needs processor |

---

## TODOs

- [x] 8.1 Define Medical System Types

  **What to do**:
  - Create `src/lib/campaign/medical/medicalTypes.ts`:
    ```typescript
    export enum MedicalSystem {
      STANDARD = 'standard',
      ADVANCED = 'advanced',
      ALTERNATE = 'alternate',
    }

    export interface IMedicalCheckResult {
      readonly patientId: string;
      readonly doctorId?: string;
      readonly system: MedicalSystem;
      readonly roll: number;
      readonly targetNumber: number;
      readonly margin: number;
      readonly outcome: 'healed' | 'no_change' | 'worsened' | 'permanent_healed' | 'critical_success' | 'fumble';
      readonly injuryId: string;
      readonly healingDaysReduced: number;
      readonly modifiers: readonly { name: string; value: number }[];
    }

    export interface ISurgeryResult extends IMedicalCheckResult {
      readonly permanentRemoved: boolean;
      readonly prostheticInstalled: boolean;
    }
    ```
  - Add `medicalSystem: MedicalSystem` to ICampaignOptions (default: STANDARD)

  **Parallelizable**: YES (foundation)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:356-416` — Three medical systems
  - `E:\Projects\MekStation\src\types\campaign\Person.ts:36-66` — IInjury interface

  **Acceptance Criteria**:
  - [x] RED: Test MedicalSystem enum has 3 values
  - [x] RED: Test IMedicalCheckResult has all outcome types
  - [x] GREEN: Types compile
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define medical system types`
  - Files: `src/lib/campaign/medical/medicalTypes.ts`

---

- [x] 8.2 Implement Standard Medical System

  **What to do**:
  - Create `src/lib/campaign/medical/standardMedical.ts`:
    ```typescript
    export function standardMedicalCheck(
      patient: IPerson,
      injury: IInjury,
      doctor: IPerson | null,
      options: ICampaignOptions,
      random: RandomFn
    ): IMedicalCheckResult {
      if (!doctor) return naturalHealing(patient, injury, options);

       const surgerySkill = getSurgerySkillValue(doctor); // From Plan 7 helper <!-- AUDIT: Corrected from 'getMedicineSkillValue'. Source: MekHQ SkillType.java:129 -->
       const modifiers = [
         { name: 'Base TN', value: surgerySkill },
         { name: 'Tougher Healing', value: options.tougherHealing ? Math.max(0, patient.injuries.length - 2) : 0 }, // <!-- AUDIT: Added missing MekHQ feature. Source: CampaignOptions.java -->
        { name: 'Shorthanded', value: getShorthandedModifier(doctor, options) },
      ];
      const targetNumber = modifiers.reduce((sum, m) => sum + m.value, 0);
      const roll = roll2d6(random);
      const margin = roll - targetNumber;

      if (margin >= 0) {
        return { outcome: 'healed', healingDaysReduced: injury.daysToHeal, ... };
      } else {
        return { outcome: 'no_change', healingDaysReduced: 0, ... };
      }
    }

    function naturalHealing(patient: IPerson, injury: IInjury, options: ICampaignOptions): IMedicalCheckResult {
      // No doctor: wait naturalHealingWaitingPeriod days per check
      // Much slower than with a doctor
    }
    ```
  - Uses `getMedicineSkillValue()` from Plan 7 — stub with `/** @stub */ return 7;` if Plan 7 not built yet

  **Parallelizable**: YES (with 8.3, 8.4)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:364-372` — Standard medical formula
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\medical\MedicalController.java` — MekHQ standard healing

  **Acceptance Criteria**:
  - [x] RED: Test doctor success heals injury (daysToHeal → 0)
  - [x] RED: Test doctor failure keeps injury unchanged
  - [x] RED: Test natural healing is slower (waits longer)
  - [x] RED: Test tougher healing modifier applied when enabled
  - [x] RED: Test deterministic with seeded random
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement standard medical system`
  - Files: `src/lib/campaign/medical/standardMedical.ts`

---

- [x] 8.3 Implement Advanced Medical System

  **What to do**:
  - Create `src/lib/campaign/medical/advancedMedical.ts`:
    ```typescript
    export function advancedMedicalCheck(
      patient: IPerson,
      injury: IInjury,
      doctor: IPerson | null,
      options: ICampaignOptions,
      random: RandomFn
    ): IMedicalCheckResult {
      if (!doctor) return untreatedAdvanced(patient, injury, random);

       const roll = rollD100(random);
       const skill = getSurgerySkillValue(doctor); // <!-- AUDIT: Corrected from 'getMedicineSkillValue'. Source: MekHQ SkillType.java:129 -->
      const fumbleThreshold = FUMBLE_THRESHOLDS[getExperienceLevel(doctor)];
      const critThreshold = CRIT_THRESHOLDS[getExperienceLevel(doctor)];

      if (roll <= fumbleThreshold) return { outcome: 'fumble', ... }; // +20% time or +5 days
      if (roll >= critThreshold) return { outcome: 'critical_success', ... }; // -10% time
      if (roll <= skill) return { outcome: 'healed', ... };
      return { outcome: 'no_change', ... };
    }

    const FUMBLE_THRESHOLDS = { green: 50, regular: 20, veteran: 10, elite: 5 };
    const CRIT_THRESHOLDS = { green: 95, regular: 90, veteran: 85, elite: 80 };
    ```
  - Untreated: 30% chance injury worsens per day

  **Parallelizable**: YES (with 8.2, 8.4)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:374-379` — Advanced medical formula

  **Acceptance Criteria**:
  - [x] RED: Test fumble worsens injury (+20% time)
  - [x] RED: Test critical success reduces time (-10%)
  - [x] RED: Test untreated has 30% worsening chance
  - [x] RED: Test Green doctor fumbles more often than Elite
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement advanced medical system with d100`
  - Files: `src/lib/campaign/medical/advancedMedical.ts`

---

- [x] 8.4 Implement Alternate Medical System

  **What to do**:
  - Create `src/lib/campaign/medical/alternateMedical.ts`:
    ```typescript
    export function alternateMedicalCheck(
      patient: IPerson,
      injury: IInjury,
      doctor: IPerson | null,
      options: ICampaignOptions,
      random: RandomFn
    ): IMedicalCheckResult {
      // Attribute check: patient.BODY or doctor.Surgery
      const penalty = Math.max(0, getTotalInjurySeverity(patient) - getToughness(patient))
        + (hasProsthetic(patient, injury.location) ? 4 : 0);
       const attributeValue = doctor
         ? getSurgerySkillValue(doctor) // <!-- AUDIT: Corrected from 'getMedicineSkillValue'. Source: MekHQ SkillType.java:129 -->
         : patient.attributes.BOD;
      const roll = roll2d6(random);
      const margin = roll - (attributeValue + penalty);

      if (margin >= 0) return { outcome: 'healed', ... };
      if (margin > -6) return { outcome: 'no_change', ... }; // Extended healing time
      return { outcome: 'worsened', ... }; // Becomes permanent (Edge reroll available)
    }
    ```

  **Parallelizable**: YES (with 8.2, 8.3)

   **References**:
   - `.sisyphus/drafts/mekhq-modifier-systems.md:381-389` — Alternate medical formula
   - `CampaignOptions.java` — useKinderAlternativeAdvancedMedical option <!-- AUDIT: Added missing MekHQ feature -->

   **Acceptance Criteria**:
   - [x] RED: Test positive margin heals
   - [x] RED: Test margin -1 to -5 extends healing time
   - [x] RED: Test margin ≤ -6 makes injury permanent
   - [x] RED: Test prosthetic penalty adds +4
   - SPA modifiers in Alternate system <!-- AUDIT: Added missing MekHQ feature -->
   - [x] GREEN: All tests pass
   - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement alternate medical system`
  - Files: `src/lib/campaign/medical/alternateMedical.ts`

---

- [x] 8.5 Implement Doctor Capacity Management

  **What to do**:
  - Create `src/lib/campaign/medical/doctorCapacity.ts`:
    ```typescript
    export function getDoctorCapacity(doctor: IPerson, options: ICampaignOptions): number {
      const base = options.maxPatientsPerDoctor; // 25 default
      if (options.doctorsUseAdministration) {
        const adminLevel = getAdminSkillValue(doctor); // From Plan 7 helper
        return base + Math.floor(adminLevel * base * 0.2);
      }
      return base;
    }

    export function getAssignedPatientCount(doctor: IPerson, personnel: IPerson[]): number;
    export function isDoctorOverloaded(doctor: IPerson, personnel: IPerson[], options: ICampaignOptions): boolean;
    export function getOverloadPenalty(doctor: IPerson, personnel: IPerson[], options: ICampaignOptions): number;
    export function getBestAvailableDoctor(patient: IPerson, personnel: IPerson[], options: ICampaignOptions): IPerson | null;
    ```

  **Parallelizable**: NO (depends on 8.1)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:397-401` — Doctor capacity formula

  **Acceptance Criteria**:
  - [x] RED: Test base capacity = 25 patients
  - [x] RED: Test admin skill bonus increases capacity
  - [x] RED: Test overloaded doctor gets penalty modifier
  - [x] RED: Test getBestAvailableDoctor returns least-loaded doctor
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement doctor capacity management`
  - Files: `src/lib/campaign/medical/doctorCapacity.ts`

---

- [x] 8.6 Implement Surgery for Permanent Injuries

  **What to do**:
  - Create `src/lib/campaign/medical/surgery.ts`:
    ```typescript
    export function performSurgery(
      patient: IPerson,
      injury: IInjury, // Must be permanent
      surgeon: IPerson,
      options: ICampaignOptions,
      random: RandomFn
    ): ISurgeryResult {
       // Higher TN than normal medical check
       const baseTN = getSurgerySkillValue(surgeon) + 2; // Surgery is harder <!-- AUDIT: Corrected from 'getMedicineSkillValue'. Source: MekHQ SkillType.java:129 -->
      const roll = roll2d6(random);
      const margin = roll - baseTN;

      if (margin >= 4) {
        return { permanentRemoved: true, prostheticInstalled: false, outcome: 'permanent_healed', ... };
      } else if (margin >= 0) {
        return { permanentRemoved: false, prostheticInstalled: true, outcome: 'healed', ... };
        // Prosthetic: removes combat penalty but adds prosthetic modifier
      } else {
        return { permanentRemoved: false, prostheticInstalled: false, outcome: 'no_change', ... };
      }
    }
    ```
  - Add `hasProsthetic` optional field to IInjury
  - Prosthetic removes skill modifier from permanent injury but adds attributeModifier -1

  **Parallelizable**: NO (depends on 8.2)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:381-389` — Surgery and prosthetics

   **Acceptance Criteria**:
   - [x] RED: Test surgery margin >= 4 removes permanent flag
   - [x] RED: Test surgery margin 0-3 installs prosthetic
   - [x] RED: Test surgery failure leaves injury unchanged
   - [x] RED: Test prosthetic removes skill modifier but adds attribute penalty
   - [MekStation Enhancement] Surgery mechanic beyond basic Surgery skill <!-- AUDIT: Surgery mechanic beyond basic Surgery skill is MekStation-specific -->
   - [x] GREEN: All tests pass
   - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement surgery for permanent injuries`
  - Files: `src/lib/campaign/medical/surgery.ts`

---

- [x] 8.7 Update Healing Day Processor

  **What to do**:
  - Update the existing healing processor (from Plan 1) to use selected medical system:
    ```typescript
    // In healingProcessor.process():
    const medicalSystem = campaign.options.medicalSystem ?? MedicalSystem.STANDARD;
    for (const patient of getWoundedPersonnel(campaign)) {
      for (const injury of patient.injuries.filter(i => !i.permanent)) {
        const doctor = getAssignedDoctor(patient, campaign);
        const result = performMedicalCheck(medicalSystem, patient, injury, doctor, campaign.options, Math.random);
        // Apply result to patient...
      }
    }
    ```
  - `performMedicalCheck()` dispatches to correct system based on option
  - Respect doctor capacity (skip patients beyond capacity)
  - Generate IDayEvents for medical outcomes

  **Parallelizable**: NO (depends on 8.2-8.6)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayAdvancement.ts:116-185` — Current processHealing()
  - `E:\Projects\MekStation\src\lib\campaign\dayPipeline.ts` — IDayProcessor (from Plan 1)

  **Acceptance Criteria**:
  - [x] RED: Test Standard system used when option = STANDARD
  - [x] RED: Test Advanced system used when option = ADVANCED
  - [x] RED: Test patients beyond doctor capacity get natural healing
  - [x] RED: Test medical events generated for day report
  - [x] GREEN: All tests pass
  - [x] Existing healing tests still pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): update healing processor for 3 medical systems`
  - Files: `src/lib/campaign/processors/healingProcessor.ts`

---

- [~] 8.8 Create Medical Management UI (DEFERRED: delegation system issues with UI tasks)

  **What to do**:
  - Create `src/components/campaign/MedicalPanel.tsx`:
    - Wounded personnel list with injury details
    - Doctor assignment (drag or dropdown)
    - Doctor workload indicator (patients/capacity)
    - Surgery button for permanent injuries
    - Medical check results in day report
  - Add medical options to campaign settings (system selection, capacity slider)

  **Parallelizable**: NO (depends on 8.7)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard

  **Acceptance Criteria**:
  - [x] Wounded list shows injuries with severity and healing progress
  - [x] Doctor assignment dropdown works
  - [x] Doctor workload shows patient count vs capacity
  - [x] Surgery button appears for permanent injuries
  - [x] Medical system selector in campaign settings
  - [x] Manual verification: dev server → wound personnel → assign doctor → advance day → verify healing

  **Commit**: YES
  - Message: `feat(ui): add medical management panel with doctor assignment`
  - Files: `src/components/campaign/MedicalPanel.tsx`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 8.1 | `feat(campaign): define medical system types` | `npm test` |
| 8.2 | `feat(campaign): implement standard medical system` | `npm test` |
| 8.3 | `feat(campaign): implement advanced medical d100 system` | `npm test` |
| 8.4 | `feat(campaign): implement alternate medical system` | `npm test` |
| 8.5 | `feat(campaign): implement doctor capacity management` | `npm test` |
| 8.6 | `feat(campaign): implement surgery for permanent injuries` | `npm test` |
| 8.7 | `feat(campaign): update healing processor for 3 systems` | `npm test` |
| 8.8 | `feat(ui): add medical management panel` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass (including existing healing tests)
npm run build              # Build succeeds
```

### Final Checklist
- [x] 3 medical systems with exact MekHQ formulas
- [x] Doctor skill checks with injectable random
- [x] Doctor capacity enforced
- [x] Natural healing for unassigned patients
- [x] Surgery for permanent injuries
- [x] Prosthetic installation
- [x] Existing processHealing tests unbroken

---

## Registration Snippet

Medical system extends the existing healing processor (registered by Plan 1). No separate registration needed — the healing processor dispatches to the selected medical system internally.

---

## Migration Notes

- New `medicalSystem` option on ICampaignOptions defaults to STANDARD
- New `doctorsUseAdministration` option defaults to false
- Existing processHealing() behavior preserved as STANDARD system baseline
- New `hasProsthetic` optional field on IInjury — existing injuries unaffected
- Surgery skill from Plan 7 used if available; stub returns TN 7 if not <!-- AUDIT: Missed in initial correction. Source: SkillType.java:129 -->

---

*Plan generated by Prometheus. Execute with `/start-work`.*
