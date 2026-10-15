import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import React from 'react';

import type { TabContentProps } from '../DesktopSettingsDialog.tabs';
import type {
  IDesktopSettings,
  IElectronAPI,
  IServiceResult,
} from '../useElectron';

import { AdvancedTab } from '../DesktopSettingsDialog.tabs';
const mockCacheApprovals: Array<() => unknown> = [];
const mockCacheDismissals: Array<() => unknown> = [];
jest.mock('@/components/ui', () => {
  const actual =
    jest.requireActual<typeof import('@/components/ui')>('@/components/ui');
  return {
    ...actual,
    Button: (props: React.ComponentProps<typeof actual.Button>) => {
      if (props.onClick) {
        const handler = props.onClick;
        if (props.children === 'Clear cache')
          mockCacheApprovals.push(() => Reflect.apply(handler, undefined, []));
        if (props.children === 'Cancel')
          mockCacheDismissals.push(() => Reflect.apply(handler, undefined, []));
      }
      return <actual.Button {...props} />;
    },
  };
});

describe('displayed cache decision identity', () => {
  it('refuses retained approval after API replacement and leaves its new decision untouched', async () => {
    const currentService = jest
      .fn<Promise<IServiceResult>, [string]>()
      .mockResolvedValue({ success: true });
    const currentApi: IElectronAPI = { ...api, serviceCall: currentService };
    const view = render(<AdvancedTab {...props} />);
    open();
    const oldApprove = mockCacheApprovals.at(-1);
    if (!oldApprove) throw new Error('Displayed approval missing');
    view.rerender(<AdvancedTab {...props} api={currentApi} />);
    open();
    const currentApprove = mockCacheApprovals.at(-1);
    if (!currentApprove) throw new Error('Replacement approval missing');
    await act(async () => {
      await oldApprove();
    });
    expect(mockService).not.toHaveBeenCalled();
    expect(currentService).not.toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: 'Clear application cache?' }),
    ).toBeInTheDocument();
    await act(async () => {
      await currentApprove();
      await currentApprove();
    });
    expect(currentService).toHaveBeenCalledTimes(1);
    expect(mockService).not.toHaveBeenCalled();
  });
  it('refuses an old approval and dismissal after Cancel then a fresh same-API decision', async () => {
    render(<AdvancedTab {...props} />);
    const first = open();
    const oldApprove = mockCacheApprovals.at(-1);
    const oldDismiss = mockCacheDismissals.at(-1);
    if (!oldApprove || !oldDismiss)
      throw new Error('Displayed callbacks missing');
    fireEvent.click(within(first).getByRole('button', { name: 'Cancel' }));
    open();
    await act(async () => {
      await oldApprove();
      oldDismiss();
    });
    expect(mockService).not.toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: 'Clear application cache?' }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Clear application cache?' }),
      ).getByRole('button', { name: 'Clear cache' }),
    );
    await screen.findByText('Cache cleared successfully.');
    expect(mockService).toHaveBeenCalledTimes(1);
  });
});

const settings: IDesktopSettings = {
  version: 1,
  launchAtLogin: false,
  startMinimized: false,
  reopenLastUnit: false,
  defaultSaveDirectory: '',
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
  backupDirectory: '',
  checkForUpdatesAutomatically: true,
  updateChannel: 'stable',
  maxRecentFiles: 15,
  dataDirectory: '',
  enableDevTools: false,
};

const mockService = jest.fn<Promise<IServiceResult>, [string]>();
// Every public API entry is a mock; only serviceCall is exercised here.
const api: IElectronAPI = {
  getAppInfo: jest.fn(),
  minimizeWindow: jest.fn(),
  maximizeWindow: jest.fn(),
  closeWindow: jest.fn(),
  saveFile: jest.fn(),
  openFile: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  selectDirectory: jest.fn(),
  getSettings: jest.fn(),
  setSettings: jest.fn(),
  resetSettings: jest.fn(),
  getSettingValue: jest.fn(),
  onSettingsChange: jest.fn(),
  getRecentFiles: jest.fn(),
  addRecentFile: jest.fn(),
  removeRecentFile: jest.fn(),
  clearRecentFiles: jest.fn(),
  onRecentFilesUpdate: jest.fn(),
  updateMenuState: jest.fn(),
  onMenuCommand: jest.fn(),
  serviceCall: mockService,
  createBackup: jest.fn(),
  restoreBackup: jest.fn(),
  onAutoSaveTrigger: jest.fn(),
  onImportUnitFile: jest.fn(),
  onImportUnitUrl: jest.fn(),
  onOpenUnit: jest.fn(),
  onCreateNewUnit: jest.fn(),
  onOpenSettings: jest.fn(),
  removeAllListeners: jest.fn(),
};
const props: TabContentProps = {
  localSettings: settings,
  updateLocalSetting: jest.fn(),
  handleSelectDirectory: jest.fn(),
  handleReset: jest.fn(),
  api,
};
const show = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const close = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});
afterAll(() => {
  for (const [key, descriptor] of [
    ['showModal', show],
    ['close', close],
  ] as const) {
    if (descriptor)
      Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});
afterEach(() => {
  cleanup();
  try {
    expect(window.confirm).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
  } finally {
    jest.restoreAllMocks();
  }
});
function deferred() {
  let resolve!: (result: IServiceResult) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<IServiceResult>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCacheApprovals.length = 0;
  mockCacheDismissals.length = 0;
  mockService.mockResolvedValue({ success: true });
  jest.spyOn(window, 'confirm').mockReturnValue(false);
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});
function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Clear Cache' }));
  return screen.getByRole('dialog', { name: 'Clear application cache?' });
}
describe('Desktop cache feedback', () => {
  it.each(['Cancel', 'Escape'])('%s leaves cache untouched', (action) => {
    render(<AdvancedTab {...props} />);
    const dialog = open();
    expect(mockService).not.toHaveBeenCalled();
    if (action === 'Escape')
      fireEvent(dialog, new Event('cancel', { cancelable: true }));
    else
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockService).not.toHaveBeenCalled();
  });
  it('waits for actual success and consumes approval once', async () => {
    const pending = deferred();
    mockService.mockReturnValue(pending.promise);
    render(<AdvancedTab {...props} />);
    const approve = within(open()).getByRole('button', { name: 'Clear cache' });
    act(() => {
      approve.click();
      approve.click();
    });
    expect(mockService).toHaveBeenCalledTimes(1);
    expect(mockService).toHaveBeenCalledWith('clearCache');
    expect(screen.getByRole('status')).toHaveTextContent('Clearing cache');
    expect(
      screen.queryByText('Cache cleared successfully.'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Cache' })).toBeDisabled();
    await act(async () => {
      pending.resolve({ success: true });
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Cache cleared successfully',
    );
    expect(screen.getByRole('button', { name: 'Clear Cache' })).toBeEnabled();
  });
  it.each(['false', 'reject'])(
    'reports %s failure and allows a fresh retry',
    async (kind) => {
      const pending = deferred();
      mockService.mockReturnValueOnce(pending.promise);
      render(<AdvancedTab {...props} />);
      fireEvent.click(
        within(open()).getByRole('button', { name: 'Clear cache' }),
      );
      await act(async () => {
        if (kind === 'false')
          pending.resolve({ success: false, error: 'Cache denied' });
        else pending.reject(new Error('Cache denied'));
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Cache denied');
      expect(
        screen.queryByText('Cache cleared successfully.'),
      ).not.toBeInTheDocument();
      fireEvent.click(
        within(open()).getByRole('button', { name: 'Clear cache' }),
      );
      await screen.findByText('Cache cleared successfully.');
      expect(mockService).toHaveBeenCalledTimes(2);
    },
  );
  it('disables clearing when Electron API is unavailable', () => {
    render(<AdvancedTab {...props} api={null} />);
    expect(screen.getByRole('button', { name: 'Clear Cache' })).toBeDisabled();
    expect(screen.getByText(/desktop application/i)).toBeInTheDocument();
    expect(mockService).not.toHaveBeenCalled();
  });
  it('invalidates approval and ignores completion when API identity changes', async () => {
    const pending = deferred();
    mockService.mockReturnValue(pending.promise);
    const view = render(<AdvancedTab {...props} />);
    open();
    view.rerender(<AdvancedTab {...props} api={{ ...api }} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockService).not.toHaveBeenCalled();
    fireEvent.click(
      within(open()).getByRole('button', { name: 'Clear cache' }),
    );
    view.rerender(<AdvancedTab {...props} api={api} />);
    await act(async () => {
      pending.resolve({ success: true });
    });
    expect(
      screen.queryByText('Cache cleared successfully.'),
    ).not.toBeInTheDocument();
  });
  it('does not retain approval or async outcome across tab unmount', async () => {
    const pending = deferred();
    mockService.mockReturnValue(pending.promise);
    const view = render(<AdvancedTab {...props} />);
    fireEvent.click(
      within(open()).getByRole('button', { name: 'Clear cache' }),
    );
    view.unmount();
    render(<AdvancedTab {...props} />);
    await act(async () => {
      pending.resolve({ success: true });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Cache cleared successfully.'),
    ).not.toBeInTheDocument();
  });
});
