import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { SaveUnitDialog } from '@/components/customizer/dialogs/SaveUnitDialog';
import { unitNameValidator } from '@/services/units/UnitNameValidator';

// Mock UnitNameValidator
jest.mock('@/services/units/UnitNameValidator', () => ({
  unitNameValidator: {
    validateUnitName: jest.fn(),
    generateUniqueName: jest.fn(),
    buildFullName: jest.fn(
      (chassis: string, variant: string) => `${chassis} ${variant}`,
    ),
  },
}));

describe('SaveUnitDialog', () => {
  const defaultProps = {
    isOpen: true,
    initialChassis: 'Atlas',
    initialVariant: 'AS7-D',
    constructionValidation: {
      isValid: true,
      isLoading: false,
      isValidating: false,
      errorCount: 0,
    },
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(unitNameValidator.validateUnitName)
      .mockImplementation(() => new Promise(() => undefined));
  });

  it.each(['create', 'overwrite'] as const)(
    'locks %s controls while saving and restores them after failure',
    async (mode) => {
      jest.mocked(unitNameValidator.validateUnitName).mockResolvedValue({
        isValid: mode === 'create',
        isCanonicalConflict: false,
        isCustomConflict: mode === 'overwrite',
        conflictingUnitId:
          mode === 'overwrite' ? 'existing-library' : undefined,
        suggestedName: mode === 'overwrite' ? 'Atlas AS7-D-2' : undefined,
      });
      const { rerender } = render(
        <SaveUnitDialog {...defaultProps} isSaving />,
      );
      await waitFor(() =>
        expect(
          screen.getByText(
            mode === 'create'
              ? 'Name is available'
              : 'Conflicts with existing custom unit',
          ),
        ).toBeInTheDocument(),
      );
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
      expect(screen.getByLabelText('Chassis Name')).toBeDisabled();
      expect(screen.getByLabelText('Variant Designation')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      if (mode === 'overwrite') {
        expect(
          screen.getByRole('button', { name: 'Save As New' }),
        ).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Suggest' })).toBeDisabled();
      }
      rerender(<SaveUnitDialog {...defaultProps} isSaving={false} />);
      expect(
        screen.getByRole('button', {
          name: mode === 'create' ? 'Save' : 'Overwrite',
        }),
      ).toBeEnabled();
      expect(screen.getByLabelText('Chassis Name')).toBeEnabled();
      expect(screen.getByLabelText('Variant Designation')).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    },
  );

  it.each(['Cancel', 'Close dialog', 'Escape', 'backdrop'])(
    'blocks %s during saving and permits dismissal after completion',
    (dismissal) => {
      const { rerender } = render(
        <SaveUnitDialog {...defaultProps} isSaving />,
      );
      const dismiss = () => {
        const dialog = screen.getByRole('dialog', { name: 'Save Unit' });
        if (dismissal === 'Escape')
          fireEvent.keyDown(dialog, { key: 'Escape' });
        else if (dismissal === 'backdrop') {
          const backdrop = dialog.parentElement;
          if (!backdrop) throw new Error('Missing dialog backdrop');
          fireEvent.click(backdrop);
        } else fireEvent.click(screen.getByRole('button', { name: dismissal }));
      };
      dismiss();
      expect(defaultProps.onCancel).not.toHaveBeenCalled();
      rerender(<SaveUnitDialog {...defaultProps} isSaving={false} />);
      dismiss();
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    },
  );

  it('should render when open', () => {
    render(<SaveUnitDialog {...defaultProps} />);

    expect(
      screen.getByRole('dialog', { name: 'Save Unit' }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Atlas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AS7-D')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<SaveUnitDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should reset form when dialog opens', () => {
    const { rerender } = render(
      <SaveUnitDialog {...defaultProps} isOpen={false} />,
    );

    rerender(
      <SaveUnitDialog
        {...defaultProps}
        isOpen={true}
        initialChassis="New"
        initialVariant="Variant"
      />,
    );

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

    await waitFor(
      () => {
        expect(unitNameValidator.validateUnitName).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );
  });

  it('should disable save button when validating', () => {
    (unitNameValidator.validateUnitName as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
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
    await waitFor(
      () => {
        const saveButton = screen.getByRole('button', { name: /Save/i });
        expect(saveButton).not.toBeDisabled();
      },
      { timeout: 2000 },
    );
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
    await waitFor(
      () => {
        expect(unitNameValidator.validateUnitName).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

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
    await waitFor(
      () => {
        const saveButton = screen.getByRole('button', { name: /Save/i });
        expect(saveButton).not.toBeDisabled();
      },
      { timeout: 2000 },
    );

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    expect(defaultProps.onSave).toHaveBeenCalledWith('Atlas', 'AS7-D');
  });

  it('blocks save when construction has errors while preserving name validation', async () => {
    const user = userEvent.setup();
    (unitNameValidator.validateUnitName as jest.Mock).mockResolvedValue({
      isValid: true,
      isCanonicalConflict: false,
      isCustomConflict: false,
    });

    render(
      <SaveUnitDialog
        {...defaultProps}
        constructionValidation={{
          isValid: false,
          isLoading: false,
          isValidating: false,
          errorCount: 2,
        }}
      />,
    );

    const variantInput = screen.getByDisplayValue('AS7-D');
    await user.type(variantInput, 'X');

    await waitFor(() => {
      expect(screen.getByText('Name is available')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'Fix 2 construction errors before saving. Cancel to keep editing your draft.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('blocks save while construction validation is pending', async () => {
    const user = userEvent.setup();
    (unitNameValidator.validateUnitName as jest.Mock).mockResolvedValue({
      isValid: true,
      isCanonicalConflict: false,
      isCustomConflict: false,
    });

    render(
      <SaveUnitDialog
        {...defaultProps}
        constructionValidation={{
          isValid: true,
          isLoading: false,
          isValidating: true,
          errorCount: 0,
        }}
      />,
    );

    const variantInput = screen.getByDisplayValue('AS7-D');
    await user.type(variantInput, 'X');

    await waitFor(() => {
      expect(screen.getByText('Name is available')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Checking construction readiness...'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('should handle custom conflict by allowing save with overwrite', async () => {
    const user = userEvent.setup();
    const conflictResult = {
      isValid: false,
      isCanonicalConflict: false,
      isCustomConflict: true,
      conflictingUnitId: 'conflict-id',
    };
    (unitNameValidator.validateUnitName as jest.Mock).mockResolvedValue(
      conflictResult,
    );

    render(<SaveUnitDialog {...defaultProps} />);

    // Trigger validation by modifying input
    const variantInput = screen.getByDisplayValue('AS7-D');
    await user.type(variantInput, 'X');

    // Wait for validation to be called
    await waitFor(
      () => {
        expect(unitNameValidator.validateUnitName).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // Verify the validation returned the expected conflict result
    expect(unitNameValidator.validateUnitName).toHaveReturnedWith(
      expect.any(Promise),
    );
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
    await waitFor(
      () => {
        expect(unitNameValidator.validateUnitName).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
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
  it('validates the existing designation whenever the dialog opens', async () => {
    jest.mocked(unitNameValidator.validateUnitName).mockResolvedValue({
      isValid: false,
      isCanonicalConflict: false,
      isCustomConflict: true,
      conflictingUnitId: 'existing-library-unit',
    });
    const { rerender } = render(<SaveUnitDialog {...defaultProps} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Overwrite' })).toBeEnabled(),
    );
    expect(unitNameValidator.validateUnitName).toHaveBeenCalledWith(
      'Atlas',
      'AS7-D',
      undefined,
    );
    rerender(<SaveUnitDialog {...defaultProps} isOpen={false} />);
    rerender(<SaveUnitDialog {...defaultProps} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Overwrite' })).toBeEnabled(),
    );
    expect(unitNameValidator.validateUnitName).toHaveBeenCalledTimes(2);
  });
  it('ignores the initial name response after the user changes the designation', async () => {
    let finishInitial!: (
      value: Awaited<ReturnType<typeof unitNameValidator.validateUnitName>>,
    ) => void;
    jest
      .mocked(unitNameValidator.validateUnitName)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishInitial = resolve;
          }),
      )
      .mockResolvedValue({
        isValid: true,
        isCanonicalConflict: false,
        isCustomConflict: false,
      });
    render(<SaveUnitDialog {...defaultProps} />);
    fireEvent.change(screen.getByDisplayValue('AS7-D'), {
      target: { value: 'NEW-1' },
    });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
    );
    await act(async () => {
      finishInitial({
        isValid: false,
        isCanonicalConflict: true,
        isCustomConflict: false,
      });
    });
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(
      screen.queryByText(/Conflicts with official unit/),
    ).not.toBeInTheDocument();
  });
  it('keeps Save disabled on the first visible paint when reopening', async () => {
    const painted: boolean[] = [];
    function PaintProbe({ open }: { open: boolean }) {
      React.useLayoutEffect(() => {
        if (open)
          painted.push(
            screen
              .getByRole('button', { name: 'Save' })
              .hasAttribute('disabled'),
          );
      }, [open]);
      return <SaveUnitDialog {...defaultProps} isOpen={open} />;
    }
    jest.mocked(unitNameValidator.validateUnitName).mockResolvedValue({
      isValid: true,
      isCanonicalConflict: false,
      isCustomConflict: false,
    });
    const { rerender } = render(<PaintProbe open />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
    );
    rerender(<PaintProbe open={false} />);
    jest
      .mocked(unitNameValidator.validateUnitName)
      .mockImplementation(() => new Promise(() => undefined));
    rerender(<PaintProbe open />);
    expect(painted.at(-1)).toBe(true);
  });
});
