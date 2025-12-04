/**
 * Unit Loading Integration Tests
 * 
 * Tests that unit data loads correctly from JSON files.
 * Validates era-based directory structure, file format, and index integrity.
 * 
 * @spec openspec/specs/data-loading-architecture/spec.md
 * @spec openspec/specs/unit-services/spec.md
 */

import * as fs from 'fs';
import * as path from 'path';

const UNITS_PATH = path.join(__dirname, '../../../../public/data/units/battlemechs');

describe('Unit Data Loading', () => {
  
  // ============================================================================
  // Directory Structure
  // ============================================================================
  describe('Directory Structure', () => {
    it('should have battlemechs directory', () => {
      expect(fs.existsSync(UNITS_PATH)).toBe(true);
    });

    const expectedEras = [
      '1-age-of-war',
      '2-star-league',
      '3-succession-wars',
      '4-clan-invasion',
      '5-civil-war',
      '6-dark-age',
    ];

    expectedEras.forEach(era => {
      it(`should have ${era} era folder`, () => {
        const eraPath = path.join(UNITS_PATH, era);
        expect(fs.existsSync(eraPath)).toBe(true);
      });
    });

    it('era folders should be numbered chronologically', () => {
      const dirs = fs.readdirSync(UNITS_PATH)
        .filter(f => fs.statSync(path.join(UNITS_PATH, f)).isDirectory())
        .filter(f => /^\d+-/.test(f));
      
      // Check ordering
      for (let i = 0; i < dirs.length - 1; i++) {
        const currentNum = parseInt(dirs[i].split('-')[0]);
        const nextNum = parseInt(dirs[i + 1].split('-')[0]);
        expect(currentNum).toBeLessThan(nextNum);
      }
    });
  });

  // ============================================================================
  // Rules Level Sub-directories
  // ============================================================================
  describe('Rules Level Sub-directories', () => {
    const era = '3-succession-wars'; // Use one with all rules levels
    const expectedRulesLevels = ['standard', 'advanced', 'experimental'];

    expectedRulesLevels.forEach(rulesLevel => {
      it(`should have ${rulesLevel} sub-folder in ${era}`, () => {
        const rulesPath = path.join(UNITS_PATH, era, rulesLevel);
        expect(fs.existsSync(rulesPath)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Master Index File
  // ============================================================================
  describe('Master Index File', () => {
    let index: {
      version: string;
      generatedAt: string;
      totalUnits: number;
      units: Array<{
        id: string;
        chassis: string;
        model: string;
        tonnage: number;
        techBase: string;
        year: number;
        role: string;
        path: string;
      }>;
    };

    beforeAll(() => {
      const indexPath = path.join(UNITS_PATH, 'index.json');
      const content = fs.readFileSync(indexPath, 'utf-8');
      index = JSON.parse(content) as typeof index;
    });

    it('should exist', () => {
      const indexPath = path.join(UNITS_PATH, 'index.json');
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('should have version field', () => {
      expect(index).toHaveProperty('version');
      expect(typeof index.version).toBe('string');
    });

    it('should have generatedAt timestamp', () => {
      expect(index).toHaveProperty('generatedAt');
      expect(typeof index.generatedAt).toBe('string');
    });

    it('should have totalUnits count', () => {
      expect(index).toHaveProperty('totalUnits');
      expect(typeof index.totalUnits).toBe('number');
      expect(index.totalUnits).toBeGreaterThan(0);
    });

    it('should have units array matching totalUnits', () => {
      expect(index).toHaveProperty('units');
      expect(Array.isArray(index.units)).toBe(true);
      expect(index.units.length).toBe(index.totalUnits);
    });

    it('each unit entry should have required fields', () => {
      // Check first 50 units for performance
      const sample = index.units.slice(0, 50);
      for (const unit of sample) {
        expect(unit).toHaveProperty('id');
        expect(unit).toHaveProperty('chassis');
        expect(unit).toHaveProperty('model');
        expect(unit).toHaveProperty('tonnage');
        expect(unit).toHaveProperty('techBase');
        expect(unit).toHaveProperty('year');
        expect(unit).toHaveProperty('path');
      }
    });

    it('unit IDs should be unique', () => {
      const ids = index.units.map(u => u.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('unit paths should point to existing files', () => {
      // Check a sample of paths for performance
      const sample = index.units.slice(0, 20);
      for (const unit of sample) {
        const fullPath = path.join(UNITS_PATH, unit.path);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Unit File Format Validation
  // ============================================================================
  describe('Unit File Format Validation', () => {
    // Find a sample unit file to validate
    const sampleUnitPath = path.join(UNITS_PATH, '2-star-league/standard/Atlas AS7-D.json');

    it('sample unit file should exist', () => {
      expect(fs.existsSync(sampleUnitPath)).toBe(true);
    });

    describe('ISerializedUnit Schema Compliance', () => {
      let unit: Record<string, unknown>;

      beforeAll(() => {
        const content = fs.readFileSync(sampleUnitPath, 'utf-8');
        unit = JSON.parse(content) as Record<string, unknown>;
      });

      it('should have identity fields', () => {
        expect(unit).toHaveProperty('id');
        expect(unit).toHaveProperty('chassis');
        expect(unit).toHaveProperty('model');
      });

      it('should have classification fields', () => {
        expect(unit).toHaveProperty('unitType');
        expect(unit).toHaveProperty('configuration');
        expect(unit).toHaveProperty('techBase');
        expect(unit).toHaveProperty('rulesLevel');
        expect(unit).toHaveProperty('era');
        expect(unit).toHaveProperty('year');
        expect(unit).toHaveProperty('tonnage');
      });

      it('should have engine configuration', () => {
        expect(unit).toHaveProperty('engine');
        const engine = unit.engine as Record<string, unknown>;
        expect(engine).toHaveProperty('type');
        expect(engine).toHaveProperty('rating');
      });

      it('should have gyro configuration', () => {
        expect(unit).toHaveProperty('gyro');
        const gyro = unit.gyro as Record<string, unknown>;
        expect(gyro).toHaveProperty('type');
      });

      it('should have structure configuration', () => {
        expect(unit).toHaveProperty('structure');
        const structure = unit.structure as Record<string, unknown>;
        expect(structure).toHaveProperty('type');
      });

      it('should have armor configuration', () => {
        expect(unit).toHaveProperty('armor');
        const armor = unit.armor as Record<string, unknown>;
        expect(armor).toHaveProperty('type');
        expect(armor).toHaveProperty('allocation');
      });

      it('should have heat sink configuration', () => {
        expect(unit).toHaveProperty('heatSinks');
        const heatSinks = unit.heatSinks as Record<string, unknown>;
        expect(heatSinks).toHaveProperty('type');
        expect(heatSinks).toHaveProperty('count');
      });

      it('should have movement configuration', () => {
        expect(unit).toHaveProperty('movement');
        const movement = unit.movement as Record<string, unknown>;
        expect(movement).toHaveProperty('walk');
        expect(movement).toHaveProperty('jump');
      });

      it('should have equipment array', () => {
        expect(unit).toHaveProperty('equipment');
        expect(Array.isArray(unit.equipment)).toBe(true);
      });

      it('should have critical slots', () => {
        expect(unit).toHaveProperty('criticalSlots');
        expect(typeof unit.criticalSlots).toBe('object');
      });
    });
  });

  // ============================================================================
  // Critical Slot Format Validation
  // ============================================================================
  describe('Critical Slot Format', () => {
    let unit: Record<string, unknown>;

    beforeAll(() => {
      const samplePath = path.join(UNITS_PATH, '2-star-league/standard/Atlas AS7-D.json');
      const content = fs.readFileSync(samplePath, 'utf-8');
      unit = JSON.parse(content) as Record<string, unknown>;
    });

    it('should have correct slot counts per location', () => {
      const criticalSlots = unit.criticalSlots as Record<string, (string | null)[]>;
      
      // Head and legs should have 6 slots
      expect(criticalSlots.HEAD.length).toBe(6);
      expect(criticalSlots.LEFT_LEG.length).toBe(6);
      expect(criticalSlots.RIGHT_LEG.length).toBe(6);
      
      // Arms and torsos should have 12 slots
      expect(criticalSlots.LEFT_ARM.length).toBe(12);
      expect(criticalSlots.RIGHT_ARM.length).toBe(12);
      expect(criticalSlots.LEFT_TORSO.length).toBe(12);
      expect(criticalSlots.RIGHT_TORSO.length).toBe(12);
      expect(criticalSlots.CENTER_TORSO.length).toBe(12);
    });

    it('each slot should be string or null', () => {
      const criticalSlots = unit.criticalSlots as Record<string, (string | null)[]>;
      
      for (const location of Object.keys(criticalSlots)) {
        for (const slot of criticalSlots[location]) {
          expect(slot === null || typeof slot === 'string').toBe(true);
        }
      }
    });
  });

  // ============================================================================
  // Armor Allocation Format
  // ============================================================================
  describe('Armor Allocation Format', () => {
    let armor: {
      type: string;
      allocation: Record<string, number | { front: number; rear: number }>;
    };

    beforeAll(() => {
      const samplePath = path.join(UNITS_PATH, '2-star-league/standard/Atlas AS7-D.json');
      const content = fs.readFileSync(samplePath, 'utf-8');
      const unit = JSON.parse(content);
      armor = unit.armor;
    });

    it('should have armor type', () => {
      expect(armor).toHaveProperty('type');
      expect(typeof armor.type).toBe('string');
    });

    it('non-torso locations should have integer values', () => {
      expect(typeof armor.allocation.HEAD).toBe('number');
      expect(typeof armor.allocation.LEFT_ARM).toBe('number');
      expect(typeof armor.allocation.RIGHT_ARM).toBe('number');
      expect(typeof armor.allocation.LEFT_LEG).toBe('number');
      expect(typeof armor.allocation.RIGHT_LEG).toBe('number');
    });

    it('torso locations should have front/rear object', () => {
      const leftTorso = armor.allocation.LEFT_TORSO as { front: number; rear: number };
      expect(leftTorso).toHaveProperty('front');
      expect(leftTorso).toHaveProperty('rear');
      expect(typeof leftTorso.front).toBe('number');
      expect(typeof leftTorso.rear).toBe('number');
    });
  });

  // ============================================================================
  // Era Distribution
  // ============================================================================
  describe('Era Distribution', () => {
    it('should have units in each era', () => {
      const eras = fs.readdirSync(UNITS_PATH)
        .filter(f => fs.statSync(path.join(UNITS_PATH, f)).isDirectory())
        .filter(f => /^\d+-/.test(f));

      for (const era of eras) {
        const eraPath = path.join(UNITS_PATH, era);
        let unitCount = 0;

        // Count units in all rules level subdirs
        for (const rulesLevel of ['standard', 'advanced', 'experimental']) {
          const rulesPath = path.join(eraPath, rulesLevel);
          if (fs.existsSync(rulesPath)) {
            const files = fs.readdirSync(rulesPath).filter(f => f.endsWith('.json'));
            unitCount += files.length;
          }
        }

        expect(unitCount).toBeGreaterThan(0);
      }
    });
  });
});

