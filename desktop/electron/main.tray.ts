import { app, Menu } from 'electron';

import { APP_IPC_CHANNELS, IRecentFile } from '../types/BaseTypes';

interface ITrayMenuContext {
  readonly checkForUpdates: () => Promise<void>;
  readonly createBackup: () => Promise<boolean>;
  readonly handleOpenRecent: (fileId: string) => void;
  readonly importUnitFile: () => Promise<void>;
  readonly recentFiles: readonly IRecentFile[];
  readonly sendToRenderer: (channel: string, ...args: unknown[]) => void;
  readonly showMainWindow: () => void;
}

export function buildTrayMenu({
  checkForUpdates,
  createBackup,
  handleOpenRecent,
  importUnitFile,
  recentFiles,
  sendToRenderer,
  showMainWindow,
}: ITrayMenuContext): Menu {
  const recentFilesSubmenu: Electron.MenuItemConstructorOptions[] =
    recentFiles.length > 0
      ? [
          ...recentFiles.slice(0, 5).map((file) => ({
            label: `${file.name}${file.variant ? ` ${file.variant}` : ''}`,
            click: () => handleOpenRecent(file.id),
          })),
          { type: 'separator' as const },
          {
            label: 'More...',
            click: showMainWindow,
          },
        ]
      : [{ label: 'No Recent Files', enabled: false }];

  return Menu.buildFromTemplate([
    {
      label: 'Show MekStation',
      click: showMainWindow,
    },
    { type: 'separator' },
    {
      label: 'Recent Files',
      submenu: recentFilesSubmenu,
    },
    { type: 'separator' },
    {
      label: 'New Unit',
      click: () => {
        sendToRenderer('create-new-unit');
      },
    },
    {
      label: 'Import Unit',
      click: () => {
        void importUnitFile();
      },
    },
    { type: 'separator' },
    {
      label: 'Preferences',
      click: () => {
        showMainWindow();
        sendToRenderer(APP_IPC_CHANNELS.OPEN_SETTINGS);
      },
    },
    { type: 'separator' },
    {
      label: 'Backup Data',
      click: () => {
        void createBackup();
      },
    },
    {
      label: 'Check for Updates',
      click: () => {
        void checkForUpdates();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
}
