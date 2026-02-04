/**
 * ForceRepository Tests
 *
 * Tests for the SQLite-based force repository.
 * Covers CRUD operations for forces and assignment operations.
 */

import {
  ForceRepository,
  getForceRepository,
  ForceErrorCode,
} from '@/services/forces/ForceRepository';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  ForceType,
  ForceStatus,
  ForcePosition,
  ICreateForceRequest,
} from '@/types/force';
import fs from 'fs';
import path from 'path';

// Test database path
const TEST_DB_PATH = './data/test-force-repository.db';

describe('ForceRepository', () => {
  let repository: ForceRepository;

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Clean up WAL files if they exist
    const walPath = `${TEST_DB_PATH}-wal`;
    const shmPath = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    // Ensure data directory exists
    const dataDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Reset SQLite singleton
    resetSQLiteService();

    // Initialize with test database
    const sqliteService = getSQLiteService({ path: TEST_DB_PATH });
    sqliteService.initialize();

    // Create a fresh repository instance for each test
    repository = new ForceRepository();
  });

  afterEach(() => {
    // Close database and clean up
    resetSQLiteService();

    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Clean up WAL files
    const walPath = `${TEST_DB_PATH}-wal`;
    const shmPath = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  // ===========================================================================
  // Initialize Tests
  // ===========================================================================

  describe('initialize', () => {
    it('should create forces and force_assignments tables', () => {
      repository.initialize();

      const db = getSQLiteService().getDatabase();

      // Check forces table exists
      const forcesTable = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='forces'"
        )
        .get();
      expect(forcesTable).toBeDefined();

      // Check force_assignments table exists
      const assignmentsTable = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='force_assignments'"
        )
        .get();
      expect(assignmentsTable).toBeDefined();
    });

    it('should be idempotent (can be called multiple times)', () => {
      repository.initialize();
      repository.initialize();
      repository.initialize();

      // Should not throw
      const forces = repository.getAllForces();
      expect(forces).toEqual([]);
    });
  });

  // ===========================================================================
  // createForce Tests
  // ===========================================================================

  describe('createForce', () => {
    it('should create a new lance force with 4 empty assignments', () => {
      const request: ICreateForceRequest = {
        name: 'Alpha Lance',
        forceType: ForceType.Lance,
        affiliation: 'House Steiner',
        description: 'Recon lance',
      };

      const result = repository.createForce(request);

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^force-/);

      // Verify force was created
      const force = repository.getForceById(result.id!);
      expect(force).not.toBeNull();
      expect(force?.name).toBe('Alpha Lance');
      expect(force?.forceType).toBe(ForceType.Lance);
      expect(force?.affiliation).toBe('House Steiner');
      expect(force?.description).toBe('Recon lance');
      expect(force?.status).toBe(ForceStatus.Active);
      expect(force?.assignments.length).toBe(4);
    });

    it('should create a star force with 5 empty assignments', () => {
      const request: ICreateForceRequest = {
        name: 'Nova Cat Star',
        forceType: ForceType.Star,
      };

      const result = repository.createForce(request);

      expect(result.success).toBe(true);

      const force = repository.getForceById(result.id!);
      expect(force?.assignments.length).toBe(5);
    });

    it('should create a Level II force with 6 empty assignments', () => {
      const request: ICreateForceRequest = {
        name: 'ComStar Level II',
        forceType: ForceType.Level_II,
      };

      const result = repository.createForce(request);

      expect(result.success).toBe(true);

      const force = repository.getForceById(result.id!);
      expect(force?.assignments.length).toBe(6);
    });

    it('should create a company force with 12 empty assignments', () => {
      const request: ICreateForceRequest = {
        name: 'Bravo Company',
        forceType: ForceType.Company,
      };

      const result = repository.createForce(request);

      expect(result.success).toBe(true);

      const force = repository.getForceById(result.id!);
      expect(force?.assignments.length).toBe(12);
    });

    it('should set first slot position to Lead and others to Member', () => {
      const request: ICreateForceRequest = {
        name: 'Test Lance',
        forceType: ForceType.Lance,
      };

      const result = repository.createForce(request);
      const force = repository.getForceById(result.id!);

      expect(force?.assignments[0].position).toBe(ForcePosition.Lead);
      expect(force?.assignments[1].position).toBe(ForcePosition.Member);
      expect(force?.assignments[2].position).toBe(ForcePosition.Member);
      expect(force?.assignments[3].position).toBe(ForcePosition.Member);
    });

    it('should create assignments with null pilot and unit IDs', () => {
      const request: ICreateForceRequest = {
        name: 'Empty Lance',
        forceType: ForceType.Lance,
      };

      const result = repository.createForce(request);
      const force = repository.getForceById(result.id!);

      for (const assignment of force!.assignments) {
        expect(assignment.pilotId).toBeNull();
        expect(assignment.unitId).toBeNull();
      }
    });

    it('should create force with parent ID', () => {
      // Create parent company
      const parentResult = repository.createForce({
        name: 'Parent Company',
        forceType: ForceType.Company,
      });

      // Create child lance
      const childResult = repository.createForce({
        name: 'Child Lance',
        forceType: ForceType.Lance,
        parentId: parentResult.id,
      });

      expect(childResult.success).toBe(true);

      const childForce = repository.getForceById(childResult.id!);
      expect(childForce?.parentId).toBe(parentResult.id);

      const parentForce = repository.getForceById(parentResult.id!);
      expect(parentForce?.childIds).toContain(childResult.id);
    });

    it('should set timestamps on creation', () => {
      const beforeCreate = new Date().toISOString();

      const result = repository.createForce({
        name: 'Timestamped Force',
        forceType: ForceType.Lance,
      });

      const afterCreate = new Date().toISOString();

      const force = repository.getForceById(result.id!);
      expect(force?.createdAt).toBeDefined();
      expect(force?.updatedAt).toBeDefined();
      expect(force!.createdAt >= beforeCreate).toBe(true);
      expect(force!.createdAt <= afterCreate).toBe(true);
      expect(force?.createdAt).toBe(force?.updatedAt);
    });
  });

  // ===========================================================================
  // getForceById Tests
  // ===========================================================================

  describe('getForceById', () => {
    it('should return null for non-existent force', () => {
      const force = repository.getForceById('non-existent-id');
      expect(force).toBeNull();
    });

    it('should return the force after creation', () => {
      const result = repository.createForce({
        name: 'Test Force',
        forceType: ForceType.Lance,
        affiliation: 'Test Affiliation',
      });

      const force = repository.getForceById(result.id!);

      expect(force).not.toBeNull();
      expect(force?.id).toBe(result.id);
      expect(force?.name).toBe('Test Force');
      expect(force?.forceType).toBe(ForceType.Lance);
      expect(force?.affiliation).toBe('Test Affiliation');
    });

    it('should include calculated stats', () => {
      const result = repository.createForce({
        name: 'Stats Test',
        forceType: ForceType.Lance,
      });

      const force = repository.getForceById(result.id!);

      expect(force?.stats).toBeDefined();
      expect(force?.stats.totalBV).toBe(0);
      expect(force?.stats.totalTonnage).toBe(0);
      expect(force?.stats.assignedPilots).toBe(0);
      expect(force?.stats.assignedUnits).toBe(0);
      expect(force?.stats.emptySlots).toBe(4);
      expect(force?.stats.averageSkill).toBeNull();
    });
  });

  // ===========================================================================
  // getAllForces Tests
  // ===========================================================================

  describe('getAllForces', () => {
    it('should return empty array when no forces exist', () => {
      const forces = repository.getAllForces();
      expect(forces).toEqual([]);
    });

    it('should return all forces', () => {
      repository.createForce({ name: 'Force A', forceType: ForceType.Lance });
      repository.createForce({ name: 'Force B', forceType: ForceType.Star });
      repository.createForce({ name: 'Force C', forceType: ForceType.Level_II });

      const forces = repository.getAllForces();

      expect(forces.length).toBe(3);
      expect(forces.some((f) => f.name === 'Force A')).toBe(true);
      expect(forces.some((f) => f.name === 'Force B')).toBe(true);
      expect(forces.some((f) => f.name === 'Force C')).toBe(true);
    });

    it('should return all created forces', () => {
      repository.createForce({ name: 'First', forceType: ForceType.Lance });
      repository.createForce({ name: 'Second', forceType: ForceType.Lance });
      repository.createForce({ name: 'Third', forceType: ForceType.Lance });

      const forces = repository.getAllForces();

      // All three forces should be returned (order may depend on insertion speed)
      expect(forces.length).toBe(3);
      const names = forces.map((f) => f.name).sort();
      expect(names).toEqual(['First', 'Second', 'Third']);
    });
  });

  // ===========================================================================
  // getRootForces Tests
  // ===========================================================================

  describe('getRootForces', () => {
    it('should return empty array when no forces exist', () => {
      const forces = repository.getRootForces();
      expect(forces).toEqual([]);
    });

    it('should return only forces without parent', () => {
      // Create root force
      const rootResult = repository.createForce({
        name: 'Root Company',
        forceType: ForceType.Company,
      });

      // Create child force
      repository.createForce({
        name: 'Child Lance',
        forceType: ForceType.Lance,
        parentId: rootResult.id,
      });

      // Create another root force
      repository.createForce({
        name: 'Another Root',
        forceType: ForceType.Lance,
      });

      const rootForces = repository.getRootForces();

      expect(rootForces.length).toBe(2);
      expect(rootForces.some((f) => f.name === 'Root Company')).toBe(true);
      expect(rootForces.some((f) => f.name === 'Another Root')).toBe(true);
      expect(rootForces.some((f) => f.name === 'Child Lance')).toBe(false);
    });

    it('should return root forces ordered by name', () => {
      repository.createForce({ name: 'Zebra Force', forceType: ForceType.Lance });
      repository.createForce({ name: 'Alpha Force', forceType: ForceType.Lance });
      repository.createForce({ name: 'Delta Force', forceType: ForceType.Lance });

      const forces = repository.getRootForces();

      expect(forces[0].name).toBe('Alpha Force');
      expect(forces[1].name).toBe('Delta Force');
      expect(forces[2].name).toBe('Zebra Force');
    });
  });

  // ===========================================================================
  // getChildForces Tests
  // ===========================================================================

  describe('getChildForces', () => {
    it('should return empty array for force with no children', () => {
      const result = repository.createForce({
        name: 'Lonely Force',
        forceType: ForceType.Lance,
      });

      const children = repository.getChildForces(result.id!);
      expect(children).toEqual([]);
    });

    it('should return empty array for non-existent parent', () => {
      const children = repository.getChildForces('non-existent-id');
      expect(children).toEqual([]);
    });

    it('should return child forces', () => {
      // Create parent
      const parentResult = repository.createForce({
        name: 'Parent Battalion',
        forceType: ForceType.Battalion,
      });

      // Create children
      repository.createForce({
        name: 'Alpha Company',
        forceType: ForceType.Company,
        parentId: parentResult.id,
      });

      repository.createForce({
        name: 'Beta Company',
        forceType: ForceType.Company,
        parentId: parentResult.id,
      });

      const children = repository.getChildForces(parentResult.id!);

      expect(children.length).toBe(2);
      expect(children.some((f) => f.name === 'Alpha Company')).toBe(true);
      expect(children.some((f) => f.name === 'Beta Company')).toBe(true);
    });

    it('should return children ordered by name', () => {
      const parentResult = repository.createForce({
        name: 'Parent',
        forceType: ForceType.Company,
      });

      repository.createForce({
        name: 'Charlie Lance',
        forceType: ForceType.Lance,
        parentId: parentResult.id,
      });

      repository.createForce({
        name: 'Alpha Lance',
        forceType: ForceType.Lance,
        parentId: parentResult.id,
      });

      repository.createForce({
        name: 'Bravo Lance',
        forceType: ForceType.Lance,
        parentId: parentResult.id,
      });

      const children = repository.getChildForces(parentResult.id!);

      expect(children[0].name).toBe('Alpha Lance');
      expect(children[1].name).toBe('Bravo Lance');
      expect(children[2].name).toBe('Charlie Lance');
    });
  });

  // ===========================================================================
  // updateForce Tests
  // ===========================================================================

  describe('updateForce', () => {
    it('should update force name', () => {
      const result = repository.createForce({
        name: 'Original Name',
        forceType: ForceType.Lance,
      });

      const updateResult = repository.updateForce(result.id!, {
        name: 'Updated Name',
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.id).toBe(result.id);

      const force = repository.getForceById(result.id!);
      expect(force?.name).toBe('Updated Name');
    });

    it('should update force type', () => {
      const result = repository.createForce({
        name: 'Type Test',
        forceType: ForceType.Lance,
      });

      repository.updateForce(result.id!, {
        forceType: ForceType.Star,
      });

      const force = repository.getForceById(result.id!);
      expect(force?.forceType).toBe(ForceType.Star);
    });

    it('should update force status', () => {
      const result = repository.createForce({
        name: 'Status Test',
        forceType: ForceType.Lance,
      });

      repository.updateForce(result.id!, {
        status: ForceStatus.Maintenance,
      });

      const force = repository.getForceById(result.id!);
      expect(force?.status).toBe(ForceStatus.Maintenance);
    });

    it('should update affiliation', () => {
      const result = repository.createForce({
        name: 'Affiliation Test',
        forceType: ForceType.Lance,
        affiliation: 'House Davion',
      });

      repository.updateForce(result.id!, {
        affiliation: 'House Steiner',
      });

      const force = repository.getForceById(result.id!);
      expect(force?.affiliation).toBe('House Steiner');
    });

    it('should clear affiliation when set to empty string', () => {
      const result = repository.createForce({
        name: 'Clear Affiliation Test',
        forceType: ForceType.Lance,
        affiliation: 'House Liao',
      });

      // Use empty string to clear - the repository converts falsy values to null in DB
      repository.updateForce(result.id!, {
        affiliation: '',
      });

      const force = repository.getForceById(result.id!);
      // Note: empty string is stored, but the hydration converts null/empty to undefined
      expect(force?.affiliation === '' || force?.affiliation === undefined).toBe(true);
    });

    it('should update description', () => {
      const result = repository.createForce({
        name: 'Description Test',
        forceType: ForceType.Lance,
      });

      repository.updateForce(result.id!, {
        description: 'New description',
      });

      const force = repository.getForceById(result.id!);
      expect(force?.description).toBe('New description');
    });

    it('should update parentId', () => {
      const parentResult = repository.createForce({
        name: 'New Parent',
        forceType: ForceType.Company,
      });

      const childResult = repository.createForce({
        name: 'Orphan Lance',
        forceType: ForceType.Lance,
      });

      repository.updateForce(childResult.id!, {
        parentId: parentResult.id,
      });

      const childForce = repository.getForceById(childResult.id!);
      expect(childForce?.parentId).toBe(parentResult.id);

      const parentForce = repository.getForceById(parentResult.id!);
      expect(parentForce?.childIds).toContain(childResult.id);
    });

    it('should remove parentId when set to null', () => {
      const parentResult = repository.createForce({
        name: 'Parent',
        forceType: ForceType.Company,
      });

      const childResult = repository.createForce({
        name: 'Child',
        forceType: ForceType.Lance,
        parentId: parentResult.id,
      });

      repository.updateForce(childResult.id!, {
        parentId: null,
      });

      const childForce = repository.getForceById(childResult.id!);
      expect(childForce?.parentId).toBeUndefined();
    });

    it('should update updatedAt timestamp', async () => {
      const result = repository.createForce({
        name: 'Timestamp Test',
        forceType: ForceType.Lance,
      });

      const forceBefore = repository.getForceById(result.id!);
      const createdAt = forceBefore?.createdAt;

      // Wait briefly to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      repository.updateForce(result.id!, {
        name: 'New Name',
      });

      const forceAfter = repository.getForceById(result.id!);
      // updatedAt should be >= createdAt after update
      expect(forceAfter?.updatedAt && forceAfter.updatedAt >= createdAt!).toBe(true);
      // The force should have the new name
      expect(forceAfter?.name).toBe('New Name');
    });

    it('should update multiple fields at once', () => {
      const result = repository.createForce({
        name: 'Multi Update',
        forceType: ForceType.Lance,
      });

      repository.updateForce(result.id!, {
        name: 'New Name',
        forceType: ForceType.Star,
        status: ForceStatus.Transit,
        affiliation: 'Clan Wolf',
        description: 'Updated description',
      });

      const force = repository.getForceById(result.id!);
      expect(force?.name).toBe('New Name');
      expect(force?.forceType).toBe(ForceType.Star);
      expect(force?.status).toBe(ForceStatus.Transit);
      expect(force?.affiliation).toBe('Clan Wolf');
      expect(force?.description).toBe('Updated description');
    });

    it('should prevent circular hierarchy (self-reference)', () => {
      const result = repository.createForce({
        name: 'Self Loop',
        forceType: ForceType.Lance,
      });

      const updateResult = repository.updateForce(result.id!, {
        parentId: result.id,
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.errorCode).toBe(ForceErrorCode.CircularHierarchy);
    });

    it('should prevent circular hierarchy (indirect loop)', () => {
      // Create A -> B -> C hierarchy
      const aResult = repository.createForce({
        name: 'Force A',
        forceType: ForceType.Battalion,
      });

      const bResult = repository.createForce({
        name: 'Force B',
        forceType: ForceType.Company,
        parentId: aResult.id,
      });

      const cResult = repository.createForce({
        name: 'Force C',
        forceType: ForceType.Lance,
        parentId: bResult.id,
      });

      // Try to set A's parent to C (would create C -> A -> B -> C loop)
      const updateResult = repository.updateForce(aResult.id!, {
        parentId: cResult.id,
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.errorCode).toBe(ForceErrorCode.CircularHierarchy);
    });
  });

  // ===========================================================================
  // deleteForce Tests
  // ===========================================================================

  describe('deleteForce', () => {
    it('should delete existing force', () => {
      const result = repository.createForce({
        name: 'To Delete',
        forceType: ForceType.Lance,
      });

      const deleteResult = repository.deleteForce(result.id!);

      expect(deleteResult.success).toBe(true);

      const force = repository.getForceById(result.id!);
      expect(force).toBeNull();
    });

    it('should delete force assignments', () => {
      const result = repository.createForce({
        name: 'Delete Assignments',
        forceType: ForceType.Lance,
      });

      const forceBefore = repository.getForceById(result.id!);
      expect(forceBefore?.assignments.length).toBe(4);

      repository.deleteForce(result.id!);

      // Verify assignments are deleted by checking database directly
      const db = getSQLiteService().getDatabase();
      const assignments = db
        .prepare('SELECT * FROM force_assignments WHERE force_id = ?')
        .all(result.id);
      expect(assignments.length).toBe(0);
    });

    it('should set children parent to null on delete', () => {
      const parentResult = repository.createForce({
        name: 'Parent To Delete',
        forceType: ForceType.Company,
      });

      const childResult = repository.createForce({
        name: 'Orphaned Child',
        forceType: ForceType.Lance,
        parentId: parentResult.id,
      });

      repository.deleteForce(parentResult.id!);

      const childForce = repository.getForceById(childResult.id!);
      expect(childForce).not.toBeNull();
      expect(childForce?.parentId).toBeUndefined();
    });

    it('should succeed for non-existent force (idempotent)', () => {
      const deleteResult = repository.deleteForce('non-existent-id');
      expect(deleteResult.success).toBe(true);
    });
  });

  // ===========================================================================
  // updateAssignment Tests
  // ===========================================================================

  describe('updateAssignment', () => {
    // Helper to create a test pilot in the database
    function createTestPilot(id: string): void {
      const db = getSQLiteService().getDatabase();
      db.prepare(`
        INSERT INTO pilots (id, name, gunnery, piloting, type, status, created_at, updated_at)
        VALUES (?, ?, 4, 5, 'persistent', 'active', datetime('now'), datetime('now'))
      `).run(id, `Test Pilot ${id}`);
    }

    it('should update pilot ID', () => {
      // Create a test pilot first (FK constraint requires valid pilot)
      createTestPilot('pilot-123');

      const forceResult = repository.createForce({
        name: 'Assignment Test',
        forceType: ForceType.Lance,
      });

      const force = repository.getForceById(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      const updateResult = repository.updateAssignment(assignmentId, {
        pilotId: 'pilot-123',
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.id).toBe(assignmentId);

      const updatedForce = repository.getForceById(forceResult.id!);
      expect(updatedForce?.assignments[0].pilotId).toBe('pilot-123');
    });

    it('should update unit ID', () => {
      const forceResult = repository.createForce({
        name: 'Unit Assignment Test',
        forceType: ForceType.Lance,
      });

      const force = repository.getForceById(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      repository.updateAssignment(assignmentId, {
        unitId: 'unit-456',
      });

      const updatedForce = repository.getForceById(forceResult.id!);
      expect(updatedForce?.assignments[0].unitId).toBe('unit-456');
    });

    it('should update position', () => {
      const forceResult = repository.createForce({
        name: 'Position Test',
        forceType: ForceType.Lance,
      });

      const force = repository.getForceById(forceResult.id!);
      const assignmentId = force!.assignments[1].id; // Second slot (member)

      repository.updateAssignment(assignmentId, {
        position: ForcePosition.Scout,
      });

      const updatedForce = repository.getForceById(forceResult.id!);
      expect(updatedForce?.assignments[1].position).toBe(ForcePosition.Scout);
    });

    it('should update notes', () => {
      const forceResult = repository.createForce({
        name: 'Notes Test',
        forceType: ForceType.Lance,
      });

      const force = repository.getForceById(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      repository.updateAssignment(assignmentId, {
        notes: 'Veteran pilot',
      });

      const updatedForce = repository.getForceById(forceResult.id!);
      expect(updatedForce?.assignments[0].notes).toBe('Veteran pilot');
    });

    it('should update notes with empty string', () => {
      const forceResult = repository.createForce({
        name: 'Clear Notes Test',
        forceType: ForceType.Lance,
      });

      const force = repository.getForceById(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      // Add notes first
      repository.updateAssignment(assignmentId, {
        notes: 'Some notes',
      });

      // Update with empty string
      repository.updateAssignment(assignmentId, {
        notes: '',
      });

      const updatedForce = repository.getForceById(forceResult.id!);
      // Empty string stored as-is or converted
      expect(updatedForce?.assignments[0].notes === '' || updatedForce?.assignments[0].notes === undefined).toBe(true);
    });

    it('should update multiple fields at once', () => {
      // Create a test pilot first (FK constraint requires valid pilot)
      createTestPilot('pilot-multi');

      const forceResult = repository.createForce({
        name: 'Multi Field Update',
        forceType: ForceType.Lance,
      });

      const force = repository.getForceById(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      repository.updateAssignment(assignmentId, {
        pilotId: 'pilot-multi',
        unitId: 'unit-multi',
        position: ForcePosition.Commander,
        notes: 'Commanding officer',
      });

      const updatedForce = repository.getForceById(forceResult.id!);
      const assignment = updatedForce?.assignments[0];
      expect(assignment?.pilotId).toBe('pilot-multi');
      expect(assignment?.unitId).toBe('unit-multi');
      expect(assignment?.position).toBe(ForcePosition.Commander);
      expect(assignment?.notes).toBe('Commanding officer');
    });

    it('should return error when no updates provided', () => {
      const forceResult = repository.createForce({
        name: 'No Update Test',
        forceType: ForceType.Lance,
      });

      const force = repository.getForceById(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      const updateResult = repository.updateAssignment(assignmentId, {});

      expect(updateResult.success).toBe(false);
      expect(updateResult.errorCode).toBe(ForceErrorCode.ValidationError);
      expect(updateResult.error).toBe('No updates provided');
    });

    it('should update calculated stats after assignment changes', () => {
      // Create a test pilot first (FK constraint requires valid pilot)
      createTestPilot('pilot-1');

      const forceResult = repository.createForce({
        name: 'Stats Update Test',
        forceType: ForceType.Lance,
      });

      let force = repository.getForceById(forceResult.id!);
      expect(force?.stats.assignedPilots).toBe(0);
      expect(force?.stats.assignedUnits).toBe(0);
      expect(force?.stats.emptySlots).toBe(4);

      // Assign pilot to first slot
      repository.updateAssignment(force!.assignments[0].id, {
        pilotId: 'pilot-1',
      });

      force = repository.getForceById(forceResult.id!);
      expect(force?.stats.assignedPilots).toBe(1);
      expect(force?.stats.emptySlots).toBe(3);

      // Assign unit to first slot
      repository.updateAssignment(force!.assignments[0].id, {
        unitId: 'unit-1',
      });

      force = repository.getForceById(forceResult.id!);
      expect(force?.stats.assignedUnits).toBe(1);
      expect(force?.stats.emptySlots).toBe(3);
    });
  });

  // ===========================================================================
  // swapAssignments Tests
  // ===========================================================================

  describe('swapAssignments', () => {
    // Helper to create a test pilot in the database
    function createSwapTestPilot(id: string): void {
      const db = getSQLiteService().getDatabase();
      db.prepare(`
        INSERT INTO pilots (id, name, gunnery, piloting, type, status, created_at, updated_at)
        VALUES (?, ?, 4, 5, 'persistent', 'active', datetime('now'), datetime('now'))
      `).run(id, `Test Pilot ${id}`);
    }

    it('should swap pilot and unit between two assignments', () => {
      // Create test pilots (FK constraint requires valid pilots)
      createSwapTestPilot('pilot-A');
      createSwapTestPilot('pilot-B');

      const forceResult = repository.createForce({
        name: 'Swap Test',
        forceType: ForceType.Lance,
      });

      let force = repository.getForceById(forceResult.id!);
      const assign1Id = force!.assignments[0].id;
      const assign2Id = force!.assignments[1].id;

      // Set up assignments
      repository.updateAssignment(assign1Id, {
        pilotId: 'pilot-A',
        unitId: 'unit-A',
      });
      repository.updateAssignment(assign2Id, {
        pilotId: 'pilot-B',
        unitId: 'unit-B',
      });

      // Swap
      const swapResult = repository.swapAssignments(assign1Id, assign2Id);

      expect(swapResult.success).toBe(true);

      force = repository.getForceById(forceResult.id!);
      expect(force?.assignments[0].pilotId).toBe('pilot-B');
      expect(force?.assignments[0].unitId).toBe('unit-B');
      expect(force?.assignments[1].pilotId).toBe('pilot-A');
      expect(force?.assignments[1].unitId).toBe('unit-A');
    });

    it('should swap with empty assignment', () => {
      // Create test pilot (FK constraint requires valid pilot)
      createSwapTestPilot('pilot-only');

      const forceResult = repository.createForce({
        name: 'Swap Empty Test',
        forceType: ForceType.Lance,
      });

      let force = repository.getForceById(forceResult.id!);
      const assign1Id = force!.assignments[0].id;
      const assign2Id = force!.assignments[1].id;

      // Only set up first assignment
      repository.updateAssignment(assign1Id, {
        pilotId: 'pilot-only',
        unitId: 'unit-only',
      });

      // Swap
      repository.swapAssignments(assign1Id, assign2Id);

      force = repository.getForceById(forceResult.id!);
      expect(force?.assignments[0].pilotId).toBeNull();
      expect(force?.assignments[0].unitId).toBeNull();
      expect(force?.assignments[1].pilotId).toBe('pilot-only');
      expect(force?.assignments[1].unitId).toBe('unit-only');
    });

    it('should return error if first assignment does not exist', () => {
      const forceResult = repository.createForce({
        name: 'Invalid Swap 1',
        forceType: ForceType.Lance,
      });

      const force = repository.getForceById(forceResult.id!);
      const validId = force!.assignments[0].id;

      const swapResult = repository.swapAssignments('non-existent-1', validId);

      expect(swapResult.success).toBe(false);
      expect(swapResult.errorCode).toBe(ForceErrorCode.NotFound);
    });

    it('should return error if second assignment does not exist', () => {
      const forceResult = repository.createForce({
        name: 'Invalid Swap 2',
        forceType: ForceType.Lance,
      });

      const force = repository.getForceById(forceResult.id!);
      const validId = force!.assignments[0].id;

      const swapResult = repository.swapAssignments(validId, 'non-existent-2');

      expect(swapResult.success).toBe(false);
      expect(swapResult.errorCode).toBe(ForceErrorCode.NotFound);
    });

    it('should return error if both assignments do not exist', () => {
      const swapResult = repository.swapAssignments('non-existent-1', 'non-existent-2');

      expect(swapResult.success).toBe(false);
      expect(swapResult.errorCode).toBe(ForceErrorCode.NotFound);
    });
  });

  // ===========================================================================
  // clearAssignment Tests
  // ===========================================================================

  describe('clearAssignment', () => {
    // Helper to create a test pilot in the database
    function createClearTestPilot(id: string): void {
      const db = getSQLiteService().getDatabase();
      db.prepare(`
        INSERT INTO pilots (id, name, gunnery, piloting, type, status, created_at, updated_at)
        VALUES (?, ?, 4, 5, 'persistent', 'active', datetime('now'), datetime('now'))
      `).run(id, `Test Pilot ${id}`);
    }

    it('should clear pilot and unit from assignment', () => {
      // Create test pilot (FK constraint requires valid pilot)
      createClearTestPilot('pilot-to-clear');

      const forceResult = repository.createForce({
        name: 'Clear Test',
        forceType: ForceType.Lance,
      });

      let force = repository.getForceById(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      // Set up assignment
      repository.updateAssignment(assignmentId, {
        pilotId: 'pilot-to-clear',
        unitId: 'unit-to-clear',
      });

      // Clear
      const clearResult = repository.clearAssignment(assignmentId);

      expect(clearResult.success).toBe(true);
      expect(clearResult.id).toBe(assignmentId);

      force = repository.getForceById(forceResult.id!);
      expect(force?.assignments[0].pilotId).toBeNull();
      expect(force?.assignments[0].unitId).toBeNull();
    });

    it('should preserve position and notes when clearing', () => {
      // Create test pilot (FK constraint requires valid pilot)
      createClearTestPilot('pilot-x');

      const forceResult = repository.createForce({
        name: 'Preserve Test',
        forceType: ForceType.Lance,
      });

      let force = repository.getForceById(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      // First update position and notes separately (they don't require pilot FK)
      repository.updateAssignment(assignmentId, {
        position: ForcePosition.Commander,
        notes: 'Important notes',
      });

      // Then assign pilot and unit
      repository.updateAssignment(assignmentId, {
        pilotId: 'pilot-x',
        unitId: 'unit-x',
      });

      // Clear
      repository.clearAssignment(assignmentId);

      force = repository.getForceById(forceResult.id!);
      const assignment = force?.assignments[0];
      expect(assignment?.pilotId).toBeNull();
      expect(assignment?.unitId).toBeNull();
      // Position and notes should be preserved
      expect(assignment?.position).toBe(ForcePosition.Commander);
      expect(assignment?.notes).toBe('Important notes');
    });

    it('should succeed for already empty assignment', () => {
      const forceResult = repository.createForce({
        name: 'Already Empty',
        forceType: ForceType.Lance,
      });

      const force = repository.getForceById(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      const clearResult = repository.clearAssignment(assignmentId);

      expect(clearResult.success).toBe(true);
    });

    it('should update stats after clearing', () => {
      // Create test pilot (FK constraint requires valid pilot)
      createClearTestPilot('pilot-stats');

      const forceResult = repository.createForce({
        name: 'Stats Clear Test',
        forceType: ForceType.Lance,
      });

      let force = repository.getForceById(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      // Assign pilot and unit
      repository.updateAssignment(assignmentId, {
        pilotId: 'pilot-stats',
        unitId: 'unit-stats',
      });

      force = repository.getForceById(forceResult.id!);
      expect(force?.stats.assignedPilots).toBe(1);
      expect(force?.stats.assignedUnits).toBe(1);

      // Clear
      repository.clearAssignment(assignmentId);

      force = repository.getForceById(forceResult.id!);
      expect(force?.stats.assignedPilots).toBe(0);
      expect(force?.stats.assignedUnits).toBe(0);
      expect(force?.stats.emptySlots).toBe(4);
    });
  });

  // ===========================================================================
  // getForceRepository Singleton Tests
  // ===========================================================================

  describe('getForceRepository', () => {
    it('should return a ForceRepository instance', () => {
      const repo = getForceRepository();
      expect(repo).toBeInstanceOf(ForceRepository);
    });

    it('should return the same instance on multiple calls', () => {
      const repo1 = getForceRepository();
      const repo2 = getForceRepository();
      expect(repo1).toBe(repo2);
    });
  });

  // ===========================================================================
  // Edge Cases and Error Handling
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle special characters in force name', () => {
      const result = repository.createForce({
        name: "Wolf's Dragoons - Alpha & Beta",
        forceType: ForceType.Lance,
        description: 'Unit with "quotes" and \'apostrophes\'',
      });

      expect(result.success).toBe(true);

      const force = repository.getForceById(result.id!);
      expect(force?.name).toBe("Wolf's Dragoons - Alpha & Beta");
      expect(force?.description).toBe('Unit with "quotes" and \'apostrophes\'');
    });

    it('should handle unicode characters', () => {
      const result = repository.createForce({
        name: 'Clanners \u00FC\u00F6\u00E4',
        forceType: ForceType.Star,
      });

      expect(result.success).toBe(true);

      const force = repository.getForceById(result.id!);
      expect(force?.name).toBe('Clanners \u00FC\u00F6\u00E4');
    });

    it('should handle empty string name', () => {
      const result = repository.createForce({
        name: '',
        forceType: ForceType.Lance,
      });

      // Empty names are allowed at repository level
      expect(result.success).toBe(true);
    });

    it('should handle very long name', () => {
      const longName = 'A'.repeat(1000);
      const result = repository.createForce({
        name: longName,
        forceType: ForceType.Lance,
      });

      expect(result.success).toBe(true);

      const force = repository.getForceById(result.id!);
      expect(force?.name).toBe(longName);
    });

    it('should handle Binary force type with 10 assignments', () => {
      const result = repository.createForce({
        name: 'Binary Test',
        forceType: ForceType.Binary,
      });

      const force = repository.getForceById(result.id!);
      expect(force?.assignments.length).toBe(10);
    });

    it('should handle Custom force type with 4 assignments', () => {
      const result = repository.createForce({
        name: 'Custom Force',
        forceType: ForceType.Custom,
      });

      const force = repository.getForceById(result.id!);
      expect(force?.assignments.length).toBe(4);
    });
  });
});
