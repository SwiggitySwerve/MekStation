import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportUnitDialog } from '@/components/customizer/dialogs/ImportUnitDialog';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';

// Mock ModalOverlay
jest.mock('@/components/customizer/dialogs/ModalOverlay', () => ({
  ModalOverlay: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="modal-overlay">{children}</div> : null,
}));

// Mock CustomUnitApiService
jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: {
    importUnit: jest.fn(),
  },
}));

describe('ImportUnitDialog', () => {
  const defaultProps = {
    isOpen: true,
    onImportSuccess: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (customUnitApiService.importUnit as jest.Mock).mockResolvedValue({
      success: true,
      unitId: 'unit-1',
      unitName: 'Atlas AS7-D',
    });
  });

  it('should render when open', () => {
    render(<ImportUnitDialog {...defaultProps} />);
    
    expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ImportUnitDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ImportUnitDialog {...defaultProps} />);
    
    // Use the Cancel button which has clear text
    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
    
    await user.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});

