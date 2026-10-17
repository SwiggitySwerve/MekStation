import { app, BrowserWindow, dialog, screen, session, shell } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

import type { EmbeddedServer } from './main.server';

import { RecentFilesService } from '../services/local/RecentFilesService';
import { SettingsService } from '../services/local/SettingsService';
import { IDesktopAppConfig } from './main.config';
import { getEmbeddedServer, SERVER_READY_TIMEOUT_MS } from './main.server';
import { buildSecurityHeaders } from './securityPolicy';

interface ICreateMainWindowContext {
  readonly appPath: string;
  readonly config: IDesktopAppConfig;
  readonly getAppIcon: () => string;
  readonly onClosed: () => void;
  readonly recentFilesService: RecentFilesService | null;
  readonly sendToRenderer: (channel: string, ...args: unknown[]) => void;
  readonly settingsService: SettingsService | null;
  readonly userDataPath: string;
}

const PACKAGED_APP_ORIGIN = 'http://127.0.0.1:3001';
const LOADING_PAGE_URL = `data:text/html;charset=utf-8,${encodeURIComponent(
  '<!doctype html><html><head><meta charset="utf-8"><title>MekStation</title></head>' +
    '<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;' +
    'background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center">' +
    '<div><h1 style="font-weight:600">MekStation</h1>' +
    '<p style="opacity:.75">Starting the local server&hellip; the first launch can take a minute.</p>' +
    '</div></body></html>',
)}`;

let securityHeadersInstalled = false;

export async function createMainWindow({
  appPath,
  config,
  getAppIcon,
  onClosed,
  recentFilesService,
  sendToRenderer,
  settingsService,
  userDataPath,
}: ICreateMainWindowContext): Promise<BrowserWindow> {
  console.log('Creating main window...');
  const appOrigin = config.developmentMode
    ? 'http://localhost:3600'
    : PACKAGED_APP_ORIGIN;

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
        // The packaged window first shows a local loading page; wait for the app.
        const onLoad = (): void => {
          if (!mainWindow.webContents.getURL().startsWith(appOrigin)) return;
          mainWindow.webContents.off('did-finish-load', onLoad);
          setTimeout(() => {
            sendToRenderer('open-unit', lastUnit.id);
          }, 1000);
        };
        mainWindow.webContents.on('did-finish-load', onLoad);
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
      app.dock?.show();
    }
    mainWindow.focus();
  });

  mainWindow.on('closed', onClosed);

  mainWindow.on('close', async () => {
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

  if (config.developmentMode) {
    await mainWindow.loadURL(appOrigin);
    mainWindow.webContents.openDevTools();
  } else {
    // Not awaited: tray and IPC setup must not wait for the server cold start.
    void loadPackagedUi(mainWindow, packagedServer(appPath, userDataPath));
  }

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

function packagedServer(
  appPath: string,
  userDataPath: string,
): Pick<EmbeddedServer, 'waitUntilReady'> {
  const serverCwd = app.isPackaged
    ? path.join(process.resourcesPath, 'next-standalone')
    : path.join(appPath, '..', '.next', 'standalone');
  const dataDir = path.join(userDataPath, 'data');

  const server = getEmbeddedServer({
    cwd: serverCwd,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: '3001',
      HOSTNAME: '127.0.0.1',
      DATABASE_PATH: path.join(dataDir, 'mekstation.db'),
    },
    serverPath: path.join(serverCwd, 'server.js'),
  });
  return {
    waitUntilReady: async (timeoutMs) => {
      await fs.mkdir(dataDir, { recursive: true });
      await server.waitUntilReady(timeoutMs);
    },
  };
}

interface ILoadPackagedUiOptions {
  readonly readyTimeoutMs?: number;
  readonly retryDelayMs?: number;
}

/**
 * Shows a loading page, waits for the embedded server's readiness marker, then
 * loads the app. Failures offer Retry (keep waiting / restart the server) or
 * Quit instead of leaving a blank window behind a one-shot error dialog.
 */
export async function loadPackagedUi(
  mainWindow: BrowserWindow,
  server: Pick<EmbeddedServer, 'waitUntilReady'>,
  {
    readyTimeoutMs = SERVER_READY_TIMEOUT_MS,
    retryDelayMs = 1000,
  }: ILoadPackagedUiOptions = {},
): Promise<void> {
  await mainWindow.loadURL(LOADING_PAGE_URL).catch((error: unknown) => {
    console.warn('Failed to show the startup loading page:', error);
  });

  for (;;) {
    try {
      await server.waitUntilReady(readyTimeoutMs);
      // A just-bound listener can still refuse the first connection.
      for (let attempt = 1; ; attempt++) {
        try {
          await mainWindow.loadURL(PACKAGED_APP_ORIGIN);
          return;
        } catch (error) {
          if (attempt >= 3 || mainWindow.isDestroyed()) throw error;
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    } catch (error) {
      if (mainWindow.isDestroyed()) return;
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to load MekStation UI:', message);
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Startup Error',
        message: 'MekStation could not start its local server.',
        detail: `${message}\n\nRetry keeps waiting (restarting the server if it stopped). Quit closes MekStation.`,
        buttons: ['Retry', 'Quit'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });
      if (mainWindow.isDestroyed()) return;
      if (response !== 0) {
        app.quit();
        return;
      }
    }
  }
}
