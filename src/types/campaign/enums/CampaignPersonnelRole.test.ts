/**
 * CampaignPersonnelRole enum expansion tests
 * Verifies 45 role values with category helpers
 */

import { CampaignPersonnelRole, getRoleCategory, isCombatRole, isSupportRole, isCivilianRole, getRolesByCategory, ALL_CAMPAIGN_PERSONNEL_ROLES } from './CampaignPersonnelRole';

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

  describe('Combat Roles (14)', () => {
    it('should have PILOT', () => {
      expect(CampaignPersonnelRole.PILOT).toBeDefined();
    });

    it('should have LAM_PILOT', () => {
      expect(CampaignPersonnelRole.LAM_PILOT).toBeDefined();
    });

    it('should have AEROSPACE_PILOT', () => {
      expect(CampaignPersonnelRole.AEROSPACE_PILOT).toBeDefined();
    });

    it('should have VEHICLE_DRIVER', () => {
      expect(CampaignPersonnelRole.VEHICLE_DRIVER).toBeDefined();
    });

    it('should have VEHICLE_CREW_NAVAL', () => {
      expect(CampaignPersonnelRole.VEHICLE_CREW_NAVAL).toBeDefined();
    });

    it('should have VEHICLE_CREW_VTOL', () => {
      expect(CampaignPersonnelRole.VEHICLE_CREW_VTOL).toBeDefined();
    });

    it('should have CONVENTIONAL_AIRCRAFT_PILOT', () => {
      expect(CampaignPersonnelRole.CONVENTIONAL_AIRCRAFT_PILOT).toBeDefined();
    });

    it('should have PROTOMEK_PILOT', () => {
      expect(CampaignPersonnelRole.PROTOMEK_PILOT).toBeDefined();
    });

    it('should have BATTLE_ARMOUR', () => {
      expect(CampaignPersonnelRole.BATTLE_ARMOUR).toBeDefined();
    });

    it('should have SOLDIER', () => {
      expect(CampaignPersonnelRole.SOLDIER).toBeDefined();
    });

    it('should have VESSEL_PILOT', () => {
      expect(CampaignPersonnelRole.VESSEL_PILOT).toBeDefined();
    });

    it('should have VESSEL_GUNNER', () => {
      expect(CampaignPersonnelRole.VESSEL_GUNNER).toBeDefined();
    });

    it('should have VESSEL_CREW', () => {
      expect(CampaignPersonnelRole.VESSEL_CREW).toBeDefined();
    });

    it('should have VESSEL_NAVIGATOR', () => {
      expect(CampaignPersonnelRole.VESSEL_NAVIGATOR).toBeDefined();
    });
  });

  describe('Support Roles (12)', () => {
    it('should have TECH', () => {
      expect(CampaignPersonnelRole.TECH).toBeDefined();
    });

    it('should have MEK_TECH', () => {
      expect(CampaignPersonnelRole.MEK_TECH).toBeDefined();
    });

    it('should have MECHANIC', () => {
      expect(CampaignPersonnelRole.MECHANIC).toBeDefined();
    });

    it('should have AERO_TEK', () => {
      expect(CampaignPersonnelRole.AERO_TEK).toBeDefined();
    });

    it('should have BA_TECH', () => {
      expect(CampaignPersonnelRole.BA_TECH).toBeDefined();
    });

    it('should have ASTECH', () => {
      expect(CampaignPersonnelRole.ASTECH).toBeDefined();
    });

    it('should have DOCTOR', () => {
      expect(CampaignPersonnelRole.DOCTOR).toBeDefined();
    });

    it('should have MEDIC', () => {
      expect(CampaignPersonnelRole.MEDIC).toBeDefined();
    });

    it('should have ADMIN_COMMAND', () => {
      expect(CampaignPersonnelRole.ADMIN_COMMAND).toBeDefined();
    });

    it('should have ADMIN_LOGISTICS', () => {
      expect(CampaignPersonnelRole.ADMIN_LOGISTICS).toBeDefined();
    });

    it('should have ADMIN_TRANSPORT', () => {
      expect(CampaignPersonnelRole.ADMIN_TRANSPORT).toBeDefined();
    });

    it('should have ADMIN_HR', () => {
      expect(CampaignPersonnelRole.ADMIN_HR).toBeDefined();
    });
  });

  describe('Civilian Roles (~20)', () => {
    it('should have DEPENDENT', () => {
      expect(CampaignPersonnelRole.DEPENDENT).toBeDefined();
    });

    it('should have CIVILIAN_OTHER', () => {
      expect(CampaignPersonnelRole.CIVILIAN_OTHER).toBeDefined();
    });

    it('should have MERCHANT', () => {
      expect(CampaignPersonnelRole.MERCHANT).toBeDefined();
    });

    it('should have TEACHER', () => {
      expect(CampaignPersonnelRole.TEACHER).toBeDefined();
    });

    it('should have LAWYER', () => {
      expect(CampaignPersonnelRole.LAWYER).toBeDefined();
    });

    it('should have MUSICIAN', () => {
      expect(CampaignPersonnelRole.MUSICIAN).toBeDefined();
    });

    it('should have CHEF', () => {
      expect(CampaignPersonnelRole.CHEF).toBeDefined();
    });

    it('should have BARTENDER', () => {
      expect(CampaignPersonnelRole.BARTENDER).toBeDefined();
    });

    it('should have FIREFIGHTER', () => {
      expect(CampaignPersonnelRole.FIREFIGHTER).toBeDefined();
    });

    it('should have FARMER', () => {
      expect(CampaignPersonnelRole.FARMER).toBeDefined();
    });

    it('should have MINER', () => {
      expect(CampaignPersonnelRole.MINER).toBeDefined();
    });

    it('should have FACTORY_WORKER', () => {
      expect(CampaignPersonnelRole.FACTORY_WORKER).toBeDefined();
    });

    it('should have COURIER', () => {
      expect(CampaignPersonnelRole.COURIER).toBeDefined();
    });

    it('should have GAMBLER', () => {
      expect(CampaignPersonnelRole.GAMBLER).toBeDefined();
    });

    it('should have HISTORIAN', () => {
      expect(CampaignPersonnelRole.HISTORIAN).toBeDefined();
    });

    it('should have PAINTER', () => {
      expect(CampaignPersonnelRole.PAINTER).toBeDefined();
    });

    it('should have RELIGIOUS_LEADER', () => {
      expect(CampaignPersonnelRole.RELIGIOUS_LEADER).toBeDefined();
    });

    it('should have PSYCHOLOGIST', () => {
      expect(CampaignPersonnelRole.PSYCHOLOGIST).toBeDefined();
    });

    it('should have NOBLE', () => {
      expect(CampaignPersonnelRole.NOBLE).toBeDefined();
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
