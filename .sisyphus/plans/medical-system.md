# Medical System

## Context

### Original Request
Expand MekStation's basic healing (daysToHeal countdown) into MekHQ's three medical systems: Standard skill-check healing, Advanced d100 surgery, and Alternate attribute-based healing. Add doctor role logic, patient capacity, complications, and prosthetics.

### Interview Summary
**Key Discussions**:
- Three medical systems selectable via campaign option (Standard/Advanced/Alternate)
- Standard: doctor's Medicine skill check, success heals 1 hit, failure waits
- Advanced: d100 roll with fumble/crit thresholds, injury worsening
- Alternate: attribute check (BODY or Surgery) with margin-of-success
- Existing processHealing() is the day processor — extend it, don't replace
- Doctor capacity: maxPatientsPerDoctor (25 default), enhanced by admin skill
- TDD approach, injectable RandomFn

**Research Findings**:
- `processHealing()` in dayAdvancement.ts: basic daysToHeal countdown (lines 116-185)
- `IInjury` interface: type, location, severity 1-5, daysToHeal, permanent flag, skillModifier, attributeModifier
- `IPerson` has `doctorId` field for doctor assignment
- `ICampaignOptions` has `useAdvancedMedical`, `healingRateMultiplier`, `healingWaitingPeriod`, `maxPatientsPerDoctor`
- Medicine skill type will be defined in Plan 7 (Skills Expansion)

### Metis Review
**Identified Gaps** (addressed):
- Medicine skill needed (Plan 7 defines it, this plan uses stub if not yet built)
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
- [ ] 3 medical systems selectable via campaign option
- [ ] Standard: skill check heals 1 hit per success
- [ ] Advanced: d100 with fumble/crit thresholds
- [ ] Alternate: attribute-based margin of success
- [ ] Doctor capacity enforced (maxPatientsPerDoctor)
- [ ] Natural healing for patients without doctor
- [ ] Surgery option for permanent injuries
- [ ] Day processor integrates selected medical system

### Must Have
- `MedicalSystem` enum: STANDARD, ADVANCED, ALTERNATE
- Medical check functions with injectable RandomFn
- Doctor capacity calculation
- Natural healing fallback
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

- [ ] 8.1 Define Medical System Types

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
  - [ ] RED: Test MedicalSystem enum has 3 values
  - [ ] RED: Test IMedicalCheckResult has all outcome types
  - [ ] GREEN: Types compile
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define medical system types`
  - Files: `src/lib/campaign/medical/medicalTypes.ts`

---

- [ ] 8.2 Implement Standard Medical System

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

      const medicineSkill = getMedicineSkillValue(doctor); // From Plan 7 helper
      const modifiers = [
        { name: 'Base TN', value: medicineSkill },
        { name: 'Tougher Healing', value: options.tougherHealing ? Math.max(0, patient.injuries.length - 2) : 0 },
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
  - [ ] RED: Test doctor success heals injury (daysToHeal → 0)
  - [ ] RED: Test doctor failure keeps injury unchanged
  - [ ] RED: Test natural healing is slower (waits longer)
  - [ ] RED: Test tougher healing modifier applied when enabled
  - [ ] RED: Test deterministic with seeded random
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement standard medical system`
  - Files: `src/lib/campaign/medical/standardMedical.ts`

---

- [ ] 8.3 Implement Advanced Medical System

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
      const skill = getMedicineSkillValue(doctor);
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
  - [ ] RED: Test fumble worsens injury (+20% time)
  - [ ] RED: Test critical success reduces time (-10%)
  - [ ] RED: Test untreated has 30% worsening chance
  - [ ] RED: Test Green doctor fumbles more often than Elite
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement advanced medical system with d100`
  - Files: `src/lib/campaign/medical/advancedMedical.ts`

---

- [ ] 8.4 Implement Alternate Medical System

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
        ? getMedicineSkillValue(doctor)
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

  **Acceptance Criteria**:
  - [ ] RED: Test positive margin heals
  - [ ] RED: Test margin -1 to -5 extends healing time
  - [ ] RED: Test margin ≤ -6 makes injury permanent
  - [ ] RED: Test prosthetic penalty adds +4
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement alternate medical system`
  - Files: `src/lib/campaign/medical/alternateMedical.ts`

---

- [ ] 8.5 Implement Doctor Capacity Management

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
  - [ ] RED: Test base capacity = 25 patients
  - [ ] RED: Test admin skill bonus increases capacity
  - [ ] RED: Test overloaded doctor gets penalty modifier
  - [ ] RED: Test getBestAvailableDoctor returns least-loaded doctor
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement doctor capacity management`
  - Files: `src/lib/campaign/medical/doctorCapacity.ts`

---

- [ ] 8.6 Implement Surgery for Permanent Injuries

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
      const baseTN = getMedicineSkillValue(surgeon) + 2; // Surgery is harder
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
  - [ ] RED: Test surgery margin >= 4 removes permanent flag
  - [ ] RED: Test surgery margin 0-3 installs prosthetic
  - [ ] RED: Test surgery failure leaves injury unchanged
  - [ ] RED: Test prosthetic removes skill modifier but adds attribute penalty
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement surgery for permanent injuries`
  - Files: `src/lib/campaign/medical/surgery.ts`

---

- [ ] 8.7 Update Healing Day Processor

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
  - [ ] RED: Test Standard system used when option = STANDARD
  - [ ] RED: Test Advanced system used when option = ADVANCED
  - [ ] RED: Test patients beyond doctor capacity get natural healing
  - [ ] RED: Test medical events generated for day report
  - [ ] GREEN: All tests pass
  - [ ] Existing healing tests still pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): update healing processor for 3 medical systems`
  - Files: `src/lib/campaign/processors/healingProcessor.ts`

---

- [ ] 8.8 Create Medical Management UI

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
  - [ ] Wounded list shows injuries with severity and healing progress
  - [ ] Doctor assignment dropdown works
  - [ ] Doctor workload shows patient count vs capacity
  - [ ] Surgery button appears for permanent injuries
  - [ ] Medical system selector in campaign settings
  - [ ] Manual verification: dev server → wound personnel → assign doctor → advance day → verify healing

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
- [ ] 3 medical systems with exact MekHQ formulas
- [ ] Doctor skill checks with injectable random
- [ ] Doctor capacity enforced
- [ ] Natural healing for unassigned patients
- [ ] Surgery for permanent injuries
- [ ] Prosthetic installation
- [ ] Existing processHealing tests unbroken

---

## Registration Snippet

Medical system extends the existing healing processor (registered by Plan 1). No separate registration needed — the healing processor dispatches to the selected medical system internally.

---

## Migration Notes

- New `medicalSystem` option on ICampaignOptions defaults to STANDARD
- New `doctorsUseAdministration` option defaults to false
- Existing processHealing() behavior preserved as STANDARD system baseline
- New `hasProsthetic` optional field on IInjury — existing injuries unaffected
- Medicine skill from Plan 7 used if available; stub returns TN 7 if not

---

*Plan generated by Prometheus. Execute with `/start-work`.*
