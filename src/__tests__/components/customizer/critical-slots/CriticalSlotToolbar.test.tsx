import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { CriticalSlotToolbar } from '@/components/customizer/critical-slots/CriticalSlotToolbar';

describe('CriticalSlotToolbar', () => {
  const defaultProps = {
    autoFillUnhittables: false,
    showPlacementPreview: false,
    onAutoFillToggle: jest.fn(),
    onPreviewToggle: jest.fn(),
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render toolbar', () => {
    render(<CriticalSlotToolbar {...defaultProps} />);

    expect(screen.getByText('Auto Fill')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    render(<CriticalSlotToolbar {...defaultProps} />);

    expect(screen.getByText('Fill')).toBeInTheDocument();
    expect(screen.getByText('Compact')).toBeInTheDocument();
    expect(screen.getByText('Sort')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('should call onAutoFillToggle when checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(<CriticalSlotToolbar {...defaultProps} />);

    const checkbox = screen.getByLabelText('Auto Fill');
    await user.click(checkbox);

    expect(defaultProps.onAutoFillToggle).toHaveBeenCalledTimes(1);
  });

  it('should call onPreviewToggle when preview checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(<CriticalSlotToolbar {...defaultProps} />);

    const checkbox = screen.getByLabelText('Preview');
    await user.click(checkbox);

    expect(defaultProps.onPreviewToggle).toHaveBeenCalledTimes(1);
  });

  it('should call onAction when action button is clicked', async () => {
    const user = userEvent.setup();
    render(<CriticalSlotToolbar {...defaultProps} />);

    const fillButton = screen.getByText('Fill');
    await user.click(fillButton);

    expect(defaultProps.onAction).toHaveBeenCalledWith('fill');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CriticalSlotToolbar {...defaultProps} className="custom-class" />,
    );

    const toolbar = container.firstChild;
    expect(toolbar).toHaveClass('custom-class');
  });
});
