/**
 * Base Types for Desktop Services
 * 
 * Local copy of core types needed by Electron services.
 * These match the types in src/services/core/types/BaseTypes.ts
 */

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

/**
 * Base interface for all services
 */
export interface IService {
  /**
   * Initialize the service
   */
  initialize(): Promise<void>;

  /**
   * Cleanup service resources
   */
  cleanup(): Promise<void>;
}

// ============================================================================
// DESKTOP SETTINGS TYPES
// ============================================================================

/**
 * Window bounds and state
 */
export interface IWindowBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly isMaximized: boolean;
}

/**
 * Update channel options
 */
export type UpdateChannel = 'stable' | 'beta';

/**
 * Desktop settings schema version for migrations
 */
export const DESKTOP_SETTINGS_VERSION = 1;

/**
 * Complete desktop settings interface
 * All settings are stored and managed by the SettingsService
 */
export interface IDesktopSettings {
  /** Schema version for migrations */
  readonly version: number;

  // General Settings
  /** Start application when user logs in */
  readonly launchAtLogin: boolean;
  /** Start minimized to system tray */
  readonly startMinimized: boolean;
  /** Reopen the last opened unit on startup */
  readonly reopenLastUnit: boolean;
  /** Default directory for save dialogs */
  readonly defaultSaveDirectory: string;
  /** Remember window position and size */
  readonly rememberWindowState: boolean;

  // Window State
  /** Last known window bounds */
  readonly windowBounds: IWindowBounds;

  // Backup Settings
  /** Enable automatic backups */
  readonly enableAutoBackup: boolean;
  /** Minutes between auto-backups */
  readonly backupIntervalMinutes: number;
  /** Maximum number of backups to retain */
  readonly maxBackupCount: number;
  /** Custom backup directory (empty = default) */
  readonly backupDirectory: string;

  // Update Settings
  /** Automatically check for updates */
  readonly checkForUpdatesAutomatically: boolean;
  /** Update channel preference */
  readonly updateChannel: UpdateChannel;

  // Recent Files Settings
  /** Maximum number of recent files to track */
  readonly maxRecentFiles: number;

  // Advanced Settings
  /** Custom data directory (empty = default) */
  readonly dataDirectory: string;
  /** Enable developer tools in production */
  readonly enableDevTools: boolean;
}

/**
 * Default settings values
 */
export const DEFAULT_DESKTOP_SETTINGS: IDesktopSettings = {
  version: DESKTOP_SETTINGS_VERSION,
  
  // General
  launchAtLogin: false,
  startMinimized: false,
  reopenLastUnit: false,
  defaultSaveDirectory: '',
  rememberWindowState: true,

  // Window
  windowBounds: {
    x: 100,
    y: 100,
    width: 1400,
    height: 900,
    isMaximized: false
  },

  // Backups
  enableAutoBackup: true,
  backupIntervalMinutes: 5,
  maxBackupCount: 10,
  backupDirectory: '',

  // Updates
  checkForUpdatesAutomatically: true,
  updateChannel: 'stable',

  // Recent Files
  maxRecentFiles: 15,

  // Advanced
  dataDirectory: '',
  enableDevTools: false
};

// ============================================================================
// RECENT FILES TYPES
// ============================================================================

/**
 * Unit type classification for recent files
 */
export type UnitType = 'BattleMech' | 'Vehicle' | 'Infantry' | 'ProtoMech' | 'Aerospace' | 'Unknown';

/**
 * Recent file entry with metadata
 */
export interface IRecentFile {
  /** Unique identifier for the unit */
  readonly id: string;
  /** Display name of the unit */
  readonly name: string;
  /** File path if file-based, or internal reference */
  readonly path: string;
  /** Timestamp of last access */
  readonly lastOpened: string; // ISO date string for serialization
  /** Type of unit */
  readonly unitType: UnitType;
  /** Unit tonnage for quick reference */
  readonly tonnage?: number;
  /** Variant/model name */
  readonly variant?: string;
}

// ============================================================================
// MENU COMMAND TYPES
// ============================================================================

/**
 * File menu commands
 */
export type FileMenuCommand = 
  | 'file:new'
  | 'file:open'
  | 'file:save'
  | 'file:save-as'
  | 'file:import'
  | 'file:export'
  | 'file:print'
  | 'file:preferences'
  | 'file:clear-recent'
  | 'file:quit';

/**
 * Edit menu commands
 */
export type EditMenuCommand =
  | 'edit:undo'
  | 'edit:redo'
  | 'edit:cut'
  | 'edit:copy'
  | 'edit:paste'
  | 'edit:select-all';

/**
 * View menu commands
 */
export type ViewMenuCommand =
  | 'view:zoom-in'
  | 'view:zoom-out'
  | 'view:zoom-reset'
  | 'view:fullscreen'
  | 'view:dev-tools';

/**
 * Unit menu commands
 */
export type UnitMenuCommand =
  | 'unit:new'
  | 'unit:duplicate'
  | 'unit:delete'
  | 'unit:properties';

/**
 * Help menu commands
 */
export type HelpMenuCommand =
  | 'help:about'
  | 'help:check-updates'
  | 'help:documentation'
  | 'help:report-issue';

/**
 * All menu commands union type
 */
export type MenuCommand =
  | FileMenuCommand
  | EditMenuCommand
  | ViewMenuCommand
  | UnitMenuCommand
  | HelpMenuCommand;

/**
 * Recent file menu command with ID
 */
export interface IRecentFileCommand {
  readonly type: 'file:open-recent';
  readonly fileId: string;
}

// ============================================================================
// IPC CHANNEL TYPES
// ============================================================================

/**
 * Settings IPC channels
 */
export const SETTINGS_IPC_CHANNELS = {
  GET: 'settings:get',
  SET: 'settings:set',
  RESET: 'settings:reset',
  GET_VALUE: 'settings:get-value',
  ON_CHANGE: 'settings:on-change'
} as const;

/**
 * Recent files IPC channels
 */
export const RECENT_FILES_IPC_CHANNELS = {
  LIST: 'recent-files:list',
  ADD: 'recent-files:add',
  REMOVE: 'recent-files:remove',
  CLEAR: 'recent-files:clear',
  ON_UPDATE: 'recent-files:on-update'
} as const;

/**
 * Menu IPC channels
 */
export const MENU_IPC_CHANNELS = {
  COMMAND: 'menu:command',
  UPDATE_RECENT: 'menu:update-recent',
  UPDATE_STATE: 'menu:update-state'
} as const;

/**
 * App IPC channels
 */
export const APP_IPC_CHANNELS = {
  OPEN_SETTINGS: 'app:open-settings',
  SHOW_ABOUT: 'app:show-about',
  GET_INFO: 'app:get-info'
} as const;

/**
 * All IPC channel names
 */
export type SettingsIPCChannel = typeof SETTINGS_IPC_CHANNELS[keyof typeof SETTINGS_IPC_CHANNELS];
export type RecentFilesIPCChannel = typeof RECENT_FILES_IPC_CHANNELS[keyof typeof RECENT_FILES_IPC_CHANNELS];
export type MenuIPCChannel = typeof MENU_IPC_CHANNELS[keyof typeof MENU_IPC_CHANNELS];
export type AppIPCChannel = typeof APP_IPC_CHANNELS[keyof typeof APP_IPC_CHANNELS];

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Settings change event payload
 */
export interface ISettingsChangeEvent {
  readonly key: keyof IDesktopSettings;
  readonly oldValue: unknown;
  readonly newValue: unknown;
}

/**
 * Recent files update event payload
 */
export interface IRecentFilesUpdateEvent {
  readonly action: 'add' | 'remove' | 'clear';
  readonly files: readonly IRecentFile[];
}

// ============================================================================
// RESULT TYPE
// ============================================================================

/**
 * Result type for operations that can fail
 */
export type ResultType<T, E = string> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

/**
 * Result class with static factory methods
 */
export class Result {
  /**
   * Create a successful result
   */
  static success<T>(data: T): ResultType<T, never> {
    return { success: true, data };
  }

  /**
   * Create a failed result
   */
  static error<E = string>(error: E): ResultType<never, E> {
    return { success: false, error };
  }

  /**
   * Check if a result is successful
   */
  static isSuccess<T, E>(result: ResultType<T, E>): result is { success: true; data: T } {
    return result.success === true;
  }

  /**
   * Check if a result is an error
   */
  static isError<T, E>(result: ResultType<T, E>): result is { success: false; error: E } {
    return result.success === false;
  }
}
