import { app, BrowserWindow, dialog, shell } from 'electron';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { RecentFilesService } from '../services/local/RecentFilesService';
import { SettingsService } from '../services/local/SettingsService';
import {
  APP_IPC_CHANNELS,
  IDesktopSettings,
  MENU_IPC_CHANNELS,
  MenuCommand,
  SETTINGS_IPC_CHANNELS,
} from '../types/BaseTypes';
import { MenuManager } from './MenuManager';

interface IMenuCommandContext {
  readonly args: readonly unknown[];
  readonly checkForUpdates: () => Promise<void>;
  readonly command: MenuCommand;
  readonly mainWindow: BrowserWindow | null;
  readonly menuManager: MenuManager | null;
  readonly recentFilesService: RecentFilesService | null;
  readonly sendToRenderer: (channel: string, ...args: unknown[]) => void;
  readonly showAboutDialog: () => void;
}

export function handleMenuCommand({
  args,
  checkForUpdates,
  command,
  mainWindow,
  menuManager,
  recentFilesService,
  sendToRenderer,
  showAboutDialog,
}: IMenuCommandContext): void {
  console.log(`Menu command: ${command}`);
  sendToRenderer(MENU_IPC_CHANNELS.COMMAND, command, ...args);

  switch (command) {
    case 'file:quit':
      app.quit();
      break;
    case 'file:preferences':
      sendToRenderer(APP_IPC_CHANNELS.OPEN_SETTINGS);
      break;
    case 'file:clear-recent':
      recentFilesService?.clear();
      menuManager?.updateRecentFiles([]);
      break;
    case 'view:fullscreen':
      mainWindow?.setFullScreen(!mainWindow.isFullScreen());
      break;
    case 'view:dev-tools':
      mainWindow?.webContents.toggleDevTools();
      break;
    case 'help:documentation':
      shell.openExternal('https://github.com/SwiggitySwerve/MekStation/wiki');
      break;
    case 'help:report-issue':
      shell.openExternal(
        'https://github.com/SwiggitySwerve/MekStation/issues/new',
      );
      break;
    case 'help:check-updates':
      void checkForUpdates();
      break;
    case 'help:about':
      showAboutDialog();
      break;
  }
}

interface ISettingsChangeContext {
  readonly event: {
    key: keyof IDesktopSettings;
    oldValue: unknown;
    newValue: unknown;
  };
  readonly recentFilesService: RecentFilesService | null;
  readonly sendToRenderer: (channel: string, ...args: unknown[]) => void;
  readonly settingsService: SettingsService | null;
}

export function handleSettingsChange({
  event,
  recentFilesService,
  sendToRenderer,
  settingsService,
}: ISettingsChangeContext): void {
  console.log(`Setting changed: ${event.key}`);

  switch (event.key) {
    case 'launchAtLogin':
      updateLaunchAtLogin(event.newValue as boolean, settingsService);
      break;
    case 'maxRecentFiles':
      recentFilesService?.setMaxRecentFiles(event.newValue as number);
      break;
    case 'enableAutoBackup':
    case 'backupIntervalMinutes':
      break;
  }

  sendToRenderer(SETTINGS_IPC_CHANNELS.ON_CHANGE, event);
}

export function updateLaunchAtLogin(
  enabled: boolean,
  settingsService: SettingsService | null,
): void {
  if (process.platform === 'linux') {
    void updateLinuxAutostart(enabled);
    return;
  }

  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: settingsService?.get('startMinimized') ?? false,
  });
}

export async function updateLinuxAutostart(enabled: boolean): Promise<void> {
  const autostartDir = path.join(os.homedir(), '.config', 'autostart');
  const desktopFile = path.join(autostartDir, 'mekstation.desktop');

  if (enabled) {
    const desktopContent = `[Desktop Entry]
Type=Application
Name=MekStation
Exec=${process.execPath}
Terminal=false
StartupNotify=false
X-GNOME-Autostart-enabled=true
`;
    try {
      await fs.mkdir(autostartDir, { recursive: true });
      await fs.writeFile(desktopFile, desktopContent);
    } catch (error) {
      console.error('Failed to create autostart file:', error);
    }
    return;
  }

  try {
    await fs.unlink(desktopFile);
  } catch (error) {
    // File may not exist, ignore error.
  }
}

export function applyStartupSettings(
  mainWindow: BrowserWindow | null,
  settingsService: SettingsService | null,
): void {
  const settings = settingsService?.getAll();
  if (settings?.startMinimized && mainWindow) {
    mainWindow.hide();
  }
}

export function showAboutDialog(mainWindow: BrowserWindow | null): void {
  if (!mainWindow) return;

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About MekStation',
    message: 'MekStation',
    detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}\n\nA comprehensive BattleMech editor for the MegaMek ecosystem.`,
    buttons: ['OK'],
  });
}
