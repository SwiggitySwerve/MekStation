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

import { app, BrowserWindow, Tray, protocol } from 'electron';
import { autoUpdater } from 'electron-updater';

import { BackupService } from '../services/local/BackupService';
// Import our service layer
import { LocalStorageService } from '../services/local/LocalStorageService';
import { RecentFilesService } from '../services/local/RecentFilesService';
import { SettingsService } from '../services/local/SettingsService';
import {
  IDesktopSettings,
  MenuCommand,
  RECENT_FILES_IPC_CHANNELS,
} from '../types/BaseTypes';
import {
  createBackup as createBackupAction,
  importUnitFile as importUnitFileAction,
  notifyUpdateAvailable as notifyUpdateAvailableAction,
  notifyUpdateError as notifyUpdateErrorAction,
  notifyUpdateReady as notifyUpdateReadyAction,
  resetProgressBar as resetProgressBarAction,
  restoreBackup as restoreBackupAction,
  updateDownloadProgress as updateDownloadProgressAction,
} from './main.actions';
import {
  applyStartupSettings,
  handleMenuCommand,
  handleSettingsChange,
  showAboutDialog,
} from './main.behavior';
import { cleanupServices } from './main.cleanup';
import {
  createDesktopAppConfig,
  getAppIcon,
  getTrayIcon,
  IDesktopAppConfig,
  IUpdateAvailableInfo,
} from './main.config';
import { setupIpcHandlers } from './main.ipc';
import { registerAppEvents } from './main.lifecycle';
import { initializeDesktopServices } from './main.services';
import { buildTrayMenu } from './main.tray';
import { initializeAutoUpdater as initializeAutoUpdaterEvents } from './main.updater';
import { createMainWindow } from './main.window';
import { MenuManager } from './MenuManager';

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

  private readonly config: IDesktopAppConfig = createDesktopAppConfig();

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
    registerAppEvents({
      cleanup: () => this.cleanup(),
      createMainWindow: () => this.createMainWindow(),
      getMainWindow: () => this.mainWindow,
      isCleaningUp: () => this.isCleaningUp,
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
          supportFetchAPI: true,
        },
      },
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
    initializeAutoUpdaterEvents({
      checkForUpdates: () => this.checkForUpdates(),
      notifyUpdateAvailable: (info) => this.notifyUpdateAvailable(info),
      notifyUpdateError: (error) => this.notifyUpdateError(error),
      notifyUpdateReady: () => this.notifyUpdateReady(),
      resetProgressBar: () => this.resetProgressBar(),
      updateCheckIntervalMs: this.config.updateCheckIntervalMs,
      updateDownloadProgress: (percent) => this.updateDownloadProgress(percent),
    });
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
      const services = await initializeDesktopServices({
        config: this.config,
        onRecentFilesUpdate: () => this.updateRecentFilesMenu(),
        onSettingsChange: (event) => this.handleSettingsChange(event),
        userDataPath: this.userDataPath,
      });

      this.localStorage = services.localStorage;
      this.settingsService = services.settingsService;
      this.recentFilesService = services.recentFilesService;
      this.backupService = services.backupService;
    } catch (error) {
      console.error('Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Initialize the menu manager
   */
  private initializeMenuManager(): void {
    this.menuManager = new MenuManager({
      developmentMode: this.config.developmentMode,
      onMenuCommand: (command, ...args) =>
        this.handleMenuCommand(command, ...args),
      onOpenRecent: (fileId) => this.handleOpenRecent(fileId),
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
    handleMenuCommand({
      args,
      checkForUpdates: () => this.checkForUpdates(),
      command,
      mainWindow: this.mainWindow,
      menuManager: this.menuManager,
      recentFilesService: this.recentFilesService,
      sendToRenderer: (channel, ...rendererArgs) => {
        void this.sendToRenderer(channel, ...rendererArgs);
      },
      showAboutDialog: () => this.showAboutDialog(),
    });
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
  private handleSettingsChange(event: {
    key: keyof IDesktopSettings;
    oldValue: unknown;
    newValue: unknown;
  }): void {
    handleSettingsChange({
      event,
      recentFilesService: this.recentFilesService,
      sendToRenderer: (channel, ...args) => {
        void this.sendToRenderer(channel, ...args);
      },
      settingsService: this.settingsService,
    });
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
      this.sendToRenderer(
        RECENT_FILES_IPC_CHANNELS.ON_UPDATE,
        this.recentFilesService.list(),
      );
    }
  }

  /**
   * Apply startup settings
   */
  private async applyStartupSettings(): Promise<void> {
    applyStartupSettings(this.mainWindow, this.settingsService);
  }

  /**
   * Show about dialog
   */
  private showAboutDialog(): void {
    showAboutDialog(this.mainWindow);
  }

  /**
   * Create the main application window
   */
  private async createMainWindow(): Promise<void> {
    this.mainWindow = await createMainWindow({
      appPath: this.appPath,
      config: this.config,
      getAppIcon: () => this.getAppIcon(),
      onClosed: () => {
        this.mainWindow = null;
      },
      recentFilesService: this.recentFilesService,
      sendToRenderer: (channel, ...args) => {
        void this.sendToRenderer(channel, ...args);
      },
      settingsService: this.settingsService,
      shouldHideToTray: () =>
        this.config.enableSystemTray && process.platform !== 'darwin',
      userDataPath: this.userDataPath,
    });
  }

  /**
   * Create system tray
   */
  private createSystemTray(): void {
    if (!this.config.enableSystemTray) return;

    console.log('Creating system tray...');

    this.tray = new Tray(this.getTrayIcon());
    this.updateTrayMenu();
    this.tray.setToolTip('MekStation');

    this.tray.on('click', () => {
      if (!this.mainWindow) return;
      if (this.mainWindow.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });

    console.log('System tray created successfully');
  }

  /**
   * Update system tray context menu
   */
  private updateTrayMenu(): void {
    if (!this.tray) return;

    const contextMenu = buildTrayMenu({
      checkForUpdates: () => this.checkForUpdates(),
      createBackup: () => this.createBackup(),
      handleOpenRecent: (fileId) => this.handleOpenRecent(fileId),
      importUnitFile: () => this.importUnitFile(),
      recentFiles: this.recentFilesService?.list() ?? [],
      sendToRenderer: (channel, ...args) => {
        void this.sendToRenderer(channel, ...args);
      },
      showMainWindow: () => {
        if (!this.mainWindow) return;
        this.mainWindow.show();
        this.mainWindow.focus();
      },
    });

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Setup IPC handlers for communication with renderer
   */
  private setupIpcHandlers(): void {
    setupIpcHandlers({
      checkForUpdates: () => this.checkForUpdates(),
      createBackup: () => this.createBackup(),
      developmentMode: this.config.developmentMode,
      getLocalStorage: () => this.localStorage,
      getMainWindow: () => this.mainWindow,
      getMenuManager: () => this.menuManager,
      getRecentFilesService: () => this.recentFilesService,
      getSettingsService: () => this.settingsService,
      restoreBackup: (backupPath) => this.restoreBackup(backupPath),
      userDataPath: this.userDataPath,
    });
  }

  /**
   * Setup periodic tasks
   */
  private setupPeriodicTasks(): void {
    console.log('⏰ Setting up periodic tasks...');

    // Auto-save awaits service orchestrator support.

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
  private async sendToRenderer(
    channel: string,
    ...args: unknown[]
  ): Promise<void> {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  /**
   * Get application icon path
   */
  private getAppIcon(): string {
    return getAppIcon(__dirname);
  }

  /**
   * Get tray icon path
   */
  private getTrayIcon(): string {
    return getTrayIcon(__dirname);
  }

  /**
   * Import unit from file
   */
  private async importUnitFile(): Promise<void> {
    await importUnitFileAction(this.mainWindow, (channel, ...args) =>
      this.sendToRenderer(channel, ...args),
    );
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
    return await createBackupAction(this.backupService);
  }

  /**
   * Restore backup
   */
  private async restoreBackup(backupPath: string): Promise<boolean> {
    return await restoreBackupAction(this.backupService, backupPath);
  }

  /**
   * Notify about available update
   */
  private async notifyUpdateAvailable(
    info: IUpdateAvailableInfo,
  ): Promise<void> {
    await notifyUpdateAvailableAction(this.mainWindow, info, (percent) =>
      this.updateDownloadProgress(percent),
    );
  }

  /**
   * Update download progress
   */
  private updateDownloadProgress(percent: number): void {
    updateDownloadProgressAction(this.mainWindow, percent);
  }

  /**
   * Clear any download progress indicator
   */
  private resetProgressBar(): void {
    resetProgressBarAction(this.mainWindow);
  }

  /**
   * Notify about update errors
   */
  private notifyUpdateError(error: unknown): void {
    notifyUpdateErrorAction(this.mainWindow, error);
  }

  /**
   * Notify about ready update
   */
  private async notifyUpdateReady(): Promise<void> {
    await notifyUpdateReadyAction(this.mainWindow);
  }

  private isCleaningUp = false;

  /**
   * Cleanup before exit
   */
  private async cleanup(): Promise<void> {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    await cleanupServices({
      backupService: this.backupService,
      localStorage: this.localStorage,
      recentFilesService: this.recentFilesService,
      sendToRenderer: (channel, ...args) =>
        this.sendToRenderer(channel, ...args),
      settingsService: this.settingsService,
    });

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
