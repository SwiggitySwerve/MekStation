import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

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
  SalaryOptions,
} from '../salaryService';

// =============================================================================
// Test Fixtures
// =============================================================================

const DEFAULT_SALARY_OPTIONS: SalaryOptions = {
  salaryMultiplier: 1.0,
  payForSecondaryRole: true,
};

/**
 * Builds a minimal valid ICampaignRosterEntry for salary tests.
 * All optional fields are omitted — only required fields set.
 */
function makeRosterEntry(
  overrides?: Partial<ICampaignRosterEntry>,
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-001',
    pilotName: 'John Smith',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

/**
 * Builds a minimal valid IPilot for XP-based salary tests.
 * career.totalXpEarned drives getExperienceLevel.
 */
function makeVaultPilot(
  totalXpEarned: number,
  overrides?: Partial<IPilot>,
): IPilot {
  return {
    id: 'pilot-001',
    name: 'John Smith',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    career: {
      missionsCompleted: 0,
      victories: 0,
      defeats: 0,
      draws: 0,
      totalKills: 0,
      killRecords: [],
      missionHistory: [],
      xp: totalXpEarned,
      totalXpEarned,
      rank: 'MechWarrior',
    },
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
    expect(BASE_MONTHLY_SALARY[CampaignPersonnelRole.AEROSPACE_PILOT]).toBe(
      1800,
    );
  });

  it('has correct salary for VEHICLE_DRIVER', () => {
    expect(BASE_MONTHLY_SALARY[CampaignPersonnelRole.VEHICLE_DRIVER]).toBe(
      1200,
    );
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
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.PILOT]).toBe(
      CampaignPersonnelRole.PILOT,
    );
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.DOCTOR]).toBe(
      CampaignPersonnelRole.DOCTOR,
    );
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.TECH]).toBe(
      CampaignPersonnelRole.TECH,
    );
  });

  it('maps LAM_PILOT to AEROSPACE_PILOT', () => {
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.LAM_PILOT]).toBe(
      CampaignPersonnelRole.AEROSPACE_PILOT,
    );
  });

  it('maps MEK_TECH to TECH', () => {
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.MEK_TECH]).toBe(
      CampaignPersonnelRole.TECH,
    );
  });

  it('maps ADMIN_COMMAND to ADMIN', () => {
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.ADMIN_COMMAND]).toBe(
      CampaignPersonnelRole.ADMIN,
    );
  });

  it('maps DEPENDENT to UNASSIGNED', () => {
    expect(ROLE_SALARY_MAPPING[CampaignPersonnelRole.DEPENDENT]).toBe(
      CampaignPersonnelRole.UNASSIGNED,
    );
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
  const entry = makeRosterEntry();

  it('returns ultra_green for 0 XP', () => {
    expect(getExperienceLevel(entry, makeVaultPilot(0))).toBe('ultra_green');
  });

  it('returns ultra_green for 99 XP', () => {
    expect(getExperienceLevel(entry, makeVaultPilot(99))).toBe('ultra_green');
  });

  it('returns green for 100 XP', () => {
    expect(getExperienceLevel(entry, makeVaultPilot(100))).toBe('green');
  });

  it('returns green for 499 XP', () => {
    expect(getExperienceLevel(entry, makeVaultPilot(499))).toBe('green');
  });

  it('returns regular for 500 XP', () => {
    expect(getExperienceLevel(entry, makeVaultPilot(500))).toBe('regular');
  });

  it('returns regular for 1999 XP', () => {
    expect(getExperienceLevel(entry, makeVaultPilot(1999))).toBe('regular');
  });

  it('returns veteran for 2000 XP', () => {
    expect(getExperienceLevel(entry, makeVaultPilot(2000))).toBe('veteran');
  });

  it('returns elite for 4000 XP', () => {
    expect(getExperienceLevel(entry, makeVaultPilot(4000))).toBe('elite');
  });

  it('returns legendary for 8000 XP', () => {
    expect(getExperienceLevel(entry, makeVaultPilot(8000))).toBe('legendary');
  });

  it('returns legendary for very high XP', () => {
    expect(getExperienceLevel(entry, makeVaultPilot(50000))).toBe('legendary');
  });

  it('returns ultra_green for null (NPC with no vault record + no campaign XP)', () => {
    // NPC domain matrix: finance = PROCESS. NPCs default to ultra_green tier
    // when entry has no accumulated campaign XP.
    expect(getExperienceLevel(entry, null)).toBe('ultra_green');
  });

  it('returns regular for NPC entry with 500 campaign XP and null pilot', () => {
    // Per Council #4 + finance NPC matrix: NPCs use entry.campaignXpEarned
    // as the XP source when no vault pilot exists.
    const npcEntry = makeRosterEntry({ campaignXpEarned: 500 });
    expect(getExperienceLevel(npcEntry, null)).toBe('regular');
  });

  it('returns ultra_green for pilot with no career field', () => {
    // career is optional on IPilot; absence treats as 0 XP
    const pilotNoCareer = makeVaultPilot(0, { career: undefined });
    expect(getExperienceLevel(entry, pilotNoCareer)).toBe('ultra_green');
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
    const entry = makeRosterEntry({ primaryRole: CampaignPersonnelRole.PILOT });
    const pilot = makeVaultPilot(500); // regular
    const salary = calculatePersonSalary(entry, pilot, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(1500);
  });

  // Acceptance Criteria: Pilot at elite = 1500 × 1.5 = 2250
  it('calculates pilot at elite experience = 2250', () => {
    const entry = makeRosterEntry({ primaryRole: CampaignPersonnelRole.PILOT });
    const pilot = makeVaultPilot(4000); // elite
    const salary = calculatePersonSalary(entry, pilot, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(2250);
  });

  it('calculates doctor at veteran experience = 2400', () => {
    const entry = makeRosterEntry({
      primaryRole: CampaignPersonnelRole.DOCTOR,
    });
    const pilot = makeVaultPilot(2000); // veteran
    const salary = calculatePersonSalary(entry, pilot, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(2400); // 2000 × 1.2
  });

  it('calculates soldier at ultra_green experience = 600', () => {
    const entry = makeRosterEntry({
      primaryRole: CampaignPersonnelRole.SOLDIER,
    });
    const pilot = makeVaultPilot(0); // ultra_green
    const salary = calculatePersonSalary(entry, pilot, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(600); // 1000 × 0.6
  });

  it('calculates unassigned at regular experience = 400', () => {
    const entry = makeRosterEntry({
      primaryRole: CampaignPersonnelRole.UNASSIGNED,
    });
    const pilot = makeVaultPilot(500); // regular
    const salary = calculatePersonSalary(entry, pilot, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(400); // 400 × 1.0
  });

  it('calculates aerospace pilot at legendary = 3600', () => {
    const entry = makeRosterEntry({
      primaryRole: CampaignPersonnelRole.AEROSPACE_PILOT,
    });
    const pilot = makeVaultPilot(8000); // legendary
    const salary = calculatePersonSalary(entry, pilot, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(3600); // 1800 × 2.0
  });

  // Acceptance Criteria: Salary multiplier option applies
  it('applies salary multiplier of 1.5', () => {
    const entry = makeRosterEntry({ primaryRole: CampaignPersonnelRole.PILOT });
    const pilot = makeVaultPilot(500); // regular
    const options: SalaryOptions = {
      salaryMultiplier: 1.5,
      payForSecondaryRole: true,
    };
    const salary = calculatePersonSalary(entry, pilot, options);
    expect(salary.amount).toBe(2250); // 1500 × 1.0 × 1.5
  });

  it('applies salary multiplier of 0.5', () => {
    const entry = makeRosterEntry({ primaryRole: CampaignPersonnelRole.PILOT });
    const pilot = makeVaultPilot(500); // regular
    const options: SalaryOptions = {
      salaryMultiplier: 0.5,
      payForSecondaryRole: true,
    };
    const salary = calculatePersonSalary(entry, pilot, options);
    expect(salary.amount).toBe(750); // 1500 × 1.0 × 0.5
  });

  it('handles mapped roles correctly (MEK_TECH → TECH salary)', () => {
    const entry = makeRosterEntry({
      primaryRole: CampaignPersonnelRole.MEK_TECH,
    });
    const pilot = makeVaultPilot(500); // regular
    const salary = calculatePersonSalary(entry, pilot, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(1000); // TECH base = 1000
  });

  it('combines XP multiplier and salary multiplier', () => {
    const entry = makeRosterEntry({ primaryRole: CampaignPersonnelRole.PILOT });
    const pilot = makeVaultPilot(4000); // elite (1.5x)
    const options: SalaryOptions = {
      salaryMultiplier: 2.0,
      payForSecondaryRole: true,
    };
    const salary = calculatePersonSalary(entry, pilot, options);
    // 1500 × 1.5 × 2.0 = 4500
    expect(salary.amount).toBe(4500);
  });

  it('applies the roster rank pay multiplier', () => {
    const entry = makeRosterEntry({
      primaryRole: CampaignPersonnelRole.PILOT,
      rankIndex: 31,
    });
    const pilot = makeVaultPilot(500); // regular
    const salary = calculatePersonSalary(entry, pilot, DEFAULT_SALARY_OPTIONS);

    expect(salary.amount).toBe(2100); // 1500 Ã— regular Ã— mercenary rank 31 (1.4)
  });

  it('charges NPC entries (pilot === null) at ultra_green rate', () => {
    // NPC domain matrix: finance = PROCESS. NPCs cost money at floor XP rate.
    const entry = makeRosterEntry({ primaryRole: CampaignPersonnelRole.PILOT });
    const salary = calculatePersonSalary(entry, null, DEFAULT_SALARY_OPTIONS);
    expect(salary.amount).toBe(900); // 1500 × 0.6 (ultra_green)
  });
});

// =============================================================================
// isEligibleForSalary
// =============================================================================

describe('isEligibleForSalary', () => {
  it('returns true for Active personnel', () => {
    const entry = makeRosterEntry({ status: CampaignPilotStatus.Active });
    expect(isEligibleForSalary(entry)).toBe(true);
  });

  it('returns true for Wounded personnel', () => {
    const entry = makeRosterEntry({ status: CampaignPilotStatus.Wounded });
    expect(isEligibleForSalary(entry)).toBe(true);
  });

  it('returns true for Critical personnel', () => {
    // Critical is still alive; salary still accrues
    const entry = makeRosterEntry({ status: CampaignPilotStatus.Critical });
    expect(isEligibleForSalary(entry)).toBe(true);
  });

  it('returns true for MIA personnel', () => {
    // MIA personnel still incur salary until formally resolved
    const entry = makeRosterEntry({ status: CampaignPilotStatus.MIA });
    expect(isEligibleForSalary(entry)).toBe(true);
  });

  it('returns false for KIA personnel', () => {
    const entry = makeRosterEntry({ status: CampaignPilotStatus.KIA });
    expect(isEligibleForSalary(entry)).toBe(false);
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
    const campaignOptions = {
      ...createDefaultCampaignOptions(),
      salaryMultiplier: 2.5,
    };
    const salaryOptions = createSalaryOptions(campaignOptions);
    expect(salaryOptions.salaryMultiplier).toBe(2.5);
  });
});

// =============================================================================
// calculateTotalMonthlySalary
// =============================================================================

describe('calculateTotalMonthlySalary', () => {
  it('returns zero for empty roster', () => {
    const options = createDefaultCampaignOptions();
    const breakdown = calculateTotalMonthlySalary([], new Map(), options);
    expect(breakdown.total.amount).toBe(0);
    expect(breakdown.personnelCount).toBe(0);
  });

  // Acceptance Criteria: Total monthly salary sums all personnel
  it('sums salaries for multiple personnel', () => {
    // Pilot at regular = 1500
    const entry1 = makeRosterEntry({
      pilotId: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
    });
    // Doctor at regular = 2000
    const entry2 = makeRosterEntry({
      pilotId: 'p2',
      primaryRole: CampaignPersonnelRole.DOCTOR,
    });
    // Tech at regular = 1000
    const entry3 = makeRosterEntry({
      pilotId: 'p3',
      primaryRole: CampaignPersonnelRole.TECH,
    });

    const pilotsMap = new Map([
      ['p1', makeVaultPilot(500, { id: 'p1' })],
      ['p2', makeVaultPilot(500, { id: 'p2' })],
      ['p3', makeVaultPilot(500, { id: 'p3' })],
    ]);

    const options = createDefaultCampaignOptions();
    const breakdown = calculateTotalMonthlySalary(
      [entry1, entry2, entry3],
      pilotsMap,
      options,
    );

    expect(breakdown.total.amount).toBe(4500); // 1500 + 2000 + 1000
    expect(breakdown.personnelCount).toBe(3);
  });

  it('excludes KIA personnel from salary', () => {
    const entry1 = makeRosterEntry({
      pilotId: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
      status: CampaignPilotStatus.Active,
    });
    const entry2 = makeRosterEntry({
      pilotId: 'p2',
      primaryRole: CampaignPersonnelRole.PILOT,
      status: CampaignPilotStatus.KIA,
    });

    const pilotsMap = new Map([
      ['p1', makeVaultPilot(500, { id: 'p1' })],
      ['p2', makeVaultPilot(500, { id: 'p2' })],
    ]);

    const options = createDefaultCampaignOptions();
    const breakdown = calculateTotalMonthlySalary(
      [entry1, entry2],
      pilotsMap,
      options,
    );

    expect(breakdown.total.amount).toBe(1500); // Only active pilot
    expect(breakdown.personnelCount).toBe(1);
  });

  it('counts all non-KIA statuses as eligible for salary', () => {
    // CampaignPilotStatus has no RETIRED or DESERTED — only KIA is excluded.
    // Wounded, Critical, MIA all still incur salary.
    const entries = [
      makeRosterEntry({ pilotId: 'p1', status: CampaignPilotStatus.Wounded }),
      makeRosterEntry({ pilotId: 'p2', status: CampaignPilotStatus.Critical }),
      makeRosterEntry({ pilotId: 'p3', status: CampaignPilotStatus.MIA }),
    ];

    const pilotsMap = new Map([
      ['p1', makeVaultPilot(500, { id: 'p1' })],
      ['p2', makeVaultPilot(500, { id: 'p2' })],
      ['p3', makeVaultPilot(500, { id: 'p3' })],
    ]);

    const options = createDefaultCampaignOptions();
    const breakdown = calculateTotalMonthlySalary(entries, pilotsMap, options);

    expect(breakdown.personnelCount).toBe(3);
    expect(breakdown.total.amount).toBe(4500); // 3 × 1500 PILOT regular
  });

  it('categorizes salaries by role type', () => {
    // Combat: Pilot = 1500
    const entry1 = makeRosterEntry({
      pilotId: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
    });
    // Support: Doctor = 2000
    const entry2 = makeRosterEntry({
      pilotId: 'p2',
      primaryRole: CampaignPersonnelRole.DOCTOR,
    });
    // Civilian: DEPENDENT → UNASSIGNED = 400
    const entry3 = makeRosterEntry({
      pilotId: 'p3',
      primaryRole: CampaignPersonnelRole.DEPENDENT,
    });

    const pilotsMap = new Map([
      ['p1', makeVaultPilot(500, { id: 'p1' })],
      ['p2', makeVaultPilot(500, { id: 'p2' })],
      ['p3', makeVaultPilot(500, { id: 'p3' })],
    ]);

    const options = createDefaultCampaignOptions();
    const breakdown = calculateTotalMonthlySalary(
      [entry1, entry2, entry3],
      pilotsMap,
      options,
    );

    expect(breakdown.combatSalaries.amount).toBe(1500);
    expect(breakdown.supportSalaries.amount).toBe(2000);
    expect(breakdown.civilianSalaries.amount).toBe(400);
    expect(breakdown.total.amount).toBe(3900);
  });

  it('provides per-person salary entries', () => {
    const entry1 = makeRosterEntry({
      pilotId: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
    });
    const entry2 = makeRosterEntry({
      pilotId: 'p2',
      primaryRole: CampaignPersonnelRole.DOCTOR,
    });

    const pilotsMap = new Map([
      ['p1', makeVaultPilot(500, { id: 'p1' })],
      ['p2', makeVaultPilot(500, { id: 'p2' })],
    ]);

    const options = createDefaultCampaignOptions();
    const breakdown = calculateTotalMonthlySalary(
      [entry1, entry2],
      pilotsMap,
      options,
    );

    expect(breakdown.entries.size).toBe(2);
    expect(breakdown.entries.get('p1')?.amount).toBe(1500);
    expect(breakdown.entries.get('p2')?.amount).toBe(2000);
  });

  it('returns zero when payForSalaries is disabled', () => {
    const entry1 = makeRosterEntry({
      pilotId: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
    });

    const pilotsMap = new Map([['p1', makeVaultPilot(500, { id: 'p1' })]]);

    const options = {
      ...createDefaultCampaignOptions(),
      payForSalaries: false,
    };
    const breakdown = calculateTotalMonthlySalary([entry1], pilotsMap, options);

    expect(breakdown.total.amount).toBe(0);
    expect(breakdown.personnelCount).toBe(0);
  });

  it('applies salary multiplier from options', () => {
    const entry1 = makeRosterEntry({
      pilotId: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
    });

    const pilotsMap = new Map([['p1', makeVaultPilot(500, { id: 'p1' })]]);

    const options = {
      ...createDefaultCampaignOptions(),
      salaryMultiplier: 2.0,
    };
    const breakdown = calculateTotalMonthlySalary([entry1], pilotsMap, options);

    expect(breakdown.total.amount).toBe(3000); // 1500 × 1.0 × 2.0
  });

  it('handles mixed experience levels correctly', () => {
    // Pilot at elite = 1500 × 1.5 = 2250
    const entry1 = makeRosterEntry({
      pilotId: 'p1',
      primaryRole: CampaignPersonnelRole.PILOT,
    });
    // Soldier at green = 1000 × 0.8 = 800
    const entry2 = makeRosterEntry({
      pilotId: 'p2',
      primaryRole: CampaignPersonnelRole.SOLDIER,
    });

    const pilotsMap = new Map([
      ['p1', makeVaultPilot(4000, { id: 'p1' })],
      ['p2', makeVaultPilot(100, { id: 'p2' })],
    ]);

    const options = createDefaultCampaignOptions();
    const breakdown = calculateTotalMonthlySalary(
      [entry1, entry2],
      pilotsMap,
      options,
    );

    expect(breakdown.total.amount).toBe(3050); // 2250 + 800
  });

  it('charges NPC entries (no vault record) at ultra_green rate', () => {
    // NPC domain matrix: finance = PROCESS. Entries without a vault match
    // default to null pilot → ultra_green XP tier.
    const entry = makeRosterEntry({
      pilotId: 'npc-001',
      primaryRole: CampaignPersonnelRole.PILOT,
    });

    // Empty pilots map — NPC has no vault counterpart
    const pilotsMap = new Map<string, IPilot>();

    const options = createDefaultCampaignOptions();
    const breakdown = calculateTotalMonthlySalary([entry], pilotsMap, options);

    expect(breakdown.personnelCount).toBe(1);
    expect(breakdown.total.amount).toBe(900); // 1500 × 0.6 (ultra_green)
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
      expect(XP_LEVEL_THRESHOLDS[i].minXp).toBeGreaterThan(
        XP_LEVEL_THRESHOLDS[i + 1].minXp,
      );
    }
  });

  it('has 6 levels', () => {
    expect(XP_LEVEL_THRESHOLDS).toHaveLength(6);
  });

  it('starts at 0 for ultra_green', () => {
    const ultraGreen = XP_LEVEL_THRESHOLDS.find(
      (t) => t.level === 'ultra_green',
    );
    expect(ultraGreen?.minXp).toBe(0);
  });
});
