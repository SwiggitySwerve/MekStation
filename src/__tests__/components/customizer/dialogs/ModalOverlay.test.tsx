import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';

describe('ModalOverlay', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div>Modal Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('should render when open', () => {
    render(<ModalOverlay {...defaultProps} />);

    expect(screen.getByText('Modal Content')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ModalOverlay {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  it('should call onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<ModalOverlay {...defaultProps} />);

    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();

    // Click on overlay (not modal content)
    await user.click(overlay!);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when modal content is clicked', async () => {
    const user = userEvent.setup();
    render(<ModalOverlay {...defaultProps} />);

    const content = screen.getByText('Modal Content');
    await user.click(content);

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<ModalOverlay {...defaultProps} />);

    await user.keyboard('{Escape}');

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when Escape is pressed if preventClose is true', async () => {
    const user = userEvent.setup();
    render(<ModalOverlay {...defaultProps} preventClose={true} />);

    await user.keyboard('{Escape}');

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should not call onClose when overlay is clicked if preventClose is true', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ModalOverlay {...defaultProps} preventClose={true} />,
    );

    const overlay = container.querySelector('.fixed.inset-0');
    await user.click(overlay!);

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should prevent body scroll when open', () => {
    render(<ModalOverlay {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should restore body scroll when closed', () => {
    const { rerender } = render(<ModalOverlay {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<ModalOverlay {...defaultProps} isOpen={false} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('should focus first focusable element when opened', () => {
    render(
      <ModalOverlay {...defaultProps}>
        <div>
          <button>First Button</button>
          <button>Second Button</button>
        </div>
      </ModalOverlay>,
    );

    const firstButton = screen.getByText('First Button');
    expect(document.activeElement).toBe(firstButton);
  });

  it('should trap focus with Tab key', async () => {
    const user = userEvent.setup();
    render(
      <ModalOverlay {...defaultProps}>
        <div>
          <button>First</button>
          <button>Second</button>
        </div>
      </ModalOverlay>,
    );

    const firstButton = screen.getByText('First');
    const secondButton = screen.getByText('Second');

    // Focus should start on first button
    expect(document.activeElement).toBe(firstButton);

    // Tab should move to second
    await user.tab();
    expect(document.activeElement).toBe(secondButton);

    // Tab again should wrap to first
    await user.tab();
    expect(document.activeElement).toBe(firstButton);
  });

  it('should trap focus with Shift+Tab', async () => {
    const user = userEvent.setup();
    render(
      <ModalOverlay {...defaultProps}>
        <div>
          <button>First</button>
          <button>Second</button>
        </div>
      </ModalOverlay>,
    );

    const firstButton = screen.getByText('First');
    const secondButton = screen.getByText('Second');

    // Focus second button
    secondButton.focus();
    expect(document.activeElement).toBe(secondButton);

    // Shift+Tab should wrap to first
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(firstButton);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ModalOverlay {...defaultProps} className="custom-class" />,
    );

    const modal = container.querySelector('[role="dialog"]');
    expect(modal).toHaveClass('custom-class');
  });
});
