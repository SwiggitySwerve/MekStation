/**
 * MekStation - Electron Main Process
 * 
 * This is the main Electron process that creates and manages the desktop
 * application window, handles system integration, and provides native
 * desktop features for the self-hosted MekStation.
 * 
 * Features:
 * - Native desktop application experience
 * - Auto-updater for seamless updates
 * - System tray integration
 * - Local file storage and backups
 * - Cross-platform compatibility (Windows, Mac, Linux)
 * - Native application menus with keyboard shortcuts
 * - Desktop settings and preferences
 * - Recent files tracking
 */

import { 
  app, 
  BrowserWindow, 
  Menu, 
  Tray, 
  dialog, 
  shell, 
  ipcMain,
  protocol,
  session,
  screen
} from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

// Import our service layer
import { LocalStorageService } from '../services/local/LocalStorageService';
import { BackupService } from '../services/local/BackupService';
import { SettingsService } from '../services/local/SettingsService';
import { RecentFilesService, IAddRecentFileParams } from '../services/local/RecentFilesService';
import { MenuManager } from './MenuManager';
import {
  IDesktopSettings,
  IRecentFile,
  MenuCommand,
  SETTINGS_IPC_CHANNELS,
  RECENT_FILES_IPC_CHANNELS,
  MENU_IPC_CHANNELS,
  APP_IPC_CHANNELS
} from '../types/BaseTypes';

/**
 * Application configuration
 */
interface IDesktopAppConfig {
  readonly enableAutoUpdater: boolean;
  readonly enableSystemTray: boolean;
  readonly enableBackups: boolean;
  readonly autoSaveInterval: number;
  readonly backupInterval: number;
  readonly updateCheckIntervalMs: number;
  readonly windowBounds: {
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
  };
  readonly developmentMode: boolean;
}

/**
 * Main application class
 */
class MekStationApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private localStorage: LocalStorageService | null = null;
  private backupService: BackupService | null = null;
  private settingsService: SettingsService | null = null;
  private recentFilesService: RecentFilesService | null = null;
  private menuManager: MenuManager | null = null;
  
  private readonly config: IDesktopAppConfig = {
    enableAutoUpdater: !process.env.NODE_ENV?.includes('dev'),
    enableSystemTray: true,
    enableBackups: true,
    autoSaveInterval: 30000, // 30 seconds
    backupInterval: 300000, // 5 minutes
    updateCheckIntervalMs: (() => {
      const envIntervalMinutes = Number.parseInt(process.env.MEKSTATION_UPDATE_INTERVAL_MINUTES ?? '', 10);
      const isValidInterval = Number.isFinite(envIntervalMinutes) && envIntervalMinutes > 0;
      return (isValidInterval ? envIntervalMinutes : 60) * 60 * 1000;
    })(),
    windowBounds: {
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 768
    },
    developmentMode: process.env.NODE_ENV === 'development'
  };

  private readonly userDataPath: string;
  private readonly appPath: string;

  constructor() {
    this.userDataPath = app.getPath('userData');
    this.appPath = app.getAppPath();
    
    this.initializeApp();
  }

  /**
   * Initialize the application
   */
  private async initializeApp(): Promise<void> {
    console.log('🚀 Initializing MekStation Desktop App...');
    
    // Handle app events
    this.registerAppEvents();
    
    // Setup protocol handlers
    this.setupProtocolHandlers();
    
    // Initialize auto-updater
    if (this.config.enableAutoUpdater) {
      this.initializeAutoUpdater();
    }
    
    // Wait for app to be ready
    await app.whenReady();
    
    // Initialize services
    await this.initializeServices();
    
    // Initialize menu manager
    this.initializeMenuManager();
    
    // Create main window
    await this.createMainWindow();
    
    // Setup system tray
    if (this.config.enableSystemTray) {
      this.createSystemTray();
    }
    
    // Setup IPC handlers
    this.setupIpcHandlers();
    
    // Setup periodic tasks
    this.setupPeriodicTasks();
    
    // Apply startup behavior settings
    await this.applyStartupSettings();
    
    console.log('✅ MekStation Desktop App initialized successfully');
  }

  /**
   * Register application event handlers
   */
  private registerAppEvents(): void {
    // Prevent multiple instances
    if (!app.requestSingleInstanceLock()) {
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      // Someone tried to run a second instance, focus our window instead
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore();
        }
        this.mainWindow.focus();
      }
    });

    app.on('window-all-closed', () => {
      // On macOS, keep the app running even when all windows are closed
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', async () => {
      // On macOS, recreate window when dock icon is clicked
      if (BrowserWindow.getAllWindows().length === 0) {
        await this.createMainWindow();
      }
    });

    app.on('before-quit', async () => {
      // Cleanup before quitting
      await this.cleanup();
    });

    app.on('will-quit', (event) => {
      // Prevent quit if cleanup is in progress
      if (this.isCleaningUp) {
        event.preventDefault();
      }
    });
  }

  /**
   * Setup custom protocol handlers
   */
  private setupProtocolHandlers(): void {
    // Register mekstation:// protocol for deep linking
    protocol.registerSchemesAsPrivileged([
      {
        scheme: 'mekstation',
        privileges: {
          standard: true,
          secure: true,
          allowServiceWorkers: true,
          supportFetchAPI: true
        }
      }
    ]);

    app.whenReady().then(() => {
      protocol.registerStringProtocol('mekstation', (request, callback) => {
        // Handle mekstation:// URLs for unit imports, etc.
        const url = request.url.substr('mekstation://'.length);
        this.handleDeepLink(url);
        callback('');
      });
    });
  }

  /**
   * Initialize auto-updater
   */
  private initializeAutoUpdater(): void {
    const updateChannel = process.env.MEKSTATION_UPDATE_CHANNEL || 'latest';
    const platformChannel =
      process.platform === 'darwin'
        ? `${updateChannel}-mac-${process.arch === 'arm64' ? 'arm64' : 'x64'}`
        : updateChannel;

    // Configure auto-updater feed (GitHub Releases or generic feed for mac arch specificity)
    autoUpdater.channel = platformChannel;
    autoUpdater.allowDowngrade = false;
    autoUpdater.autoDownload = false;

    if (process.platform === 'darwin') {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: 'https://github.com/SwiggitySwerve/MekStation/releases/latest/download',
        channel: platformChannel
      });
    } else {
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'SwiggitySwerve',
        repo: 'MekStation',
        private: false,
        channel: updateChannel
      });
    }

    console.log(
      `ℹ️ Auto-updater initialized | version=${app.getVersion()} | channel=${platformChannel} | platform=${process.platform} | arch=${process.arch}`
    );

    // Initial check
    void this.checkForUpdates();

    autoUpdater.on('checking-for-update', () => {
      console.log('🔍 Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('📥 Update available:', info.version);
      void this.notifyUpdateAvailable(info);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('✅ App is up to date');
      this.resetProgressBar();
    });

    autoUpdater.on('error', (err) => {
      console.error('❌ Auto-updater error:', err);
      this.resetProgressBar();
      this.notifyUpdateError(err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      console.log(message);
      this.updateDownloadProgress(progressObj.percent);
    });

    autoUpdater.on('update-downloaded', () => {
      console.log('✅ Update downloaded');
      this.resetProgressBar();
      void this.notifyUpdateReady();
    });

    // Check for updates every hour
    setInterval(() => {
      void this.checkForUpdates();
    }, this.config.updateCheckIntervalMs);
  }

  /**
   * Check for updates without auto-download
   */
  private async checkForUpdates(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('❌ Failed to check for updates:', error);
      this.notifyUpdateError(error);
    }
  }

  /**
   * Initialize services
   */
  private async initializeServices(): Promise<void> {
    try {
      console.log('🔧 Initializing services...');

      // Initialize local storage service
      this.localStorage = new LocalStorageService({
        dataPath: path.join(this.userDataPath, 'data'),
        enableCompression: true,
        enableEncryption: false, // Optional for local-only data
        maxFileSize: 10 * 1024 * 1024 // 10MB
      });
      await this.localStorage.initialize();

      // Initialize settings service
      this.settingsService = new SettingsService({
        localStorage: this.localStorage
      });
      await this.settingsService.initialize();

      // Listen for settings changes
      this.settingsService.on('change', (event) => {
        this.handleSettingsChange(event);
      });

      // Initialize recent files service
      const maxRecentFiles = this.settingsService.get('maxRecentFiles');
      this.recentFilesService = new RecentFilesService({
        localStorage: this.localStorage,
        maxRecentFiles
      });
      await this.recentFilesService.initialize();

      // Listen for recent files updates
      this.recentFilesService.on('update', () => {
        this.updateRecentFilesMenu();
      });

      // Initialize backup service
      if (this.config.enableBackups) {
        const settings = this.settingsService.getAll();
        this.backupService = new BackupService({
          dataPath: path.join(this.userDataPath, 'data'),
          backupPath: settings.backupDirectory || path.join(this.userDataPath, 'backups'),
          maxBackups: settings.maxBackupCount,
          compressionLevel: 6
        });
        await this.backupService.initialize();
      }

      console.log('✅ Services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Initialize the menu manager
   */
  private initializeMenuManager(): void {
    this.menuManager = new MenuManager({
      developmentMode: this.config.developmentMode,
      onMenuCommand: (command, ...args) => this.handleMenuCommand(command, ...args),
      onOpenRecent: (fileId) => this.handleOpenRecent(fileId)
    });

    this.menuManager.initialize();

    // Update recent files in menu
    if (this.recentFilesService) {
      this.menuManager.updateRecentFiles(this.recentFilesService.list());
    }
  }

  /**
   * Handle menu commands
   */
  private handleMenuCommand(command: MenuCommand, ...args: unknown[]): void {
    console.log(`📋 Menu command: ${command}`);

    // Send command to renderer
    this.sendToRenderer(MENU_IPC_CHANNELS.COMMAND, command, ...args);

    // Handle commands that need main process action
    switch (command) {
      case 'file:quit':
        app.quit();
        break;
      case 'file:preferences':
        this.sendToRenderer(APP_IPC_CHANNELS.OPEN_SETTINGS);
        break;
      case 'file:clear-recent':
        if (this.recentFilesService) {
          this.recentFilesService.clear();
          // Update menu to reflect cleared list
          if (this.menuManager) {
            this.menuManager.updateRecentFiles([]);
          }
        }
        break;
      case 'view:fullscreen':
        if (this.mainWindow) {
          this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
        }
        break;
      case 'view:dev-tools':
        if (this.mainWindow) {
          this.mainWindow.webContents.toggleDevTools();
        }
        break;
      case 'help:documentation':
        shell.openExternal('https://github.com/SwiggitySwerve/MekStation/wiki');
        break;
      case 'help:report-issue':
        shell.openExternal('https://github.com/SwiggitySwerve/MekStation/issues/new');
        break;
      case 'help:check-updates':
        void this.checkForUpdates();
        break;
      case 'help:about':
        this.showAboutDialog();
        break;
    }
  }

  /**
   * Handle opening a recent file
   */
  private handleOpenRecent(fileId: string): void {
    console.log(`📂 Opening recent file: ${fileId}`);
    this.sendToRenderer('open-unit', fileId);
  }

  /**
   * Handle settings changes
   */
  private handleSettingsChange(event: { key: keyof IDesktopSettings; oldValue: unknown; newValue: unknown }): void {
    console.log(`⚙️ Setting changed: ${event.key}`);

    switch (event.key) {
      case 'launchAtLogin':
        this.updateLaunchAtLogin(event.newValue as boolean);
        break;
      case 'maxRecentFiles':
        if (this.recentFilesService) {
          this.recentFilesService.setMaxRecentFiles(event.newValue as number);
        }
        break;
      case 'enableAutoBackup':
      case 'backupIntervalMinutes':
        // Backup interval changes are handled in periodic tasks
        break;
    }

    // Notify renderer of settings change
    this.sendToRenderer(SETTINGS_IPC_CHANNELS.ON_CHANGE, event);
  }

  /**
   * Update recent files menu
   */
  private updateRecentFilesMenu(): void {
    if (this.menuManager && this.recentFilesService) {
      this.menuManager.updateRecentFiles(this.recentFilesService.list());
    }

    // Update tray menu if enabled
    if (this.config.enableSystemTray && this.tray) {
      this.updateTrayMenu();
    }

    // Notify renderer
    if (this.recentFilesService) {
      this.sendToRenderer(RECENT_FILES_IPC_CHANNELS.ON_UPDATE, this.recentFilesService.list());
    }
  }

  /**
   * Update launch at login setting
   */
  private updateLaunchAtLogin(enabled: boolean): void {
    if (process.platform === 'linux') {
      // Linux uses .desktop file in autostart
      this.updateLinuxAutostart(enabled);
    } else {
      // Windows and macOS use native API
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: this.settingsService?.get('startMinimized') ?? false
      });
    }
  }

  /**
   * Update Linux autostart .desktop file
   */
  private async updateLinuxAutostart(enabled: boolean): Promise<void> {
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
    } else {
      try {
        await fs.unlink(desktopFile);
      } catch (error) {
        // File may not exist, ignore error
      }
    }
  }

  /**
   * Apply startup settings
   */
  private async applyStartupSettings(): Promise<void> {
    if (!this.settingsService) return;

    const settings = this.settingsService.getAll();

    // Handle start minimized
    if (settings.startMinimized && this.mainWindow) {
      this.mainWindow.hide();
    }

    // Note: reopen last unit is handled in createMainWindow() before URL load
    // to ensure the did-finish-load listener is registered in time
  }

  /**
   * Show about dialog
   */
  private showAboutDialog(): void {
    if (!this.mainWindow) return;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'About MekStation',
      message: 'MekStation',
      detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}\n\nA comprehensive BattleMech editor for the MegaMek ecosystem.`,
      buttons: ['OK']
    });
  }

  /**
   * Create the main application window
   */
  private async createMainWindow(): Promise<void> {
    console.log('🪟 Creating main window...');

    // Get window bounds from settings service or defaults
    const settings = this.settingsService?.getAll();
    const savedBounds = settings?.rememberWindowState ? settings.windowBounds : null;
    
    // Validate saved bounds are on a visible display
    let windowBounds = { 
      ...this.config.windowBounds,
      x: savedBounds?.x,
      y: savedBounds?.y,
      width: savedBounds?.width || this.config.windowBounds.width,
      height: savedBounds?.height || this.config.windowBounds.height
    };

    // Validate window is within visible display bounds
    if (savedBounds?.x !== undefined && savedBounds?.y !== undefined) {
      const displays = screen.getAllDisplays();
      const isVisible = displays.some(display => {
        const { x, y, width, height } = display.bounds;
        return (
          savedBounds.x >= x &&
          savedBounds.x < x + width &&
          savedBounds.y >= y &&
          savedBounds.y < y + height
        );
      });

      if (!isVisible) {
        // Reset to primary display center if not visible
        const primaryDisplay = screen.getPrimaryDisplay();
        windowBounds.x = Math.round((primaryDisplay.bounds.width - windowBounds.width) / 2);
        windowBounds.y = Math.round((primaryDisplay.bounds.height - windowBounds.height) / 2);
      }
    }

    this.mainWindow = new BrowserWindow({
      width: windowBounds.width,
      height: windowBounds.height,
      x: windowBounds.x,
      y: windowBounds.y,
      minWidth: this.config.windowBounds.minWidth,
      minHeight: this.config.windowBounds.minHeight,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: !this.config.developmentMode
      },
      icon: this.getAppIcon(),
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false // Don't show until ready
    });

    // Restore maximized state
    if (savedBounds?.isMaximized && this.mainWindow) {
      this.mainWindow.maximize();
    }

    // Register did-finish-load listener for reopen last unit BEFORE loading URL
    // This must be done before loadURL() to catch the initial page load event
    if (this.settingsService && this.recentFilesService) {
      const settings = this.settingsService.getAll();
      if (settings.reopenLastUnit) {
        const lastUnit = this.recentFilesService.getMostRecent();
        if (lastUnit) {
          this.mainWindow.webContents.once('did-finish-load', () => {
            setTimeout(() => {
              this.sendToRenderer('open-unit', lastUnit.id);
            }, 1000); // Small delay to ensure app is fully initialized
          });
        }
      }
    }

    // Load the application
    if (this.config.developmentMode) {
      await this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      // In production, start the Next.js standalone server and load it
      const { spawn } = require('child_process');
      const serverPath = path.join(__dirname, '../../.next/standalone/server.js');
      
      // Start the Next.js server
      const server = spawn('node', [serverPath], {
        env: {
          ...process.env,
          PORT: '3001', // Use different port to avoid conflicts
          HOSTNAME: '127.0.0.1',
        },
        cwd: path.join(__dirname, '../../.next/standalone'),
      });
      
      server.stdout?.on('data', (data: Buffer) => {
        console.log(`Server: ${data.toString()}`);
      });
      
      server.stderr?.on('data', (data: Buffer) => {
        console.error(`Server Error: ${data.toString()}`);
      });
      
      // Wait for server to start and then load
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.mainWindow.loadURL('http://127.0.0.1:3001');
    }

    // Show window when ready (unless start minimized is enabled)
    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow) {
        const startMinimized = this.settingsService?.get('startMinimized') ?? false;
        
        if (!startMinimized) {
          this.mainWindow.show();
          
          // Focus window
          if (process.platform === 'darwin') {
            app.dock.show();
          }
          this.mainWindow.focus();
        }
      }
    });

    // Handle window events
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.on('close', async (event) => {
      // Save window bounds to settings
      if (this.mainWindow && this.settingsService) {
        const bounds = this.mainWindow.getBounds();
        const isMaximized = this.mainWindow.isMaximized();
        
        await this.settingsService.updateWindowBounds({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized
        });
      }

      // Hide to tray instead of closing (except on macOS)
      if (this.config.enableSystemTray && process.platform !== 'darwin') {
        event.preventDefault();
        if (this.mainWindow) {
          this.mainWindow.hide();
        }
      }
    });

    // Handle navigation
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    console.log('✅ Main window created successfully');
  }

  /**
   * Create system tray
   */
  private createSystemTray(): void {
    if (!this.config.enableSystemTray) return;

    console.log('🔔 Creating system tray...');

    const trayIcon = this.getTrayIcon();
    this.tray = new Tray(trayIcon);

    this.updateTrayMenu();

    this.tray.setToolTip('MekStation');

    this.tray.on('click', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isVisible()) {
          this.mainWindow.hide();
        } else {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      }
    });

    console.log('✅ System tray created successfully');
  }

  /**
   * Update system tray context menu
   */
  private updateTrayMenu(): void {
    if (!this.tray) return;

    const recentFiles = this.recentFilesService?.list() ?? [];
    
    // Build recent files submenu
    const recentFilesSubmenu: Electron.MenuItemConstructorOptions[] = recentFiles.length > 0
      ? [
          ...recentFiles.slice(0, 5).map(file => ({
            label: `${file.name}${file.variant ? ` ${file.variant}` : ''}`,
            click: () => this.handleOpenRecent(file.id)
          })),
          { type: 'separator' as const },
          {
            label: 'More...',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.show();
                this.mainWindow.focus();
              }
            }
          }
        ]
      : [{ label: 'No Recent Files', enabled: false }];

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show MekStation',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Recent Files',
        submenu: recentFilesSubmenu
      },
      { type: 'separator' },
      {
        label: 'New Unit',
        click: () => {
          this.sendToRenderer('create-new-unit');
        }
      },
      {
        label: 'Import Unit',
        click: () => {
          this.importUnitFile();
        }
      },
      { type: 'separator' },
      {
        label: 'Preferences',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
          this.sendToRenderer(APP_IPC_CHANNELS.OPEN_SETTINGS);
        }
      },
      { type: 'separator' },
      {
        label: 'Backup Data',
        click: () => {
          this.createBackup();
        }
      },
      {
        label: 'Check for Updates',
        click: () => {
          void this.checkForUpdates();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Setup IPC handlers for communication with renderer
   */
  private setupIpcHandlers(): void {
    console.log('📡 Setting up IPC handlers...');

    // =========================================================================
    // SETTINGS IPC HANDLERS
    // =========================================================================

    ipcMain.handle(SETTINGS_IPC_CHANNELS.GET, () => {
      return this.settingsService?.getAll() ?? null;
    });

    ipcMain.handle(SETTINGS_IPC_CHANNELS.SET, async (event, updates: Partial<IDesktopSettings>) => {
      if (!this.settingsService) return { success: false, error: 'Settings service not initialized' };
      return await this.settingsService.setMultiple(updates);
    });

    ipcMain.handle(SETTINGS_IPC_CHANNELS.RESET, async () => {
      if (!this.settingsService) return { success: false, error: 'Settings service not initialized' };
      return await this.settingsService.reset();
    });

    ipcMain.handle(SETTINGS_IPC_CHANNELS.GET_VALUE, (event, key: keyof IDesktopSettings) => {
      return this.settingsService?.get(key) ?? null;
    });

    // =========================================================================
    // RECENT FILES IPC HANDLERS
    // =========================================================================

    ipcMain.handle(RECENT_FILES_IPC_CHANNELS.LIST, () => {
      return this.recentFilesService?.list() ?? [];
    });

    ipcMain.handle(RECENT_FILES_IPC_CHANNELS.ADD, async (event, params: IAddRecentFileParams) => {
      if (!this.recentFilesService) return { success: false, error: 'Recent files service not initialized' };
      return await this.recentFilesService.add(params);
    });

    ipcMain.handle(RECENT_FILES_IPC_CHANNELS.REMOVE, async (event, id: string) => {
      if (!this.recentFilesService) return { success: false, error: 'Recent files service not initialized' };
      return await this.recentFilesService.remove(id);
    });

    ipcMain.handle(RECENT_FILES_IPC_CHANNELS.CLEAR, async () => {
      if (!this.recentFilesService) return { success: false, error: 'Recent files service not initialized' };
      return await this.recentFilesService.clear();
    });

    // =========================================================================
    // MENU IPC HANDLERS
    // =========================================================================

    ipcMain.handle(MENU_IPC_CHANNELS.UPDATE_STATE, (event, state: { canUndo?: boolean; canRedo?: boolean; hasUnit?: boolean; hasSelection?: boolean }) => {
      if (this.menuManager) {
        this.menuManager.updateMenuState(state);
      }
    });

    // =========================================================================
    // FILE OPERATIONS
    // =========================================================================

    ipcMain.handle('save-file', async (event, defaultPath: string, filters: Electron.FileFilter[]) => {
      if (!this.mainWindow) return { canceled: true };
      const result = await dialog.showSaveDialog(this.mainWindow, {
        defaultPath,
        filters
      });
      return result;
    });

    ipcMain.handle('open-file', async (event, filters: Electron.FileFilter[]) => {
      if (!this.mainWindow) return { canceled: true, filePaths: [] };
      const result = await dialog.showOpenDialog(this.mainWindow, {
        filters,
        properties: ['openFile']
      });
      return result;
    });

    ipcMain.handle('read-file', async (event, filePath: string) => {
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        return { success: true, data };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to read file' 
        };
      }
    });

    ipcMain.handle('write-file', async (event, filePath: string, data: string) => {
      try {
        await fs.writeFile(filePath, data, 'utf-8');
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to write file' 
        };
      }
    });

    ipcMain.handle('select-directory', async () => {
      if (!this.mainWindow) return { canceled: true, filePaths: [] };
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory', 'createDirectory']
      });
      return result;
    });

    // =========================================================================
    // APPLICATION INFO
    // =========================================================================

    ipcMain.handle('get-app-info', () => ({
      version: app.getVersion(),
      platform: process.platform,
      userDataPath: this.userDataPath,
      developmentMode: this.config.developmentMode
    }));

    // =========================================================================
    // WINDOW OPERATIONS
    // =========================================================================

    ipcMain.handle('minimize-window', () => {
      if (this.mainWindow) {
        this.mainWindow.minimize();
      }
    });

    ipcMain.handle('maximize-window', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMaximized()) {
          this.mainWindow.unmaximize();
        } else {
          this.mainWindow.maximize();
        }
      }
    });

    ipcMain.handle('close-window', () => {
      if (this.mainWindow) {
        this.mainWindow.close();
      }
    });

    // =========================================================================
    // SERVICE OPERATIONS
    // =========================================================================

    ipcMain.handle('service-call', async (event, method: string) => {
      try {
        switch (method) {
          case 'checkForUpdates':
            await this.checkForUpdates();
            return { success: true };
          case 'clearCache':
            // Clear any cached data
            if (this.localStorage) {
              // Clear only the cache, not the actual storage
              await this.localStorage.clear();
            }
            return { success: true };
          default:
            return { success: false, error: `Unknown method: ${method}` };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    });

    // =========================================================================
    // BACKUP OPERATIONS
    // =========================================================================

    ipcMain.handle('create-backup', async () => {
      return await this.createBackup();
    });

    ipcMain.handle('restore-backup', async (event, backupPath: string) => {
      return await this.restoreBackup(backupPath);
    });

    console.log('✅ IPC handlers setup complete');
  }

  /**
   * Setup periodic tasks
   */
  private setupPeriodicTasks(): void {
    console.log('⏰ Setting up periodic tasks...');

    // Auto-save - disabled until service orchestrator is implemented
    // setInterval(async () => {
    //   if (this.serviceOrchestrator) {
    //     try {
    //       await this.sendToRenderer('auto-save-trigger');
    //     } catch (error) {
    //       console.error('Auto-save trigger failed:', error);
    //     }
    //   }
    // }, this.config.autoSaveInterval);

    // Auto-backup
    if (this.config.enableBackups) {
      setInterval(async () => {
        try {
          await this.createBackup();
        } catch (error) {
          console.error('Auto-backup failed:', error);
        }
      }, this.config.backupInterval);
    }

    console.log('✅ Periodic tasks setup complete');
  }

  /**
   * Handle deep links
   */
  private async handleDeepLink(url: string): Promise<void> {
    console.log('🔗 Handling deep link:', url);

    try {
      // Parse the deep link URL
      const [action, ...params] = url.split('/');

      switch (action) {
        case 'import':
          if (params[0]) {
            await this.importFromUrl(params[0]);
          }
          break;
        case 'open':
          if (params[0]) {
            await this.openUnit(params[0]);
          }
          break;
        default:
          console.warn('Unknown deep link action:', action);
      }

      // Bring window to front
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    } catch (error) {
      console.error('Deep link handling failed:', error);
    }
  }

  /**
   * Send message to renderer process
   */
  private async sendToRenderer(channel: string, ...args: any[]): Promise<void> {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  /**
   * Get application icon path
   */
  private getAppIcon(): string {
    const iconName = process.platform === 'win32' ? 'icon.ico' : 
                    process.platform === 'darwin' ? 'icon.icns' : 'icon.png';
    return path.join(__dirname, '../assets/icons', iconName);
  }

  /**
   * Get tray icon path
   */
  private getTrayIcon(): string {
    const iconName = process.platform === 'win32' ? 'tray.ico' : 
                    process.platform === 'darwin' ? 'tray.png' : 'tray.png';
    return path.join(__dirname, '../assets/icons', iconName);
  }


  /**
   * Import unit from file
   */
  private async importUnitFile(): Promise<void> {
    try {
      if (!this.mainWindow) return;
      const result = await dialog.showOpenDialog(this.mainWindow, {
        filters: [
          { name: 'MegaMek Files', extensions: ['mtf'] },
          { name: 'MekStation Files', extensions: ['bte', 'json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        await this.sendToRenderer('import-unit-file', result.filePaths[0]);
      }
    } catch (error) {
      console.error('Unit import failed:', error);
    }
  }

  /**
   * Import from URL
   */
  private async importFromUrl(url: string): Promise<void> {
    try {
      await this.sendToRenderer('import-unit-url', url);
    } catch (error) {
      console.error('URL import failed:', error);
    }
  }

  /**
   * Open specific unit
   */
  private async openUnit(unitId: string): Promise<void> {
    try {
      await this.sendToRenderer('open-unit', unitId);
    } catch (error) {
      console.error('Unit open failed:', error);
    }
  }

  /**
   * Create backup
   */
  private async createBackup(): Promise<boolean> {
    try {
      if (this.backupService) {
        const backupPath = await this.backupService.createBackup();
        console.log('✅ Backup created:', backupPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      return false;
    }
  }

  /**
   * Restore backup
   */
  private async restoreBackup(backupPath: string): Promise<boolean> {
    try {
      if (this.backupService) {
        await this.backupService.restoreBackup(backupPath);
        console.log('✅ Backup restored:', backupPath);
        
        // Restart services to pick up restored data
        // Service orchestrator not implemented yet
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Backup restoration failed:', error);
      return false;
    }
  }

  /**
   * Notify about available update
   */
  private async notifyUpdateAvailable(info: any): Promise<void> {
    if (!this.mainWindow) return;
    const choice = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. Would you like to download it now?`,
      buttons: ['Download', 'Later'],
      defaultId: 0
    });

    if (choice.response === 0) {
      this.updateDownloadProgress(0);
      autoUpdater.downloadUpdate();
    }
  }

  /**
   * Update download progress
   */
  private updateDownloadProgress(percent: number): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.setProgressBar(percent / 100);
    }
  }

  /**
   * Clear any download progress indicator
   */
  private resetProgressBar(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.setProgressBar(-1);
    }
  }

  /**
   * Notify about update errors
   */
  private notifyUpdateError(error: unknown): void {
    if (!this.mainWindow) return;
    const message = error instanceof Error ? error.message : 'Unknown error occurred while checking for updates.';
    dialog.showMessageBox(this.mainWindow, {
      type: 'error',
      title: 'Update Failed',
      message: 'Failed to check for or download updates.',
      detail: message,
      buttons: ['OK']
    });
  }

  /**
   * Notify about ready update
   */
  private async notifyUpdateReady(): Promise<void> {
    if (!this.mainWindow) return;
    const choice = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. The application will restart to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0
    });

    if (choice.response === 0) {
      autoUpdater.quitAndInstall();
    }
  }

  private isCleaningUp = false;

  /**
   * Cleanup before exit
   */
  private async cleanup(): Promise<void> {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    console.log('🧹 Cleaning up application...');

    try {
      // Save current state
      await this.sendToRenderer('save-all-data');

      // Cleanup services in reverse initialization order
      if (this.recentFilesService) {
        await this.recentFilesService.cleanup();
      }

      if (this.settingsService) {
        await this.settingsService.cleanup();
      }

      if (this.backupService) {
        await this.backupService.cleanup();
      }

      if (this.localStorage) {
        await this.localStorage.cleanup();
      }

      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }

    this.isCleaningUp = false;
  }
}

// Create and run the application
new MekStationApp();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default MekStationApp;