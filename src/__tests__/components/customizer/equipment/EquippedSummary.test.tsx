import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EquippedSummary } from '@/components/customizer/equipment/EquippedSummary';
import { EquipmentCategory } from '@/types/equipment';
import type { LoadoutEquipmentItem } from '@/components/customizer/equipment/GlobalLoadoutTray';

describe('EquippedSummary', () => {
  const createEquipment = (overrides?: Partial<LoadoutEquipmentItem>): LoadoutEquipmentItem => ({
    instanceId: 'equip-1',
    equipmentId: 'medium-laser',
    name: 'Medium Laser',
    category: EquipmentCategory.ENERGY_WEAPON,
    weight: 1,
    criticalSlots: 1,
    isAllocated: false,
    isRemovable: true,
    ...overrides,
  });

  const defaultProps = {
    equipment: [createEquipment()],
    onRemoveEquipment: jest.fn(),
    onSelectEquipment: jest.fn(),
    selectedEquipmentId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render nothing when no removable equipment', () => {
      const { container } = render(
        <EquippedSummary {...defaultProps} equipment={[]} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when all equipment is non-removable', () => {
      const equipment = [createEquipment({ isRemovable: false })];
      const { container } = render(
        <EquippedSummary {...defaultProps} equipment={equipment} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render Equipped header', () => {
      render(<EquippedSummary {...defaultProps} />);
      expect(screen.getByText('Equipped')).toBeInTheDocument();
    });

    it('should display equipment count', () => {
      const equipment = [
        createEquipment({ instanceId: 'e1' }),
        createEquipment({ instanceId: 'e2' }),
      ];
      render(<EquippedSummary {...defaultProps} equipment={equipment} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display total weight', () => {
      const equipment = [
        createEquipment({ instanceId: 'e1', weight: 2 }),
        createEquipment({ instanceId: 'e2', weight: 3 }),
      ];
      render(<EquippedSummary {...defaultProps} equipment={equipment} />);
      expect(screen.getByText('5t')).toBeInTheDocument();
    });

    it('should display total slots', () => {
      const equipment = [
        createEquipment({ instanceId: 'e1', criticalSlots: 2 }),
        createEquipment({ instanceId: 'e2', criticalSlots: 3 }),
      ];
      render(<EquippedSummary {...defaultProps} equipment={equipment} />);
      expect(screen.getByText('5 slots')).toBeInTheDocument();
    });

    it('should display equipment name', () => {
      render(<EquippedSummary {...defaultProps} />);
      expect(screen.getByText('Medium Laser')).toBeInTheDocument();
    });
  });

  describe('Grouping', () => {
    it('should group identical equipment with count', () => {
      const equipment = [
        createEquipment({ instanceId: 'e1', name: 'Medium Laser' }),
        createEquipment({ instanceId: 'e2', name: 'Medium Laser' }),
        createEquipment({ instanceId: 'e3', name: 'Medium Laser' }),
      ];
      render(<EquippedSummary {...defaultProps} equipment={equipment} />);
      expect(screen.getByText('×3')).toBeInTheDocument();
    });

    it('should not show count for single items', () => {
      render(<EquippedSummary {...defaultProps} />);
      expect(screen.queryByText('×1')).not.toBeInTheDocument();
    });

    it('should group by name and category', () => {
      const equipment = [
        createEquipment({ instanceId: 'e1', name: 'Medium Laser', category: EquipmentCategory.ENERGY_WEAPON }),
        createEquipment({ instanceId: 'e2', name: 'LRM 10', category: EquipmentCategory.MISSILE_WEAPON }),
      ];
      render(<EquippedSummary {...defaultProps} equipment={equipment} />);
      expect(screen.getByText('Medium Laser')).toBeInTheDocument();
      expect(screen.getByText('LRM 10')).toBeInTheDocument();
    });
  });

  describe('Filtering non-removable equipment', () => {
    it('should only show removable equipment', () => {
      const equipment = [
        createEquipment({ instanceId: 'e1', name: 'Medium Laser', isRemovable: true }),
        createEquipment({ instanceId: 'e2', name: 'Endo Steel', isRemovable: false }),
      ];
      render(<EquippedSummary {...defaultProps} equipment={equipment} />);
      expect(screen.getByText('Medium Laser')).toBeInTheDocument();
      expect(screen.queryByText('Endo Steel')).not.toBeInTheDocument();
    });

    it('should only count removable equipment in totals', () => {
      const equipment = [
        createEquipment({ instanceId: 'e1', weight: 2, isRemovable: true }),
        createEquipment({ instanceId: 'e2', weight: 10, isRemovable: false }),
      ];
      render(<EquippedSummary {...defaultProps} equipment={equipment} />);
      expect(screen.getByText('2t')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Collapse/Expand', () => {
    it('should start expanded by default', () => {
      render(<EquippedSummary {...defaultProps} />);
      expect(screen.getByText('Medium Laser')).toBeInTheDocument();
    });

    it('should toggle collapse when header is clicked', async () => {
      const user = userEvent.setup();
      render(<EquippedSummary {...defaultProps} />);
      
      const header = screen.getByText('Equipped').closest('button');
      await user.click(header!);
      
      expect(screen.queryByText('Medium Laser')).not.toBeInTheDocument();
      
      await user.click(header!);
      expect(screen.getByText('Medium Laser')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onSelectEquipment when unallocated equipment is clicked', async () => {
      const user = userEvent.setup();
      const equipment = [createEquipment({ isAllocated: false })];
      render(<EquippedSummary {...defaultProps} equipment={equipment} />);
      
      const chip = screen.getByText('Medium Laser').closest('div');
      await user.click(chip!);
      
      expect(defaultProps.onSelectEquipment).toHaveBeenCalledWith('equip-1');
    });

    it('should highlight selected equipment', () => {
      const equipment = [createEquipment({ instanceId: 'selected-1' })];
      render(
        <EquippedSummary
          {...defaultProps}
          equipment={equipment}
          selectedEquipmentId="selected-1"
        />
      );
      
      const chip = screen.getByText('Medium Laser').closest('div');
      expect(chip).toHaveClass('ring-1');
    });

    it('should deselect when clicking selected equipment', async () => {
      const user = userEvent.setup();
      const equipment = [createEquipment({ instanceId: 'selected-1', isAllocated: false })];
      render(
        <EquippedSummary
          {...defaultProps}
          equipment={equipment}
          selectedEquipmentId="selected-1"
        />
      );
      
      const chip = screen.getByText('Medium Laser').closest('div');
      await user.click(chip!);
      
      expect(defaultProps.onSelectEquipment).toHaveBeenCalledWith(null);
    });
  });

  describe('Removal', () => {
    it('should show remove button on hover', () => {
      render(<EquippedSummary {...defaultProps} />);
      expect(screen.getByTitle('Remove one Medium Laser')).toBeInTheDocument();
    });

    it('should call onRemoveEquipment when remove is clicked', async () => {
      const user = userEvent.setup();
      render(<EquippedSummary {...defaultProps} />);
      
      const removeButton = screen.getByTitle('Remove one Medium Laser');
      await user.click(removeButton);
      
      expect(defaultProps.onRemoveEquipment).toHaveBeenCalledWith('equip-1');
    });

    it('should remove one item from a group', async () => {
      const user = userEvent.setup();
      const equipment = [
        createEquipment({ instanceId: 'e1', name: 'Medium Laser' }),
        createEquipment({ instanceId: 'e2', name: 'Medium Laser' }),
      ];
      render(<EquippedSummary {...defaultProps} equipment={equipment} />);
      
      const removeButton = screen.getByTitle('Remove one Medium Laser');
      await user.click(removeButton);
      
      expect(defaultProps.onRemoveEquipment).toHaveBeenCalledWith('e1');
    });
  });
});
