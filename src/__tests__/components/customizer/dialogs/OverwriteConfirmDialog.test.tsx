import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { OverwriteConfirmDialog } from '@/components/customizer/dialogs/OverwriteConfirmDialog';

describe('OverwriteConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    newUnitName: 'Atlas AS7-X',
    existingUnitName: 'Atlas AS7-X',
    onOverwrite: jest.fn(),
    onSaveAsNew: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open', () => {
    render(<OverwriteConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Unit Already Exists')).toBeInTheDocument();
    expect(
      screen.getByText(/A custom unit with this name already exists/),
    ).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<OverwriteConfirmDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Unit Already Exists')).not.toBeInTheDocument();
  });

  it('should display existing unit name', () => {
    render(
      <OverwriteConfirmDialog
        {...defaultProps}
        existingUnitName="Atlas AS7-D"
      />,
    );

    expect(screen.getByText('Atlas AS7-D')).toBeInTheDocument();
  });

  it('should call onOverwrite when Overwrite button clicked', async () => {
    const user = userEvent.setup();
    render(<OverwriteConfirmDialog {...defaultProps} />);

    const overwriteButton = screen.getByText('Overwrite');
    await user.click(overwriteButton);

    expect(defaultProps.onOverwrite).toHaveBeenCalledTimes(1);
  });

  it('should call onSaveAsNew when Save As New button clicked', async () => {
    const user = userEvent.setup();
    render(<OverwriteConfirmDialog {...defaultProps} />);

    const saveAsNewButton = screen.getByText('Save As New');
    await user.click(saveAsNewButton);

    expect(defaultProps.onSaveAsNew).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when Cancel button clicked', async () => {
    const user = userEvent.setup();
    render(<OverwriteConfirmDialog {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when close button clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<OverwriteConfirmDialog {...defaultProps} />);

    const closeButton = container
      .querySelector('button svg')
      ?.closest('button');
    expect(closeButton).toBeInTheDocument();
    await user.click(closeButton!);

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });
});
