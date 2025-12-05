/**
 * Equipment Loading Integration Tests
 * 
 * Tests that equipment data loads correctly from JSON files.
 * Validates file structure, content integrity, and service integration.
 * 
 * @spec openspec/specs/data-loading-architecture/spec.md
 * @spec openspec/specs/equipment-services/spec.md
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_PATH = path.join(__dirname, '../../../../public/data/equipment');
const OFFICIAL_PATH = path.join(DATA_PATH, 'official');
const SCHEMA_PATH = path.join(DATA_PATH, '_schema');

describe('Equipment Data Loading', () => {
  
  // ============================================================================
  // Directory Structure
  // ============================================================================
  describe('Directory Structure', () => {
    it('should have equipment data directory', () => {
      expect(fs.existsSync(DATA_PATH)).toBe(true);
    });

    it('should have official equipment directory', () => {
      expect(fs.existsSync(OFFICIAL_PATH)).toBe(true);
    });

    it('should have schema directory', () => {
      expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
    });

    it('should have weapons subdirectory', () => {
      expect(fs.existsSync(path.join(OFFICIAL_PATH, 'weapons'))).toBe(true);
    });
  });

  // ============================================================================
  // Equipment JSON Files
  // ============================================================================
  describe('Equipment JSON Files', () => {
    const expectedFiles = [
      'weapons/energy.json',
      'weapons/ballistic.json',
      'weapons/missile.json',
      'weapons/physical.json',
      'ammunition.json',
      'electronics.json',
      'miscellaneous.json',
      'index.json',
    ];

    expectedFiles.forEach(file => {
      it(`should have ${file}`, () => {
        const filePath = path.join(OFFICIAL_PATH, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it(`${file} should be valid JSON`, () => {
        const filePath = path.join(OFFICIAL_PATH, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(() => JSON.parse(content) as unknown).not.toThrow();
      });
    });
  });

  // ============================================================================
  // Schema Files
  // ============================================================================
  describe('Schema Files', () => {
    const expectedSchemas = [
      'weapon-schema.json',
      'ammunition-schema.json',
      'electronics-schema.json',
      'misc-equipment-schema.json',
      'physical-weapon-schema.json',
      'unit-schema.json',
    ];

    expectedSchemas.forEach(schema => {
      it(`should have ${schema}`, () => {
        const schemaPath = path.join(SCHEMA_PATH, schema);
        expect(fs.existsSync(schemaPath)).toBe(true);
      });

      it(`${schema} should be valid JSON Schema`, () => {
        const schemaPath = path.join(SCHEMA_PATH, schema);
        const content = fs.readFileSync(schemaPath, 'utf-8');
        const parsed = JSON.parse(content) as { $schema?: string; type?: string };
        
        // Basic JSON Schema requirements
        expect(parsed).toHaveProperty('$schema');
        expect(parsed).toHaveProperty('type');
      });
    });
  });

  // ============================================================================
  // Weapon Data Validation
  // ============================================================================
  describe('Weapon Data Validation', () => {
    const weaponFiles = ['energy.json', 'ballistic.json', 'missile.json'];

    weaponFiles.forEach(file => {
      describe(file, () => {
        let fileData: { items: unknown[]; count: number };
        let weapons: unknown[];

        beforeAll(() => {
          const filePath = path.join(OFFICIAL_PATH, 'weapons', file);
          const content = fs.readFileSync(filePath, 'utf-8');
          fileData = JSON.parse(content) as { items: unknown[]; count: number };
          weapons = fileData.items;
        });

        it('should have items array', () => {
          expect(fileData).toHaveProperty('items');
          expect(Array.isArray(weapons)).toBe(true);
        });

        it('should be a non-empty array', () => {
          expect(weapons.length).toBeGreaterThan(0);
        });

        it('count should match items length', () => {
          expect(fileData.count).toBe(weapons.length);
        });

        it('each weapon should have required fields', () => {
          for (const weapon of weapons as Record<string, unknown>[]) {
            expect(weapon).toHaveProperty('id');
            expect(weapon).toHaveProperty('name');
            expect(weapon).toHaveProperty('category');
            expect(weapon).toHaveProperty('techBase');
            expect(weapon).toHaveProperty('rulesLevel');
            expect(weapon).toHaveProperty('damage');
            expect(weapon).toHaveProperty('heat');
            expect(weapon).toHaveProperty('weight');
            expect(weapon).toHaveProperty('criticalSlots');
          }
        });

        it('each weapon should have valid techBase', () => {
          const validTechBases = ['INNER_SPHERE', 'CLAN', 'BOTH'];
          for (const weapon of weapons as Record<string, unknown>[]) {
            expect(validTechBases).toContain(weapon.techBase);
          }
        });

        it('each weapon should have valid rulesLevel', () => {
          const validRulesLevels = ['INTRODUCTORY', 'STANDARD', 'ADVANCED', 'EXPERIMENTAL', 'UNOFFICIAL'];
          for (const weapon of weapons as Record<string, unknown>[]) {
            expect(validRulesLevels).toContain(weapon.rulesLevel);
          }
        });

        it('each weapon ID should be unique', () => {
          const ids = (weapons as Record<string, unknown>[]).map(w => w.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);
        });
      });
    });
  });

  // ============================================================================
  // Ammunition Data Validation
  // ============================================================================
  describe('Ammunition Data Validation', () => {
    let fileData: { items: unknown[]; count: number };
    let ammunition: unknown[];

    beforeAll(() => {
      const filePath = path.join(OFFICIAL_PATH, 'ammunition.json');
      const content = fs.readFileSync(filePath, 'utf-8');
      fileData = JSON.parse(content) as { items: unknown[]; count: number };
      ammunition = fileData.items;
    });

    it('should have items array', () => {
      expect(fileData).toHaveProperty('items');
      expect(Array.isArray(ammunition)).toBe(true);
    });

    it('should be a non-empty array', () => {
      expect(ammunition.length).toBeGreaterThan(0);
    });

    it('count should match items length', () => {
      expect(fileData.count).toBe(ammunition.length);
    });

    it('each ammo should have required fields', () => {
      for (const ammo of ammunition as Record<string, unknown>[]) {
        expect(ammo).toHaveProperty('id');
        expect(ammo).toHaveProperty('name');
        expect(ammo).toHaveProperty('techBase');
        expect(ammo).toHaveProperty('shotsPerTon');
        expect(ammo).toHaveProperty('weight');
      }
    });

    it('each ammo ID should be unique', () => {
      const ids = (ammunition as Record<string, unknown>[]).map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // ============================================================================
  // Electronics Data Validation
  // ============================================================================
  describe('Electronics Data Validation', () => {
    let fileData: { items: unknown[]; count: number };
    let electronics: unknown[];

    beforeAll(() => {
      const filePath = path.join(OFFICIAL_PATH, 'electronics.json');
      const content = fs.readFileSync(filePath, 'utf-8');
      fileData = JSON.parse(content) as { items: unknown[]; count: number };
      electronics = fileData.items;
    });

    it('should have items array', () => {
      expect(fileData).toHaveProperty('items');
      expect(Array.isArray(electronics)).toBe(true);
    });

    it('should be a non-empty array', () => {
      expect(electronics.length).toBeGreaterThan(0);
    });

    it('count should match items length', () => {
      expect(fileData.count).toBe(electronics.length);
    });

    it('each electronics should have required fields', () => {
      for (const item of electronics as Record<string, unknown>[]) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('techBase');
        expect(item).toHaveProperty('weight');
        expect(item).toHaveProperty('criticalSlots');
      }
    });
  });

  // ============================================================================
  // Index File Validation
  // ============================================================================
  describe('Index File Validation', () => {
    let index: Record<string, unknown>;

    beforeAll(() => {
      const filePath = path.join(OFFICIAL_PATH, 'index.json');
      const content = fs.readFileSync(filePath, 'utf-8');
      index = JSON.parse(content) as Record<string, unknown>;
    });

    it('should have version field', () => {
      expect(index).toHaveProperty('version');
    });

    it('should have generatedAt timestamp', () => {
      expect(index).toHaveProperty('generatedAt');
    });

    it('should have files object', () => {
      expect(index).toHaveProperty('files');
      expect(typeof index.files).toBe('object');
    });

    it('should have totalItems object', () => {
      expect(index).toHaveProperty('totalItems');
      expect(typeof index.totalItems).toBe('object');
    });
  });
});

