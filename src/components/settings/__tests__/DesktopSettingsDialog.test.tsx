import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import React from 'react';

import type {
  IDesktopSettings,
  IServiceResult,
  ISettingsChangeEvent,
} from '../useElectron';

import { DesktopSettingsDialog } from '../DesktopSettingsDialog';
import { useDesktopSettingsDialogState } from '../DesktopSettingsDialog.state';
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

const mockReset = jest.fn<Promise<IServiceResult>, []>();
const mockUpdate = jest.fn<
  Promise<IServiceResult>,
  [Partial<IDesktopSettings>, (() => boolean)?]
>();
let mockSettings = settings;
let mockApi = {};
let mockResetOwner = mockReset;
let mockUseActualSettings = false;
jest.mock('../useElectron', () => ({ useElectron: () => mockApi }));
jest.mock('../useDesktopSettings', () => ({
  useDesktopSettings: () =>
    mockUseActualSettings
      ? jest
          .requireActual<typeof import('../useDesktopSettings')>(
            '../useDesktopSettings',
          )
          .useDesktopSettings()
      : {
          settings: mockSettings,
          isLoading: false,
          updateSettings: mockUpdate,
          resetSettings: mockResetOwner,
          isElectron: true,
        },
}));
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

describe('displayed desktop decision identity', () => {
  it.each([
    { oldAction: 'reset', newAction: 'reset' },
    { oldAction: 'reset', newAction: 'discard' },
    { oldAction: 'discard', newAction: 'reset' },
    { oldAction: 'discard', newAction: 'discard' },
  ] as const)(
    'refuses retained $oldAction approval after reopening with a new $newAction decision',
    async ({ oldAction, newAction }) => {
      const oldOwner = jest
        .fn<Promise<IServiceResult>, []>()
        .mockResolvedValue({ success: true });
      const newOwner = jest
        .fn<Promise<IServiceResult>, []>()
        .mockResolvedValue({ success: true });
      const oldClose = jest.fn();
      const newClose = jest.fn();
      mockResetOwner = oldOwner;
      const view = renderHook(useDesktopSettingsDialogState, {
        initialProps: { isOpen: true, onClose: oldClose },
      });
      const request = async (action: 'reset' | 'discard') => {
        await act(async () => {
          if (action === 'reset') await view.result.current.handleReset();
          else {
            view.result.current.updateLocalSetting('launchAtLogin', true);
          }
        });
        if (action === 'discard') act(() => view.result.current.handleClose());
      };
      await request(oldAction);
      const oldApprove = view.result.current.approveDecision;
      view.rerender({ isOpen: false, onClose: oldClose });
      mockApi = {};
      mockResetOwner = newOwner;
      view.rerender({ isOpen: true, onClose: newClose });
      await request(newAction);
      const replacement = view.result.current.decision;
      const currentApprove = view.result.current.approveDecision;
      await act(async () => {
        await oldApprove();
      });
      expect(oldOwner).not.toHaveBeenCalled();
      expect(newOwner).not.toHaveBeenCalled();
      expect(oldClose).not.toHaveBeenCalled();
      expect(newClose).not.toHaveBeenCalled();
      expect(view.result.current.decision).toBe(replacement);
      await act(async () => {
        await currentApprove();
        await currentApprove();
      });
      expect(newAction === 'reset' ? newOwner : newClose).toHaveBeenCalledTimes(
        1,
      );
      expect(
        newAction === 'reset' ? newClose : newOwner,
      ).not.toHaveBeenCalled();
      expect(oldOwner).not.toHaveBeenCalled();
      expect(oldClose).not.toHaveBeenCalled();
    },
  );
  it('refuses an old approval after a newer draft decision without consuming it', async () => {
    const view = renderHook(useDesktopSettingsDialogState, {
      initialProps: { isOpen: true, onClose: jest.fn() },
    });
    await act(async () => {
      await view.result.current.handleReset();
    });
    const oldApprove = view.result.current.approveDecision;
    act(() => {
      view.result.current.dismissDecision();
      view.result.current.updateLocalSetting('launchAtLogin', true);
    });
    await act(async () => {
      await view.result.current.handleReset();
    });
    const replacement = view.result.current.decision;
    await act(async () => {
      await oldApprove();
    });
    expect(mockReset).not.toHaveBeenCalled();
    expect(view.result.current.decision).toBe(replacement);
    await act(async () => {
      await view.result.current.approveDecision();
    });
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
  it.each(['reset', 'discard'] as const)(
    'uses current committed callbacks for unchanged %s admission',
    async (action) => {
      const oldOwner = jest
        .fn<Promise<IServiceResult>, []>()
        .mockResolvedValue({ success: true });
      const currentOwner = jest
        .fn<Promise<IServiceResult>, []>()
        .mockResolvedValue({ success: true });
      const oldClose = jest.fn();
      const currentClose = jest.fn();
      mockResetOwner = oldOwner;
      const view = renderHook(useDesktopSettingsDialogState, {
        initialProps: { isOpen: true, onClose: oldClose },
      });
      await act(async () => {
        if (action === 'reset') await view.result.current.handleReset();
        else {
          view.result.current.updateLocalSetting('launchAtLogin', true);
        }
      });
      if (action === 'discard') act(() => view.result.current.handleClose());
      const displayedApprove = view.result.current.approveDecision;
      mockResetOwner = currentOwner;
      view.rerender({ isOpen: true, onClose: currentClose });
      await act(async () => {
        await displayedApprove();
      });
      expect(
        action === 'reset' ? currentOwner : currentClose,
      ).toHaveBeenCalledTimes(1);
      expect(oldOwner).not.toHaveBeenCalled();
      expect(oldClose).not.toHaveBeenCalled();
    },
  );
  it('does not let an old dismissal consume a newer decision', async () => {
    const view = renderHook(useDesktopSettingsDialogState, {
      initialProps: { isOpen: true, onClose: jest.fn() },
    });
    await act(async () => {
      await view.result.current.handleReset();
    });
    const oldDismiss = view.result.current.dismissDecision;
    act(() => view.result.current.dismissDecision());
    await act(async () => {
      await view.result.current.handleReset();
    });
    const replacement = view.result.current.decision;
    act(() => oldDismiss());
    expect(view.result.current.decision).toBe(replacement);
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
  mockUseActualSettings = false;
  mockResetOwner = mockReset;
  mockSettings = settings;
  mockApi = {};
  mockReset.mockReset().mockResolvedValue({ success: true });
  mockUpdate.mockReset().mockResolvedValue({ success: true });
  jest.spyOn(window, 'confirm').mockReturnValue(false);
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('desktop settings Save and Apply ownership', () => {
  function editedDialog() {
    const onClose = jest.fn();
    const view = renderHook(useDesktopSettingsDialogState, {
      initialProps: { isOpen: true, onClose },
    });
    act(() => view.result.current.updateLocalSetting('launchAtLogin', true));
    return { view, onClose };
  }

  it.each(['handleSave', 'handleApply'] as const)(
    '%s admits one write before a render',
    async (action) => {
      const pending = deferred();
      mockUpdate.mockReturnValue(pending.promise);
      const { view, onClose } = editedDialog();
      let first!: Promise<void>;
      act(() => {
        first = view.result.current[action]();
        void view.result.current.handleSave();
        void view.result.current.handleApply();
        view.result.current.handleClose();
        void view.result.current.handleReset();
      });
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        { launchAtLogin: true },
        expect.any(Function),
      );
      expect(view.result.current.isSaving).toBe(true);
      expect(view.result.current.decision).toBeNull();
      await act(async () => {
        pending.resolve({ success: true });
        await first;
      });
      expect(view.result.current.hasChanges).toBe(false);
      expect(view.result.current.isSaving).toBe(false);
      expect(onClose).toHaveBeenCalledTimes(action === 'handleSave' ? 1 : 0);
    },
  );

  it.each(['reopen', 'api', 'unmount'] as const)(
    'ignores a save completion after %s',
    async (change) => {
      const pending = deferred();
      mockUpdate.mockReturnValue(pending.promise);
      const { view, onClose } = editedDialog();
      let save!: Promise<void>;
      act(() => {
        save = view.result.current.handleSave();
      });
      if (change === 'unmount') view.unmount();
      else {
        if (change === 'reopen') view.rerender({ isOpen: false, onClose });
        else mockApi = {};
        view.rerender({ isOpen: true, onClose });
        act(() =>
          view.result.current.updateLocalSetting('startMinimized', true),
        );
      }
      await act(async () => {
        pending.resolve({ success: true });
        await save;
      });
      expect(onClose).not.toHaveBeenCalled();
      if (change !== 'unmount') {
        expect(view.result.current.hasChanges).toBe(true);
        expect(view.result.current.localSettings?.startMinimized).toBe(true);
      }
    },
  );

  it('does not let old completion release a newer save', async () => {
    const old = deferred();
    const current = deferred();
    mockUpdate
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise);
    const { view, onClose } = editedDialog();
    let oldSave!: Promise<void>;
    let currentSave!: Promise<void>;
    act(() => {
      oldSave = view.result.current.handleSave();
    });
    view.rerender({ isOpen: false, onClose });
    view.rerender({ isOpen: true, onClose });
    act(() => view.result.current.updateLocalSetting('startMinimized', true));
    act(() => {
      currentSave = view.result.current.handleApply();
    });
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    await act(async () => {
      old.resolve({ success: true });
      await oldSave;
    });
    expect(view.result.current.isSaving).toBe(true);
    expect(view.result.current.hasChanges).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => {
      current.resolve({ success: true });
      await currentSave;
    });
    expect(view.result.current.isSaving).toBe(false);
    expect(view.result.current.hasChanges).toBe(false);
  });

  it('preserves newer edits and incoming main settings, and writes only unsaved keys', async () => {
    const pending = deferred();
    mockUpdate.mockReturnValueOnce(pending.promise);
    const { view, onClose } = editedDialog();
    mockSettings = {
      ...settings,
      windowBounds: { ...settings.windowBounds, x: 450 },
    };
    view.rerender({ isOpen: true, onClose });
    expect(view.result.current.localSettings?.launchAtLogin).toBe(true);
    expect(view.result.current.localSettings?.windowBounds.x).toBe(450);
    expect(view.result.current.hasChanges).toBe(true);
    let save!: Promise<void>;
    act(() => {
      save = view.result.current.handleSave();
    });
    act(() => view.result.current.updateLocalSetting('startMinimized', true));
    await act(async () => {
      pending.resolve({ success: true });
      await save;
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(view.result.current.hasChanges).toBe(true);
    expect(view.result.current.localSettings?.startMinimized).toBe(true);
    await act(async () => {
      await view.result.current.handleApply();
    });
    expect(mockUpdate).toHaveBeenLastCalledWith(
      { startMinimized: true },
      expect.any(Function),
    );
    expect(view.result.current.hasChanges).toBe(false);
  });

  it('treats a reverted edit as clean without a write', async () => {
    const { view } = editedDialog();
    act(() => view.result.current.updateLocalSetting('launchAtLogin', false));
    expect(view.result.current.hasChanges).toBe(false);
    await act(async () => {
      await view.result.current.handleApply();
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('keeps a same-key reversal made during a pending write', async () => {
    const pending = deferred();
    mockUpdate.mockReturnValueOnce(pending.promise);
    const { view, onClose } = editedDialog();
    let save!: Promise<void>;
    act(() => {
      save = view.result.current.handleSave();
    });
    act(() => view.result.current.updateLocalSetting('launchAtLogin', false));
    await act(async () => {
      pending.resolve({ success: true });
      await save;
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(view.result.current.hasChanges).toBe(true);
    expect(view.result.current.localSettings?.launchAtLogin).toBe(false);
    await act(async () => {
      await view.result.current.handleApply();
    });
    expect(mockUpdate).toHaveBeenLastCalledWith(
      { launchAtLogin: false },
      expect.any(Function),
    );
  });

  it.each(['false', 'reject'] as const)(
    'retains a failed %s draft and allows retry',
    async (failure) => {
      const pending = deferred();
      mockUpdate.mockReturnValueOnce(pending.promise);
      const { view, onClose } = editedDialog();
      let save!: Promise<void>;
      act(() => {
        save = view.result.current.handleSave();
      });
      await act(async () => {
        if (failure === 'false')
          pending.resolve({ success: false, error: 'Save denied' });
        else pending.reject(new Error('Save denied'));
        await save;
      });
      expect(view.result.current.hasChanges).toBe(true);
      expect(view.result.current.isSaving).toBe(false);
      expect(onClose).not.toHaveBeenCalled();
      await act(async () => {
        await view.result.current.handleSave();
      });
      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  it('preserves a real-hook draft across settings events and save echoes', async () => {
    mockUseActualSettings = true;
    const pending = deferred();
    let listener!: (event: ISettingsChangeEvent) => void;
    const setSettings = jest
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue({ success: true });
    mockApi = {
      getSettings: jest.fn().mockResolvedValue(settings),
      setSettings,
      onSettingsChange: (next: typeof listener) => {
        listener = next;
      },
      removeAllListeners: jest.fn(),
    };
    const onClose = jest.fn();
    const view = renderHook(useDesktopSettingsDialogState, {
      initialProps: { isOpen: true, onClose },
    });
    await act(async () => {});
    act(() => view.result.current.updateLocalSetting('launchAtLogin', true));
    act(() =>
      listener({
        key: 'windowBounds',
        oldValue: settings.windowBounds,
        newValue: { ...settings.windowBounds, x: 450 },
      }),
    );
    expect(view.result.current.hasChanges).toBe(true);
    expect(view.result.current.localSettings?.launchAtLogin).toBe(true);
    let save!: Promise<void>;
    act(() => {
      save = view.result.current.handleSave();
    });
    act(() => view.result.current.updateLocalSetting('startMinimized', true));
    act(() =>
      listener({ key: 'launchAtLogin', oldValue: false, newValue: true }),
    );
    await act(async () => {
      pending.resolve({ success: true });
      await save;
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(view.result.current.hasChanges).toBe(true);
    expect(view.result.current.localSettings?.windowBounds.x).toBe(450);
    await act(async () => {
      await view.result.current.handleApply();
    });
    expect(setSettings.mock.calls).toEqual([
      [{ launchAtLogin: true }],
      [{ startMinimized: true }],
    ]);
    expect(view.result.current.hasChanges).toBe(false);
  });

  it('replaces an edited draft with defaults after a real-hook reset', async () => {
    mockUseActualSettings = true;
    mockApi = {
      getSettings: jest.fn().mockImplementation(async () => ({ ...settings })),
      resetSettings: jest.fn().mockResolvedValue({ success: true }),
      onSettingsChange: jest.fn(),
      removeAllListeners: jest.fn(),
    };
    const view = renderHook(useDesktopSettingsDialogState, {
      initialProps: { isOpen: true, onClose: jest.fn() },
    });
    await act(async () => {});
    act(() => view.result.current.updateLocalSetting('launchAtLogin', true));
    await act(async () => {
      await view.result.current.handleReset();
    });
    await act(async () => {
      await view.result.current.approveDecision();
    });
    expect(view.result.current.hasChanges).toBe(false);
    expect(view.result.current.localSettings?.launchAtLogin).toBe(false);
  });

  it('does not publish an old save acknowledgement over a newer session Apply', async () => {
    mockUseActualSettings = true;
    const old = deferred();
    let listener!: (event: ISettingsChangeEvent) => void;
    const setSettings = jest
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValue({ success: true });
    mockApi = {
      getSettings: jest.fn().mockResolvedValue(settings),
      setSettings,
      onSettingsChange: (next: typeof listener) => {
        listener = next;
      },
      removeAllListeners: jest.fn(),
    };
    const onClose = jest.fn();
    const view = renderHook(useDesktopSettingsDialogState, {
      initialProps: { isOpen: true, onClose },
    });
    await act(async () => {});
    act(() => view.result.current.updateLocalSetting('launchAtLogin', true));
    let oldSave!: Promise<void>;
    act(() => {
      oldSave = view.result.current.handleSave();
    });
    view.rerender({ isOpen: false, onClose });
    view.rerender({ isOpen: true, onClose });
    act(() =>
      listener({ key: 'launchAtLogin', oldValue: false, newValue: true }),
    );
    act(() => view.result.current.updateLocalSetting('launchAtLogin', false));
    await act(async () => {
      await view.result.current.handleApply();
    });
    expect(view.result.current.localSettings?.launchAtLogin).toBe(false);
    await act(async () => {
      old.resolve({ success: true });
      await oldSave;
    });
    expect(view.result.current.localSettings?.launchAtLogin).toBe(false);
    expect(view.result.current.hasChanges).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    expect(setSettings.mock.calls).toEqual([
      [{ launchAtLogin: true }],
      [{ launchAtLogin: false }],
    ]);
  });

  it('accepts reset defaults published before the reset acknowledgement', async () => {
    const pending = deferred();
    mockReset.mockReturnValue(pending.promise);
    const { view, onClose } = editedDialog();
    await act(async () => {
      await view.result.current.handleReset();
    });
    let reset!: Promise<void>;
    act(() => {
      reset = view.result.current.approveDecision();
    });
    mockSettings = { ...settings };
    view.rerender({ isOpen: true, onClose });
    await act(async () => {
      pending.resolve({ success: true });
      await reset;
    });
    expect(view.result.current.hasChanges).toBe(false);
    expect(view.result.current.localSettings?.launchAtLogin).toBe(false);
  });

  it.each(['success', 'failure', 'reject'] as const)(
    'ignores obsolete API %s publication in the settings hook',
    async (outcome) => {
      mockUseActualSettings = true;
      const pending = deferred();
      const actual = jest.requireActual<typeof import('../useDesktopSettings')>(
        '../useDesktopSettings',
      );
      const createApi = () => ({
        getSettings: jest.fn().mockResolvedValue(settings),
        setSettings: jest.fn().mockReturnValue(pending.promise),
        onSettingsChange: jest.fn(),
        removeAllListeners: jest.fn(),
      });
      mockApi = createApi();
      const view = renderHook(actual.useDesktopSettings);
      await act(async () => {});
      let save!: Promise<IServiceResult>;
      act(() => {
        save = view.result.current.updateSettings({ launchAtLogin: true });
      });
      mockApi = createApi();
      view.rerender();
      await act(async () => {});
      await act(async () => {
        if (outcome === 'reject') pending.reject(new Error('Old failure'));
        else
          pending.resolve(
            outcome === 'success'
              ? { success: true }
              : { success: false, error: 'Old failure' },
          );
        await save;
      });
      expect(view.result.current.settings.launchAtLogin).toBe(false);
      expect(view.result.current.error).toBeNull();
    },
  );
});
function resetDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset All Settings' }));
  return screen.getByRole('dialog', { name: 'Reset desktop settings?' });
}
describe('Desktop settings in-app decisions', () => {
  it.each(['Cancel', 'Escape'])(
    '%s cancels nested reset without closing parent',
    (action) => {
      const onClose = jest.fn();
      render(<DesktopSettingsDialog isOpen onClose={onClose} />);
      const dialog = resetDialog();
      expect(dialog.tagName).toBe('DIALOG');
      expect(mockReset).not.toHaveBeenCalled();
      if (action === 'Escape')
        fireEvent(dialog, new Event('cancel', { cancelable: true }));
      else
        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      expect(
        screen.queryByRole('dialog', { name: 'Reset desktop settings?' }),
      ).not.toBeInTheDocument();
      expect(screen.getByText('Preferences')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      expect(document.body.style.overflow).toBe('hidden');
    },
  );
  it('keeps an edited draft on cancellation and discards once only after approval', () => {
    const onClose = jest.fn();
    render(<DesktopSettingsDialog isOpen onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Launch at login'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const child = screen.getByRole('dialog', {
      name: 'Discard unsaved changes?',
    });
    fireEvent.click(
      within(child).getByRole('button', { name: 'Keep editing' }),
    );
    expect(screen.getByLabelText('Launch at login')).toBeChecked();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const discard = within(
      screen.getByRole('dialog', { name: 'Discard unsaved changes?' }),
    ).getByRole('button', { name: 'Discard changes' });
    act(() => {
      discard.click();
      discard.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
  });
  it('closes a clean dialog immediately without a confirmation', () => {
    const onClose = jest.fn();
    render(<DesktopSettingsDialog isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('dialog', { name: /Discard/ }),
    ).not.toBeInTheDocument();
  });
  it('consumes reset once, blocks conflicting edits and reports only actual success', async () => {
    const pending = deferred();
    mockReset.mockReturnValue(pending.promise);
    render(<DesktopSettingsDialog isOpen onClose={jest.fn()} />);
    const reset = within(resetDialog()).getByRole('button', {
      name: 'Reset settings',
    });
    act(() => {
      reset.click();
      reset.click();
    });
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Resetting settings');
    expect(
      screen.getByRole('button', { name: 'Reset All Settings' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'General' }));
    expect(screen.getByLabelText('Launch at login')).toBeDisabled();
    await act(async () => {
      pending.resolve({ success: true });
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Settings reset successfully',
    );
  });
  it.each(['false', 'reject'])(
    'shows %s reset failure without closing or claiming success',
    async (kind) => {
      const pending = deferred();
      mockReset.mockReturnValue(pending.promise);
      const onClose = jest.fn();
      render(<DesktopSettingsDialog isOpen onClose={onClose} />);
      fireEvent.click(
        within(resetDialog()).getByRole('button', { name: 'Reset settings' }),
      );
      await act(async () => {
        if (kind === 'false')
          pending.resolve({ success: false, error: 'Reset denied' });
        else pending.reject(new Error('Reset denied'));
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Reset denied');
      expect(onClose).not.toHaveBeenCalled();
      expect(
        screen.queryByText('Settings reset successfully.'),
      ).not.toBeInTheDocument();
    },
  );
  it('invalidates approval when the settings snapshot changes', () => {
    const view = render(<DesktopSettingsDialog isOpen onClose={jest.fn()} />);
    resetDialog();
    mockSettings = { ...settings, launchAtLogin: true };
    view.rerender(<DesktopSettingsDialog isOpen onClose={jest.fn()} />);
    expect(
      screen.queryByRole('dialog', { name: 'Reset desktop settings?' }),
    ).not.toBeInTheDocument();
    expect(mockReset).not.toHaveBeenCalled();
  });
  it('invalidates pending approval on close/reopen and API identity change', () => {
    const onClose = jest.fn();
    const view = render(<DesktopSettingsDialog isOpen onClose={onClose} />);
    resetDialog();
    view.rerender(<DesktopSettingsDialog isOpen={false} onClose={onClose} />);
    view.rerender(<DesktopSettingsDialog isOpen onClose={onClose} />);
    expect(
      screen.queryByRole('dialog', { name: 'Reset desktop settings?' }),
    ).not.toBeInTheDocument();
    resetDialog();
    mockApi = {};
    view.rerender(<DesktopSettingsDialog isOpen onClose={onClose} />);
    expect(
      screen.queryByRole('dialog', { name: 'Reset desktop settings?' }),
    ).not.toBeInTheDocument();
    expect(mockReset).not.toHaveBeenCalled();
  });
  it('refuses stale completion after close/reopen and preserves the current draft', async () => {
    const pending = deferred();
    mockReset.mockReturnValue(pending.promise);
    const onClose = jest.fn();
    const view = render(<DesktopSettingsDialog isOpen onClose={onClose} />);
    fireEvent.click(
      within(resetDialog()).getByRole('button', { name: 'Reset settings' }),
    );
    view.rerender(<DesktopSettingsDialog isOpen={false} onClose={onClose} />);
    mockSettings = { ...settings, launchAtLogin: true };
    view.rerender(<DesktopSettingsDialog isOpen onClose={onClose} />);
    await act(async () => {
      pending.resolve({ success: true });
    });
    fireEvent.click(screen.getByRole('button', { name: 'General' }));
    expect(screen.getByLabelText('Launch at login')).toBeChecked();
    expect(
      screen.queryByText('Settings reset successfully.'),
    ).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
  it('does not publish a completion after unmount', async () => {
    const pending = deferred();
    mockReset.mockReturnValue(pending.promise);
    const onClose = jest.fn();
    const view = render(<DesktopSettingsDialog isOpen onClose={onClose} />);
    fireEvent.click(
      within(resetDialog()).getByRole('button', { name: 'Reset settings' }),
    );
    view.unmount();
    await act(async () => {
      pending.resolve({ success: true });
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
