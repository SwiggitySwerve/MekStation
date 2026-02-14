import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { tap } from '@/utils/hapticFeedback';

import type { PipState } from '../ArmorPip';

import { ArmorPip, ArmorPipGroup } from '../ArmorPip';

// Mock haptic feedback
jest.mock('../../../utils/hapticFeedback');

describe('ArmorPip', () => {
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(tap).toHaveBeenCalled();
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

      expect(tap).toHaveBeenCalledTimes(1);
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
