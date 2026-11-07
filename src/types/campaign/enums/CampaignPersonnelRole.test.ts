/**
 * CampaignPersonnelRole enum expansion tests
 * Verifies 45 role values with category helpers
 */

import {
  CampaignPersonnelRole,
  getRoleCategory,
  isCombatRole,
  isSupportRole,
  isCivilianRole,
  getRolesByCategory,
  ALL_CAMPAIGN_PERSONNEL_ROLES,
} from './CampaignPersonnelRole';

describe('CampaignPersonnelRole Enum Expansion', () => {
  describe('Enum Values Count', () => {
    it('should have exactly 48 role values', () => {
      const roleValues = Object.values(CampaignPersonnelRole);
      expect(roleValues).toHaveLength(48);
    });

    it('should include all original 10 roles', () => {
      const originalRoles = [
        CampaignPersonnelRole.PILOT,
        CampaignPersonnelRole.AEROSPACE_PILOT,
        CampaignPersonnelRole.VEHICLE_DRIVER,
        CampaignPersonnelRole.TECH,
        CampaignPersonnelRole.DOCTOR,
        CampaignPersonnelRole.ADMIN,
        CampaignPersonnelRole.MEDIC,
        CampaignPersonnelRole.SUPPORT,
        CampaignPersonnelRole.SOLDIER,
        CampaignPersonnelRole.UNASSIGNED,
      ];

      originalRoles.forEach((role) => {
        expect(Object.values(CampaignPersonnelRole)).toContain(role);
      });
    });

    it('should preserve original role string values', () => {
      expect(CampaignPersonnelRole.PILOT).toBe('Pilot');
      expect(CampaignPersonnelRole.AEROSPACE_PILOT).toBe('Aerospace Pilot');
      expect(CampaignPersonnelRole.VEHICLE_DRIVER).toBe('Vehicle Driver');
      expect(CampaignPersonnelRole.TECH).toBe('Technician');
      expect(CampaignPersonnelRole.DOCTOR).toBe('Doctor');
      expect(CampaignPersonnelRole.ADMIN).toBe('Administrator');
      expect(CampaignPersonnelRole.MEDIC).toBe('Medic');
      expect(CampaignPersonnelRole.SUPPORT).toBe('Support Staff');
      expect(CampaignPersonnelRole.SOLDIER).toBe('Soldier');
      expect(CampaignPersonnelRole.UNASSIGNED).toBe('Unassigned');
    });
  });

  describe('getRoleCategory()', () => {
    it('should return combat for PILOT', () => {
      expect(getRoleCategory(CampaignPersonnelRole.PILOT)).toBe('combat');
    });

    it('should return combat for all combat roles', () => {
      const combatRoles = [
        CampaignPersonnelRole.PILOT,
        CampaignPersonnelRole.LAM_PILOT,
        CampaignPersonnelRole.AEROSPACE_PILOT,
        CampaignPersonnelRole.VEHICLE_DRIVER,
        CampaignPersonnelRole.SOLDIER,
      ];

      combatRoles.forEach((role) => {
        expect(getRoleCategory(role)).toBe('combat');
      });
    });

    it('should return support for TECH', () => {
      expect(getRoleCategory(CampaignPersonnelRole.TECH)).toBe('support');
    });

    it('should return support for all support roles', () => {
      const supportRoles = [
        CampaignPersonnelRole.TECH,
        CampaignPersonnelRole.DOCTOR,
        CampaignPersonnelRole.MEDIC,
        CampaignPersonnelRole.ADMIN_COMMAND,
      ];

      supportRoles.forEach((role) => {
        expect(getRoleCategory(role)).toBe('support');
      });
    });

    it('should return civilian for DEPENDENT', () => {
      expect(getRoleCategory(CampaignPersonnelRole.DEPENDENT)).toBe('civilian');
    });

    it('should return civilian for all civilian roles', () => {
      const civilianRoles = [
        CampaignPersonnelRole.DEPENDENT,
        CampaignPersonnelRole.CIVILIAN_OTHER,
        CampaignPersonnelRole.MERCHANT,
        CampaignPersonnelRole.TEACHER,
      ];

      civilianRoles.forEach((role) => {
        expect(getRoleCategory(role)).toBe('civilian');
      });
    });
  });

  describe('isCombatRole()', () => {
    it('should return true for PILOT', () => {
      expect(isCombatRole(CampaignPersonnelRole.PILOT)).toBe(true);
    });

    it('should return true for all combat roles', () => {
      const combatRoles = [
        CampaignPersonnelRole.PILOT,
        CampaignPersonnelRole.LAM_PILOT,
        CampaignPersonnelRole.AEROSPACE_PILOT,
        CampaignPersonnelRole.SOLDIER,
      ];

      combatRoles.forEach((role) => {
        expect(isCombatRole(role)).toBe(true);
      });
    });

    it('should return false for TECH', () => {
      expect(isCombatRole(CampaignPersonnelRole.TECH)).toBe(false);
    });

    it('should return false for DEPENDENT', () => {
      expect(isCombatRole(CampaignPersonnelRole.DEPENDENT)).toBe(false);
    });
  });

  describe('isSupportRole()', () => {
    it('should return true for TECH', () => {
      expect(isSupportRole(CampaignPersonnelRole.TECH)).toBe(true);
    });

    it('should return true for all support roles', () => {
      const supportRoles = [
        CampaignPersonnelRole.TECH,
        CampaignPersonnelRole.DOCTOR,
        CampaignPersonnelRole.MEDIC,
        CampaignPersonnelRole.ADMIN_COMMAND,
      ];

      supportRoles.forEach((role) => {
        expect(isSupportRole(role)).toBe(true);
      });
    });

    it('should return false for PILOT', () => {
      expect(isSupportRole(CampaignPersonnelRole.PILOT)).toBe(false);
    });

    it('should return false for DEPENDENT', () => {
      expect(isSupportRole(CampaignPersonnelRole.DEPENDENT)).toBe(false);
    });
  });

  describe('isCivilianRole()', () => {
    it('should return true for DEPENDENT', () => {
      expect(isCivilianRole(CampaignPersonnelRole.DEPENDENT)).toBe(true);
    });

    it('should return true for all civilian roles', () => {
      const civilianRoles = [
        CampaignPersonnelRole.DEPENDENT,
        CampaignPersonnelRole.CIVILIAN_OTHER,
        CampaignPersonnelRole.MERCHANT,
        CampaignPersonnelRole.TEACHER,
      ];

      civilianRoles.forEach((role) => {
        expect(isCivilianRole(role)).toBe(true);
      });
    });

    it('should return false for PILOT', () => {
      expect(isCivilianRole(CampaignPersonnelRole.PILOT)).toBe(false);
    });

    it('should return false for TECH', () => {
      expect(isCivilianRole(CampaignPersonnelRole.TECH)).toBe(false);
    });
  });

  describe('getRolesByCategory()', () => {
    it('should return 14 combat roles', () => {
      const combatRoles = getRolesByCategory('combat');
      expect(combatRoles).toHaveLength(14);
    });

    it('should return 12 support roles', () => {
      const supportRoles = getRolesByCategory('support');
      expect(supportRoles).toHaveLength(12);
    });

    it('should return 19 civilian roles', () => {
      const civilianRoles = getRolesByCategory('civilian');
      expect(civilianRoles).toHaveLength(19);
    });

    it('should return all combat roles', () => {
      const combatRoles = getRolesByCategory('combat');
      expect(combatRoles).toContain(CampaignPersonnelRole.PILOT);
      expect(combatRoles).toContain(CampaignPersonnelRole.SOLDIER);
      expect(combatRoles).toContain(CampaignPersonnelRole.AEROSPACE_PILOT);
    });

    it('should return all support roles', () => {
      const supportRoles = getRolesByCategory('support');
      expect(supportRoles).toContain(CampaignPersonnelRole.TECH);
      expect(supportRoles).toContain(CampaignPersonnelRole.DOCTOR);
      expect(supportRoles).toContain(CampaignPersonnelRole.ADMIN_COMMAND);
    });

    it('should return all civilian roles', () => {
      const civilianRoles = getRolesByCategory('civilian');
      expect(civilianRoles).toContain(CampaignPersonnelRole.DEPENDENT);
      expect(civilianRoles).toContain(CampaignPersonnelRole.MERCHANT);
      expect(civilianRoles).toContain(CampaignPersonnelRole.TEACHER);
    });
  });

  describe('ALL_CAMPAIGN_PERSONNEL_ROLES Array', () => {
    it('should contain all 48 roles', () => {
      expect(ALL_CAMPAIGN_PERSONNEL_ROLES).toHaveLength(48);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(ALL_CAMPAIGN_PERSONNEL_ROLES)).toBe(true);
    });

    it('should contain all enum values', () => {
      const enumValues = Object.values(CampaignPersonnelRole);
      enumValues.forEach((role) => {
        expect(ALL_CAMPAIGN_PERSONNEL_ROLES).toContain(role);
      });
    });
  });
});
