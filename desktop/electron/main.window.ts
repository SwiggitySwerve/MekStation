import { spawn } from 'child_process';
import { app, BrowserWindow, dialog, screen, session, shell } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

import { RecentFilesService } from '../services/local/RecentFilesService';
import { SettingsService } from '../services/local/SettingsService';
import { IDesktopAppConfig } from './main.config';
import { buildSecurityHeaders } from './securityPolicy';

interface ICreateMainWindowContext {
  readonly appPath: string;
  readonly config: IDesktopAppConfig;
  readonly getAppIcon: () => string;
  readonly onClosed: () => void;
  readonly recentFilesService: RecentFilesService | null;
  readonly sendToRenderer: (channel: string, ...args: unknown[]) => void;
  readonly settingsService: SettingsService | null;
  readonly shouldHideToTray: () => boolean;
  readonly userDataPath: string;
}

let securityHeadersInstalled = false;

export async function createMainWindow({
  appPath,
  config,
  getAppIcon,
  onClosed,
  recentFilesService,
  sendToRenderer,
  settingsService,
  shouldHideToTray,
  userDataPath,
}: ICreateMainWindowContext): Promise<BrowserWindow> {
  console.log('Creating main window...');
  const appOrigin = config.developmentMode
    ? 'http://localhost:3600'
    : 'http://127.0.0.1:3001';

  installDesktopSecurityHeaders(config.developmentMode);

  const settings = settingsService?.getAll();
  const savedBounds = settings?.rememberWindowState
    ? settings.windowBounds
    : null;
  const windowBounds = {
    ...config.windowBounds,
    x: savedBounds?.x,
    y: savedBounds?.y,
    width: savedBounds?.width || config.windowBounds.width,
    height: savedBounds?.height || config.windowBounds.height,
  };

  if (savedBounds?.x !== undefined && savedBounds?.y !== undefined) {
    const isVisible = screen.getAllDisplays().some((display) => {
      const { x, y, width, height } = display.bounds;
      return (
        savedBounds.x >= x &&
        savedBounds.x < x + width &&
        savedBounds.y >= y &&
        savedBounds.y < y + height
      );
    });

    if (!isVisible) {
      const primaryDisplay = screen.getPrimaryDisplay();
      windowBounds.x = Math.round(
        (primaryDisplay.bounds.width - windowBounds.width) / 2,
      );
      windowBounds.y = Math.round(
        (primaryDisplay.bounds.height - windowBounds.height) / 2,
      );
    }
  }

  const mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    minWidth: config.windowBounds.minWidth,
    minHeight: config.windowBounds.minHeight,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      webSecurity: !config.developmentMode,
    },
    icon: getAppIcon(),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  });

  if (savedBounds?.isMaximized) {
    mainWindow.maximize();
  }

  if (settingsService && recentFilesService) {
    const currentSettings = settingsService.getAll();
    if (currentSettings.reopenLastUnit) {
      const lastUnit = recentFilesService.getMostRecent();
      if (lastUnit) {
        mainWindow.webContents.once('did-finish-load', () => {
          setTimeout(() => {
            sendToRenderer('open-unit', lastUnit.id);
          }, 1000);
        });
      }
    }
  }

  mainWindow.once('ready-to-show', () => {
    const startMinimized = settingsService?.get('startMinimized') ?? false;
    if (startMinimized) {
      return;
    }

    mainWindow.show();
    if (process.platform === 'darwin') {
      app.dock.show();
    }
    mainWindow.focus();
  });

  if (config.developmentMode) {
    await mainWindow.loadURL(appOrigin);
    mainWindow.webContents.openDevTools();
  } else {
    await loadPackagedUi(mainWindow, appPath, userDataPath);
  }

  mainWindow.on('closed', onClosed);

  mainWindow.on('close', async (event) => {
    if (settingsService) {
      const bounds = mainWindow.getBounds();
      await settingsService.updateWindowBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: mainWindow.isMaximized(),
      });
    }

    if (shouldHideToTray()) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedAppNavigation(url, appOrigin)) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  console.log('Main window created successfully');
  return mainWindow;
}

function installDesktopSecurityHeaders(developmentMode: boolean): void {
  if (securityHeadersInstalled) return;
  securityHeadersInstalled = true;

  const headers = buildSecurityHeaders(developmentMode);
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    for (const header of headers) {
      responseHeaders[header.key] = [header.value];
    }
    callback({ responseHeaders });
  });
}

function isAllowedAppNavigation(url: string, expectedOrigin: string): boolean {
  try {
    return new URL(url).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}

async function loadPackagedUi(
  mainWindow: BrowserWindow,
  appPath: string,
  userDataPath: string,
): Promise<void> {
  const serverCwd = app.isPackaged
    ? path.join(process.resourcesPath, 'next-standalone')
    : path.join(appPath, '..', '.next', 'standalone');
  const serverPath = path.join(serverCwd, 'server.js');
  const dataDir = path.join(userDataPath, 'data');
  const databasePath = path.join(dataDir, 'mekstation.db');

  await fs.mkdir(dataDir, { recursive: true });

  const server = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: '3001',
      HOSTNAME: '127.0.0.1',
      DATABASE_PATH: databasePath,
    },
    cwd: serverCwd,
  });

  server.on('error', (error: Error) => {
    console.error('Failed to start Next.js server:', error);
    if (!mainWindow.isDestroyed()) {
      void dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Startup Error',
        message:
          'Failed to start the local web server required to run MekStation.',
        detail: error.message,
        buttons: ['OK'],
      });
    }
  });

  server.stdout?.on('data', (data: Buffer) => {
    console.log(`Server: ${data.toString()}`);
  });

  server.stderr?.on('data', (data: Buffer) => {
    console.error(`Server Error: ${data.toString()}`);
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));
  try {
    await mainWindow.loadURL('http://127.0.0.1:3001');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to load MekStation UI:', message);
    if (!mainWindow.isDestroyed()) {
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Startup Error',
        message: 'MekStation failed to load its UI.',
        detail: message,
        buttons: ['OK'],
      });
    }
    throw error;
  }
}
