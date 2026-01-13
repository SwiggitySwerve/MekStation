import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlotRow } from '@/components/customizer/critical-slots/SlotRow';
import { SlotContent } from '@/components/customizer/critical-slots/CriticalSlotsDisplay';

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
    
    expect(screen.getByText('- Empty -')).toBeInTheDocument();
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

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    render(<SlotRow {...defaultProps} />);
    
    const slot = screen.getByText('- Empty -').closest('div');
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
    
    const slot = screen.getByText('- Empty -').closest('div');
    expect(slot).toHaveClass('bg-green-900/60');
  });

  it('should highlight selected slots', () => {
    render(<SlotRow {...defaultProps} isSelected={true} />);

    const slot = screen.getByText('- Empty -').closest('div');
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
      const slotElement = screen.getByText('ER Large Laser (Fixed)').closest('div');
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
      const slotElement = screen.getByText('ER Large Laser (Fixed)').closest('div');
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

