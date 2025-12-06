/**
 * SettingsService Unit Tests
 * 
 * Tests for the desktop settings service including CRUD operations,
 * validation, persistence, and event notifications.
 */

import { SettingsService } from '../SettingsService';
import { LocalStorageService } from '../LocalStorageService';
import { Result, DEFAULT_DESKTOP_SETTINGS, DESKTOP_SETTINGS_VERSION } from '../../../types/BaseTypes';

// Mock LocalStorageService
const mockLocalStorage = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  initialize: jest.fn(),
  cleanup: jest.fn()
};

describe('SettingsService', () => {
  let settingsService: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.get.mockResolvedValue(Result.success(null));
    mockLocalStorage.set.mockResolvedValue(Result.success(undefined));
    settingsService = new SettingsService({
      localStorage: mockLocalStorage as unknown as LocalStorageService
    });
  });

  describe('initialize', () => {
    it('should load default settings when no saved settings exist', async () => {
      mockLocalStorage.get.mockResolvedValue(Result.success(null));
      
      await settingsService.initialize();
      
      const settings = settingsService.getAll();
      expect(settings.version).toBe(DESKTOP_SETTINGS_VERSION);
      expect(settings.launchAtLogin).toBe(false);
      expect(settings.maxRecentFiles).toBe(15);
    });

    it('should load and merge saved settings with defaults', async () => {
      const savedSettings = {
        launchAtLogin: true,
        maxRecentFiles: 20
      };
      mockLocalStorage.get.mockResolvedValue(Result.success(savedSettings));
      
      await settingsService.initialize();
      
      const settings = settingsService.getAll();
      expect(settings.launchAtLogin).toBe(true);
      expect(settings.maxRecentFiles).toBe(20);
      // Should have merged with defaults
      expect(settings.startMinimized).toBe(false);
    });

    it('should only initialize once', async () => {
      await settingsService.initialize();
      await settingsService.initialize();
      
      expect(mockLocalStorage.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await settingsService.initialize();
    });

    it('should return specific setting value', () => {
      expect(settingsService.get('launchAtLogin')).toBe(false);
      expect(settingsService.get('maxRecentFiles')).toBe(15);
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await settingsService.initialize();
    });

    it('should update a single setting', async () => {
      const result = await settingsService.set('launchAtLogin', true);
      
      expect(result.success).toBe(true);
      expect(settingsService.get('launchAtLogin')).toBe(true);
      expect(mockLocalStorage.set).toHaveBeenCalled();
    });

    it('should emit change event when setting is updated', async () => {
      const changeHandler = jest.fn();
      settingsService.on('change', changeHandler);
      
      await settingsService.set('launchAtLogin', true);
      
      expect(changeHandler).toHaveBeenCalledWith({
        key: 'launchAtLogin',
        oldValue: false,
        newValue: true
      });
    });

    it('should not emit event when value unchanged', async () => {
      const changeHandler = jest.fn();
      settingsService.on('change', changeHandler);
      
      await settingsService.set('launchAtLogin', false); // Already false
      
      expect(changeHandler).not.toHaveBeenCalled();
    });

    it('should validate setting values', async () => {
      const result = await settingsService.set('maxRecentFiles', 1000 as unknown as number);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('must be between');
      }
    });

    it('should validate backupIntervalMinutes range', async () => {
      const tooLow = await settingsService.set('backupIntervalMinutes', 0);
      expect(tooLow.success).toBe(false);

      const tooHigh = await settingsService.set('backupIntervalMinutes', 2000);
      expect(tooHigh.success).toBe(false);

      const valid = await settingsService.set('backupIntervalMinutes', 30);
      expect(valid.success).toBe(true);
    });
  });

  describe('setMultiple', () => {
    beforeEach(async () => {
      await settingsService.initialize();
    });

    it('should update multiple settings at once', async () => {
      const result = await settingsService.setMultiple({
        launchAtLogin: true,
        startMinimized: true,
        maxRecentFiles: 25
      });
      
      expect(result.success).toBe(true);
      expect(settingsService.get('launchAtLogin')).toBe(true);
      expect(settingsService.get('startMinimized')).toBe(true);
      expect(settingsService.get('maxRecentFiles')).toBe(25);
    });

    it('should emit change events for each changed setting', async () => {
      const changeHandler = jest.fn();
      settingsService.on('change', changeHandler);
      
      await settingsService.setMultiple({
        launchAtLogin: true,
        startMinimized: true
      });
      
      expect(changeHandler).toHaveBeenCalledTimes(2);
    });

    it('should fail if any validation fails', async () => {
      const result = await settingsService.setMultiple({
        launchAtLogin: true,
        maxRecentFiles: 1000 // Invalid
      });
      
      expect(result.success).toBe(false);
      // Original values should be unchanged
      expect(settingsService.get('launchAtLogin')).toBe(false);
    });
  });

  describe('reset', () => {
    beforeEach(async () => {
      await settingsService.initialize();
    });

    it('should reset all settings to defaults', async () => {
      await settingsService.set('launchAtLogin', true);
      await settingsService.set('maxRecentFiles', 30);
      
      const result = await settingsService.reset();
      
      expect(result.success).toBe(true);
      expect(settingsService.get('launchAtLogin')).toBe(false);
      expect(settingsService.get('maxRecentFiles')).toBe(15);
    });

    it('should emit reset event', async () => {
      const resetHandler = jest.fn();
      settingsService.on('reset', resetHandler);
      
      await settingsService.reset();
      
      expect(resetHandler).toHaveBeenCalled();
    });
  });

  describe('resetSetting', () => {
    beforeEach(async () => {
      await settingsService.initialize();
    });

    it('should reset a single setting to default', async () => {
      await settingsService.set('maxRecentFiles', 30);
      
      await settingsService.resetSetting('maxRecentFiles');
      
      expect(settingsService.get('maxRecentFiles')).toBe(DEFAULT_DESKTOP_SETTINGS.maxRecentFiles);
    });
  });

  describe('updateWindowBounds', () => {
    beforeEach(async () => {
      await settingsService.initialize();
    });

    it('should update window bounds partially', async () => {
      await settingsService.updateWindowBounds({ width: 1600, height: 1000 });
      
      const bounds = settingsService.get('windowBounds');
      expect(bounds.width).toBe(1600);
      expect(bounds.height).toBe(1000);
      // Should preserve other properties
      expect(bounds.x).toBe(DEFAULT_DESKTOP_SETTINGS.windowBounds.x);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await settingsService.initialize();
    });

    it('should persist settings on cleanup', async () => {
      await settingsService.set('launchAtLogin', true);
      mockLocalStorage.set.mockClear();
      
      await settingsService.cleanup();
      
      expect(mockLocalStorage.set).toHaveBeenCalled();
    });
  });
});
