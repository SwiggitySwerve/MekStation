const mockQuit = jest.fn();
const mockOpenExternal = jest.fn();
const mockSetLoginItemSettings = jest.fn();
const mockShowMessageBox = jest.fn();

jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn(() => '0.0.0-test'),
    quit: mockQuit,
    setLoginItemSettings: mockSetLoginItemSettings,
  },
  BrowserWindow: jest.fn(),
  dialog: {
    showMessageBox: mockShowMessageBox,
  },
  shell: {
    openExternal: mockOpenExternal,
  },
}));

import {
  APP_IPC_CHANNELS,
  MENU_IPC_CHANNELS,
  SETTINGS_IPC_CHANNELS,
} from '../../types/BaseTypes';
import { handleMenuCommand, handleSettingsChange } from '../main.behavior';

function menuContext(overrides: Record<string, unknown> = {}) {
  return {
    args: [],
    checkForUpdates: jest.fn(async () => undefined),
    command: 'file:quit',
    mainWindow: null,
    menuManager: null,
    recentFilesService: null,
    sendToRenderer: jest.fn(),
    showAboutDialog: jest.fn(),
    ...overrides,
  } as never;
}

describe('desktop main behavior dispatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards every menu command to the renderer before local handling', () => {
    const sendToRenderer = jest.fn();

    handleMenuCommand(
      menuContext({
        args: ['payload'],
        command: 'file:preferences',
        sendToRenderer,
      }),
    );

    expect(sendToRenderer).toHaveBeenCalledWith(
      MENU_IPC_CHANNELS.COMMAND,
      'file:preferences',
      'payload',
    );
    expect(sendToRenderer).toHaveBeenCalledWith(APP_IPC_CHANNELS.OPEN_SETTINGS);
  });

  it('runs local side effects for supported menu commands', () => {
    const menuManager = { updateRecentFiles: jest.fn() };
    const recentFilesService = { clear: jest.fn() };
    const mainWindow = {
      isFullScreen: jest.fn(() => false),
      setFullScreen: jest.fn(),
      webContents: { toggleDevTools: jest.fn() },
    };
    const checkForUpdates = jest.fn(async () => undefined);
    const showAboutDialog = jest.fn();

    handleMenuCommand(
      menuContext({
        command: 'file:clear-recent',
        menuManager,
        recentFilesService,
      }),
    );
    handleMenuCommand(menuContext({ command: 'view:fullscreen', mainWindow }));
    handleMenuCommand(menuContext({ command: 'view:dev-tools', mainWindow }));
    handleMenuCommand(
      menuContext({ command: 'help:check-updates', checkForUpdates }),
    );
    handleMenuCommand(menuContext({ command: 'help:about', showAboutDialog }));

    expect(recentFilesService.clear).toHaveBeenCalled();
    expect(menuManager.updateRecentFiles).toHaveBeenCalledWith([]);
    expect(mainWindow.setFullScreen).toHaveBeenCalledWith(true);
    expect(mainWindow.webContents.toggleDevTools).toHaveBeenCalled();
    expect(checkForUpdates).toHaveBeenCalled();
    expect(showAboutDialog).toHaveBeenCalled();
  });

  it('opens known help links externally', () => {
    handleMenuCommand(menuContext({ command: 'help:documentation' }));
    handleMenuCommand(menuContext({ command: 'help:report-issue' }));

    expect(mockOpenExternal).toHaveBeenCalledWith(
      'https://github.com/SwiggitySwerve/MekStation/wiki',
    );
    expect(mockOpenExternal).toHaveBeenCalledWith(
      'https://github.com/SwiggitySwerve/MekStation/issues/new',
    );
  });

  it('applies settings side effects and notifies the renderer', () => {
    const recentFilesService = { setMaxRecentFiles: jest.fn() };
    const sendToRenderer = jest.fn();
    const event = {
      key: 'maxRecentFiles',
      oldValue: 15,
      newValue: 25,
    } as const;

    handleSettingsChange({
      event,
      recentFilesService: recentFilesService as never,
      sendToRenderer,
      settingsService: null,
    });

    expect(recentFilesService.setMaxRecentFiles).toHaveBeenCalledWith(25);
    expect(sendToRenderer).toHaveBeenCalledWith(
      SETTINGS_IPC_CHANNELS.ON_CHANGE,
      event,
    );
  });

  it('still notifies the renderer for settings without local side effects', () => {
    const sendToRenderer = jest.fn();
    const event = {
      key: 'enableAutoBackup',
      oldValue: false,
      newValue: true,
    } as const;

    handleSettingsChange({
      event,
      recentFilesService: null,
      sendToRenderer,
      settingsService: null,
    });

    expect(sendToRenderer).toHaveBeenCalledWith(
      SETTINGS_IPC_CHANNELS.ON_CHANGE,
      event,
    );
  });
});
