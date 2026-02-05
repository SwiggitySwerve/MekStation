import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import type { CriticalSlotData } from '../CriticalSlot';

import { CriticalSlot, CriticalSlotsGrid } from '../CriticalSlot';

const mockEmptySlot: CriticalSlotData = {
  id: 'slot-1',
  index: 0,
  equipment: null,
};

const mockFilledSlot: CriticalSlotData = {
  id: 'slot-2',
  index: 1,
  equipment: {
    id: 'eq-1',
    name: 'Large Laser',
    type: 'Energy',
  },
};

const mockFilledSlotWithIcon: CriticalSlotData = {
  id: 'slot-3',
  index: 2,
  equipment: {
    id: 'eq-2',
    name: 'AC/20',
    type: 'Ballistic',
    icon: '/icons/ac20.png',
  },
};

describe('CriticalSlot', () => {
  const mockOnRemove = jest.fn();
  const mockOnAssign = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty Slot', () => {
    it('should display empty slot state', () => {
      render(<CriticalSlot slot={mockEmptySlot} onRemove={mockOnRemove} />);

      expect(screen.getByText('Empty slot')).toBeInTheDocument();
    });

    it('should display slot number', () => {
      render(<CriticalSlot slot={mockEmptySlot} onRemove={mockOnRemove} />);

      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    it('should show tap to assign message when onAssign is provided', () => {
      render(
        <CriticalSlot
          slot={mockEmptySlot}
          onRemove={mockOnRemove}
          onAssign={mockOnAssign}
        />,
      );

      expect(screen.getByText('Tap to assign')).toBeInTheDocument();
    });

    it('should call onAssign when tapped', () => {
      render(
        <CriticalSlot
          slot={mockEmptySlot}
          onRemove={mockOnRemove}
          onAssign={mockOnAssign}
        />,
      );

      const slot = screen.getByLabelText('Critical slot 1 empty');
      fireEvent.click(slot);

      expect(mockOnAssign).toHaveBeenCalledWith('slot-1');
    });

    it('should not show remove button', () => {
      const { container } = render(
        <CriticalSlot
          slot={mockEmptySlot}
          onRemove={mockOnRemove}
          onAssign={mockOnAssign}
        />,
      );

      const removeButton = container.querySelector('[aria-label*="Remove"]');
      expect(removeButton).not.toBeInTheDocument();
    });

    it('should display empty placeholder icon', () => {
      const { container } = render(
        <CriticalSlot
          slot={mockEmptySlot}
          onRemove={mockOnRemove}
          onAssign={mockOnAssign}
        />,
      );

      const placeholder = container.querySelector('.border-dashed');
      expect(placeholder).toBeInTheDocument();
    });

    it('should have 88px minimum height (44x44 for touch)', () => {
      const { container } = render(
        <CriticalSlot slot={mockEmptySlot} onRemove={mockOnRemove} />,
      );

      const slot = container.querySelector('.critical-slot');
      expect(slot).toHaveClass('min-h-[88px]');
    });
  });

  describe('Filled Slot', () => {
    it('should display equipment name', () => {
      render(<CriticalSlot slot={mockFilledSlot} onRemove={mockOnRemove} />);

      expect(screen.getByText('Large Laser')).toBeInTheDocument();
    });

    it('should display equipment type', () => {
      render(<CriticalSlot slot={mockFilledSlot} onRemove={mockOnRemove} />);

      expect(screen.getByText('Energy')).toBeInTheDocument();
    });

    it('should display slot number', () => {
      render(<CriticalSlot slot={mockFilledSlot} onRemove={mockOnRemove} />);

      expect(screen.getByText('#2')).toBeInTheDocument();
    });

    it('should highlight on tap', () => {
      render(<CriticalSlot slot={mockFilledSlot} onRemove={mockOnRemove} />);

      const slot = screen.getByLabelText(
        'Critical slot 2 containing Large Laser',
      );
      fireEvent.click(slot);

      expect(slot).toHaveClass('border-blue-500');
    });

    it('should show remove button when highlighted', () => {
      render(<CriticalSlot slot={mockFilledSlot} onRemove={mockOnRemove} />);

      const slot = screen.getByLabelText(
        'Critical slot 2 containing Large Laser',
      );
      fireEvent.click(slot);

      expect(
        screen.getByLabelText(/Remove.*Large Laser.*slot 2/),
      ).toBeInTheDocument();
    });

    it('should call onRemove when remove button is clicked', () => {
      render(<CriticalSlot slot={mockFilledSlot} onRemove={mockOnRemove} />);

      const slot = screen.getByLabelText(
        'Critical slot 2 containing Large Laser',
      );
      fireEvent.click(slot);

      const removeButton = screen.getByLabelText(/Remove.*Large Laser/);
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith('slot-2');
    });

    it('should toggle highlight on double tap', () => {
      render(<CriticalSlot slot={mockFilledSlot} onRemove={mockOnRemove} />);

      const slot = screen.getByLabelText(
        'Critical slot 2 containing Large Laser',
      );
      fireEvent.click(slot);
      expect(slot).toHaveClass('border-blue-500');

      fireEvent.click(slot);
      expect(slot).not.toHaveClass('border-blue-500');
    });

    it('should display default icon when no icon provided', () => {
      const { container } = render(
        <CriticalSlot slot={mockFilledSlot} onRemove={mockOnRemove} />,
      );

      const iconContainer = container.querySelector('.bg-blue-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should display custom icon when provided', () => {
      const { container } = render(
        <CriticalSlot slot={mockFilledSlotWithIcon} onRemove={mockOnRemove} />,
      );

      const img = container.querySelector('img[src="/icons/ac20.png"]');
      expect(img).toBeInTheDocument();
    });

    it('should have proper ARIA label', () => {
      render(<CriticalSlot slot={mockFilledSlot} onRemove={mockOnRemove} />);

      expect(
        screen.getByLabelText('Critical slot 2 containing Large Laser'),
      ).toBeInTheDocument();
    });
  });

  describe('Touch Targets', () => {
    it('should have 88px minimum height for 44x44px touch target', () => {
      const { container } = render(
        <CriticalSlot slot={mockEmptySlot} onRemove={mockOnRemove} />,
      );

      const slot = container.querySelector('.critical-slot');
      expect(slot).toHaveClass('min-h-[88px]');
    });

    it('should have 32px minimum on remove button', () => {
      render(<CriticalSlot slot={mockFilledSlot} onRemove={mockOnRemove} />);

      const slot = screen.getByLabelText(
        'Critical slot 2 containing Large Laser',
      );
      fireEvent.click(slot);

      const removeButton = screen.getByLabelText(/Remove.*Large Laser/);
      expect(removeButton).toHaveClass('min-h-[32px]');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be focusable', () => {
      render(
        <CriticalSlot
          slot={mockEmptySlot}
          onRemove={mockOnRemove}
          onAssign={mockOnAssign}
        />,
      );

      const slot = screen.getByLabelText('Critical slot 1 empty');
      expect(slot).toHaveAttribute('tabIndex', '0');
    });

    it('should call onAssign on Enter key', () => {
      render(
        <CriticalSlot
          slot={mockEmptySlot}
          onRemove={mockOnRemove}
          onAssign={mockOnAssign}
        />,
      );

      const slot = screen.getByLabelText('Critical slot 1 empty');
      fireEvent.keyDown(slot, { key: 'Enter' });

      expect(mockOnAssign).toHaveBeenCalledWith('slot-1');
    });

    it('should call onAssign on Space key', () => {
      render(
        <CriticalSlot
          slot={mockEmptySlot}
          onRemove={mockOnRemove}
          onAssign={mockOnAssign}
        />,
      );

      const slot = screen.getByLabelText('Critical slot 1 empty');
      fireEvent.keyDown(slot, { key: ' ' });

      expect(mockOnAssign).toHaveBeenCalledWith('slot-1');
    });

    it('should toggle highlight on keyboard interaction for filled slot', () => {
      render(<CriticalSlot slot={mockFilledSlot} onRemove={mockOnRemove} />);

      const slot = screen.getByLabelText(
        'Critical slot 2 containing Large Laser',
      );
      fireEvent.keyDown(slot, { key: 'Enter' });

      expect(slot).toHaveClass('border-blue-500');
    });
  });

  describe('Accessibility', () => {
    it('should hide decorative icons from screen readers', () => {
      const { container } = render(
        <CriticalSlot slot={mockFilledSlot} onRemove={mockOnRemove} />,
      );

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have proper button role', () => {
      render(<CriticalSlot slot={mockEmptySlot} onRemove={mockOnRemove} />);

      const slot = screen.getByLabelText('Critical slot 1 empty');
      expect(slot).toHaveAttribute('role', 'button');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <CriticalSlot
          slot={mockEmptySlot}
          onRemove={mockOnRemove}
          className="custom-class"
        />,
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});

describe('CriticalSlotsGrid', () => {
  const mockOnRemove = jest.fn();
  const mockOnAssign = jest.fn();

  const mockSlots: CriticalSlotData[] = [
    { id: 'slot-1', index: 0, equipment: null },
    {
      id: 'slot-2',
      index: 1,
      equipment: { id: 'eq-1', name: 'Large Laser', type: 'Energy' },
    },
    { id: 'slot-3', index: 2, equipment: null },
    {
      id: 'slot-4',
      index: 3,
      equipment: { id: 'eq-2', name: 'AC/20', type: 'Ballistic' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all slots', () => {
    render(<CriticalSlotsGrid slots={mockSlots} onRemove={mockOnRemove} />);

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('#4')).toBeInTheDocument();
  });

  it('should use grid layout', () => {
    const { container } = render(
      <CriticalSlotsGrid slots={mockSlots} onRemove={mockOnRemove} />,
    );

    const grid = container.querySelector('.critical-slots-grid');
    expect(grid).toHaveClass('grid');
  });

  it('should be responsive (2 columns on mobile, up to 6 on desktop)', () => {
    const { container } = render(
      <CriticalSlotsGrid slots={mockSlots} onRemove={mockOnRemove} />,
    );

    const grid = container.querySelector('.critical-slots-grid');
    expect(grid).toHaveClass('grid-cols-2');
    expect(grid).toHaveClass('sm:grid-cols-3');
    expect(grid).toHaveClass('md:grid-cols-4');
    expect(grid).toHaveClass('lg:grid-cols-6');
  });

  it('should pass props to child slots', () => {
    render(
      <CriticalSlotsGrid
        slots={mockSlots}
        onRemove={mockOnRemove}
        onAssign={mockOnAssign}
      />,
    );

    const emptySlot = screen.getByLabelText('Critical slot 1 empty');
    fireEvent.click(emptySlot);

    expect(mockOnAssign).toHaveBeenCalledWith('slot-1');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CriticalSlotsGrid
        slots={mockSlots}
        onRemove={mockOnRemove}
        className="custom-class"
      />,
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should display gaps between slots', () => {
    const { container } = render(
      <CriticalSlotsGrid slots={mockSlots} onRemove={mockOnRemove} />,
    );

    const grid = container.querySelector('.critical-slots-grid');
    expect(grid).toHaveClass('gap-3');
  });
});
