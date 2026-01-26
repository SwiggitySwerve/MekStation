# Implementation Tasks

## 1. Core Quality System
- [ ] 1.1 Define quality types and enum
  - Create `src/types/campaign/quality/PartQuality.ts`
  - Define PartQuality enum (A=worst to F=best)
  - Define QUALITY_TN_MODIFIER mapping (+3 to -2)
  - Implement degradeQuality() and improveQuality() functions
  - Define maintenance thresholds (improve margin: 4, degrade margin: -3, critical: -6)
  - Create IUnitQuality and IMaintenanceRecord interfaces
  - Acceptance: Quality A has TN +3, F has TN -2, degrade/improve respect floor/ceiling

- [ ] 1.2 Implement maintenance check logic
  - Create `src/lib/campaign/maintenance/maintenanceCheck.ts`
  - Implement calculateMaintenanceTN() with tech skill + quality + modifiers
  - Implement performMaintenanceCheck() with 2d6 roll and injectable RandomFn
  - Determine outcome (success/failure/critical) based on margin
  - Apply quality changes based on outcome
  - Include modifier breakdown in result
  - Stub modifiers: era, planetary conditions (return 0)
  - Acceptance: Deterministic tests with seeded random, quality degrades on failure, improves on high success

- [ ] 1.3 Add Tech skill type
  - Extend `src/types/campaign/skills/ISkillType.ts` with TECH skill
  - Add Tech to skill catalog with appropriate defaults
  - Update skill-related helpers to recognize Tech skill
  - Acceptance: Tech skill can be assigned to personnel, used in maintenance checks

- [ ] 1.4 Integrate quality with repair system
  - Extend repair interfaces with optional quality fields
  - Update repair TN calculations to include quality modifier
  - Add quality to unit creation (default: D)
  - Add quality to salvage (default: C)
  - Acceptance: Existing repair jobs work unchanged, new units have quality D

- [ ] 1.5 Create maintenance day processor
  - Create `src/lib/campaign/processors/maintenanceProcessor.ts`
  - Implement IDayProcessor with phase MAINTENANCE
  - Add shouldRunMaintenance() frequency gate (weekly/monthly/quarterly/annually)
  - Run maintenance checks for all active units
  - Update unit quality based on results
  - Record maintenance history
  - Generate day events for failures and quality changes
  - Export registerMaintenanceProcessor() function
  - Acceptance: Processor runs on correct frequency, updates quality, generates events

- [ ] 1.6 Add quality UI components
  - Create quality indicator component for unit cards
  - Add maintenance report panel for day report
  - Show quality grade with color coding (A=red, F=green)
  - Display maintenance history with roll details
  - Add maintenance options to campaign settings
  - Acceptance: Quality visible on units, maintenance reports show in day report

## 2. Testing
- [ ] 2.1 Write comprehensive tests
  - Test quality enum and helper functions
  - Test maintenance check with various scenarios
  - Test quality degradation/improvement
  - Test Tech skill integration
  - Test day processor frequency gates
  - Test UI components
  - Acceptance: 100% test pass rate, TDD approach maintained

## 3. Documentation
- [ ] 3.1 Update documentation
  - Document quality system in campaign guide
  - Document maintenance check mechanics
  - Document Tech skill usage
  - Acceptance: Clear documentation for users and developers
