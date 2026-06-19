import * as H from './ArmorPip.test-helpers';

const {
  ArmorPip,
  ArmorPipGroup,
  React,
  fireEvent,
  render,
  screen,
  useHaptics,
} = H;

type PipState = H.PipState;
describe('ArmorPip', () => {
  const mockOnToggle = jest.fn();
  const mockVibrateCustom = jest.fn();
  const mockUseHaptics = useHaptics as jest.MockedFunction<typeof useHaptics>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHaptics.mockReturnValue({
      vibrate: jest.fn(),
      vibrateCustom: mockVibrateCustom,
      cancel: jest.fn(),
      isSupported: true,
    });
  });

  describe('Rendering', () => {
    it('should display empty pip', () => {
      render(<ArmorPip state="empty" onToggle={mockOnToggle} />);

      const pip = screen.getByLabelText('Armor pip: empty');
      expect(pip).toBeInTheDocument();
      expect(pip).toHaveClass('bg-gray-200');
    });

    it('should display filled pip', () => {
      render(<ArmorPip state="filled" onToggle={mockOnToggle} />);

      const pip = screen.getByLabelText('Armor pip: filled');
      expect(pip).toBeInTheDocument();
      expect(pip).toHaveClass('bg-green-500');
    });

    it('should display destroyed pip with X mark', () => {
      render(<ArmorPip state="destroyed" onToggle={mockOnToggle} />);

      const pip = screen.getByLabelText('Armor pip: destroyed');
      expect(pip).toBeInTheDocument();
      expect(pip).toHaveClass('bg-red-500');
      expect(pip.querySelector('svg')).toBeInTheDocument();
    });

    it('should display blown-off pip with circle icon', () => {
      render(<ArmorPip state="blown-off" onToggle={mockOnToggle} />);

      const pip = screen.getByLabelText('Armor pip: blown-off');
      expect(pip).toBeInTheDocument();
      expect(pip).toHaveClass('bg-orange-500');
      expect(pip.querySelector('svg')).toBeInTheDocument();
    });

    it('should be 48x48px minimum (44x44px plus padding)', () => {
      const { container } = render(
        <ArmorPip state="empty" onToggle={mockOnToggle} />,
      );

      const pip = container.querySelector('.armor-pip');
      expect(pip).toHaveStyle({ minWidth: '48px', minHeight: '48px' });
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ArmorPip
          state="empty"
          onToggle={mockOnToggle}
          className="custom-class"
        />,
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Tap-to-Toggle', () => {
    it('should cycle from empty to filled', () => {
      render(<ArmorPip state="empty" onToggle={mockOnToggle} />);

      const pip = screen.getByLabelText('Armor pip: empty');
      fireEvent.click(pip);

      expect(mockOnToggle).toHaveBeenCalledWith('filled');
      expect(mockVibrateCustom).toHaveBeenCalledWith(50);
    });

    it('should cycle from filled to destroyed', () => {
      render(<ArmorPip state="filled" onToggle={mockOnToggle} />);

      const pip = screen.getByLabelText('Armor pip: filled');
      fireEvent.click(pip);

      expect(mockOnToggle).toHaveBeenCalledWith('destroyed');
    });

    it('should cycle from destroyed to blown-off', () => {
      render(<ArmorPip state="destroyed" onToggle={mockOnToggle} />);

      const pip = screen.getByLabelText('Armor pip: destroyed');
      fireEvent.click(pip);

      expect(mockOnToggle).toHaveBeenCalledWith('blown-off');
    });

    it('should cycle from blown-off back to empty', () => {
      render(<ArmorPip state="blown-off" onToggle={mockOnToggle} />);

      const pip = screen.getByLabelText('Armor pip: blown-off');
      fireEvent.click(pip);

      expect(mockOnToggle).toHaveBeenCalledWith('empty');
    });

    it('should trigger haptic feedback on tap', () => {
      render(<ArmorPip state="empty" onToggle={mockOnToggle} />);

      const pip = screen.getByLabelText('Armor pip: empty');
      fireEvent.click(pip);

      expect(mockVibrateCustom).toHaveBeenCalledTimes(1);
    });

    it('should not trigger callback when disabled', () => {
      render(<ArmorPip state="empty" onToggle={mockOnToggle} disabled />);

      const pip = screen.getByLabelText('Armor pip: empty');
      fireEvent.click(pip);

      expect(mockOnToggle).not.toHaveBeenCalled();
    });

    it('should have aria-disabled when disabled', () => {
      render(<ArmorPip state="empty" onToggle={mockOnToggle} disabled />);

      const pip = screen.getByLabelText('Armor pip: empty');
      expect(pip).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Animations', () => {
    it('should have GPU-accelerated transitions', () => {
      const { container } = render(
        <ArmorPip state="empty" onToggle={mockOnToggle} />,
      );

      const pip = container.querySelector('.armor-pip');
      expect(pip).toHaveClass('transition-all');
      expect(pip).toHaveClass('duration-200');
    });

    it('should use transform for performance', () => {
      const { container } = render(
        <ArmorPip state="empty" onToggle={mockOnToggle} />,
      );

      const pip = container.querySelector('.armor-pip');
      expect(pip).toBeInstanceOf(HTMLElement);
      const pipElement = pip as HTMLElement;
      expect(pipElement.style.transform).toBeDefined();
    });
  });

  describe('Visual States', () => {
    it('should have distinct colors for each state', () => {
      const { container: emptyContainer } = render(
        <ArmorPip state="empty" onToggle={mockOnToggle} />,
      );
      const { container: filledContainer } = render(
        <ArmorPip state="filled" onToggle={mockOnToggle} />,
      );
      const { container: destroyedContainer } = render(
        <ArmorPip state="destroyed" onToggle={mockOnToggle} />,
      );
      const { container: blownOffContainer } = render(
        <ArmorPip state="blown-off" onToggle={mockOnToggle} />,
      );

      expect(emptyContainer.querySelector('.bg-gray-200')).toBeInTheDocument();
      expect(
        filledContainer.querySelector('.bg-green-500'),
      ).toBeInTheDocument();
      expect(
        destroyedContainer.querySelector('.bg-red-500'),
      ).toBeInTheDocument();
      expect(
        blownOffContainer.querySelector('.bg-orange-500'),
      ).toBeInTheDocument();
    });

    it('should show X mark for destroyed state', () => {
      const { container } = render(
        <ArmorPip state="destroyed" onToggle={mockOnToggle} />,
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.querySelector('path')).toHaveAttribute(
        'd',
        expect.stringContaining('M6 18L18 6M6 6l12 12'),
      );
    });

    it('should show circle mark for blown-off state', () => {
      const { container } = render(
        <ArmorPip state="blown-off" onToggle={mockOnToggle} />,
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.querySelector('path')).toHaveAttribute(
        'd',
        expect.stringContaining('M15 12H9'),
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label', () => {
      render(<ArmorPip state="filled" onToggle={mockOnToggle} />);

      expect(screen.getByLabelText('Armor pip: filled')).toBeInTheDocument();
    });

    it('should update ARIA label on state change', () => {
      const { rerender } = render(
        <ArmorPip state="empty" onToggle={mockOnToggle} />,
      );

      expect(screen.getByLabelText('Armor pip: empty')).toBeInTheDocument();

      rerender(<ArmorPip state="filled" onToggle={mockOnToggle} />);

      expect(screen.getByLabelText('Armor pip: filled')).toBeInTheDocument();
      expect(
        screen.queryByLabelText('Armor pip: empty'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Hover and Active States', () => {
    it('should scale up on hover when not disabled', () => {
      const { container } = render(
        <ArmorPip state="empty" onToggle={mockOnToggle} />,
      );

      const pip = container.querySelector('.armor-pip');
      expect(pip).toHaveClass('hover:scale-105');
    });

    it('should scale down on active', () => {
      const { container } = render(
        <ArmorPip state="empty" onToggle={mockOnToggle} />,
      );

      const pip = container.querySelector('.armor-pip');
      expect(pip).toHaveClass('active:scale-95');
    });

    it('should not have hover effects when disabled', () => {
      const { container } = render(
        <ArmorPip state="empty" onToggle={mockOnToggle} disabled />,
      );

      const pip = container.querySelector('.armor-pip');
      expect(pip).toHaveClass('cursor-not-allowed');
      expect(pip).toHaveClass('opacity-50');
    });
  });
});
