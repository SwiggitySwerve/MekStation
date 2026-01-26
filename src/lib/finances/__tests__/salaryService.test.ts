import {
  BASE_MONTHLY_SALARY,
  ROLE_SALARY_MAPPING,
  XP_SALARY_MULTIPLIER,
  SPECIAL_MULTIPLIERS,
  XP_LEVEL_THRESHOLDS,
  getExperienceLevel,
  getBaseSalaryForRole,
  calculatePersonSalary,
  calculateTotalMonthlySalary,
  createSalaryOptions,
  isEligibleForSalary,
  ExperienceLevel,
  SalaryOptions,
  SalaryBreakdown,
} from '../salaryService';

import { Money } from '@/types/campaign/Money';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import type { IPerson } from '@/types/campaign/Person';
import type { ICampaign, ICampaignOptions } from '@/types/campaign/Campaign';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import type { IForce } from '@/types/campaign/Force';
import type { IMission } from '@/types/campaign/Mission';
import { ForceType, FormationLevel } from '@/types/campaign/enums';

// =============================================================================
// Test Fixtures
// =============================================================================

const DEFAULT_SALARY_OPTIONS: SalaryOptions = {
  salaryMultiplier: 1.0,
  payForSecondaryRole: true,
};

function createTestPerson(overrides?: Partial<IPerson>): IPerson {
  return {
    id: 'person-001',
    name: 'John Smith',
    callsign: 'Hammer',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('3025-01-01'),
    missionsCompleted: 5,
    totalKills: 3,
    xp: 100,
    totalXpEarned: 500,
    xpSpent: 400,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createTestCampaign(overrides?: Partial<ICampaign>): ICampaign {
  return {
    id: 'campaign-001',
    name: 'Test Campaign',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    personnel: new Map<string, IPerson>(),
    forces: new Map<string, IForce>(),
    rootForceId: 'force-root',
    missions: new Map<string, IMission>(),
    finances: { transactions: [], balance: new Money(1000000) },
    options: createDefaultCampaignOptions(),
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// BASE_MONTHLY_SALARY lookup table
// =============================================================================

describe('BASE_MONTHLY_SALARY', () => {
  it('has correct salary for PILOT', () => {
    expect(BASE_MONTHLY_SALARY[CampaignPersonnelRole.PILOT]).toBe(1500);
  });

  it('has correct salary for AEROSPACE_PILOT', () => {
    expect(BASE_MONTHLY_SALARY[CampaignPersonnelRole.AEROSPACE_PILOT]).toBe(1800);
  });

  it('has correct salary for VEHICLE_DRIVER', () => {
    expect(BASE_MONTHLY_SALARY[CampaignPersonnelRole.VEHICLE_DRIVER]).toBe(1200);
  });

  it('has correct salary for TECH', () => {
    expect(BASE_MONTHLY_SALARY[CampaignPersonnelRole.TECH]).toBe(1000);
  });

  it('has correct salary for DOCTOR', () => {
    expect(BASE_MONTHLY_SALARY[CampaignPersonnelRole.DOCTOR]).toBe(2000);
  });

  it('has correct salary for ADMIN', () => {
    expect(BASE_MONTHLY_SALARY[CampaignPersonnelRole.ADMIN]).toBe(800);
  });

  it('has correct salary for MEDIC', () => {
    expect(BASE_MONTHLY_SALARY[CampaignPersonnelRole.MEDIC]).toBe(900);
  });

  it('has correct salary for SUPPORT', () => {
    expect(BASE_MONTHLY_SALARY[CampaignPersonnelRole.SUPPORT]).toBe(600);
  });

  it('has correct salary for SOLDIER', () => {
    expect(BASE_MONTHLY_SALARY[CampaignPersonnelRole.SOLDIER]).toBe(1000);
  });

  it('has correct salary for UNASSIGNED', () => {
    expect(BASE_MONTHLY_SALARY[CampaignPersonnelRole.UNASSIGNED]).toBe(400);
  });

  it('has exactly 10 entries', () => {
    expect(Object.keys(BASE_MONTHLY_SALARY)).toHaveLength(10);
  });
});

// =============================================================================
// XP_SALARY_MULTIPLIER lookup table
// =============================================================================

describe('XP_SALARY_MULTIPLIER', () => {
  it('has correct multiplier for ultra_green', () => {
    expect(XP_SALARY_MULTIPLIER.ultra_green).toBe(0.6);
  });

  it('has correct multiplier for green', () => {
    expect(XP_SALARY_MULTIPLIER.green).toBe(0.8);
  });

  it('has correct multiplier for regular', () => {
    expect(XP_SALARY_MULTIPLIER.regular).toBe(1.0);
  });

  it('has correct multiplier for veteran', () => {
    expect(XP_SALARY_MULTIPLIER.veteran).toBe(1.2);
  });

  it('has correct multiplier for elite', () => {
    expect(XP_SALARY_MULTIPLIER.elite).toBe(1.5);
  });

  it('has correct multiplier for legendary', () => {
    expect(XP_SALARY_MULTIPLIER.legendary).toBe(2.0);
  });

  it('has exactly 6 entries', () => {
    expect(Object.keys(XP_SALARY_MULTIPLIER)).toHaveLength(6);
  });
});

// =============================================================================
// ROLE_SALARY_MAPPING
// =============================================================================

describe('ROLE_SALARY_MAPPING', () => {
  it('maps canonical roles to themselves', () => {
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.PILOT]).toBe(CampaignPersonnelRole.PILOT);
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.DOCTOR]).toBe(CampaignPersonnelRole.DOCTOR);
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.TECH]).toBe(CampaignPersonnelRole.TECH);
  });

  it('maps LAM_PILOT to AEROSPACE_PILOT', () => {
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.LAM_PILOT]).toBe(CampaignPersonnelRole.AEROSPACE_PILOT);
  });

  it('maps MEK_TECH to TECH', () => {
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.MEK_TECH]).toBe(CampaignPersonnelRole.TECH);
  });

  it('maps ADMIN_COMMAND to ADMIN', () => {
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.ADMIN_COMMAND]).toBe(CampaignPersonnelRole.ADMIN);
  });

  it('maps DEPENDENT to UNASSIGNED', () => {
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.DEPENDENT]).toBe(CampaignPersonnelRole.UNASSIGNED);
  });

  it('covers all CampaignPersonnelRole values', () => {
    const allRoles = Object.values(CampaignPersonnelRole);
    for (const role of allRoles) {
      expect(ROLE_SALARY_MAPPING[role]).toBeDefined();
    }
  });
});

// =============================================================================
// getExperienceLevel
// =============================================================================

describe('getExperienceLevel', () => {
  it('returns ultra_green for 0 XP', () => {
    const person = createTestPerson({ totalXpEarned: 0 });
    expect(getExperienceLevel(person)).toBe('ultra_green');
  });

  it('returns ultra_green for 99 XP', () => {
    const person = createTestPerson({ totalXpEarned: 99 });
    expect(getExperienceLevel(person)).toBe('ultra_green');
  });

  it('returns green for 100 XP', () => {
    const person = createTestPerson({ totalXpEarned: 100 });
    expect(getExperienceLevel(person)).toBe('green');
  });

  it('returns green for 499 XP', () => {
    const person = createTestPerson({ totalXpEarned: 499 });
    expect(getExperienceLevel(person)).toBe('green');
  });

  it('returns regular for 500 XP', () => {
    const person = createTestPerson({ totalXpEarned: 500 });
    expect(getExperienceLevel(person)).toBe('regular');
  });

  it('returns regular for 1999 XP', () => {
    const person = createTestPerson({ totalXpEarned: 1999 });
    expect(getExperienceLevel(person)).toBe('regular');
  });

  it('returns veteran for 2000 XP', () => {
    const person = createTestPerson({ totalXpEarned: 2000 });
    expect(getExperienceLevel(person)).toBe('veteran');
  });

  it('returns elite for 4000 XP', () => {
    const person = createTestPerson({ totalXpEarned: 4000 });
    expect(getExperienceLevel(person)).toBe('elite');
  });

  it('returns legendary for 8000 XP', () => {
    const person = createTestPerson({ totalXpEarned: 8000 });
    expect(getExperienceLevel(person)).toBe('legendary');
  });

  it('returns legendary for very high XP', () => {
    const person = createTestPerson({ totalXpEarned: 50000 });
    expect(getExperienceLevel(person)).toBe('legendary');
  });
});

// =============================================================================
// getBaseSalaryForRole
// =============================================================================

describe('getBaseSalaryForRole', () => {
  it('returns 1500 for PILOT', () => {
    expect(getBaseSalaryForRole(CampaignPersonnelRole.PILOT)).toBe(1500);
  });

  it('returns 1800 for LAM_PILOT (mapped to AEROSPACE_PILOT)', () => {
    expect(getBaseSalaryForRole(CampaignPersonnelRole.LAM_PILOT)).toBe(1800);
  });

  it('returns 1000 for MEK_TECH (mapped to TECH)', () => {
    expect(getBaseSalaryForRole(CampaignPersonnelRole.MEK_TECH)).toBe(1000);
  });

  it('returns 400 for DEPENDENT (mapped to UNASSIGNED)', () => {
    expect(getBaseSalaryForRole(CampaignPersonnelRole.DEPENDENT)).toBe(400);
  });

  it('returns 800 for ADMIN_COMMAND (mapped to ADMIN)', () => {
    expect(getBaseSalaryForRole(CampaignPersonnelRole.ADMIN_COMMAND)).toBe(800);
  });
});

// =============================================================================
// calculatePersonSalary
// =============================================================================

describe('calculatePersonSalary', () => {
  // Acceptance Criteria: Pilot at regular = 1500 × 1.0 = 1500
  it('calculates pilot at regular experience = 1500', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 500, // regular
    });
    const salary = calculatePersonSalary(person, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(1500);
  });

  // Acceptance Criteria: Pilot at elite = 1500 × 1.5 = 2250
  it('calculates pilot at elite experience = 2250', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 4000, // elite
    });
    const salary = calculatePersonSalary(person, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(2250);
  });

  it('calculates doctor at veteran experience = 2400', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.DOCTOR,
      totalXpEarned: 2000, // veteran
    });
    const salary = calculatePersonSalary(person, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(2400); // 2000 × 1.2
  });

  it('calculates soldier at ultra_green experience = 600', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.SOLDIER,
      totalXpEarned: 0, // ultra_green
    });
    const salary = calculatePersonSalary(person, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(600); // 1000 × 0.6
  });

  it('calculates unassigned at regular experience = 400', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.UNASSIGNED,
      totalXpEarned: 500, // regular
    });
    const salary = calculatePersonSalary(person, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(400); // 400 × 1.0
  });

  it('calculates aerospace pilot at legendary = 3600', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.AEROSPACE_PILOT,
      totalXpEarned: 8000, // legendary
    });
    const salary = calculatePersonSalary(person, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(3600); // 1800 × 2.0
  });

  // Acceptance Criteria: Secondary role adds 50% of its base
  it('adds secondary role at 50% when payForSecondaryRole is true', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.PILOT,
      secondaryRole: CampaignPersonnelRole.TECH,
      totalXpEarned: 500, // regular
    });
    const salary = calculatePersonSalary(person, DEFAULT_SALARY_OPTIONS);
    // 1500 × 1.0 × 1.0 + 1000 × 0.5 = 1500 + 500 = 2000
    expect(salary.amount).toBe(2000);
  });

  it('does not add secondary role when payForSecondaryRole is false', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.PILOT,
      secondaryRole: CampaignPersonnelRole.TECH,
      totalXpEarned: 500, // regular
    });
    const options: SalaryOptions = { salaryMultiplier: 1.0, payForSecondaryRole: false };
    const salary = calculatePersonSalary(person, options);
    expect(salary.amount).toBe(1500); // No secondary role bonus
  });

  it('does not add secondary role when person has no secondary role', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.PILOT,
      secondaryRole: undefined,
      totalXpEarned: 500,
    });
    const salary = calculatePersonSalary(person, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(1500);
  });

  // Acceptance Criteria: Salary multiplier option applies
  it('applies salary multiplier of 1.5', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 500, // regular
    });
    const options: SalaryOptions = { salaryMultiplier: 1.5, payForSecondaryRole: true };
    const salary = calculatePersonSalary(person, options);
    expect(salary.amount).toBe(2250); // 1500 × 1.0 × 1.5
  });

  it('applies salary multiplier of 0.5', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 500, // regular
    });
    const options: SalaryOptions = { salaryMultiplier: 0.5, payForSecondaryRole: true };
    const salary = calculatePersonSalary(person, options);
    expect(salary.amount).toBe(750); // 1500 × 1.0 × 0.5
  });

  it('applies salary multiplier with secondary role (multiplier only affects primary)', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.PILOT,
      secondaryRole: CampaignPersonnelRole.TECH,
      totalXpEarned: 500, // regular
    });
    const options: SalaryOptions = { salaryMultiplier: 2.0, payForSecondaryRole: true };
    const salary = calculatePersonSalary(person, options);
    // (1500 × 1.0 × 2.0) + (1000 × 0.5) = 3000 + 500 = 3500
    expect(salary.amount).toBe(3500);
  });

  it('handles mapped roles correctly (MEK_TECH → TECH salary)', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.MEK_TECH,
      totalXpEarned: 500, // regular
    });
    const salary = calculatePersonSalary(person, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(1000); // TECH base = 1000
  });

  it('combines XP multiplier and salary multiplier', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 4000, // elite (1.5x)
    });
    const options: SalaryOptions = { salaryMultiplier: 2.0, payForSecondaryRole: true };
    const salary = calculatePersonSalary(person, options);
    // 1500 × 1.5 × 2.0 = 4500
    expect(salary.amount).toBe(4500);
  });
});

// =============================================================================
// isEligibleForSalary
// =============================================================================

describe('isEligibleForSalary', () => {
  it('returns true for ACTIVE personnel', () => {
    const person = createTestPerson({ status: PersonnelStatus.ACTIVE });
    expect(isEligibleForSalary(person)).toBe(true);
  });

  it('returns true for WOUNDED personnel', () => {
    const person = createTestPerson({ status: PersonnelStatus.WOUNDED });
    expect(isEligibleForSalary(person)).toBe(true);
  });

  it('returns true for ON_LEAVE personnel', () => {
    const person = createTestPerson({ status: PersonnelStatus.ON_LEAVE });
    expect(isEligibleForSalary(person)).toBe(true);
  });

  it('returns true for POW personnel', () => {
    const person = createTestPerson({ status: PersonnelStatus.POW });
    expect(isEligibleForSalary(person)).toBe(true);
  });

  it('returns false for KIA personnel', () => {
    const person = createTestPerson({ status: PersonnelStatus.KIA });
    expect(isEligibleForSalary(person)).toBe(false);
  });

  it('returns false for RETIRED personnel', () => {
    const person = createTestPerson({ status: PersonnelStatus.RETIRED });
    expect(isEligibleForSalary(person)).toBe(false);
  });

  it('returns false for DESERTED personnel', () => {
    const person = createTestPerson({ status: PersonnelStatus.DESERTED });
    expect(isEligibleForSalary(person)).toBe(false);
  });
});

// =============================================================================
// createSalaryOptions
// =============================================================================

describe('createSalaryOptions', () => {
  it('extracts salaryMultiplier from campaign options', () => {
    const campaignOptions = createDefaultCampaignOptions();
    const salaryOptions = createSalaryOptions(campaignOptions);
    expect(salaryOptions.salaryMultiplier).toBe(1.0);
  });

  it('defaults payForSecondaryRole to true', () => {
    const campaignOptions = createDefaultCampaignOptions();
    const salaryOptions = createSalaryOptions(campaignOptions);
    expect(salaryOptions.payForSecondaryRole).toBe(true);
  });

  it('respects custom salaryMultiplier', () => {
    const campaignOptions = { ...createDefaultCampaignOptions(), salaryMultiplier: 2.5 };
    const salaryOptions = createSalaryOptions(campaignOptions);
    expect(salaryOptions.salaryMultiplier).toBe(2.5);
  });
});

// =============================================================================
// calculateTotalMonthlySalary
// =============================================================================

describe('calculateTotalMonthlySalary', () => {
  it('returns zero for empty campaign', () => {
    const campaign = createTestCampaign();
    const breakdown = calculateTotalMonthlySalary(campaign);
    expect(breakdown.total.amount).toBe(0);
    expect(breakdown.personnelCount).toBe(0);
  });

  // Acceptance Criteria: Total monthly salary sums all personnel
  it('sums salaries for multiple personnel', () => {
    const personnel = new Map<string, IPerson>();
    // Pilot at regular = 1500
    personnel.set('p1', createTestPerson({
      id: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 500,
    }));
    // Doctor at regular = 2000
    personnel.set('p2', createTestPerson({
      id: 'p2',
      primaryRole: CampaignPersonnelRole.DOCTOR,
      totalXpEarned: 500,
    }));
    // Tech at regular = 1000
    personnel.set('p3', createTestPerson({
      id: 'p3',
      primaryRole: CampaignPersonnelRole.TECH,
      totalXpEarned: 500,
    }));

    const campaign = createTestCampaign({ personnel });
    const breakdown = calculateTotalMonthlySalary(campaign);

    expect(breakdown.total.amount).toBe(4500); // 1500 + 2000 + 1000
    expect(breakdown.personnelCount).toBe(3);
  });

  it('excludes KIA personnel from salary', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({
      id: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 500,
      status: PersonnelStatus.ACTIVE,
    }));
    personnel.set('p2', createTestPerson({
      id: 'p2',
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 500,
      status: PersonnelStatus.KIA,
    }));

    const campaign = createTestCampaign({ personnel });
    const breakdown = calculateTotalMonthlySalary(campaign);

    expect(breakdown.total.amount).toBe(1500); // Only active pilot
    expect(breakdown.personnelCount).toBe(1);
  });

  it('excludes RETIRED personnel from salary', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({
      id: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 500,
      status: PersonnelStatus.RETIRED,
    }));

    const campaign = createTestCampaign({ personnel });
    const breakdown = calculateTotalMonthlySalary(campaign);

    expect(breakdown.total.amount).toBe(0);
    expect(breakdown.personnelCount).toBe(0);
  });

  it('categorizes salaries by role type', () => {
    const personnel = new Map<string, IPerson>();
    // Combat: Pilot = 1500
    personnel.set('p1', createTestPerson({
      id: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 500,
    }));
    // Support: Doctor = 2000
    personnel.set('p2', createTestPerson({
      id: 'p2',
      primaryRole: CampaignPersonnelRole.DOCTOR,
      totalXpEarned: 500,
    }));
    // Civilian: DEPENDENT → UNASSIGNED = 400
    personnel.set('p3', createTestPerson({
      id: 'p3',
      primaryRole: CampaignPersonnelRole.DEPENDENT,
      totalXpEarned: 500,
    }));

    const campaign = createTestCampaign({ personnel });
    const breakdown = calculateTotalMonthlySalary(campaign);

    expect(breakdown.combatSalaries.amount).toBe(1500);
    expect(breakdown.supportSalaries.amount).toBe(2000);
    expect(breakdown.civilianSalaries.amount).toBe(400);
    expect(breakdown.total.amount).toBe(3900);
  });

  it('provides per-person salary entries', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({
      id: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 500,
    }));
    personnel.set('p2', createTestPerson({
      id: 'p2',
      primaryRole: CampaignPersonnelRole.DOCTOR,
      totalXpEarned: 500,
    }));

    const campaign = createTestCampaign({ personnel });
    const breakdown = calculateTotalMonthlySalary(campaign);

    expect(breakdown.entries.size).toBe(2);
    expect(breakdown.entries.get('p1')?.amount).toBe(1500);
    expect(breakdown.entries.get('p2')?.amount).toBe(2000);
  });

  it('returns zero when payForSalaries is disabled', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({
      id: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 500,
    }));

    const options = { ...createDefaultCampaignOptions(), payForSalaries: false };
    const campaign = createTestCampaign({ personnel, options });
    const breakdown = calculateTotalMonthlySalary(campaign);

    expect(breakdown.total.amount).toBe(0);
    expect(breakdown.personnelCount).toBe(0);
  });

  it('applies salary multiplier from campaign options', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({
      id: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 500, // regular
    }));

    const options = { ...createDefaultCampaignOptions(), salaryMultiplier: 2.0 };
    const campaign = createTestCampaign({ personnel, options });
    const breakdown = calculateTotalMonthlySalary(campaign);

    expect(breakdown.total.amount).toBe(3000); // 1500 × 1.0 × 2.0
  });

  it('includes secondary role salary in total', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({
      id: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
      secondaryRole: CampaignPersonnelRole.TECH,
      totalXpEarned: 500,
    }));

    const campaign = createTestCampaign({ personnel });
    const breakdown = calculateTotalMonthlySalary(campaign);

    // 1500 + (1000 × 0.5) = 2000
    expect(breakdown.total.amount).toBe(2000);
  });

  it('handles mixed experience levels correctly', () => {
    const personnel = new Map<string, IPerson>();
    // Pilot at elite = 1500 × 1.5 = 2250
    personnel.set('p1', createTestPerson({
      id: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
      totalXpEarned: 4000,
    }));
    // Soldier at green = 1000 × 0.8 = 800
    personnel.set('p2', createTestPerson({
      id: 'p2',
      primaryRole: CampaignPersonnelRole.SOLDIER,
      totalXpEarned: 100,
    }));

    const campaign = createTestCampaign({ personnel });
    const breakdown = calculateTotalMonthlySalary(campaign);

    expect(breakdown.total.amount).toBe(3050); // 2250 + 800
  });
});

// =============================================================================
// SPECIAL_MULTIPLIERS
// =============================================================================

describe('SPECIAL_MULTIPLIERS', () => {
  it('has antiMek multiplier of 1.5', () => {
    expect(SPECIAL_MULTIPLIERS.antiMek).toBe(1.5);
  });

  it('has specialistInfantry multiplier of 1.28', () => {
    expect(SPECIAL_MULTIPLIERS.specialistInfantry).toBe(1.28);
  });

  it('has secondaryRoleRatio of 0.5', () => {
    expect(SPECIAL_MULTIPLIERS.secondaryRoleRatio).toBe(0.5);
  });
});

// =============================================================================
// XP_LEVEL_THRESHOLDS
// =============================================================================

describe('XP_LEVEL_THRESHOLDS', () => {
  it('is sorted in descending order by minXp', () => {
    for (let i = 0; i < XP_LEVEL_THRESHOLDS.length - 1; i++) {
      expect(XP_LEVEL_THRESHOLDS[i].minXp).toBeGreaterThan(XP_LEVEL_THRESHOLDS[i + 1].minXp);
    }
  });

  it('has 6 levels', () => {
    expect(XP_LEVEL_THRESHOLDS).toHaveLength(6);
  });

  it('starts at 0 for ultra_green', () => {
    const ultraGreen = XP_LEVEL_THRESHOLDS.find(t => t.level === 'ultra_green');
    expect(ultraGreen?.minXp).toBe(0);
  });
});
