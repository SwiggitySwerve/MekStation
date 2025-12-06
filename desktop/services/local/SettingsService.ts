/**
 * Settings Service for BattleTech Editor Desktop App
 * 
 * Manages all desktop application preferences with type-safe access,
 * default values, persistence, and change notifications.
 * 
 * Features:
 * - Type-safe settings access
 * - Default value merging
 * - Persistence via LocalStorageService
 * - Schema versioning and migrations
 * - Change event notifications
 * - Validation of setting values
 */

import { EventEmitter } from 'events';
import {
  IService,
  ResultType,
  Result,
  IDesktopSettings,
  IWindowBounds,
  UpdateChannel,
  DEFAULT_DESKTOP_SETTINGS,
  DESKTOP_SETTINGS_VERSION,
  ISettingsChangeEvent
} from '../../types/BaseTypes';
import { LocalStorageService } from './LocalStorageService';

/**
 * Storage key for settings
 */
const SETTINGS_STORAGE_KEY = 'desktop-settings';

/**
 * Settings service configuration
 */
interface ISettingsServiceConfig {
  readonly localStorage: LocalStorageService;
}

/**
 * Settings service implementation
 * 
 * Provides centralized management of desktop application settings
 * with persistence, validation, and change notifications.
 */
export class SettingsService extends EventEmitter implements IService {
  private readonly localStorage: LocalStorageService;
  private settings: IDesktopSettings;
  private initialized = false;

  constructor(config: ISettingsServiceConfig) {
    super();
    this.localStorage = config.localStorage;
    this.settings = { ...DEFAULT_DESKTOP_SETTINGS };
  }

  /**
   * Initialize the settings service
   * Loads saved settings and merges with defaults
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔧 Initializing SettingsService...');

      // Load saved settings
      const result = await this.localStorage.get<Partial<IDesktopSettings>>(SETTINGS_STORAGE_KEY);
      
      if (result.success && result.data) {
        // Migrate if needed
        const migrated = await this.migrateSettings(result.data);
        
        // Merge with defaults (saved settings override defaults)
        this.settings = this.mergeWithDefaults(migrated);
      } else {
        // No saved settings, use defaults
        this.settings = { ...DEFAULT_DESKTOP_SETTINGS };
        
        // Persist defaults
        await this.persistSettings();
      }

      this.initialized = true;
      console.log('✅ SettingsService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize SettingsService:', error);
      // Fall back to defaults on error
      this.settings = { ...DEFAULT_DESKTOP_SETTINGS };
      this.initialized = true;
    }
  }

  /**
   * Cleanup service resources
   */
  async cleanup(): Promise<void> {
    // Ensure settings are persisted before cleanup
    await this.persistSettings();
    this.removeAllListeners();
    console.log('🧹 SettingsService cleanup completed');
  }

  /**
   * Get all settings
   */
  getAll(): IDesktopSettings {
    return { ...this.settings };
  }

  /**
   * Get a specific setting value
   */
  get<K extends keyof IDesktopSettings>(key: K): IDesktopSettings[K] {
    return this.settings[key];
  }

  /**
   * Update a single setting
   */
  async set<K extends keyof IDesktopSettings>(
    key: K,
    value: IDesktopSettings[K]
  ): Promise<ResultType<void, string>> {
    try {
      // Validate the value
      const validationResult = this.validateSetting(key, value);
      if (!validationResult.success) {
        return validationResult;
      }

      const oldValue = this.settings[key];
      
      // Skip if value hasn't changed
      if (JSON.stringify(oldValue) === JSON.stringify(value)) {
        return Result.success(undefined);
      }

      // Update in memory
      this.settings = {
        ...this.settings,
        [key]: value
      };

      // Persist to storage
      const saveResult = await this.persistSettings();
      if (!saveResult.success) {
        // Rollback on save failure
        this.settings = {
          ...this.settings,
          [key]: oldValue
        };
        return saveResult;
      }

      // Emit change event
      const changeEvent: ISettingsChangeEvent = {
        key,
        oldValue,
        newValue: value
      };
      this.emit('change', changeEvent);
      this.emit(`change:${key}`, changeEvent);

      return Result.success(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to set setting: ${message}`);
    }
  }

  /**
   * Update multiple settings at once
   */
  async setMultiple(
    updates: Partial<IDesktopSettings>
  ): Promise<ResultType<void, string>> {
    try {
      // Validate all values first
      for (const [key, value] of Object.entries(updates)) {
        const validationResult = this.validateSetting(
          key as keyof IDesktopSettings,
          value
        );
        if (!validationResult.success) {
          return Result.error(`Validation failed for ${key}: ${validationResult.error}`);
        }
      }

      const oldSettings = { ...this.settings };
      const changes: ISettingsChangeEvent[] = [];

      // Apply updates
      for (const [key, value] of Object.entries(updates)) {
        const typedKey = key as keyof IDesktopSettings;
        const oldValue = this.settings[typedKey];
        
        if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
          changes.push({
            key: typedKey,
            oldValue,
            newValue: value
          });
        }
      }

      // Update settings
      this.settings = {
        ...this.settings,
        ...updates
      };

      // Persist to storage
      const saveResult = await this.persistSettings();
      if (!saveResult.success) {
        // Rollback on save failure
        this.settings = oldSettings;
        return saveResult;
      }

      // Emit change events
      for (const change of changes) {
        this.emit('change', change);
        this.emit(`change:${change.key}`, change);
      }

      return Result.success(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to set settings: ${message}`);
    }
  }

  /**
   * Reset all settings to defaults
   */
  async reset(): Promise<ResultType<void, string>> {
    try {
      const oldSettings = { ...this.settings };
      
      // Reset to defaults
      this.settings = { ...DEFAULT_DESKTOP_SETTINGS };

      // Persist to storage
      const saveResult = await this.persistSettings();
      if (!saveResult.success) {
        // Rollback on save failure
        this.settings = oldSettings;
        return saveResult;
      }

      // Emit reset event
      this.emit('reset', {
        oldSettings,
        newSettings: this.settings
      });

      return Result.success(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to reset settings: ${message}`);
    }
  }

  /**
   * Reset a specific setting to its default
   */
  async resetSetting<K extends keyof IDesktopSettings>(
    key: K
  ): Promise<ResultType<void, string>> {
    const defaultValue = DEFAULT_DESKTOP_SETTINGS[key];
    return this.set(key, defaultValue);
  }

  /**
   * Update window bounds
   * Convenience method for window state management
   */
  async updateWindowBounds(bounds: Partial<IWindowBounds>): Promise<ResultType<void, string>> {
    const currentBounds = this.settings.windowBounds;
    const newBounds: IWindowBounds = {
      ...currentBounds,
      ...bounds
    };
    return this.set('windowBounds', newBounds);
  }

  /**
   * Validate a setting value
   */
  private validateSetting<K extends keyof IDesktopSettings>(
    key: K,
    value: unknown
  ): ResultType<void, string> {
    switch (key) {
      case 'version':
        if (typeof value !== 'number' || value < 1) {
          return Result.error('Version must be a positive number');
        }
        break;

      case 'launchAtLogin':
      case 'startMinimized':
      case 'reopenLastUnit':
      case 'rememberWindowState':
      case 'enableAutoBackup':
      case 'checkForUpdatesAutomatically':
      case 'enableDevTools':
        if (typeof value !== 'boolean') {
          return Result.error(`${key} must be a boolean`);
        }
        break;

      case 'defaultSaveDirectory':
      case 'backupDirectory':
      case 'dataDirectory':
        if (typeof value !== 'string') {
          return Result.error(`${key} must be a string`);
        }
        break;

      case 'backupIntervalMinutes':
        if (typeof value !== 'number' || value < 1 || value > 1440) {
          return Result.error('Backup interval must be between 1 and 1440 minutes');
        }
        break;

      case 'maxBackupCount':
        if (typeof value !== 'number' || value < 1 || value > 100) {
          return Result.error('Max backup count must be between 1 and 100');
        }
        break;

      case 'maxRecentFiles':
        if (typeof value !== 'number' || value < 5 || value > 50) {
          return Result.error('Max recent files must be between 5 and 50');
        }
        break;

      case 'updateChannel':
        if (!['stable', 'beta'].includes(value as string)) {
          return Result.error('Update channel must be "stable" or "beta"');
        }
        break;

      case 'windowBounds':
        if (!this.isValidWindowBounds(value)) {
          return Result.error('Invalid window bounds structure');
        }
        break;
    }

    return Result.success(undefined);
  }

  /**
   * Validate window bounds object
   */
  private isValidWindowBounds(value: unknown): value is IWindowBounds {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const bounds = value as Record<string, unknown>;
    return (
      typeof bounds.x === 'number' &&
      typeof bounds.y === 'number' &&
      typeof bounds.width === 'number' &&
      typeof bounds.height === 'number' &&
      typeof bounds.isMaximized === 'boolean' &&
      bounds.width > 0 &&
      bounds.height > 0
    );
  }

  /**
   * Persist settings to storage
   */
  private async persistSettings(): Promise<ResultType<void, string>> {
    return this.localStorage.set(SETTINGS_STORAGE_KEY, this.settings);
  }

  /**
   * Merge saved settings with defaults
   * Ensures all required properties exist
   */
  private mergeWithDefaults(saved: Partial<IDesktopSettings>): IDesktopSettings {
    // Deep merge for nested objects like windowBounds
    const windowBounds: IWindowBounds = {
      ...DEFAULT_DESKTOP_SETTINGS.windowBounds,
      ...(saved.windowBounds || {})
    };

    return {
      ...DEFAULT_DESKTOP_SETTINGS,
      ...saved,
      windowBounds,
      version: DESKTOP_SETTINGS_VERSION
    };
  }

  /**
   * Migrate settings from older versions
   */
  private async migrateSettings(
    saved: Partial<IDesktopSettings>
  ): Promise<Partial<IDesktopSettings>> {
    const currentVersion = saved.version || 0;

    if (currentVersion >= DESKTOP_SETTINGS_VERSION) {
      return saved;
    }

    console.log(`🔄 Migrating settings from v${currentVersion} to v${DESKTOP_SETTINGS_VERSION}`);

    let migrated = { ...saved };

    // Migration from v0 (no version) to v1
    if (currentVersion < 1) {
      // v1 adds version field and standardizes structure
      migrated = {
        ...migrated,
        version: 1
      };
    }

    // Future migrations can be added here
    // if (currentVersion < 2) { ... }

    return migrated;
  }
}

export type { ISettingsServiceConfig };
