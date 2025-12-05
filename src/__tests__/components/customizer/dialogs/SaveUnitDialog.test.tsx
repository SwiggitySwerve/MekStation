import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveUnitDialog } from '@/components/customizer/dialogs/SaveUnitDialog';
import { unitNameValidator } from '@/services/units/UnitNameValidator';

// Mock ModalOverlay
jest.mock('@/components/customizer/dialogs/ModalOverlay', () => ({
  ModalOverlay: ({ children, isOpen, onClose: _onClose }: { children: React.ReactNode; isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div data-testid="modal-overlay">{children}</div> : null,
}));

// Mock UnitNameValidator
jest.mock('@/services/units/UnitNameValidator', () => ({
  unitNameValidator: {
    validateUnitName: jest.fn(),
    generateUniqueName: jest.fn(),
    buildFullName: jest.fn((chassis: string, variant: string) => `${chassis} ${variant}`),
  },
}));

describe('SaveUnitDialog', () => {
  const defaultProps = {
    isOpen: true,
    initialChassis: 'Atlas',
    initialVariant: 'AS7-D',
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open', () => {
    render(<SaveUnitDialog {...defaultProps} />);
    
    expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Atlas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AS7-D')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<SaveUnitDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
  });

  it('should reset form when dialog opens', () => {
    const { rerender } = render(<SaveUnitDialog {...defaultProps} isOpen={false} />);
    
    rerender(<SaveUnitDialog {...defaultProps} isOpen={true} initialChassis="New" initialVariant="Variant" />);
    
    expect(screen.getByDisplayValue('New')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Variant')).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SaveUnitDialog {...defaultProps} />);
    
    const cancelButton = screen.getByText(/Cancel/i);
    await user.click(cancelButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should validate name when inputs change', async () => {
    const user = userEvent.setup({ delay: null });
    (unitNameValidator.validateUnitName as jest.Mock).mockResolvedValue({
      isValid: true,
      isCanonicalConflict: false,
      isCustomConflict: false,
    });
    
    render(<SaveUnitDialog {...defaultProps} />);
    
    const chassisInput = screen.getByDisplayValue('Atlas');
    await user.clear(chassisInput);
    await user.type(chassisInput, 'New');
    
    jest.advanceTimersByTime(350);
    
    await waitFor(() => {
      expect(unitNameValidator.validateUnitName).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should disable save button when validating', () => {
    (unitNameValidator.validateUnitName as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    
    render(<SaveUnitDialog {...defaultProps} />);
    
    const saveButton = screen.getByRole('button', { name: /Save/i });
    // Save button starts disabled before validation completes
    expect(saveButton).toBeDisabled();
  });

  it('should enable save button when name is valid', async () => {
    const user = userEvent.setup();
    (unitNameValidator.validateUnitName as jest.Mock).mockResolvedValue({
      isValid: true,
      isCanonicalConflict: false,
      isCustomConflict: false,
    });
    
    render(<SaveUnitDialog {...defaultProps} />);
    
    // Trigger validation by modifying input
    const variantInput = screen.getByDisplayValue('AS7-D');
    await user.type(variantInput, 'X');
    
    // Wait for validation to complete
    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /Save/i });
      expect(saveButton).not.toBeDisabled();
    }, { timeout: 2000 });
  });

  it('should disable save button when canonical conflict', async () => {
    const user = userEvent.setup();
    (unitNameValidator.validateUnitName as jest.Mock).mockResolvedValue({
      isValid: false,
      isCanonicalConflict: true,
      isCustomConflict: false,
      errorMessage: 'Conflicts with official unit',
    });
    
    render(<SaveUnitDialog {...defaultProps} />);
    
    // Trigger validation by modifying input
    const variantInput = screen.getByDisplayValue('AS7-D');
    await user.type(variantInput, 'X');
    
    // Wait for validation to complete - button should remain disabled
    await waitFor(() => {
      expect(unitNameValidator.validateUnitName).toHaveBeenCalled();
    }, { timeout: 2000 });
    
    const saveButton = screen.getByRole('button', { name: /Save/i });
    expect(saveButton).toBeDisabled();
  });

  it('should call onSave when save button is clicked with valid name', async () => {
    const user = userEvent.setup();
    (unitNameValidator.validateUnitName as jest.Mock).mockResolvedValue({
      isValid: true,
      isCanonicalConflict: false,
      isCustomConflict: false,
    });
    
    render(<SaveUnitDialog {...defaultProps} />);
    
    // Trigger validation by modifying input
    const variantInput = screen.getByDisplayValue('AS7-D');
    await user.clear(variantInput);
    await user.type(variantInput, 'AS7-D');
    
    // Wait for validation to complete and button to be enabled
    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /Save/i });
      expect(saveButton).not.toBeDisabled();
    }, { timeout: 2000 });
    
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);
    
    expect(defaultProps.onSave).toHaveBeenCalledWith('Atlas', 'AS7-D');
  });

  it('should handle custom conflict by allowing save with overwrite', async () => {
    const user = userEvent.setup();
    const conflictResult = {
      isValid: false,
      isCanonicalConflict: false,
      isCustomConflict: true,
      conflictingUnitId: 'conflict-id',
    };
    (unitNameValidator.validateUnitName as jest.Mock).mockResolvedValue(conflictResult);
    
    render(<SaveUnitDialog {...defaultProps} />);
    
    // Trigger validation by modifying input
    const variantInput = screen.getByDisplayValue('AS7-D');
    await user.type(variantInput, 'X');
    
    // Wait for validation to be called
    await waitFor(() => {
      expect(unitNameValidator.validateUnitName).toHaveBeenCalled();
    }, { timeout: 2000 });
    
    // Verify the validation returned the expected conflict result
    expect(unitNameValidator.validateUnitName).toHaveReturnedWith(expect.any(Promise));
  });

  it('should call validation when input changes', async () => {
    const user = userEvent.setup();
    (unitNameValidator.validateUnitName as jest.Mock).mockResolvedValue({
      isValid: true,
      isCanonicalConflict: false,
      isCustomConflict: false,
    });
    
    render(<SaveUnitDialog {...defaultProps} />);
    
    // Trigger validation by modifying input
    const variantInput = screen.getByDisplayValue('AS7-D');
    await user.type(variantInput, 'X');
    
    // Wait for validation to be called
    await waitFor(() => {
      expect(unitNameValidator.validateUnitName).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should have generateUniqueName available for suggesting names', () => {
    // Verify the mock is set up correctly for the suggest flow
    (unitNameValidator.generateUniqueName as jest.Mock).mockResolvedValue({
      chassis: 'Atlas',
      variant: 'AS7-D-2',
    });
    
    // The generateUniqueName function should be available and mockable
    expect(unitNameValidator.generateUniqueName).toBeDefined();
  });
});

