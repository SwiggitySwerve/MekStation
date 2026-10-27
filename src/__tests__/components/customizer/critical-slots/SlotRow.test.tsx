import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { SlotContent } from '@/components/customizer/critical-slots/CriticalSlotsDisplay';
import { SlotRow } from '@/components/customizer/critical-slots/SlotRow';

describe('SlotRow', () => {
  const defaultProps = {
    slot: { index: 0, type: 'empty' as const },
    isAssignable: false,
    isSelected: false,
    onClick: jest.fn(),
    onDrop: jest.fn(),
    onRemove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty slot', () => {
    render(<SlotRow {...defaultProps} />);

    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('+')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('gridcell', { name: 'Empty slot 1' })).toHaveClass(
      'border-border-theme-strong/60',
      'border-dashed',
    );
  });

  it('should render equipment slot', () => {
    const slot: SlotContent = {
      index: 0,
      type: 'equipment',
      name: 'Medium Laser',
      equipmentId: 'equip-1',
    };

    render(<SlotRow {...defaultProps} slot={slot} />);

    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
  });

  it('hides continuation content while retaining its complete accessible name and actions', async () => {
    const slot: SlotContent = {
      index: 2,
      type: 'equipment',
      name: 'Large Pulse Laser',
      equipmentId: 'equip-1',
      totalSlots: 2,
      isFirstSlot: false,
      isLastSlot: true,
    };

    render(<SlotRow {...defaultProps} slot={slot} />);

    expect(screen.queryByText('3')).not.toBeInTheDocument();
    expect(screen.queryByText('LPL Laser')).not.toBeInTheDocument();
    expect(screen.queryByText('↳')).not.toBeInTheDocument();
    expect(screen.queryByText('2 slots')).not.toBeInTheDocument();
    const cell = screen.getByRole('gridcell', {
      name: 'Slot 3: Large Pulse Laser',
    });
    expect(cell).toHaveAttribute('draggable', 'true');
    await userEvent.click(cell);
    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Delete}');
    expect(defaultProps.onRemove).toHaveBeenCalledTimes(1);
  });

  it('shows one equipment label and a muted slot count at the beginning of a merged block', () => {
    render(
      <SlotRow
        {...defaultProps}
        slot={{
          index: 2,
          type: 'equipment',
          name: 'AC/20',
          equipmentId: 'ac20',
          totalSlots: 10,
          isFirstSlot: true,
          isLastSlot: false,
        }}
      />,
    );
    expect(screen.getByText('AC/20')).toBeInTheDocument();
    expect(screen.getByText('3–12')).toBeInTheDocument();
    expect(screen.getByText('10 slots')).toHaveClass(
      'text-text-theme-secondary',
    );
    expect(
      screen.getByRole('gridcell', { name: 'Slot 3: AC/20' }),
    ).toHaveAttribute('tabindex', '0');
  });

  it('spells out Heat Sink while preserving its complete accessible name', () => {
    render(
      <SlotRow
        {...defaultProps}
        slot={{ index: 4, type: 'equipment', name: 'Heat Sink' }}
      />,
    );
    expect(screen.getByText('Heat Sink')).toHaveAttribute('title', 'Heat Sink');
    expect(screen.queryByText('HS')).not.toBeInTheDocument();
    expect(
      screen.getByRole('gridcell', { name: 'Slot 5: Heat Sink' }),
    ).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    render(<SlotRow {...defaultProps} />);

    const slot = screen.getByText('Available').closest('div');
    if (slot) {
      await user.click(slot);
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    }
  });

  it('should call onRemove on double-click', async () => {
    const user = userEvent.setup();
    const slot: SlotContent = {
      index: 0,
      type: 'equipment',
      name: 'Medium Laser',
      equipmentId: 'equip-1',
    };

    render(<SlotRow {...defaultProps} slot={slot} />);

    const slotElement = screen.getByText('Medium Laser').closest('div');
    if (slotElement) {
      await user.dblClick(slotElement);
      expect(defaultProps.onRemove).toHaveBeenCalledTimes(1);
    }
  });

  it('should highlight assignable slots', () => {
    render(<SlotRow {...defaultProps} isAssignable={true} />);

    const slot = screen.getByText('Available').closest('div');
    expect(slot).toHaveClass('bg-amber-500/10');
  });

  it('should highlight selected slots', () => {
    render(<SlotRow {...defaultProps} isSelected={true} />);

    const slot = screen.getByText('Available').closest('div');
    expect(slot).toHaveClass('ring-2');
  });

  describe('OmniMech fixed equipment', () => {
    it('should not call onRemove on double-click for fixed equipment', async () => {
      const user = userEvent.setup();
      const slot: SlotContent = {
        index: 0,
        type: 'equipment',
        name: 'ER Large Laser',
        equipmentId: 'equip-1',
        isOmniPodMounted: false,
      };

      render(<SlotRow {...defaultProps} slot={slot} isOmni={true} />);

      // Display name includes (Fixed) postfix for fixed equipment on OmniMechs
      const slotElement = screen
        .getByText('ER Large Laser (Fixed)')
        .closest('div');
      if (slotElement) {
        await user.dblClick(slotElement);
        expect(defaultProps.onRemove).not.toHaveBeenCalled();
      }
    });

    it('should apply reduced opacity and cursor-not-allowed to fixed equipment', () => {
      const slot: SlotContent = {
        index: 0,
        type: 'equipment',
        name: 'ER Large Laser',
        equipmentId: 'equip-1',
        isOmniPodMounted: false,
      };

      render(<SlotRow {...defaultProps} slot={slot} isOmni={true} />);

      // Display name includes (Fixed) postfix for fixed equipment on OmniMechs
      const slotElement = screen
        .getByText('ER Large Laser (Fixed)')
        .closest('div');
      expect(slotElement).toHaveClass('opacity-60');
      expect(slotElement).toHaveClass('cursor-not-allowed');
    });

    it('should allow unassign for pod-mounted equipment on OmniMech', async () => {
      const user = userEvent.setup();
      const slot: SlotContent = {
        index: 0,
        type: 'equipment',
        name: 'Medium Laser',
        equipmentId: 'equip-1',
        isOmniPodMounted: true,
      };

      render(<SlotRow {...defaultProps} slot={slot} isOmni={true} />);

      // Display name includes (Pod) postfix for pod-mounted equipment on OmniMechs
      const slotElement = screen.getByText('Medium Laser (Pod)').closest('div');
      if (slotElement) {
        await user.dblClick(slotElement);
        expect(defaultProps.onRemove).toHaveBeenCalledTimes(1);
      }
    });

    it('should not apply fixed styling to non-OmniMech equipment', () => {
      const slot: SlotContent = {
        index: 0,
        type: 'equipment',
        name: 'ER Large Laser',
        equipmentId: 'equip-1',
        isOmniPodMounted: false,
      };

      // isOmni defaults to false
      render(<SlotRow {...defaultProps} slot={slot} />);

      const slotElement = screen.getByText('ER Large Laser').closest('div');
      expect(slotElement).not.toHaveClass('opacity-60');
      expect(slotElement).not.toHaveClass('cursor-not-allowed');
    });

    it('should not prevent unassign for fixed equipment on non-OmniMech', async () => {
      const user = userEvent.setup();
      const slot: SlotContent = {
        index: 0,
        type: 'equipment',
        name: 'ER Large Laser',
        equipmentId: 'equip-1',
        isOmniPodMounted: false,
      };

      // isOmni defaults to false, so isOmniPodMounted should be ignored
      render(<SlotRow {...defaultProps} slot={slot} />);

      // No postfix for non-OmniMech equipment
      const slotElement = screen.getByText('ER Large Laser').closest('div');
      if (slotElement) {
        await user.dblClick(slotElement);
        expect(defaultProps.onRemove).toHaveBeenCalledTimes(1);
      }
    });

    it('should display (Pod) postfix for pod-mounted equipment', () => {
      const slot: SlotContent = {
        index: 0,
        type: 'equipment',
        name: 'Medium Laser',
        equipmentId: 'equip-1',
        isOmniPodMounted: true,
      };

      render(<SlotRow {...defaultProps} slot={slot} isOmni={true} />);

      expect(screen.getByText('Medium Laser (Pod)')).toBeInTheDocument();
    });

    it('should display (Fixed) postfix for fixed equipment', () => {
      const slot: SlotContent = {
        index: 0,
        type: 'equipment',
        name: 'ER Large Laser',
        equipmentId: 'equip-1',
        isOmniPodMounted: false,
      };

      render(<SlotRow {...defaultProps} slot={slot} isOmni={true} />);

      expect(screen.getByText('ER Large Laser (Fixed)')).toBeInTheDocument();
    });

    it('should not display postfix for non-OmniMech equipment', () => {
      const slot: SlotContent = {
        index: 0,
        type: 'equipment',
        name: 'Medium Laser',
        equipmentId: 'equip-1',
        isOmniPodMounted: true,
      };

      // isOmni defaults to false
      render(<SlotRow {...defaultProps} slot={slot} />);

      // No postfix - just the equipment name
      expect(screen.getByText('Medium Laser')).toBeInTheDocument();
      expect(screen.queryByText('Medium Laser (Pod)')).not.toBeInTheDocument();
    });
  });
});
