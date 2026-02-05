/**
 * Tests for Formula Registry
 */

import {
  WEIGHT_FORMULAS,
  MOVEMENT_FORMULAS,
  SLOT_FORMULAS,
  HEAT_SINK_FORMULAS,
  ARMOR_FORMULAS,
  getFormula,
  getFormulasByCategory,
} from '@/utils/construction/formulaRegistry';

describe('Formula Registry', () => {
  // ============================================================================
  // WEIGHT_FORMULAS
  // ============================================================================
  describe('WEIGHT_FORMULAS', () => {
    it('should contain engine formulas', () => {
      const engineFormulas = WEIGHT_FORMULAS.filter((f) =>
        f.id.startsWith('engine.'),
      );
      expect(engineFormulas.length).toBeGreaterThan(0);
    });

    it('should contain gyro formulas', () => {
      const gyroFormulas = WEIGHT_FORMULAS.filter((f) =>
        f.id.startsWith('gyro.'),
      );
      expect(gyroFormulas.length).toBeGreaterThan(0);
    });

    it('should contain structure formulas', () => {
      const structureFormulas = WEIGHT_FORMULAS.filter((f) =>
        f.id.startsWith('structure.'),
      );
      expect(structureFormulas.length).toBeGreaterThan(0);
    });

    it('should have required properties', () => {
      for (const formula of WEIGHT_FORMULAS) {
        expect(formula.id).toBeDefined();
        expect(formula.name).toBeDefined();
        expect(formula.description).toBeDefined();
        expect(formula.formula).toBeDefined();
        expect(formula.source).toBeDefined();
      }
    });

    it('should reference TechManual', () => {
      for (const formula of WEIGHT_FORMULAS) {
        expect(formula.source).toBe('TechManual');
      }
    });
  });

  // ============================================================================
  // MOVEMENT_FORMULAS
  // ============================================================================
  describe('MOVEMENT_FORMULAS', () => {
    it('should contain walk MP formula', () => {
      const walkFormula = MOVEMENT_FORMULAS.find((f) => f.id.includes('walk'));
      expect(walkFormula).toBeDefined();
    });

    it('should contain run MP formula', () => {
      const runFormula = MOVEMENT_FORMULAS.find((f) => f.id.includes('run'));
      expect(runFormula).toBeDefined();
    });

    it('should contain engine rating formula', () => {
      const engineFormula = MOVEMENT_FORMULAS.find((f) =>
        f.id.includes('engine_rating'),
      );
      expect(engineFormula).toBeDefined();
    });

    it('should have required properties', () => {
      for (const formula of MOVEMENT_FORMULAS) {
        expect(formula.id).toBeDefined();
        expect(formula.name).toBeDefined();
        expect(formula.source).toBeDefined();
      }
    });
  });

  // ============================================================================
  // SLOT_FORMULAS
  // ============================================================================
  describe('SLOT_FORMULAS', () => {
    it('should contain engine slot formulas', () => {
      const engineFormulas = SLOT_FORMULAS.filter((f) =>
        f.id.includes('engine'),
      );
      expect(engineFormulas.length).toBeGreaterThan(0);
    });

    it('should contain gyro slot formula', () => {
      const gyroFormula = SLOT_FORMULAS.find((f) => f.id.includes('gyro'));
      expect(gyroFormula).toBeDefined();
    });

    it('should have required properties', () => {
      for (const formula of SLOT_FORMULAS) {
        expect(formula.id).toBeDefined();
        expect(formula.name).toBeDefined();
        expect(formula.source).toBeDefined();
      }
    });
  });

  // ============================================================================
  // HEAT_SINK_FORMULAS
  // ============================================================================
  describe('HEAT_SINK_FORMULAS', () => {
    it('should contain integral heat sinks formula', () => {
      const integralFormula = HEAT_SINK_FORMULAS.find((f) =>
        f.id.includes('integral'),
      );
      expect(integralFormula).toBeDefined();
    });

    it('should contain dissipation formulas', () => {
      const dissipationFormulas = HEAT_SINK_FORMULAS.filter((f) =>
        f.id.includes('dissipation'),
      );
      expect(dissipationFormulas.length).toBeGreaterThan(0);
    });

    it('should have required properties', () => {
      for (const formula of HEAT_SINK_FORMULAS) {
        expect(formula.id).toBeDefined();
        expect(formula.name).toBeDefined();
        expect(formula.source).toBeDefined();
      }
    });
  });

  // ============================================================================
  // ARMOR_FORMULAS
  // ============================================================================
  describe('ARMOR_FORMULAS', () => {
    it('should contain max armor formula', () => {
      const maxFormula = ARMOR_FORMULAS.find((f) => f.id.includes('max'));
      expect(maxFormula).toBeDefined();
    });

    it('should have required properties', () => {
      for (const formula of ARMOR_FORMULAS) {
        expect(formula.id).toBeDefined();
        expect(formula.name).toBeDefined();
        expect(formula.source).toBeDefined();
      }
    });
  });

  // ============================================================================
  // getFormula
  // ============================================================================
  describe('getFormula', () => {
    it('should find weight formula by ID', () => {
      const formula = getFormula('engine.standard');
      expect(formula).toBeDefined();
      expect(formula?.name).toContain('Engine');
    });

    it('should find movement formula by ID', () => {
      const formula = getFormula('movement.walk');
      expect(formula).toBeDefined();
    });

    it('should find slot formula by ID', () => {
      const formula = getFormula('slots.gyro');
      expect(formula).toBeDefined();
    });

    it('should find heat sink formula by ID', () => {
      const formula = getFormula('heat_sinks.integral');
      expect(formula).toBeDefined();
    });

    it('should find armor formula by ID', () => {
      const formula = getFormula('armor.max.standard');
      expect(formula).toBeDefined();
    });

    it('should return undefined for unknown ID', () => {
      const formula = getFormula('unknown.formula');
      expect(formula).toBeUndefined();
    });
  });

  // ============================================================================
  // getFormulasByCategory
  // ============================================================================
  describe('getFormulasByCategory', () => {
    it('should return weight formulas', () => {
      const formulas = getFormulasByCategory('weight');
      expect(formulas).toBe(WEIGHT_FORMULAS);
    });

    it('should return movement formulas', () => {
      const formulas = getFormulasByCategory('movement');
      expect(formulas).toBe(MOVEMENT_FORMULAS);
    });

    it('should return slot formulas', () => {
      const formulas = getFormulasByCategory('slots');
      expect(formulas).toBe(SLOT_FORMULAS);
    });

    it('should return heat sink formulas', () => {
      const formulas = getFormulasByCategory('heat_sinks');
      expect(formulas).toBe(HEAT_SINK_FORMULAS);
    });

    it('should return armor formulas', () => {
      const formulas = getFormulasByCategory('armor');
      expect(formulas).toBe(ARMOR_FORMULAS);
    });

    it('should return empty array for invalid category', () => {
      // @ts-expect-error Testing invalid category
      const formulas = getFormulasByCategory('invalid');
      expect(formulas).toEqual([]);
    });
  });

  // ============================================================================
  // Formula structure validation
  // ============================================================================
  describe('Formula structure', () => {
    it('all formulas should have valid IDs', () => {
      const allFormulas = [
        ...WEIGHT_FORMULAS,
        ...MOVEMENT_FORMULAS,
        ...SLOT_FORMULAS,
        ...HEAT_SINK_FORMULAS,
        ...ARMOR_FORMULAS,
      ];

      for (const formula of allFormulas) {
        expect(formula.id).toMatch(/^[a-z_\.]+$/);
      }
    });

    it('should have unique IDs', () => {
      const allFormulas = [
        ...WEIGHT_FORMULAS,
        ...MOVEMENT_FORMULAS,
        ...SLOT_FORMULAS,
        ...HEAT_SINK_FORMULAS,
        ...ARMOR_FORMULAS,
      ];

      const ids = allFormulas.map((f) => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have page references for TechManual formulas', () => {
      const allFormulas = [
        ...WEIGHT_FORMULAS,
        ...MOVEMENT_FORMULAS,
        ...SLOT_FORMULAS,
        ...HEAT_SINK_FORMULAS,
        ...ARMOR_FORMULAS,
      ];

      const techManualFormulas = allFormulas.filter(
        (f) => f.source === 'TechManual',
      );
      for (const formula of techManualFormulas) {
        // Page reference should exist for TechManual sourced formulas
        expect(formula.pageReference).toBeDefined();
      }
    });
  });
});
