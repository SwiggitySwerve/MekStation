/**
 * Version Repository Tests
 * 
 * Tests for the SQLite-based version repository.
 */

// Jest is the testing framework used in this project
import { 
  VersionRepository, 
  getVersionRepository, 
  resetVersionRepository 
} from '@/services/units/VersionRepository';
import { 
  getUnitRepository, 
  resetUnitRepository 
} from '@/services/units/UnitRepository';
import { 
  getSQLiteService, 
  resetSQLiteService 
} from '@/services/persistence/SQLiteService';
import fs from 'fs';
import path from 'path';

// Test database path
const TEST_DB_PATH = './data/test-versions.db';

describe('VersionRepository', () => {
  let versionRepository: VersionRepository;

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
    resetVersionRepository();

    // Initialize with test database
    const sqliteService = getSQLiteService({ path: TEST_DB_PATH });
    sqliteService.initialize();

    versionRepository = getVersionRepository();
  });

  afterEach(() => {
    // Close database and clean up
    resetSQLiteService();
    resetUnitRepository();
    resetVersionRepository();

    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  // Helper to create a unit
  function createTestUnit(): string {
    const unitRepository = getUnitRepository();
    const result = unitRepository.create({
      chassis: 'TestMech',
      variant: `Test-${Date.now()}`,
      data: { chassis: 'TestMech', tonnage: 50 },
    });
    if (!result.success) {
      throw new Error(`Failed to create test unit: ${result.error.message ?? 'Unknown error'}`);
    }
    return result.data.id;
  }

  // Helper to update a unit (creates new version)
  function updateTestUnit(id: string): void {
    const unitRepository = getUnitRepository();
    unitRepository.update(id, {
      data: { chassis: 'TestMech', tonnage: 50, updated: true },
    });
  }

  describe('getVersionHistory', () => {
    it('should return version history in descending order', () => {
      const unitId = createTestUnit();
      updateTestUnit(unitId);
      updateTestUnit(unitId);

      const history = versionRepository.getVersionHistory(unitId);

      expect(history.length).toBe(3);
      expect(history[0].version).toBe(3); // Most recent first
      expect(history[1].version).toBe(2);
      expect(history[2].version).toBe(1);
    });

    it('should return empty array for non-existent unit', () => {
      const history = versionRepository.getVersionHistory('non-existent');
      expect(history).toEqual([]);
    });
  });

  describe('getVersion', () => {
    it('should return specific version data', () => {
      const unitId = createTestUnit();
      updateTestUnit(unitId);

      const version = versionRepository.getVersion(unitId, 1);

      expect(version).not.toBeNull();
      expect(version?.version).toBe(1);
      expect(version?.data).toBeDefined();
    });

    it('should return null for non-existent version', () => {
      const unitId = createTestUnit();

      const version = versionRepository.getVersion(unitId, 999);

      expect(version).toBeNull();
    });
  });

  describe('getLatestVersion', () => {
    it('should return latest version', () => {
      const unitId = createTestUnit();
      updateTestUnit(unitId);
      updateTestUnit(unitId);

      const latest = versionRepository.getLatestVersion(unitId);

      expect(latest).not.toBeNull();
      expect(latest?.version).toBe(3);
    });
  });

  describe('revert', () => {
    it('should create new version with old data', () => {
      const unitId = createTestUnit();
      updateTestUnit(unitId);
      updateTestUnit(unitId);

      // Revert to version 1
      const result = versionRepository.revert(unitId, 1);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.version).toBe(4); // New version created

      // Verify new version references revert source
      const history = versionRepository.getVersionHistory(unitId);
      expect(history[0].revertSource).toBe(1);
    });

    it('should return error for non-existent version', () => {
      const unitId = createTestUnit();

      const result = versionRepository.revert(unitId, 999);

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.errorCode).toBe('VERSION_NOT_FOUND');
    });

    it('should return error for non-existent unit', () => {
      const result = versionRepository.revert('non-existent', 1);

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.errorCode).toBe('VERSION_NOT_FOUND');
    });
  });

  describe('getVersionCount', () => {
    it('should return correct version count', () => {
      const unitId = createTestUnit();
      updateTestUnit(unitId);
      updateTestUnit(unitId);

      const count = versionRepository.getVersionCount(unitId);

      expect(count).toBe(3);
    });

    it('should return 0 for non-existent unit', () => {
      const count = versionRepository.getVersionCount('non-existent');
      expect(count).toBe(0);
    });
  });
});

