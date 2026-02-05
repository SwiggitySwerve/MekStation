import {
  IDesktopSettings,
  IElectronAPI,
} from '../../src/components/settings/useElectron';

const DEFAULT_SETTINGS: IDesktopSettings = {
  version: 1,
  launchAtLogin: false,
  startMinimized: false,
  reopenLastUnit: false,
  defaultSaveDirectory: '/Users/pilot/Documents/MekStation',
  rememberWindowState: true,
  windowBounds: {
    x: 100,
    y: 100,
    width: 1400,
    height: 900,
    isMaximized: false,
  },
  enableAutoBackup: true,
  backupIntervalMinutes: 5,
  maxBackupCount: 10,
  backupDirectory: '/Users/pilot/Documents/MekStation/backups',
  checkForUpdatesAutomatically: true,
  updateChannel: 'stable',
  maxRecentFiles: 15,
  dataDirectory: '/Users/pilot/.mekstation',
  enableDevTools: false,
};

let mockSettings = { ...DEFAULT_SETTINGS };

export function setMockElectronSettings(settings: Partial<IDesktopSettings>) {
  mockSettings = { ...DEFAULT_SETTINGS, ...settings };
}

export function resetMockElectronSettings() {
  mockSettings = { ...DEFAULT_SETTINGS };
}

export function createMockElectronAPI(): IElectronAPI {
  return {
    getAppInfo: async () => ({
      version: '1.0.0-storybook',
      platform: 'darwin',
      userDataPath: '/Users/pilot/.mekstation',
      developmentMode: true,
    }),
    minimizeWindow: async () => console.log('[Mock Electron] minimizeWindow'),
    maximizeWindow: async () => console.log('[Mock Electron] maximizeWindow'),
    closeWindow: async () => console.log('[Mock Electron] closeWindow'),
    saveFile: async () => ({
      canceled: false,
      filePath: '/Users/pilot/Documents/unit.json',
    }),
    openFile: async () => ({
      canceled: false,
      filePaths: ['/Users/pilot/Documents/unit.json'],
    }),
    readFile: async () => ({ success: true, data: '{}' }),
    writeFile: async () => ({ success: true }),
    selectDirectory: async () => ({
      canceled: false,
      filePaths: ['/Users/pilot/Documents'],
    }),
    getSettings: async () => mockSettings,
    setSettings: async (updates) => {
      mockSettings = { ...mockSettings, ...updates };
      console.log('[Mock Electron] setSettings:', updates);
      return { success: true };
    },
    resetSettings: async () => {
      mockSettings = { ...DEFAULT_SETTINGS };
      console.log('[Mock Electron] resetSettings');
      return { success: true };
    },
    getSettingValue: async (key) => mockSettings[key] ?? null,
    onSettingsChange: () => {},
    getRecentFiles: async () => [],
    addRecentFile: async () => ({ success: true }),
    removeRecentFile: async () => ({ success: true }),
    clearRecentFiles: async () => ({ success: true }),
    onRecentFilesUpdate: () => {},
    updateMenuState: () => {},
    onMenuCommand: () => {},
    serviceCall: async (method) => {
      console.log('[Mock Electron] serviceCall:', method);
      return { success: true };
    },
    createBackup: async () => true,
    restoreBackup: async () => true,
    onAutoSaveTrigger: () => {},
    onImportUnitFile: () => {},
    onImportUnitUrl: () => {},
    onOpenUnit: () => {},
    onCreateNewUnit: () => {},
    onOpenSettings: () => {},
    removeAllListeners: () => {},
  };
}

export function enableMockElectron() {
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).electronAPI =
      createMockElectronAPI();
  }
}

export function disableMockElectron() {
  if (typeof window !== 'undefined') {
    delete (window as unknown as Record<string, unknown>).electronAPI;
  }
}
