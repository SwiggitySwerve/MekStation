import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ResetConfirmationDialog } from '@/components/customizer/dialogs/ResetConfirmationDialog';

// Mock ModalOverlay
jest.mock('@/components/customizer/dialogs/ModalOverlay', () => ({
  ModalOverlay: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div data-testid="modal-overlay">{children}</div> : null),
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
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

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
});
