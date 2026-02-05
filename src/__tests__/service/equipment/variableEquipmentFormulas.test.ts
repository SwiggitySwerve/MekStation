/**
 * Tests for Variable Equipment Formulas
 */

import {
  VARIABLE_EQUIPMENT_FORMULAS,
  getVariableEquipmentIds,
  hasVariableEquipmentFormulas,
  getVariableEquipmentFormulas,
} from '@/services/equipment/variableEquipmentFormulas';

describe('Variable Equipment Formulas', () => {
  // ============================================================================
  // VARIABLE_EQUIPMENT_FORMULAS
  // ============================================================================
  describe('VARIABLE_EQUIPMENT_FORMULAS', () => {
    it('should contain targeting computer formulas', () => {
      expect(
        VARIABLE_EQUIPMENT_FORMULAS['targeting-computer-is'],
      ).toBeDefined();
      expect(
        VARIABLE_EQUIPMENT_FORMULAS['targeting-computer-clan'],
      ).toBeDefined();
    });

    it('should contain MASC formulas', () => {
      expect(VARIABLE_EQUIPMENT_FORMULAS['masc-is']).toBeDefined();
      expect(VARIABLE_EQUIPMENT_FORMULAS['masc-clan']).toBeDefined();
    });

    it('should contain supercharger formula', () => {
      expect(VARIABLE_EQUIPMENT_FORMULAS['supercharger']).toBeDefined();
    });

    it('should contain partial wing formula', () => {
      expect(VARIABLE_EQUIPMENT_FORMULAS['partial-wing']).toBeDefined();
    });

    it('should contain TSM formula', () => {
      expect(VARIABLE_EQUIPMENT_FORMULAS['tsm']).toBeDefined();
    });

    it('should contain physical weapon formulas', () => {
      expect(VARIABLE_EQUIPMENT_FORMULAS['hatchet']).toBeDefined();
      expect(VARIABLE_EQUIPMENT_FORMULAS['sword']).toBeDefined();
      expect(VARIABLE_EQUIPMENT_FORMULAS['mace']).toBeDefined();
    });

    it('should have required formula properties', () => {
      const formula = VARIABLE_EQUIPMENT_FORMULAS['targeting-computer-is'];
      expect(formula.weight).toBeDefined();
      expect(formula.criticalSlots).toBeDefined();
      expect(formula.cost).toBeDefined();
      expect(formula.requiredContext).toBeDefined();
    });

    it('should have correct required context for targeting computer', () => {
      const formula = VARIABLE_EQUIPMENT_FORMULAS['targeting-computer-is'];
      expect(formula.requiredContext).toContain('directFireWeaponTonnage');
    });

    it('should have correct required context for MASC', () => {
      const formula = VARIABLE_EQUIPMENT_FORMULAS['masc-is'];
      // MASC uses tonnage-based formula: tonnage / 20 (IS), tonnage / 25 (Clan)
      expect(formula.requiredContext).toContain('tonnage');
      expect(formula.requiredContext).not.toContain('engineRating');
    });
  });

  // ============================================================================
  // getVariableEquipmentIds
  // ============================================================================
  describe('getVariableEquipmentIds', () => {
    it('should return array of equipment IDs', () => {
      const ids = getVariableEquipmentIds();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBeGreaterThan(0);
    });

    it('should include known equipment IDs', () => {
      const ids = getVariableEquipmentIds();
      expect(ids).toContain('targeting-computer-is');
      expect(ids).toContain('masc-is');
      expect(ids).toContain('tsm');
    });

    it('should match keys of VARIABLE_EQUIPMENT_FORMULAS', () => {
      const ids = getVariableEquipmentIds();
      const keys = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);
      expect(ids).toEqual(keys);
    });
  });

  // ============================================================================
  // hasVariableEquipmentFormulas
  // ============================================================================
  describe('hasVariableEquipmentFormulas', () => {
    it('should return true for known equipment', () => {
      expect(hasVariableEquipmentFormulas('targeting-computer-is')).toBe(true);
      expect(hasVariableEquipmentFormulas('masc-clan')).toBe(true);
      expect(hasVariableEquipmentFormulas('hatchet')).toBe(true);
    });

    it('should return false for unknown equipment', () => {
      expect(hasVariableEquipmentFormulas('unknown-equipment')).toBe(false);
      expect(hasVariableEquipmentFormulas('medium-laser')).toBe(false);
      expect(hasVariableEquipmentFormulas('')).toBe(false);
    });
  });

  // ============================================================================
  // getVariableEquipmentFormulas
  // ============================================================================
  describe('getVariableEquipmentFormulas', () => {
    it('should return formula for known equipment', () => {
      const formula = getVariableEquipmentFormulas('tsm');
      expect(formula).toBeDefined();
      expect(formula?.weight).toBeDefined();
      expect(formula?.criticalSlots).toBeDefined();
    });

    it('should return undefined for unknown equipment', () => {
      expect(getVariableEquipmentFormulas('unknown')).toBeUndefined();
    });

    it('should return formula matching VARIABLE_EQUIPMENT_FORMULAS', () => {
      const formula = getVariableEquipmentFormulas('supercharger');
      expect(formula).toBe(VARIABLE_EQUIPMENT_FORMULAS['supercharger']);
    });
  });

  // ============================================================================
  // Formula structures
  // ============================================================================
  describe('Formula structures', () => {
    it('should have fixed slots for supercharger', () => {
      const formula = VARIABLE_EQUIPMENT_FORMULAS['supercharger'];
      // Fixed(1) creates an object with value 1
      expect(formula.criticalSlots).toBeDefined();
    });

    it('should have damage formula for physical weapons', () => {
      const hatchet = VARIABLE_EQUIPMENT_FORMULAS['hatchet'];
      expect(hatchet.damage).toBeDefined();
    });

    it('should have all physical weapon formulas', () => {
      const physicalWeapons = [
        'hatchet',
        'sword',
        'mace',
        'claws',
        'lance',
        'talons',
        'retractable-blade',
        'flail',
        'wrecking-ball',
      ];

      for (const weapon of physicalWeapons) {
        expect(VARIABLE_EQUIPMENT_FORMULAS[weapon]).toBeDefined();
        expect(VARIABLE_EQUIPMENT_FORMULAS[weapon].damage).toBeDefined();
      }
    });

    it('should have required context for all formulas', () => {
      for (const [, formula] of Object.entries(VARIABLE_EQUIPMENT_FORMULAS)) {
        expect(formula.requiredContext).toBeDefined();
        expect(Array.isArray(formula.requiredContext)).toBe(true);
      }
    });
  });
});
