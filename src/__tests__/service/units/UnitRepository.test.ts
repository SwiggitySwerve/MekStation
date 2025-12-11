/**
 * Unit Repository Tests
 * 
 * Tests for the SQLite-based unit repository.
 */

// Jest is the testing framework used in this project
import { 
  UnitRepository, 
  getUnitRepository, 
  resetUnitRepository 
} from '@/services/units/UnitRepository';
import { 
  getSQLiteService, 
  resetSQLiteService 
} from '@/services/persistence/SQLiteService';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/enums/Era';
import { RulesLevel } from '@/types/enums/RulesLevel';
import fs from 'fs';
import path from 'path';

// Test database path
const TEST_DB_PATH = './data/test-mekstation.db';

describe('UnitRepository', () => {
  let repository: UnitRepository;

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Ensure data directory exists
    const dataDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Reset singletons
    resetSQLiteService();
    resetUnitRepository();

    // Initialize with test database
    const sqliteService = getSQLiteService({ path: TEST_DB_PATH });
    sqliteService.initialize();

    repository = getUnitRepository();
  });

  afterEach(() => {
    // Close database and clean up
    resetSQLiteService();
    resetUnitRepository();

    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('create', () => {
    it('should create a new unit with version 1', () => {
      const result = repository.create({
        chassis: 'Atlas',
        variant: 'AS7-D-Test',
        data: {
          chassis: 'Atlas',
          variant: 'AS7-D-Test',
          tonnage: 100,
          techBase: TechBase.INNER_SPHERE,
          era: Era.LATE_SUCCESSION_WARS,
          rulesLevel: RulesLevel.STANDARD,
          unitType: 'BattleMech',
        },
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^custom-/);
      expect(result.version).toBe(1);
    });

    it('should reject duplicate names', () => {
      // Create first unit
      repository.create({
        chassis: 'Atlas',
        variant: 'AS7-D-Dup',
        data: { chassis: 'Atlas', variant: 'AS7-D-Dup', tonnage: 100 },
      });

      // Try to create duplicate
      const result = repository.create({
        chassis: 'Atlas',
        variant: 'AS7-D-Dup',
        data: { chassis: 'Atlas', variant: 'AS7-D-Dup', tonnage: 100 },
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('DUPLICATE_NAME');
    });
  });

  describe('getById', () => {
    it('should return null for non-existent unit', () => {
      const unit = repository.getById('non-existent-id');
      expect(unit).toBeNull();
    });

    it('should return the unit after creation', () => {
      const createResult = repository.create({
        chassis: 'Timber Wolf',
        variant: 'Prime-Test',
        data: {
          chassis: 'Timber Wolf',
          variant: 'Prime-Test',
          tonnage: 75,
          techBase: TechBase.CLAN,
        },
      });

      const unit = repository.getById(createResult.id!);

      expect(unit).not.toBeNull();
      expect(unit?.chassis).toBe('Timber Wolf');
      expect(unit?.variant).toBe('Prime-Test');
      expect(unit?.tonnage).toBe(75);
      expect(unit?.currentVersion).toBe(1);
    });
  });

  describe('update', () => {
    it('should increment version on update', () => {
      // Create unit
      const createResult = repository.create({
        chassis: 'Marauder',
        variant: 'MAD-3R-Test',
        data: { chassis: 'Marauder', variant: 'MAD-3R-Test', tonnage: 75 },
      });

      // Update unit
      const updateResult = repository.update(createResult.id!, {
        data: { chassis: 'Marauder', variant: 'MAD-3R-Test', tonnage: 75, armor: 200 },
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.version).toBe(2);

      // Verify version incremented
      const unit = repository.getById(createResult.id!);
      expect(unit?.currentVersion).toBe(2);
    });

    it('should return error for non-existent unit', () => {
      const result = repository.update('non-existent-id', {
        data: { tonnage: 100 },
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('delete', () => {
    it('should delete existing unit', () => {
      // Create unit
      const createResult = repository.create({
        chassis: 'Warhammer',
        variant: 'WHM-6R-Test',
        data: { chassis: 'Warhammer', variant: 'WHM-6R-Test', tonnage: 70 },
      });

      // Delete unit
      const deleteResult = repository.delete(createResult.id!);
      expect(deleteResult.success).toBe(true);

      // Verify deleted
      const unit = repository.getById(createResult.id!);
      expect(unit).toBeNull();
    });
  });

  describe('list', () => {
    it('should return empty array when no units', () => {
      const units = repository.list();
      expect(units).toEqual([]);
    });

    it('should return all units', () => {
      // Create multiple units
      repository.create({
        chassis: 'Atlas',
        variant: 'List-1',
        data: { chassis: 'Atlas', variant: 'List-1', tonnage: 100 },
      });
      repository.create({
        chassis: 'Hunchback',
        variant: 'List-2',
        data: { chassis: 'Hunchback', variant: 'List-2', tonnage: 50 },
      });

      const units = repository.list();

      expect(units.length).toBe(2);
      expect(units.some(u => u.chassis === 'Atlas')).toBe(true);
      expect(units.some(u => u.chassis === 'Hunchback')).toBe(true);
    });
  });

  describe('suggestCloneName', () => {
    it('should suggest unique name with -Custom-1 suffix', () => {
      const suggestion = repository.suggestCloneName('Atlas', 'AS7-D');

      expect(suggestion.chassis).toBe('Atlas');
      expect(suggestion.suggestedVariant).toBe('AS7-D-Custom-1');
    });

    it('should increment suffix if name exists', () => {
      // Create unit with -Custom-1
      repository.create({
        chassis: 'Atlas',
        variant: 'AS7-D-Custom-1',
        data: { chassis: 'Atlas', variant: 'AS7-D-Custom-1', tonnage: 100 },
      });

      const suggestion = repository.suggestCloneName('Atlas', 'AS7-D');

      expect(suggestion.suggestedVariant).toBe('AS7-D-Custom-2');
    });
  });

  describe('findByName', () => {
    it('should find unit by name (case-insensitive)', () => {
      repository.create({
        chassis: 'Timber Wolf',
        variant: 'Prime',
        data: { chassis: 'Timber Wolf', variant: 'Prime', tonnage: 75 },
      });

      const found = repository.findByName('timber wolf', 'PRIME');

      expect(found).not.toBeNull();
      expect(found?.chassis).toBe('Timber Wolf');
    });

    it('should return null for non-existent name', () => {
      const found = repository.findByName('NonExistent', 'Variant');
      expect(found).toBeNull();
    });
  });
});

