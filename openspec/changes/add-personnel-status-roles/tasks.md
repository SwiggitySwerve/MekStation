# Tasks: Personnel Status & Role Expansion

## 1. Expand PersonnelStatus Enum

- [ ] 1.1 Update `src/types/campaign/enums/PersonnelStatus.ts` with 37 status values
  - Add Active/Employed (6): ACTIVE, RETIRED, STUDENT, MISSING, DESERTED, AWOL
  - Add Absent (3): ON_LEAVE, ON_MATERNITY_LEAVE, POW
  - Add Departed (9): RESIGNED, FIRED, LEFT, SACKED, DEFECTED, STUDENT_GRADUATED, RETIRED_FROM_WOUNDS, MEDICAL_RETIREMENT, CONTRACT_ENDED
  - Add Dead (14): KIA, ACCIDENTAL_DEATH, DISEASE, NATURAL_CAUSES, MURDER, WOUNDS, MIA_PRESUMED_DEAD, OLD_AGE, PREGNANCY_COMPLICATIONS, UNDETERMINED, MEDICAL_COMPLICATIONS, SUICIDE, EXECUTION, MISSING_PRESUMED_DEAD
  - Add Other (1): DEPENDENT
  - Maintain existing 10 statuses for backward compatibility

- [ ] 1.2 Write tests for PersonnelStatus enum
  - RED: Test enum has 37 values
  - RED: Test all status groups are present
  - RED: Test backward compatibility with existing 10 statuses
  - GREEN: All tests pass

- [ ] 1.3 Verify npm test passes
  - Run `npm test` and confirm all enum tests pass
  - Commit: `feat(campaign): expand PersonnelStatus from 10 to 37 values`

## 2. Implement Status Behavioral Rules

- [ ] 2.1 Create `src/lib/campaign/personnel/statusRules.ts`
  - Implement isAbsent(status): MIA, POW, ON_LEAVE, ON_MATERNITY_LEAVE, AWOL, STUDENT
  - Implement isSalaryEligible(status): ACTIVE, POW, ON_LEAVE, ON_MATERNITY_LEAVE, STUDENT
  - Implement isDead(status): All 14 death statuses
  - Implement isDepartedUnit(status): All 9 departed statuses
  - Implement getNotificationSeverity(status): NEGATIVE/WARNING/NEUTRAL/POSITIVE

- [ ] 2.2 Write tests for status rules
  - RED: Test isAbsent returns true for absent statuses
  - RED: Test isSalaryEligible returns true for eligible statuses
  - RED: Test isDead returns true for all death statuses
  - RED: Test isDepartedUnit returns true for departed statuses
  - RED: Test getNotificationSeverity returns correct severity
  - GREEN: All tests pass

- [ ] 2.3 Verify npm test passes
  - Run `npm test` and confirm all status rule tests pass
  - Commit: `feat(campaign): add status behavioral rule helpers`

## 3. Implement Status Transition Validation

- [ ] 3.1 Create `src/lib/campaign/personnel/statusTransitions.ts`
  - Define IStatusTransition interface with: fromStatus, toStatus, sideEffects
  - Implement isValidTransition(from, to): Check against valid transitions
  - Implement getTransitionSideEffects(from, to): Return side effects
  - Define side effects: clearAssignments, setDateOfDeath, setDepartureDate, triggerEvent

- [ ] 3.2 Write tests for status transitions
  - RED: Test valid transitions (ACTIVE → WOUNDED, WOUNDED → ACTIVE)
  - RED: Test invalid transitions (KIA → ACTIVE)
  - RED: Test death transitions set dateOfDeath
  - RED: Test departure transitions set departureDate
  - RED: Test transition side effects are returned
  - GREEN: All tests pass

- [ ] 3.3 Verify npm test passes
  - Run `npm test` and confirm all transition tests pass
  - Commit: `feat(campaign): add status transition validation with side effects`

## 4. Expand CampaignPersonnelRole Enum

- [ ] 4.1 Update `src/types/campaign/enums/CampaignPersonnelRole.ts` with ~45 role values
  - Add Combat (14): PILOT, AEROSPACE_PILOT, VEHICLE_DRIVER, NAVAL_VEHICLE_DRIVER, VTOL_PILOT, VEHICLE_GUNNER, VEHICLE_CREW, SOLDIER, BATTLE_ARMOR, CONVENTIONAL_AIRCRAFT_PILOT, PROTOMECH_PILOT, LAM_PILOT, VESSEL_PILOT, VESSEL_GUNNER
  - Add Support (11): TECH, DOCTOR, MEDIC, ADMIN, ASTECH, VESSEL_CREW, VESSEL_NAVIGATOR, HYPERSPACE_NAVIGATOR, MECH_WARRIOR_INSTRUCTOR, AEROSPACE_INSTRUCTOR, VEHICLE_INSTRUCTOR
  - Add Civilian (~20): DEPENDENT, CIVILIAN_OTHER, ADMINISTRATOR, SCIENTIST, ENGINEER, LAWYER, ACCOUNTANT, MERCHANT, FARMER, LABORER, TEACHER, ARTIST, ENTERTAINER, JOURNALIST, POLITICIAN, RELIGIOUS_LEADER, SECURITY, PILOT_CIVILIAN, MEDIC_CIVILIAN, TECH_CIVILIAN
  - Maintain existing 10 roles for backward compatibility

- [ ] 4.2 Write tests for CampaignPersonnelRole enum
  - RED: Test enum has ~45 values
  - RED: Test all role categories are present
  - RED: Test backward compatibility with existing 10 roles
  - GREEN: All tests pass

- [ ] 4.3 Verify npm test passes
  - Run `npm test` and confirm all enum tests pass
  - Commit: `feat(campaign): expand CampaignPersonnelRole from 10 to 45 values`

## 5. Implement Role Category Helpers and Salaries

- [ ] 5.1 Create `src/lib/campaign/personnel/roleSalaries.ts`
  - Define BASE_SALARY_BY_ROLE mapping for all 45 roles
  - Implement getBaseSalary(role): Return base salary for role
  - Implement isCombatRole(role): Check if role is combat
  - Implement isSupportRole(role): Check if role is support
  - Implement isCivilianRole(role): Check if role is civilian

- [ ] 5.2 Write tests for role helpers and salaries
  - RED: Test getBaseSalary returns correct salary for each role
  - RED: Test isCombatRole returns true for combat roles
  - RED: Test isSupportRole returns true for support roles
  - RED: Test isCivilianRole returns true for civilian roles
  - RED: Test all 45 roles have base salary defined
  - GREEN: All tests pass

- [ ] 5.3 Verify npm test passes
  - Run `npm test` and confirm all role tests pass
  - Commit: `feat(campaign): add role category helpers and base salary mapping`

## 6. UI Integration

- [ ] 6.1 Update personnel status dropdown to show all 37 statuses
  - Group statuses by category in dropdown
  - Show notification severity with color coding

- [ ] 6.2 Update personnel role dropdown to show all 45 roles
  - Group roles by category (Combat, Support, Civilian)
  - Show base salary in role selection

- [ ] 6.3 Add status transition validation to personnel detail page
  - Prevent invalid status transitions
  - Show warning for transitions with side effects
  - Confirm before applying side effects

- [ ] 6.4 Verify UI changes
  - Manual testing of status/role dropdowns
  - Test status transition validation
  - Commit: `feat(ui): update personnel status and role UI with expanded values`
