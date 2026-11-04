/**
 * Role base salary mapping tests
 * Verifies salary values for all 48 roles
 */

import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

import { BASE_SALARY_BY_ROLE, getBaseSalary } from './roleSalaries';

describe('Role Base Salary Mapping', () => {
  describe('BASE_SALARY_BY_ROLE', () => {
    it('should have salary defined for all 48 roles', () => {
      const allRoles = Object.values(CampaignPersonnelRole);
      expect(allRoles).toHaveLength(48);

      allRoles.forEach((role) => {
        expect(BASE_SALARY_BY_ROLE[role]).toBeDefined();
        expect(typeof BASE_SALARY_BY_ROLE[role]).toBe('number');
      });
    });

    it('should have exactly 48 salary entries', () => {
      const salaryEntries = Object.keys(BASE_SALARY_BY_ROLE);
      expect(salaryEntries).toHaveLength(48);
    });
  });

  describe('Combat Role Salaries', () => {
    it('should have PILOT salary = 1500', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.PILOT]).toBe(1500);
    });

    it('should have LAM_PILOT salary = 1500', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.LAM_PILOT]).toBe(1500);
    });

    it('should have AEROSPACE_PILOT salary = 1500', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.AEROSPACE_PILOT]).toBe(
        1500,
      );
    });

    it('should have VEHICLE_DRIVER salary = 900', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.VEHICLE_DRIVER]).toBe(
        900,
      );
    });

    it('should have SOLDIER salary = 600', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.SOLDIER]).toBe(600);
    });

    it('should have BATTLE_ARMOUR salary = 1200', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.BATTLE_ARMOUR]).toBe(
        1200,
      );
    });
  });

  describe('Support Role Salaries', () => {
    it('should have TECH salary = 800', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.TECH]).toBe(800);
    });

    it('should have MEK_TECH salary = 800', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.MEK_TECH]).toBe(800);
    });

    it('should have DOCTOR salary = 1200', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.DOCTOR]).toBe(1200);
    });

    it('should have MEDIC salary = 600', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.MEDIC]).toBe(600);
    });

    it('should have ADMIN_COMMAND salary = 700', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.ADMIN_COMMAND]).toBe(
        700,
      );
    });

    it('should have ADMIN_HR salary = 700', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.ADMIN_HR]).toBe(700);
    });

    it('should have ASTECH salary = 500', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.ASTECH]).toBe(500);
    });
  });

  describe('Civilian Role Salaries', () => {
    it('should have DEPENDENT salary = 0', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.DEPENDENT]).toBe(0);
    });

    it('should have CIVILIAN_OTHER salary = 400', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.CIVILIAN_OTHER]).toBe(
        400,
      );
    });

    it('should have MERCHANT salary = 600', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.MERCHANT]).toBe(600);
    });

    it('should have TEACHER salary = 500', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.TEACHER]).toBe(500);
    });

    it('should have LAWYER salary = 800', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.LAWYER]).toBe(800);
    });

    it('should have FARMER salary = 400', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.FARMER]).toBe(400);
    });
  });

  describe('Legacy Role Salaries', () => {
    it('should have ADMIN salary = 700', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.ADMIN]).toBe(700);
    });

    it('should have SUPPORT salary = 500', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.SUPPORT]).toBe(500);
    });

    it('should have UNASSIGNED salary = 0', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.UNASSIGNED]).toBe(0);
    });
  });

  describe('getBaseSalary()', () => {
    it('should return 1500 for PILOT', () => {
      expect(getBaseSalary(CampaignPersonnelRole.PILOT)).toBe(1500);
    });

    it('should return 0 for DEPENDENT', () => {
      expect(getBaseSalary(CampaignPersonnelRole.DEPENDENT)).toBe(0);
    });

    it('should return 800 for TECH', () => {
      expect(getBaseSalary(CampaignPersonnelRole.TECH)).toBe(800);
    });

    it('should return 1200 for DOCTOR', () => {
      expect(getBaseSalary(CampaignPersonnelRole.DOCTOR)).toBe(1200);
    });

    it('should return salary for all roles', () => {
      const allRoles = Object.values(CampaignPersonnelRole);
      allRoles.forEach((role) => {
        const salary = getBaseSalary(role);
        expect(typeof salary).toBe('number');
        expect(salary).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return fallback 500 for undefined role', () => {
      const undefinedRole = 'UNKNOWN_ROLE' as CampaignPersonnelRole;
      expect(getBaseSalary(undefinedRole)).toBe(500);
    });
  });

  describe('Salary Ranges', () => {
    it('should have all salaries >= 0', () => {
      Object.values(BASE_SALARY_BY_ROLE).forEach((salary) => {
        expect(salary).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have pilot salaries higher than support staff', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.PILOT]).toBeGreaterThan(
        BASE_SALARY_BY_ROLE[CampaignPersonnelRole.ASTECH],
      );
    });

    it('should have doctor salary higher than medic', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.DOCTOR]).toBeGreaterThan(
        BASE_SALARY_BY_ROLE[CampaignPersonnelRole.MEDIC],
      );
    });

    it('should have dependent salary = 0', () => {
      expect(BASE_SALARY_BY_ROLE[CampaignPersonnelRole.DEPENDENT]).toBe(0);
    });
  });
});
