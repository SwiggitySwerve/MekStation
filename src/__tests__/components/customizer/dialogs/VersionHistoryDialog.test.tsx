import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { VersionHistoryDialog } from '@/components/customizer/dialogs/VersionHistoryDialog';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';

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

// Mock CustomUnitApiService
jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: {
    getVersionHistory: jest.fn(),
    getVersion: jest.fn(),
    revert: jest.fn(),
  },
}));

describe('VersionHistoryDialog', () => {
  const defaultProps = {
    isOpen: true,
    unitId: 'unit-1',
    unitName: 'Atlas AS7-D',
    currentVersion: 3,
    onRevert: jest.fn(),
    onClose: jest.fn(),
  };

  const mockVersions = [
    { version: 1, createdAt: '2024-01-01', createdBy: 'user1' },
    { version: 2, createdAt: '2024-01-02', createdBy: 'user1' },
    { version: 3, createdAt: '2024-01-03', createdBy: 'user1' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (customUnitApiService.getVersionHistory as jest.Mock).mockResolvedValue(
      mockVersions,
    );
    (customUnitApiService.getVersion as jest.Mock).mockResolvedValue({
      version: 1,
      data: { chassis: 'Atlas', variant: 'AS7-D' },
    });
    (customUnitApiService.revert as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  it('should render when open', () => {
    render(<VersionHistoryDialog {...defaultProps} />);

    expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<VersionHistoryDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
  });

  it('should load version history when dialog opens', async () => {
    render(<VersionHistoryDialog {...defaultProps} />);

    await waitFor(() => {
      expect(customUnitApiService.getVersionHistory).toHaveBeenCalledWith(
        'unit-1',
      );
    });
  });

  it('should display loading state', () => {
    (customUnitApiService.getVersionHistory as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<VersionHistoryDialog {...defaultProps} />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should display error when loading fails', async () => {
    (customUnitApiService.getVersionHistory as jest.Mock).mockRejectedValue(
      new Error('Failed'),
    );

    render(<VersionHistoryDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<VersionHistoryDialog {...defaultProps} />);

    // Wait for loading to complete then click Close button
    await waitFor(() => {
      expect(customUnitApiService.getVersionHistory).toHaveBeenCalled();
    });

    // Find and click the Close button by text
    const closeButton = await screen.findByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
