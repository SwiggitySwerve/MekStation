/**
 * Menu Manager for BattleTech Editor Desktop App
 * 
 * Manages the native application menu bar with standard menus,
 * keyboard shortcuts, and dynamic content like recent files.
 * 
 * Features:
 * - Platform-aware menu construction (macOS vs Windows/Linux)
 * - Standard keyboard shortcuts (Cmd/Ctrl based on platform)
 * - Dynamic recent files submenu
 * - Menu state updates (enable/disable items)
 * - IPC communication with renderer for menu commands
 */

import { Menu, MenuItem, BrowserWindow, app, shell } from 'electron';
import {
  IRecentFile,
  MenuCommand,
  MENU_IPC_CHANNELS
} from '../types/BaseTypes';

/**
 * Menu manager configuration
 */
interface IMenuManagerConfig {
  readonly developmentMode: boolean;
  readonly onMenuCommand: (command: MenuCommand, ...args: unknown[]) => void;
  readonly onOpenRecent: (fileId: string) => void;
}

/**
 * Menu state for enabling/disabling items
 */
interface IMenuState {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly hasUnit: boolean;
  readonly hasSelection: boolean;
}

/**
 * Default menu state
 */
const DEFAULT_MENU_STATE: IMenuState = {
  canUndo: false,
  canRedo: false,
  hasUnit: false,
  hasSelection: false
};

/**
 * MenuManager handles native application menu construction and updates
 */
export class MenuManager {
  private readonly config: IMenuManagerConfig;
  private recentFiles: readonly IRecentFile[] = [];
  private menuState: IMenuState = DEFAULT_MENU_STATE;
  private menu: Menu | null = null;

  constructor(config: IMenuManagerConfig) {
    this.config = config;
  }

  /**
   * Initialize the menu manager and set the application menu
   */
  initialize(): void {
    console.log('🍔 Initializing MenuManager...');
    this.buildMenu();
    console.log('✅ MenuManager initialized');
  }

  /**
   * Update the recent files list and rebuild the menu
   */
  updateRecentFiles(files: readonly IRecentFile[]): void {
    this.recentFiles = files;
    this.buildMenu();
  }

  /**
   * Update menu state (enable/disable items)
   */
  updateMenuState(state: Partial<IMenuState>): void {
    this.menuState = { ...this.menuState, ...state };
    this.buildMenu();
  }

  /**
   * Build and set the application menu
   */
  private buildMenu(): void {
    const template = this.createMenuTemplate();
    this.menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(this.menu);
  }

  /**
   * Create the menu template
   */
  private createMenuTemplate(): Electron.MenuItemConstructorOptions[] {
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Cmd' : 'Ctrl';

    const template: Electron.MenuItemConstructorOptions[] = [];

    // macOS app menu
    if (isMac) {
      template.push(this.createMacAppMenu());
    }

    // File menu
    template.push(this.createFileMenu(modifier, isMac));

    // Edit menu
    template.push(this.createEditMenu(modifier));

    // View menu
    template.push(this.createViewMenu(modifier));

    // Unit menu
    template.push(this.createUnitMenu(modifier));

    // Window menu (macOS standard)
    if (isMac) {
      template.push(this.createWindowMenu());
    }

    // Help menu
    template.push(this.createHelpMenu(isMac));

    return template;
  }

  /**
   * Create macOS app menu
   */
  private createMacAppMenu(): Electron.MenuItemConstructorOptions {
    return {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => this.sendCommand('file:preferences')
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    };
  }

  /**
   * Create File menu
   */
  private createFileMenu(
    modifier: string,
    isMac: boolean
  ): Electron.MenuItemConstructorOptions {
    const recentFilesSubmenu = this.createRecentFilesSubmenu();

    const submenu: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'New Unit',
        accelerator: `${modifier}+N`,
        click: () => this.sendCommand('file:new')
      },
      {
        label: 'Open...',
        accelerator: `${modifier}+O`,
        click: () => this.sendCommand('file:open')
      },
      {
        label: 'Open Recent',
        submenu: recentFilesSubmenu
      },
      { type: 'separator' },
      {
        label: 'Save',
        accelerator: `${modifier}+S`,
        click: () => this.sendCommand('file:save')
      },
      {
        label: 'Save As...',
        accelerator: `${modifier}+Shift+S`,
        click: () => this.sendCommand('file:save-as')
      },
      { type: 'separator' },
      {
        label: 'Import...',
        accelerator: `${modifier}+I`,
        click: () => this.sendCommand('file:import')
      },
      {
        label: 'Export...',
        accelerator: `${modifier}+E`,
        click: () => this.sendCommand('file:export')
      },
      { type: 'separator' },
      {
        label: 'Print...',
        accelerator: `${modifier}+P`,
        click: () => this.sendCommand('file:print')
      }
    ];

    // On Windows/Linux, add preferences and quit to File menu
    if (!isMac) {
      submenu.push(
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: `${modifier}+,`,
          click: () => this.sendCommand('file:preferences')
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: `${modifier}+Q`,
          click: () => this.sendCommand('file:quit')
        }
      );
    }

    return {
      label: 'File',
      submenu
    };
  }

  /**
   * Create recent files submenu
   */
  private createRecentFilesSubmenu(): Electron.MenuItemConstructorOptions[] {
    if (this.recentFiles.length === 0) {
      return [
        {
          label: 'No Recent Files',
          enabled: false
        }
      ];
    }

    const items: Electron.MenuItemConstructorOptions[] = this.recentFiles.map((file, index) => {
      // Format: "1. Atlas AS7-D (100t) - BattleMech"
      const accelerator = index < 9 ? `CmdOrCtrl+${index + 1}` : undefined;
      const tonnageStr = file.tonnage ? ` (${file.tonnage}t)` : '';
      const label = `${file.name}${file.variant ? ` ${file.variant}` : ''}${tonnageStr}`;

      return {
        label,
        accelerator,
        click: () => this.config.onOpenRecent(file.id)
      };
    });

    items.push(
      { type: 'separator' },
      {
        label: 'Clear Recent',
        click: () => this.sendCommand('file:clear-recent')
      }
    );

    return items;
  }

  /**
   * Create Edit menu
   */
  private createEditMenu(modifier: string): Electron.MenuItemConstructorOptions {
    return {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: `${modifier}+Z`,
          enabled: this.menuState.canUndo,
          click: () => this.sendCommand('edit:undo')
        },
        {
          label: 'Redo',
          accelerator: process.platform === 'darwin' ? 'Cmd+Shift+Z' : 'Ctrl+Y',
          enabled: this.menuState.canRedo,
          click: () => this.sendCommand('edit:redo')
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: `${modifier}+X`,
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: `${modifier}+C`,
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: `${modifier}+V`,
          role: 'paste'
        },
        { type: 'separator' },
        {
          label: 'Select All',
          accelerator: `${modifier}+A`,
          role: 'selectAll'
        }
      ]
    };
  }

  /**
   * Create View menu
   */
  private createViewMenu(modifier: string): Electron.MenuItemConstructorOptions {
    const submenu: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Zoom In',
        accelerator: `${modifier}+=`,
        click: () => this.sendCommand('view:zoom-in')
      },
      {
        label: 'Zoom Out',
        accelerator: `${modifier}+-`,
        click: () => this.sendCommand('view:zoom-out')
      },
      {
        label: 'Reset Zoom',
        accelerator: `${modifier}+0`,
        click: () => this.sendCommand('view:zoom-reset')
      },
      { type: 'separator' },
      {
        label: 'Toggle Fullscreen',
        accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
        click: () => this.sendCommand('view:fullscreen')
      }
    ];

    // Developer tools in development mode or if enabled
    if (this.config.developmentMode) {
      submenu.push(
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => this.sendCommand('view:dev-tools')
        },
        { role: 'reload' },
        { role: 'forceReload' }
      );
    }

    return {
      label: 'View',
      submenu
    };
  }

  /**
   * Create Unit menu
   */
  private createUnitMenu(modifier: string): Electron.MenuItemConstructorOptions {
    return {
      label: 'Unit',
      submenu: [
        {
          label: 'New Unit...',
          accelerator: `${modifier}+Shift+N`,
          click: () => this.sendCommand('unit:new')
        },
        {
          label: 'Duplicate Unit',
          accelerator: `${modifier}+D`,
          enabled: this.menuState.hasUnit,
          click: () => this.sendCommand('unit:duplicate')
        },
        { type: 'separator' },
        {
          label: 'Delete Unit',
          enabled: this.menuState.hasUnit,
          click: () => this.sendCommand('unit:delete')
        },
        { type: 'separator' },
        {
          label: 'Unit Properties...',
          enabled: this.menuState.hasUnit,
          click: () => this.sendCommand('unit:properties')
        }
      ]
    };
  }

  /**
   * Create Window menu (macOS)
   */
  private createWindowMenu(): Electron.MenuItemConstructorOptions {
    return {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ]
    };
  }

  /**
   * Create Help menu
   */
  private createHelpMenu(isMac: boolean): Electron.MenuItemConstructorOptions {
    const submenu: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Documentation',
        click: () => this.sendCommand('help:documentation')
      },
      {
        label: 'Report Issue...',
        click: () => this.sendCommand('help:report-issue')
      },
      { type: 'separator' },
      {
        label: 'Check for Updates...',
        click: () => this.sendCommand('help:check-updates')
      }
    ];

    // On Windows/Linux, add About to Help menu
    if (!isMac) {
      submenu.push(
        { type: 'separator' },
        {
          label: 'About BattleTech Editor',
          click: () => this.sendCommand('help:about')
        }
      );
    }

    return {
      label: 'Help',
      submenu
    };
  }

  /**
   * Send a menu command
   */
  private sendCommand(command: MenuCommand, ...args: unknown[]): void {
    this.config.onMenuCommand(command, ...args);
  }
}

export type { IMenuManagerConfig, IMenuState };
