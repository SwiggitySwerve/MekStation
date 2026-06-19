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
describe('ArmorPipGroup', () => {
  const mockPips: PipState[] = ['filled', 'filled', 'empty', 'destroyed'];
  const mockOnPipChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should display location name', () => {
      render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
        />,
      );

      expect(screen.getByText('Left Arm')).toBeInTheDocument();
    });

    it('should render all pips', () => {
      render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
        />,
      );

      expect(screen.getAllByLabelText(/Armor pip:/).length).toBe(4);
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
          className="custom-class"
        />,
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Batch Actions', () => {
    it('should have Fill All button', () => {
      render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
        />,
      );

      expect(
        screen.getByLabelText('Fill all armor pips in Left Arm'),
      ).toBeInTheDocument();
    });

    it('should have Clear All button', () => {
      render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
        />,
      );

      expect(
        screen.getByLabelText('Clear all armor pips in Left Arm'),
      ).toBeInTheDocument();
    });

    it('should have Destroy All button', () => {
      render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
        />,
      );

      expect(
        screen.getByLabelText('Destroy all armor pips in Left Arm'),
      ).toBeInTheDocument();
    });

    it('should fill all pips when Fill is clicked', () => {
      render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
        />,
      );

      fireEvent.click(screen.getByLabelText('Fill all armor pips in Left Arm'));

      expect(mockOnPipChange).toHaveBeenCalledTimes(4);
      expect(mockOnPipChange).toHaveBeenCalledWith(0, 'filled');
      expect(mockOnPipChange).toHaveBeenCalledWith(1, 'filled');
      expect(mockOnPipChange).toHaveBeenCalledWith(2, 'filled');
      expect(mockOnPipChange).toHaveBeenCalledWith(3, 'filled');
    });

    it('should clear all pips when Clear is clicked', () => {
      render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
        />,
      );

      fireEvent.click(
        screen.getByLabelText('Clear all armor pips in Left Arm'),
      );

      expect(mockOnPipChange).toHaveBeenCalledTimes(4);
      for (let i = 0; i < 4; i++) {
        expect(mockOnPipChange).toHaveBeenCalledWith(i, 'empty');
      }
    });

    it('should destroy all pips when Destroy is clicked', () => {
      render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
        />,
      );

      fireEvent.click(
        screen.getByLabelText('Destroy all armor pips in Left Arm'),
      );

      expect(mockOnPipChange).toHaveBeenCalledTimes(4);
      for (let i = 0; i < 4; i++) {
        expect(mockOnPipChange).toHaveBeenCalledWith(i, 'destroyed');
      }
    });

    it('should have 32x32px minimum on batch action buttons', () => {
      const { container } = render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
        />,
      );

      const buttons = container.querySelectorAll('button[type="button"]');
      const batchButtons = Array.from(buttons).filter((btn) =>
        btn.textContent?.match(/^(Fill|Clear|Destroy)$/),
      );

      batchButtons.forEach((button) => {
        expect(button).toHaveClass('min-h-[32px]');
        expect(button).toHaveClass('min-w-[32px]');
      });
    });
  });

  describe('Individual Pip Changes', () => {
    it('should call onPipChange when individual pip is clicked', () => {
      render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
        />,
      );

      const pips = screen.getAllByLabelText(/Armor pip:/);
      fireEvent.click(pips[0]);

      expect(mockOnPipChange).toHaveBeenCalledWith(0, 'destroyed'); // empty → filled
    });

    it('should disable all pips and batch actions when disabled prop is true', () => {
      render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
          disabled
        />,
      );

      const pips = screen.getAllByLabelText(/Armor pip:/);
      pips.forEach((pip) => {
        expect(pip).toHaveAttribute('aria-disabled', 'true');
      });

      const fillButton = screen.getByLabelText(
        'Fill all armor pips in Left Arm',
      );
      expect(fillButton).toBeDisabled();
    });
  });

  describe('Layout', () => {
    it('should wrap pips in flex layout', () => {
      const { container } = render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
        />,
      );

      const wrapper = container.querySelector('.flex.flex-wrap.gap-2');
      expect(wrapper).toBeInTheDocument();
    });

    it('should display pips with gap', () => {
      const { container } = render(
        <ArmorPipGroup
          location="Left Arm"
          pips={mockPips}
          onPipChange={mockOnPipChange}
        />,
      );

      const wrapper = container.querySelector('.flex-wrap.gap-2');
      expect(wrapper).toHaveClass('gap-2');
    });
  });
});
