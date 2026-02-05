import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { UnsavedChangesDialog } from '@/components/customizer/dialogs/UnsavedChangesDialog';

describe('UnsavedChangesDialog', () => {
  const defaultProps = {
    isOpen: true,
    unitName: 'Atlas AS7-X',
    onClose: jest.fn(),
    onDiscard: jest.fn(),
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);

    expect(
      screen.getByText('Save Unit Before Proceeding?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /All unsaved changes in the current unit will be discarded/,
      ),
    ).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<UnsavedChangesDialog {...defaultProps} isOpen={false} />);

    expect(
      screen.queryByText('Save Unit Before Proceeding?'),
    ).not.toBeInTheDocument();
  });

  it('should display unit name', () => {
    render(<UnsavedChangesDialog {...defaultProps} unitName="Custom Mech" />);

    expect(screen.getByText(/Unit: Custom Mech/)).toBeInTheDocument();
  });

  it('should call onSave when Yes button clicked', async () => {
    const user = userEvent.setup();
    render(<UnsavedChangesDialog {...defaultProps} />);

    const yesButton = screen.getByText('Yes');
    await user.click(yesButton);

    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });

  it('should call onDiscard when No button clicked', async () => {
    const user = userEvent.setup();
    render(<UnsavedChangesDialog {...defaultProps} />);

    const noButton = screen.getByText('No');
    await user.click(noButton);

    expect(defaultProps.onDiscard).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Cancel button clicked', async () => {
    const user = userEvent.setup();
    render(<UnsavedChangesDialog {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should not show Yes button when onSave is not provided', () => {
    const { onSave: _omitted, ...propsWithoutSave } = defaultProps;
    void _omitted;
    render(<UnsavedChangesDialog {...propsWithoutSave} onSave={undefined} />);

    expect(screen.queryByText('Yes')).not.toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<UnsavedChangesDialog {...defaultProps} />);

    const closeButton = container
      .querySelector('button svg')
      ?.closest('button');
    expect(closeButton).toBeInTheDocument();
    await user.click(closeButton!);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
