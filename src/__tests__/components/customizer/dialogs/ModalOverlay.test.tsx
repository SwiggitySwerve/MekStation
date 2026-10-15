import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';

describe('ModalOverlay native ownership', () => {
  const originalShow = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  const originalClose = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'close',
  );

  beforeAll(() => {
    // JSDOM fixture for lifecycle/events only; this does not model browser top-layer geometry.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
        this.querySelector<HTMLElement>('button')?.focus();
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      },
    });
  });

  afterAll(() => {
    for (const [key, descriptor] of [
      ['showModal', originalShow],
      ['close', originalClose],
    ] as const) {
      if (descriptor)
        Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
    }
  });

  beforeEach(() => {
    document.body.style.overflow = 'scroll';
    jest.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue({
      0: new DOMRect(0, 0, 10, 10),
      length: 1,
      item: () => new DOMRect(0, 0, 10, 10),
    } as unknown as DOMRectList);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    document.body.style.overflow = '';
  });

  function Pair({
    parentOpen,
    childOpen,
  }: {
    parentOpen: boolean;
    childOpen: boolean;
  }) {
    return (
      <>
        <ModalOverlay
          fullScreen
          isOpen={parentOpen}
          onClose={jest.fn()}
          ariaLabelledBy="parent-title"
        >
          <h2 id="parent-title">Parent</h2>
          <button>Parent action</button>
        </ModalOverlay>
        <ModalOverlay
          fullScreen
          isOpen={childOpen}
          onClose={jest.fn()}
          ariaLabelledBy="child-title"
        >
          <h2 id="child-title">Child</h2>
          <button>Child action</button>
        </ModalOverlay>
      </>
    );
  }

  it.each(['parent-first', 'child-first'] as const)(
    'restores original overflow after %s release',
    (order) => {
      const view = render(<Pair parentOpen childOpen />);
      expect(document.body.style.overflow).toBe('hidden');
      view.rerender(
        <Pair
          parentOpen={order !== 'parent-first'}
          childOpen={order !== 'child-first'}
        />,
      );
      expect(document.body.style.overflow).toBe('hidden');
      view.rerender(<Pair parentOpen={false} childOpen={false} />);
      expect(document.body.style.overflow).toBe('scroll');
    },
  );

  it('closed centered cleanup cannot unlock a remaining native parent', () => {
    const view = render(
      <>
        <ModalOverlay fullScreen isOpen onClose={jest.fn()}>
          <button>Parent action</button>
        </ModalOverlay>
        <ModalOverlay isOpen={false} onClose={jest.fn()}>
          Closed child
        </ModalOverlay>
      </>,
    );
    view.rerender(
      <ModalOverlay fullScreen isOpen onClose={jest.fn()}>
        <button>Parent action</button>
      </ModalOverlay>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    view.unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('StrictMode whole-subtree teardown releases every scroll owner', () => {
    const view = render(
      <React.StrictMode>
        <Pair parentOpen childOpen />
      </React.StrictMode>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    view.unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('parent-first close does not move focus beneath a remaining child', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const view = render(<Pair parentOpen childOpen />);
    const childAction = screen.getByRole('button', { name: 'Child action' });
    expect(document.activeElement).toBe(childAction);
    view.rerender(<Pair parentOpen={false} childOpen />);
    expect(document.activeElement).toBe(childAction);
    view.unmount();
    opener.remove();
  });

  it('native centered Tab and Shift+Tab remain within the child controls', async () => {
    const user = userEvent.setup();
    render(
      <ModalOverlay topLayer isOpen onClose={jest.fn()}>
        <button>Cancel</button>
        <button>Confirm</button>
      </ModalOverlay>,
    );
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(document.activeElement).toBe(cancel);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirm);
    await user.tab();
    expect(document.activeElement).toBe(cancel);
  });

  it('returns default centered focus to a living opener', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const view = render(
      <ModalOverlay isOpen onClose={jest.fn()}>
        <button>Modal action</button>
      </ModalOverlay>,
    );
    view.unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('does not focus a removed native opener', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const view = render(
      <ModalOverlay fullScreen isOpen onClose={jest.fn()}>
        <button>Modal action</button>
      </ModalOverlay>,
    );
    const focus = jest.spyOn(opener, 'focus');
    opener.remove();
    view.unmount();
    expect(focus).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('keeps child keyboard and pointer events away from underlying document handlers', () => {
    const keydown = jest.fn();
    const pointerdown = jest.fn();
    document.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', pointerdown);
    try {
      render(
        <ModalOverlay fullScreen isOpen onClose={jest.fn()}>
          <button>Child action</button>
        </ModalOverlay>,
      );
      const button = screen.getByRole('button', { name: 'Child action' });
      fireEvent.keyDown(button, { key: 'Escape' });
      fireEvent.pointerDown(button);
      expect(keydown).not.toHaveBeenCalled();
      expect(pointerdown).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('pointerdown', pointerdown);
    }
  });

  it('native centered cancel closes only the child and keeps parent scroll lock', () => {
    const parentClose = jest.fn();
    function Family() {
      const [childOpen, setChildOpen] = React.useState(true);
      return (
        <>
          <ModalOverlay
            fullScreen
            isOpen
            onClose={parentClose}
            ariaLabelledBy="parent-title"
          >
            <h2 id="parent-title">Parent</h2>
            <button>Parent action</button>
          </ModalOverlay>
          <ModalOverlay
            topLayer
            isOpen={childOpen}
            onClose={() => setChildOpen(false)}
            ariaLabelledBy="child-title"
          >
            <h2 id="child-title">Child</h2>
            <button>Child action</button>
          </ModalOverlay>
        </>
      );
    }
    render(<Family />);
    const child = screen.getByRole('dialog', { name: 'Child' });
    expect(child.tagName).toBe('DIALOG');
    const cancel = new Event('cancel', { bubbles: true, cancelable: true });
    fireEvent(child, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(parentClose).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('dialog', { name: 'Child' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Parent' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Parent action' }),
    );
  });

  it('native centered backdrop uses bounds and preserves content/preventClose', () => {
    const close = jest.fn();
    const view = render(
      <ModalOverlay topLayer isOpen onClose={close}>
        <button>Content action</button>
      </ModalOverlay>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.tagName).toBe('DIALOG');
    jest
      .spyOn(dialog, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(100, 100, 400, 300));
    fireEvent.click(dialog, { clientX: 150, clientY: 150 });
    fireEvent.click(screen.getByRole('button'), { clientX: 150, clientY: 150 });
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(dialog, { clientX: 10, clientY: 10 });
    expect(close).toHaveBeenCalledTimes(1);
    view.rerender(
      <ModalOverlay topLayer isOpen preventClose onClose={close}>
        <button>Content action</button>
      </ModalOverlay>,
    );
    fireEvent.click(dialog, { clientX: 10, clientY: 10 });
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(close).toHaveBeenCalledTimes(1);
  });
});

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
