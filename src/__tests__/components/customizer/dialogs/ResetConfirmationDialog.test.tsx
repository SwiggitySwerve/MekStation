import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ResetConfirmationDialog } from '@/components/customizer/dialogs/ResetConfirmationDialog';

// Mock ModalOverlay
jest.mock('@/components/customizer/dialogs/ModalOverlay', () => ({
  ModalOverlay: ({
    children,
    isOpen,
    onClose,
    preventClose,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    preventClose: boolean;
  }) =>
    isOpen ? (
      <div data-testid="modal-overlay">
        <button onClick={onClose} disabled={preventClose}>
          Dismiss overlay
        </button>
        {children}
      </div>
    ) : null,
}));

describe('ResetConfirmationDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  async function confirmReset() {
    const user = userEvent.setup({ delay: null });
    await user.click(
      screen.getByRole('button', { name: 'Continue with Reset' }),
    );
    await user.click(screen.getByRole('button', { name: 'Confirm Reset' }));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => jest.runAllTicks());
    return user;
  }

  it('should render when open', () => {
    render(<ResetConfirmationDialog {...defaultProps} />);

    expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ResetConfirmationDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
  });

  it('should display reset options', () => {
    render(<ResetConfirmationDialog {...defaultProps} />);

    expect(screen.getByText('Reset Equipment Only')).toBeInTheDocument();
    expect(screen.getByText('Reset Armor & Equipment')).toBeInTheDocument();
    expect(screen.getByText('Full Reset')).toBeInTheDocument();
  });

  it('should allow selecting different options', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ResetConfirmationDialog {...defaultProps} />);

    const armorOption = screen.getByText('Reset Armor & Equipment');
    await user.click(armorOption);

    expect(screen.getByText('Reset Armor & Equipment')).toBeInTheDocument();
  });

  it('should call onClose when cancel is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ResetConfirmationDialog {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should show confirmation step when continue is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ResetConfirmationDialog {...defaultProps} />);

    const continueButton = screen.getByText(/Continue/i);
    await user.click(continueButton);

    expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
  });

  it('should call onConfirm when reset is confirmed', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ResetConfirmationDialog {...defaultProps} />);

    const continueButton = screen.getByText(/Continue/i);
    await user.click(continueButton);

    const confirmButton = screen.getByText(/Confirm Reset/i);
    await user.click(confirmButton);

    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalled();
    });
  });

  it('stops progress after rejection and leaves the failure open', async () => {
    const pending = Promise.withResolvers<void>();
    render(
      <ResetConfirmationDialog
        {...defaultProps}
        onConfirm={() => pending.promise}
      />,
    );
    await confirmReset();
    act(() => jest.advanceTimersByTime(300));
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Dismiss overlay' }),
    ).toBeDisabled();
    await act(async () => pending.reject(new Error('Reset unavailable')));
    act(() => jest.runAllTicks());

    expect(screen.getByText('Reset Failed')).toBeInTheDocument();
    expect(screen.getByText('Reset unavailable')).toBeInTheDocument();
    expect(jest.getTimerCount()).toBe(0);
    act(() => jest.advanceTimersByTime(5000));
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('closes successful results once at two seconds and reopens at selection', async () => {
    const pending = Promise.withResolvers<void>();
    const props = { ...defaultProps, onConfirm: () => pending.promise };
    const view = render(<ResetConfirmationDialog {...props} />);
    await confirmReset();
    await act(async () => pending.resolve());
    act(() => jest.runAllTicks());
    expect(screen.getByText('Reset Complete')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1999));
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    view.rerender(<ResetConfirmationDialog {...defaultProps} isOpen={false} />);
    view.rerender(<ResetConfirmationDialog {...defaultProps} />);
    expect(screen.getByText('Choose what to reset:')).toBeInTheDocument();
  });

  it('cancels auto-close when manually closed before a new reset starts', async () => {
    const view = render(<ResetConfirmationDialog {...defaultProps} />);
    const user = await confirmReset();
    await screen.findByText('Reset Complete');
    await user.click(screen.getByRole('button', { name: 'Dismiss overlay' }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    view.rerender(<ResetConfirmationDialog {...defaultProps} isOpen={false} />);
    const pending = Promise.withResolvers<void>();
    view.rerender(
      <ResetConfirmationDialog
        {...defaultProps}
        onConfirm={() => pending.promise}
      />,
    );
    await confirmReset();
    act(() => jest.advanceTimersByTime(2000));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Resetting...')).toBeInTheDocument();
    await act(async () => pending.resolve());
    expect(screen.getByText('Reset Complete')).toBeInTheDocument();
  });

  it('cancels auto-close on parent close and resets on reopen', async () => {
    const view = render(<ResetConfirmationDialog {...defaultProps} />);
    await confirmReset();
    await screen.findByText('Reset Complete');
    view.rerender(<ResetConfirmationDialog {...defaultProps} isOpen={false} />);
    expect(jest.getTimerCount()).toBe(0);
    view.rerender(<ResetConfirmationDialog {...defaultProps} />);
    expect(screen.getByText('Choose what to reset:')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(2000));
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('cancels auto-close on unmount', async () => {
    const view = render(<ResetConfirmationDialog {...defaultProps} />);
    await confirmReset();
    await screen.findByText('Reset Complete');
    view.unmount();
    expect(jest.getTimerCount()).toBe(0);
    act(() => jest.advanceTimersByTime(2000));
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it.each(['resolve', 'reject'] as const)(
    'ignores an old reset that later %ss while a reopened reset is pending',
    async (outcome) => {
      const oldReset = Promise.withResolvers<void>();
      const newReset = Promise.withResolvers<void>();
      const onConfirm = jest
        .fn()
        .mockReturnValueOnce(oldReset.promise)
        .mockReturnValueOnce(newReset.promise);
      const props = { ...defaultProps, onConfirm };
      const view = render(<ResetConfirmationDialog {...props} />);
      await confirmReset();
      view.rerender(<ResetConfirmationDialog {...props} isOpen={false} />);
      expect(jest.getTimerCount()).toBe(0);
      view.rerender(<ResetConfirmationDialog {...props} />);
      expect(screen.getByText('Choose what to reset:')).toBeInTheDocument();
      await confirmReset();
      await act(async () => {
        if (outcome === 'resolve') oldReset.resolve();
        else oldReset.reject(new Error('Old reset failed'));
      });
      expect(screen.getByText('Resetting...')).toBeInTheDocument();
      act(() => jest.advanceTimersByTime(300));
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
      await act(async () => newReset.resolve());
      expect(screen.getByText('Reset Complete')).toBeInTheDocument();
    },
  );

  it.each(['resolve', 'reject'] as const)(
    'cleans up a pending reset on unmount before it %ss',
    async (outcome) => {
      const pending = Promise.withResolvers<void>();
      const view = render(
        <ResetConfirmationDialog
          {...defaultProps}
          onConfirm={() => pending.promise}
        />,
      );
      await confirmReset();
      view.unmount();
      expect(jest.getTimerCount()).toBe(0);
      await act(async () => {
        if (outcome === 'resolve') pending.resolve();
        else pending.reject(new Error('Old reset failed'));
      });
      act(() => jest.runAllTicks());
      expect(jest.getTimerCount()).toBe(0);
      act(() => jest.advanceTimersByTime(5000));
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    },
  );
});
