/**
 * useElectron Hook
 * 
 * Provides access to Electron APIs in the renderer process.
 * Returns null when running in web browser (non-Electron) mode.
 */

import { useCallback, useMemo } from 'react';

/**
 * Electron API type definition
 * Mirrors the IElectronAPI from desktop/electron/preload.ts
 */
export interface IElectronAPI {
  getAppInfo(): Promise<IAppInfo>;
  minimizeWindow(): Promise<void>;
  maximizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;
  saveFile(defaultPath: string, filters: IFileFilter[]): Promise<ISaveDialogResult>;
  openFile(filters: IFileFilter[]): Promise<IOpenDialogResult>;
  readFile(filePath: string): Promise<IFileResult>;
  writeFile(filePath: string, data: string): Promise<IFileResult>;
  selectDirectory(): Promise<IOpenDialogResult>;
  getSettings(): Promise<IDesktopSettings | null>;
  setSettings(updates: Partial<IDesktopSettings>): Promise<IServiceResult>;
  resetSettings(): Promise<IServiceResult>;
  getSettingValue<K extends keyof IDesktopSettings>(key: K): Promise<IDesktopSettings[K] | null>;
  onSettingsChange(callback: (event: ISettingsChangeEvent) => void): void;
  getRecentFiles(): Promise<readonly IRecentFile[]>;
  addRecentFile(params: IAddRecentFileParams): Promise<IServiceResult>;
  removeRecentFile(id: string): Promise<IServiceResult>;
  clearRecentFiles(): Promise<IServiceResult>;
  onRecentFilesUpdate(callback: (files: readonly IRecentFile[]) => void): void;
  updateMenuState(state: { canUndo?: boolean; canRedo?: boolean; hasUnit?: boolean; hasSelection?: boolean }): void;
  onMenuCommand(callback: (command: MenuCommand) => void): void;
  serviceCall(method: string, ...args: unknown[]): Promise<IServiceResult>;
  createBackup(): Promise<boolean>;
  restoreBackup(backupPath: string): Promise<boolean>;
  onAutoSaveTrigger(callback: () => void): void;
  onImportUnitFile(callback: (filePath: string) => void): void;
  onImportUnitUrl(callback: (url: string) => void): void;
  onOpenUnit(callback: (unitId: string) => void): void;
  onCreateNewUnit(callback: () => void): void;
  onOpenSettings(callback: () => void): void;
  removeAllListeners(channel: string): void;
}

// Type definitions matching the desktop types
export interface IAppInfo {
  version: string;
  platform: string;
  userDataPath: string;
  developmentMode: boolean;
}

export interface IFileFilter {
  name: string;
  extensions: string[];
}

export interface ISaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

export interface IOpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface IFileResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface IServiceResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface IWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

export type UpdateChannel = 'stable' | 'beta';

export interface IDesktopSettings {
  version: number;
  launchAtLogin: boolean;
  startMinimized: boolean;
  reopenLastUnit: boolean;
  defaultSaveDirectory: string;
  rememberWindowState: boolean;
  windowBounds: IWindowBounds;
  enableAutoBackup: boolean;
  backupIntervalMinutes: number;
  maxBackupCount: number;
  backupDirectory: string;
  checkForUpdatesAutomatically: boolean;
  updateChannel: UpdateChannel;
  maxRecentFiles: number;
  dataDirectory: string;
  enableDevTools: boolean;
}

export type UnitType = 'BattleMech' | 'Vehicle' | 'Infantry' | 'ProtoMech' | 'Aerospace' | 'Unknown';

export interface IRecentFile {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
  unitType: UnitType;
  tonnage?: number;
  variant?: string;
}

export interface IAddRecentFileParams {
  id: string;
  name: string;
  path: string;
  unitType: UnitType;
  tonnage?: number;
  variant?: string;
}

export interface ISettingsChangeEvent {
  key: keyof IDesktopSettings;
  oldValue: unknown;
  newValue: unknown;
}

export type MenuCommand =
  | 'file:new' | 'file:open' | 'file:save' | 'file:save-as' | 'file:import'
  | 'file:export' | 'file:print' | 'file:preferences' | 'file:quit'
  | 'edit:undo' | 'edit:redo' | 'edit:cut' | 'edit:copy' | 'edit:paste' | 'edit:select-all'
  | 'view:zoom-in' | 'view:zoom-out' | 'view:zoom-reset' | 'view:fullscreen' | 'view:dev-tools'
  | 'unit:new' | 'unit:duplicate' | 'unit:delete' | 'unit:properties'
  | 'help:about' | 'help:check-updates' | 'help:documentation' | 'help:report-issue';

/**
 * Extend Window interface to include electronAPI
 */
declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}

/**
 * Get the electron API if available
 */
function getElectronAPI(): IElectronAPI | null {
  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    return window.electronAPI ?? null;
  }
  return null;
}

/**
 * Check if running in Electron environment
 */
export function isElectron(): boolean {
  return getElectronAPI() !== null;
}

/**
 * Hook to access Electron APIs
 * Returns null when not running in Electron
 */
export function useElectron(): IElectronAPI | null {
  const api = useMemo(() => getElectronAPI(), []);
  return api;
}

/**
 * Hook for window operations in Electron
 */
export function useElectronWindow(): {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isElectron: boolean;
} {
  const api = useElectron();
  
  const minimize = useCallback(() => {
    api?.minimizeWindow();
  }, [api]);
  
  const maximize = useCallback(() => {
    api?.maximizeWindow();
  }, [api]);
  
  const close = useCallback(() => {
    api?.closeWindow();
  }, [api]);
  
  return {
    minimize,
    maximize,
    close,
    isElectron: api !== null
  };
}
