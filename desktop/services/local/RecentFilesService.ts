/**
 * Recent Files Service for BattleTech Editor Desktop App
 * 
 * Maintains a persistent list of recently opened units with relevant metadata
 * for quick access from menus and the application UI.
 * 
 * Features:
 * - LRU (Least Recently Used) eviction
 * - Configurable maximum entries
 * - Persistent storage via LocalStorageService
 * - Invalid entry detection and cleanup
 * - Change event notifications
 */

import { EventEmitter } from 'events';
import {
  IService,
  ResultType,
  Result,
  IRecentFile,
  UnitType,
  IRecentFilesUpdateEvent
} from '../../types/BaseTypes';
import { LocalStorageService } from './LocalStorageService';

/**
 * Storage key for recent files
 */
const RECENT_FILES_STORAGE_KEY = 'recent-files';

/**
 * Default maximum recent files
 */
const DEFAULT_MAX_RECENT_FILES = 15;

/**
 * Recent files service configuration
 */
interface IRecentFilesServiceConfig {
  readonly localStorage: LocalStorageService;
  readonly maxRecentFiles?: number;
}

/**
 * Parameters for adding a file to recent files
 */
interface IAddRecentFileParams {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly unitType: UnitType;
  readonly tonnage?: number;
  readonly variant?: string;
}

/**
 * Recent files service implementation
 * 
 * Manages the list of recently opened units with automatic
 * LRU eviction and persistence.
 */
export class RecentFilesService extends EventEmitter implements IService {
  private readonly localStorage: LocalStorageService;
  private maxRecentFiles: number;
  private recentFiles: IRecentFile[] = [];
  private initialized = false;

  constructor(config: IRecentFilesServiceConfig) {
    super();
    this.localStorage = config.localStorage;
    this.maxRecentFiles = config.maxRecentFiles ?? DEFAULT_MAX_RECENT_FILES;
  }

  /**
   * Initialize the recent files service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔧 Initializing RecentFilesService...');

      // Load saved recent files
      const result = await this.localStorage.get<IRecentFile[]>(RECENT_FILES_STORAGE_KEY);
      
      if (result.success && result.data && Array.isArray(result.data)) {
        this.recentFiles = result.data;
        
        // Validate and cleanup invalid entries
        await this.cleanupInvalidEntries();
        
        // Enforce max limit
        if (this.recentFiles.length > this.maxRecentFiles) {
          this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
          await this.persistRecentFiles();
        }
      } else {
        this.recentFiles = [];
      }

      this.initialized = true;
      console.log(`✅ RecentFilesService initialized with ${this.recentFiles.length} entries`);
    } catch (error) {
      console.error('❌ Failed to initialize RecentFilesService:', error);
      this.recentFiles = [];
      this.initialized = true;
    }
  }

  /**
   * Cleanup service resources
   */
  async cleanup(): Promise<void> {
    await this.persistRecentFiles();
    this.removeAllListeners();
    console.log('🧹 RecentFilesService cleanup completed');
  }

  /**
   * Update the maximum number of recent files
   */
  async setMaxRecentFiles(max: number): Promise<void> {
    if (max < 5 || max > 50) {
      console.warn('Max recent files must be between 5 and 50, using bounds');
      max = Math.max(5, Math.min(50, max));
    }

    this.maxRecentFiles = max;

    // Trim list if needed
    if (this.recentFiles.length > max) {
      this.recentFiles = this.recentFiles.slice(0, max);
      await this.persistRecentFiles();
      this.emitUpdate('remove', this.recentFiles);
    }
  }

  /**
   * Get all recent files (most recent first)
   */
  list(): readonly IRecentFile[] {
    return [...this.recentFiles];
  }

  /**
   * Get recent files count
   */
  count(): number {
    return this.recentFiles.length;
  }

  /**
   * Add a unit to recent files
   * If already exists, moves to top and updates timestamp
   */
  async add(params: IAddRecentFileParams): Promise<ResultType<void, string>> {
    try {
      // Remove existing entry with same ID (will be re-added at top)
      const existingIndex = this.recentFiles.findIndex(f => f.id === params.id);
      if (existingIndex !== -1) {
        this.recentFiles.splice(existingIndex, 1);
      }

      // Create new entry
      const newEntry: IRecentFile = {
        id: params.id,
        name: params.name,
        path: params.path,
        lastOpened: new Date().toISOString(),
        unitType: params.unitType,
        tonnage: params.tonnage,
        variant: params.variant
      };

      // Add to beginning (most recent)
      this.recentFiles.unshift(newEntry);

      // Enforce max limit (LRU eviction)
      if (this.recentFiles.length > this.maxRecentFiles) {
        this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
      }

      // Persist changes
      await this.persistRecentFiles();

      // Emit update event
      this.emitUpdate('add', this.recentFiles);

      return Result.success(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to add recent file: ${message}`);
    }
  }

  /**
   * Remove a file from recent files by ID
   */
  async remove(id: string): Promise<ResultType<boolean, string>> {
    try {
      const index = this.recentFiles.findIndex(f => f.id === id);
      
      if (index === -1) {
        return Result.success(false);
      }

      this.recentFiles.splice(index, 1);
      await this.persistRecentFiles();
      
      this.emitUpdate('remove', this.recentFiles);

      return Result.success(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to remove recent file: ${message}`);
    }
  }

  /**
   * Clear all recent files
   */
  async clear(): Promise<ResultType<void, string>> {
    try {
      this.recentFiles = [];
      await this.persistRecentFiles();
      
      this.emitUpdate('clear', []);

      return Result.success(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to clear recent files: ${message}`);
    }
  }

  /**
   * Get a specific recent file by ID
   */
  get(id: string): IRecentFile | undefined {
    return this.recentFiles.find(f => f.id === id);
  }

  /**
   * Get the most recently opened file
   */
  getMostRecent(): IRecentFile | undefined {
    return this.recentFiles[0];
  }

  /**
   * Check if a file exists in recent files
   */
  has(id: string): boolean {
    return this.recentFiles.some(f => f.id === id);
  }

  /**
   * Mark a file as invalid (e.g., file no longer exists)
   * Removes it from the list
   */
  async markInvalid(id: string): Promise<ResultType<void, string>> {
    return this.remove(id).then(result => 
      result.success ? Result.success(undefined) : Result.error(result.error)
    );
  }

  /**
   * Validate that a recent file entry still exists
   * Override this method to implement actual file/unit validation
   */
  protected async validateEntry(entry: IRecentFile): Promise<boolean> {
    // By default, we consider all entries valid
    // Subclasses can override this to check if the unit still exists
    // in the database or if the file path is still valid
    return entry.id !== undefined && entry.name !== undefined;
  }

  /**
   * Cleanup invalid entries from the list
   */
  private async cleanupInvalidEntries(): Promise<void> {
    const validEntries: IRecentFile[] = [];
    let hasInvalid = false;

    for (const entry of this.recentFiles) {
      if (await this.validateEntry(entry)) {
        validEntries.push(entry);
      } else {
        hasInvalid = true;
        console.log(`🧹 Removing invalid recent file entry: ${entry.name}`);
      }
    }

    if (hasInvalid) {
      this.recentFiles = validEntries;
      await this.persistRecentFiles();
    }
  }

  /**
   * Persist recent files to storage
   */
  private async persistRecentFiles(): Promise<ResultType<void, string>> {
    return this.localStorage.set(RECENT_FILES_STORAGE_KEY, this.recentFiles);
  }

  /**
   * Emit an update event
   */
  private emitUpdate(action: 'add' | 'remove' | 'clear', files: readonly IRecentFile[]): void {
    const event: IRecentFilesUpdateEvent = {
      action,
      files
    };
    this.emit('update', event);
  }
}

export type { IRecentFilesServiceConfig, IAddRecentFileParams };
