/**
 * BattleTech Editor - Electron Main Process
 * 
 * This is the main Electron process that creates and manages the desktop
 * application window, handles system integration, and provides native
 * desktop features for the self-hosted BattleTech Editor.
 * 
 * Features:
 * - Native desktop application experience
 * - Auto-updater for seamless updates
 * - System tray integration
 * - Local file storage and backups
 * - Cross-platform compatibility (Windows, Mac, Linux)
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
  session
} from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

// Import our service layer
import { LocalStorageService } from '../services/local/LocalStorageService';
import { BackupService } from '../services/local/BackupService';

/**
 * Application configuration
 */
interface IDesktopAppConfig {
  readonly enableAutoUpdater: boolean;
  readonly enableSystemTray: boolean;
  readonly enableBackups: boolean;
  readonly autoSaveInterval: number;
  readonly backupInterval: number;
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
class BattleTechEditorApp {
  private mainWindow: typeof BrowserWindow | null = null;
  private tray: typeof Tray | null = null;
  private localStorage: LocalStorageService | null = null;
  private backupService: BackupService | null = null;
  
  private readonly config: IDesktopAppConfig = {
    enableAutoUpdater: !process.env.NODE_ENV?.includes('dev'),
    enableSystemTray: true,
    enableBackups: true,
    autoSaveInterval: 30000, // 30 seconds
    backupInterval: 300000, // 5 minutes
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
    console.log('🚀 Initializing BattleTech Editor Desktop App...');
    
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
    
    console.log('✅ BattleTech Editor Desktop App initialized successfully');
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
    // Register battletech:// protocol for deep linking
    protocol.registerSchemesAsPrivileged([
      {
        scheme: 'battletech',
        privileges: {
          standard: true,
          secure: true,
          allowServiceWorkers: true,
          supportFetchAPI: true
        }
      }
    ]);

    app.whenReady().then(() => {
      protocol.registerStringProtocol('battletech', (request, callback) => {
        // Handle battletech:// URLs for unit imports, etc.
        const url = request.url.substr('battletech://'.length);
        this.handleDeepLink(url);
        callback('');
      });
    });
  }

  /**
   * Initialize auto-updater
   */
  private initializeAutoUpdater(): void {
    // Configure auto-updater
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'swervelabs',
      repo: 'battletech-editor',
      private: false
    });

    autoUpdater.on('checking-for-update', () => {
      console.log('🔍 Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('📥 Update available:', info.version);
      this.notifyUpdateAvailable(info);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('✅ App is up to date');
    });

    autoUpdater.on('error', (err) => {
      console.error('❌ Auto-updater error:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      console.log(message);
      this.updateDownloadProgress(progressObj.percent);
    });

    autoUpdater.on('update-downloaded', () => {
      console.log('✅ Update downloaded');
      this.notifyUpdateReady();
    });

    // Check for updates every hour
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 60 * 60 * 1000);
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

      // Initialize backup service
      if (this.config.enableBackups) {
        this.backupService = new BackupService({
          dataPath: path.join(this.userDataPath, 'data'),
          backupPath: path.join(this.userDataPath, 'backups'),
          maxBackups: 10,
          compressionLevel: 6
        });
        await this.backupService.initialize();
      }

      // Service orchestrator removed - not implemented yet

      console.log('✅ Services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Create the main application window
   */
  private async createMainWindow(): Promise<void> {
    console.log('🪟 Creating main window...');

    // Load previous window bounds if available
    const savedBounds = await this.loadWindowBounds();
    const bounds = { ...this.config.windowBounds, ...savedBounds };

    this.mainWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      minWidth: bounds.minWidth,
      minHeight: bounds.minHeight,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: !this.config.developmentMode
      },
      icon: this.getAppIcon(),
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false // Don't show until ready
    });

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

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      // Focus window
      if (process.platform === 'darwin') {
        app.dock.show();
      }
      this.mainWindow?.focus();
    });

    // Handle window events
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.on('close', async (event) => {
      // Save window bounds
      if (this.mainWindow) {
        await this.saveWindowBounds(this.mainWindow.getBounds());
      }

      // Hide to tray instead of closing (except on macOS)
      if (this.config.enableSystemTray && process.platform !== 'darwin') {
        event.preventDefault();
        this.mainWindow?.hide();
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

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show BattleTech Editor',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        }
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
        label: 'Backup Data',
        click: () => {
          this.createBackup();
        }
      },
      {
        label: 'Check for Updates',
        click: () => {
          autoUpdater.checkForUpdatesAndNotify();
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
    this.tray.setToolTip('BattleTech Editor');

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
   * Setup IPC handlers for communication with renderer
   */
  private setupIpcHandlers(): void {
    console.log('📡 Setting up IPC handlers...');

    // Service orchestrator communication - disabled until implemented
    // ipcMain.handle('service-call', async (event, method: string, ...args: any[]) => {
    //   // Service orchestrator not implemented yet
    // });

    // File operations
    ipcMain.handle('save-file', async (event, defaultPath: string, filters: any[]) => {
      const result = await dialog.showSaveDialog(this.mainWindow!, {
        defaultPath,
        filters
      });
      return result;
    });

    ipcMain.handle('open-file', async (event, filters: any[]) => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
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

    // Application info
    ipcMain.handle('get-app-info', () => ({
      version: app.getVersion(),
      platform: process.platform,
      userDataPath: this.userDataPath,
      developmentMode: this.config.developmentMode
    }));

    // Window operations
    ipcMain.handle('minimize-window', () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle('maximize-window', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    ipcMain.handle('close-window', () => {
      this.mainWindow?.close();
    });

    // Backup operations
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
   * Load saved window bounds
   */
  private async loadWindowBounds(): Promise<Partial<Electron.Rectangle>> {
    try {
      if (this.localStorage) {
        const bounds = await this.localStorage.get('window-bounds');
        return bounds || {};
      }
    } catch (error) {
      console.error('Failed to load window bounds:', error);
    }
    return {};
  }

  /**
   * Save window bounds
   */
  private async saveWindowBounds(bounds: Electron.Rectangle): Promise<void> {
    try {
      if (this.localStorage) {
        await this.localStorage.set('window-bounds', bounds);
      }
    } catch (error) {
      console.error('Failed to save window bounds:', error);
    }
  }

  /**
   * Import unit from file
   */
  private async importUnitFile(): Promise<void> {
    try {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        filters: [
          { name: 'MegaMek Files', extensions: ['mtf'] },
          { name: 'BattleTech Editor Files', extensions: ['bte', 'json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
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
        if (this.serviceOrchestrator) {
          await this.serviceOrchestrator.cleanup();
          await this.serviceOrchestrator.initialize();
        }
        
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
    const choice = await dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. Would you like to download it now?`,
      buttons: ['Download', 'Later'],
      defaultId: 0
    });

    if (choice.response === 0) {
      autoUpdater.downloadUpdate();
    }
  }

  /**
   * Update download progress
   */
  private updateDownloadProgress(percent: number): void {
    if (this.mainWindow) {
      this.mainWindow.setProgressBar(percent / 100);
    }
  }

  /**
   * Notify about ready update
   */
  private async notifyUpdateReady(): Promise<void> {
    const choice = await dialog.showMessageBox(this.mainWindow!, {
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

      // Cleanup services
      if (this.serviceOrchestrator) {
        await this.serviceOrchestrator.cleanup();
      }

      if (this.localStorage) {
        await this.localStorage.cleanup();
      }

      if (this.backupService) {
        await this.backupService.cleanup();
      }

      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }

    this.isCleaningUp = false;
  }
}

// Create and run the application
const battletechApp = new BattleTechEditorApp();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default BattleTechEditorApp;