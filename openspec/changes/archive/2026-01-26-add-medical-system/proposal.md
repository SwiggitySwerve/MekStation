# Change: Medical System

## Why

MekStation's current healing system is a simple daysToHeal countdown with no doctor involvement, skill checks, or treatment outcomes. This removes strategic medical management from campaigns and makes all injuries heal identically. MekHQ offers three medical systems (Standard skill-check, Advanced d100, Alternate attribute-based) that create meaningful doctor-patient relationships, treatment risk/reward, and capacity management challenges.

## What Changes

- Implement three selectable medical systems via campaign option
- **Standard System**: Doctor Medicine skill check (2d6 vs TN), success heals 1 hit, failure waits
- **Advanced System**: d100 roll with fumble/critical thresholds, injury worsening on fumble
- **Alternate System**: Attribute-based check (BODY or Surgery), margin-of-success healing
- Add doctor capacity management (maxPatientsPerDoctor with admin skill bonus)
- Implement natural healing for patients without assigned doctor (slower rate)
- Add surgery system for permanent injuries (success removes permanent flag or installs prosthetic)
- Extend existing healing processor to use selected medical system
- Add doctor assignment and treatment report UI
- Add medical system options to ICampaignOptions (8 new fields)

## Impact

- Affected specs: `personnel-management` (MODIFIED), `day-progression` (MODIFIED), `medical-system` (ADDED)
- Affected code:
  - `src/lib/campaign/medical/` (NEW) - All medical logic
  - `src/lib/campaign/medical/standardMedical.ts` (NEW) - Standard system
  - `src/lib/campaign/medical/advancedMedical.ts` (NEW) - Advanced d100 system
  - `src/lib/campaign/medical/alternateMedical.ts` (NEW) - Alternate attribute system
  - `src/lib/campaign/medical/doctorCapacity.ts` (NEW) - Capacity management
  - `src/lib/campaign/medical/surgery.ts` (NEW) - Surgery for permanent injuries
  - `src/lib/campaign/processors/healingProcessor.ts` (MODIFIED) - Integrate medical systems
  - `src/types/campaign/Person.ts` (MODIFIED) - Add hasProsthetic to IInjury
  - `src/types/campaign/Campaign.ts` (MODIFIED) - Add 8 medical options
  - `src/components/campaign/MedicalPanel.tsx` (NEW) - Doctor assignment UI
  - `src/components/campaign/TreatmentReportPanel.tsx` (NEW) - Treatment outcomes
- Dependencies: Requires Plan 1 (day processor), Plan 7 (Medicine skill type)
- Breaking changes: None (new feature, backward compatible, existing healing continues as fallback)
