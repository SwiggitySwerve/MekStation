import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import React from 'react';

import { ResetSettings } from '../ResetSettings';

const mockOrder: string[] = [];
const mockAppearance = jest.fn(() => mockOrder.push('appearance'));
const mockCustomizer = jest.fn(() => mockOrder.push('customizer'));
const mockAccessibility = jest.fn(() => mockOrder.push('accessibility'));
const mockUIBehavior = jest.fn(() => mockOrder.push('ui-behavior'));

jest.mock('@/stores/useAppearanceStore', () => ({
  useAppearanceStore: (
    select: (state: { resetToDefaults: typeof mockAppearance }) => unknown,
  ) => select({ resetToDefaults: mockAppearance }),
}));
jest.mock('@/stores/useCustomizerSettingsStore', () => ({
  useCustomizerSettingsStore: (
    select: (state: { resetToDefaults: typeof mockCustomizer }) => unknown,
  ) => select({ resetToDefaults: mockCustomizer }),
}));
jest.mock('@/stores/useAccessibilityStore', () => ({
  useAccessibilityStore: (
    select: (state: { resetToDefaults: typeof mockAccessibility }) => unknown,
  ) => select({ resetToDefaults: mockAccessibility }),
}));
jest.mock('@/stores/useUIBehaviorStore', () => ({
  useUIBehaviorStore: (
    select: (state: { resetToDefaults: typeof mockUIBehavior }) => unknown,
  ) => select({ resetToDefaults: mockUIBehavior }),
}));

describe('ResetSettings in-app confirmation', () => {
  const show = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  const close = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'close',
  );
  const props = { isExpanded: true, onToggle: jest.fn(), onRef: jest.fn() };

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
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrder.length = 0;
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  function open() {
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset' }).at(-1)!);
    return screen.getByRole('dialog', { name: 'Reset all settings?' });
  }

  it('opens the shared top-layer dialog without resetting a store', () => {
    render(<ResetSettings {...props} />);
    const dialog = open();
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('open');
    expect(mockOrder).toEqual([]);
  });

  it.each(['Cancel', 'Close dialog', 'Escape'])(
    '%s dismisses without changing settings',
    (action) => {
      render(<ResetSettings {...props} />);
      const dialog = open();
      if (action === 'Escape')
        fireEvent(dialog, new Event('cancel', { cancelable: true }));
      else
        fireEvent.click(within(dialog).getByRole('button', { name: action }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(mockOrder).toEqual([]);
    },
  );

  it('consumes approval synchronously once and preserves all four reset calls in order', () => {
    render(<ResetSettings {...props} />);
    const approve = within(open()).getByRole('button', {
      name: 'Reset settings',
    });
    act(() => {
      approve.click();
      approve.click();
    });
    expect(mockOrder).toEqual([
      'appearance',
      'customizer',
      'accessibility',
      'ui-behavior',
    ]);
    for (const reset of [
      mockAppearance,
      mockCustomizer,
      mockAccessibility,
      mockUIBehavior,
    ]) {
      expect(reset).toHaveBeenCalledTimes(1);
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(
      within(open()).getByRole('button', { name: 'Reset settings' }),
    );
    expect(mockAppearance).toHaveBeenCalledTimes(2);
  });

  it('invalidates a pending decision on collapse and requires a new confirmation', () => {
    const view = render(<ResetSettings {...props} />);
    open();
    view.rerender(<ResetSettings {...props} isExpanded={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(<ResetSettings {...props} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockOrder).toEqual([]);
    open();
    expect(mockOrder).toEqual([]);
  });

  it('does not retain a pending decision after unmount', () => {
    const view = render(<ResetSettings {...props} />);
    open();
    view.unmount();
    render(<ResetSettings {...props} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockOrder).toEqual([]);
  });
});
