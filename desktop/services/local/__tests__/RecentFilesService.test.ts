/**
 * RecentFilesService Unit Tests
 * 
 * Tests for the recent files service including CRUD operations,
 * LRU eviction, persistence, and event notifications.
 */

import { RecentFilesService } from '../RecentFilesService';
import { LocalStorageService } from '../LocalStorageService';
import { Result, IRecentFile } from '../../../types/BaseTypes';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

// Mock LocalStorageService
const mockLocalStorage = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  initialize: jest.fn(),
  cleanup: jest.fn()
};

// Helper to create a recent file entry
function createRecentFile(id: string, name: string = 'Test Unit'): IRecentFile {
  return {
    id,
    name,
    path: `/path/to/${id}.json`,
    lastOpened: new Date().toISOString(),
    unitType: 'BattleMech' as UnitType,
    tonnage: 75,
    variant: 'TDR-5S'
  };
}

describe('RecentFilesService', () => {
  let recentFilesService: RecentFilesService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.get.mockResolvedValue(Result.success(null));
    mockLocalStorage.set.mockResolvedValue(Result.success(undefined));
    recentFilesService = new RecentFilesService({
      localStorage: mockLocalStorage as unknown as LocalStorageService,
      maxRecentFiles: 5
    });
  });

  describe('initialize', () => {
    it('should load with empty list when no saved files exist', async () => {
      mockLocalStorage.get.mockResolvedValue(Result.success(null));
      
      await recentFilesService.initialize();
      
      expect(recentFilesService.list()).toEqual([]);
      expect(recentFilesService.count()).toBe(0);
    });

    it('should load saved recent files', async () => {
      const savedFiles = [
        createRecentFile('1', 'Unit 1'),
        createRecentFile('2', 'Unit 2')
      ];
      mockLocalStorage.get.mockResolvedValue(Result.success(savedFiles));
      
      await recentFilesService.initialize();
      
      expect(recentFilesService.count()).toBe(2);
    });

    it('should enforce max limit on initialization', async () => {
      const savedFiles = Array.from({ length: 10 }, (_, i) => 
        createRecentFile(`${i}`, `Unit ${i}`)
      );
      mockLocalStorage.get.mockResolvedValue(Result.success(savedFiles));
      
      await recentFilesService.initialize();
      
      expect(recentFilesService.count()).toBe(5); // Max is 5
    });

    it('should only initialize once', async () => {
      await recentFilesService.initialize();
      await recentFilesService.initialize();
      
      expect(mockLocalStorage.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('add', () => {
    beforeEach(async () => {
      await recentFilesService.initialize();
    });

    it('should add a new file to the list', async () => {
      const result = await recentFilesService.add({
        id: '1',
        name: 'New Unit',
        path: '/path/to/unit.json',
        unitType: 'BattleMech',
        tonnage: 75
      });
      
      expect(result.success).toBe(true);
      expect(recentFilesService.count()).toBe(1);
      expect(recentFilesService.get('1')?.name).toBe('New Unit');
    });

    it('should add new file at the beginning of the list', async () => {
      await recentFilesService.add({ id: '1', name: 'First', path: '/1', unitType: 'BattleMech' });
      await recentFilesService.add({ id: '2', name: 'Second', path: '/2', unitType: 'BattleMech' });
      
      const files = recentFilesService.list();
      expect(files[0].id).toBe('2'); // Most recent first
      expect(files[1].id).toBe('1');
    });

    it('should move existing file to top when re-added', async () => {
      await recentFilesService.add({ id: '1', name: 'First', path: '/1', unitType: 'BattleMech' });
      await recentFilesService.add({ id: '2', name: 'Second', path: '/2', unitType: 'BattleMech' });
      await recentFilesService.add({ id: '1', name: 'First Updated', path: '/1', unitType: 'BattleMech' });
      
      const files = recentFilesService.list();
      expect(files.length).toBe(2); // No duplicates
      expect(files[0].id).toBe('1'); // Moved to top
      expect(files[0].name).toBe('First Updated'); // Updated data
    });

    it('should enforce LRU eviction when limit reached', async () => {
      // Add 5 files (the max)
      for (let i = 1; i <= 5; i++) {
        await recentFilesService.add({
          id: `${i}`,
          name: `Unit ${i}`,
          path: `/${i}`,
          unitType: 'BattleMech'
        });
      }
      
      // Add a 6th file
      await recentFilesService.add({
        id: '6',
        name: 'Unit 6',
        path: '/6',
        unitType: 'BattleMech'
      });
      
      expect(recentFilesService.count()).toBe(5);
      expect(recentFilesService.has('1')).toBe(false); // Oldest evicted
      expect(recentFilesService.has('6')).toBe(true);
    });

    it('should emit update event on add', async () => {
      const updateHandler = jest.fn();
      recentFilesService.on('update', updateHandler);
      
      await recentFilesService.add({ id: '1', name: 'Unit', path: '/1', unitType: 'BattleMech' });
      
      expect(updateHandler).toHaveBeenCalledWith({
        action: 'add',
        files: expect.any(Array)
      });
    });

    it('should persist after add', async () => {
      await recentFilesService.add({ id: '1', name: 'Unit', path: '/1', unitType: 'BattleMech' });
      
      expect(mockLocalStorage.set).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    beforeEach(async () => {
      await recentFilesService.initialize();
      await recentFilesService.add({ id: '1', name: 'Unit 1', path: '/1', unitType: 'BattleMech' });
      await recentFilesService.add({ id: '2', name: 'Unit 2', path: '/2', unitType: 'BattleMech' });
    });

    it('should remove a file from the list', async () => {
      const result = await recentFilesService.remove('1');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
      expect(recentFilesService.has('1')).toBe(false);
      expect(recentFilesService.count()).toBe(1);
    });

    it('should return false when file not found', async () => {
      const result = await recentFilesService.remove('nonexistent');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it('should emit update event on remove', async () => {
      const updateHandler = jest.fn();
      recentFilesService.on('update', updateHandler);
      
      await recentFilesService.remove('1');
      
      expect(updateHandler).toHaveBeenCalledWith({
        action: 'remove',
        files: expect.any(Array)
      });
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      await recentFilesService.initialize();
      await recentFilesService.add({ id: '1', name: 'Unit 1', path: '/1', unitType: 'BattleMech' });
      await recentFilesService.add({ id: '2', name: 'Unit 2', path: '/2', unitType: 'BattleMech' });
    });

    it('should clear all files', async () => {
      const result = await recentFilesService.clear();
      
      expect(result.success).toBe(true);
      expect(recentFilesService.count()).toBe(0);
    });

    it('should emit update event with clear action', async () => {
      const updateHandler = jest.fn();
      recentFilesService.on('update', updateHandler);
      
      await recentFilesService.clear();
      
      expect(updateHandler).toHaveBeenCalledWith({
        action: 'clear',
        files: []
      });
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await recentFilesService.initialize();
      await recentFilesService.add({ id: '1', name: 'Unit 1', path: '/1', unitType: 'BattleMech', tonnage: 75 });
    });

    it('should return file by id', () => {
      const file = recentFilesService.get('1');
      
      expect(file).toBeDefined();
      expect(file?.name).toBe('Unit 1');
      expect(file?.tonnage).toBe(75);
    });

    it('should return undefined for non-existent id', () => {
      const file = recentFilesService.get('nonexistent');
      
      expect(file).toBeUndefined();
    });
  });

  describe('getMostRecent', () => {
    beforeEach(async () => {
      await recentFilesService.initialize();
    });

    it('should return most recent file', async () => {
      await recentFilesService.add({ id: '1', name: 'First', path: '/1', unitType: 'BattleMech' });
      await recentFilesService.add({ id: '2', name: 'Second', path: '/2', unitType: 'BattleMech' });
      
      const mostRecent = recentFilesService.getMostRecent();
      
      expect(mostRecent?.id).toBe('2');
    });

    it('should return undefined when list is empty', () => {
      const mostRecent = recentFilesService.getMostRecent();
      
      expect(mostRecent).toBeUndefined();
    });
  });

  describe('has', () => {
    beforeEach(async () => {
      await recentFilesService.initialize();
      await recentFilesService.add({ id: '1', name: 'Unit 1', path: '/1', unitType: 'BattleMech' });
    });

    it('should return true for existing file', () => {
      expect(recentFilesService.has('1')).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(recentFilesService.has('nonexistent')).toBe(false);
    });
  });

  describe('setMaxRecentFiles', () => {
    beforeEach(async () => {
      await recentFilesService.initialize();
      for (let i = 1; i <= 5; i++) {
        await recentFilesService.add({
          id: `${i}`,
          name: `Unit ${i}`,
          path: `/${i}`,
          unitType: 'BattleMech'
        });
      }
    });

    it('should trim list when max is reduced', async () => {
      // Service was initialized with maxRecentFiles: 5
      // Add 10 files to fill up
      for (let i = 6; i <= 10; i++) {
        await recentFilesService.add({
          id: `${i}`,
          name: `Unit ${i}`,
          path: `/${i}`,
          unitType: 'BattleMech'
        });
      }
      expect(recentFilesService.count()).toBe(5); // Capped at max
      
      // Create a new service with max 10
      const service = new RecentFilesService({
        localStorage: mockLocalStorage as unknown as LocalStorageService,
        maxRecentFiles: 10
      });
      mockLocalStorage.get.mockResolvedValue(Result.success(null));
      await service.initialize();
      
      // Add 10 files
      for (let i = 1; i <= 10; i++) {
        await service.add({
          id: `${i}`,
          name: `Unit ${i}`,
          path: `/${i}`,
          unitType: 'BattleMech'
        });
      }
      expect(service.count()).toBe(10);
      
      // Reduce to 5 (minimum is 5)
      await service.setMaxRecentFiles(5);
      expect(service.count()).toBe(5);
    });

    it('should clamp to valid range', async () => {
      await recentFilesService.setMaxRecentFiles(1); // Too low
      expect(recentFilesService.count()).toBeLessThanOrEqual(5);
      
      await recentFilesService.setMaxRecentFiles(100); // Too high
      expect(recentFilesService.count()).toBe(5);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await recentFilesService.initialize();
      await recentFilesService.add({ id: '1', name: 'Unit', path: '/1', unitType: 'BattleMech' });
    });

    it('should persist on cleanup', async () => {
      mockLocalStorage.set.mockClear();
      
      await recentFilesService.cleanup();
      
      expect(mockLocalStorage.set).toHaveBeenCalled();
    });
  });
});
