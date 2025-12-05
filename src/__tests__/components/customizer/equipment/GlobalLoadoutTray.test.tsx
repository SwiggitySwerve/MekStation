import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlobalLoadoutTray, LoadoutEquipmentItem } from '@/components/customizer/equipment/GlobalLoadoutTray';
import { EquipmentCategory } from '@/types/equipment';
import { MechLocation } from '@/types/construction';

describe('GlobalLoadoutTray', () => {
  const createEquipment = (overrides?: Partial<LoadoutEquipmentItem>): LoadoutEquipmentItem => ({
    instanceId: 'equip-1',
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
    equipmentCount: 1,
    onRemoveEquipment: jest.fn(),
    onRemoveAllEquipment: jest.fn(),
    isExpanded: true,
    onToggleExpand: jest.fn(),
    selectedEquipmentId: null,
    onSelectEquipment: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render equipment tray', () => {
    render(<GlobalLoadoutTray {...defaultProps} />);
    
    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
  });

  it('should display equipment count', () => {
    render(<GlobalLoadoutTray {...defaultProps} equipmentCount={5} />);
    
    expect(screen.getByText(/5/i)).toBeInTheDocument();
  });

  it('should have clickable section headers', async () => {
    const user = userEvent.setup();
    render(<GlobalLoadoutTray {...defaultProps} />);
    
    // Click on the "Unallocated" section header button
    const sectionButton = screen.getByRole('button', { name: /Unallocated/i });
    await user.click(sectionButton);
    
    // Verify the section header was found and clicked (no error = success)
    expect(sectionButton).toBeInTheDocument();
  });

  it('should call onSelectEquipment when equipment is clicked', async () => {
    const user = userEvent.setup();
    render(<GlobalLoadoutTray {...defaultProps} />);
    
    const equipment = screen.getByText('Medium Laser');
    await user.click(equipment);
    
    expect(defaultProps.onSelectEquipment).toHaveBeenCalledWith('equip-1');
  });

  it('should call onRemoveEquipment when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<GlobalLoadoutTray {...defaultProps} />);
    
    // Find the remove button by title
    const removeButton = screen.getByTitle('Remove from unit');
    await user.click(removeButton);
    expect(defaultProps.onRemoveEquipment).toHaveBeenCalledWith('equip-1');
  });

  it('should not show remove button for non-removable equipment', () => {
    const equipment = createEquipment({ isRemovable: false });
    render(<GlobalLoadoutTray {...defaultProps} equipment={[equipment]} />);
    
    // Should show lock icon instead of remove button
    expect(screen.queryByTitle('Remove from unit')).not.toBeInTheDocument();
    expect(screen.getByTitle('Managed by configuration')).toBeInTheDocument();
  });

  it('should display allocated equipment in allocated section', () => {
    const allocated = createEquipment({
      instanceId: 'allocated-1',
      name: 'Allocated Laser',
      isAllocated: true,
      location: 'Right Torso',
    });
    
    render(<GlobalLoadoutTray {...defaultProps} equipment={[allocated]} />);
    
    expect(screen.getByText('Allocated Laser')).toBeInTheDocument();
    expect(screen.getByText(/RT/i)).toBeInTheDocument();
  });

  it('should display unallocated equipment in unallocated section', () => {
    const unallocated = createEquipment({
      instanceId: 'unallocated-1',
      name: 'Unallocated Laser',
      isAllocated: false,
    });
    
    render(<GlobalLoadoutTray {...defaultProps} equipment={[unallocated]} />);
    
    expect(screen.getByText('Unallocated Laser')).toBeInTheDocument();
  });

  it('should highlight selected equipment', () => {
    const { container } = render(<GlobalLoadoutTray {...defaultProps} selectedEquipmentId="equip-1" />);
    
    // The ring-1 class is applied to the item row wrapper div
    const highlightedItem = container.querySelector('.ring-1');
    expect(highlightedItem).toBeInTheDocument();
  });

  it('should accept available locations prop', () => {
    const availableLocations = [
      {
        location: MechLocation.RIGHT_TORSO,
        label: 'Right Torso',
        availableSlots: 5,
        canFit: true,
      },
    ];
    
    render(
      <GlobalLoadoutTray
        {...defaultProps}
        onQuickAssign={jest.fn()}
        availableLocations={availableLocations}
        selectedEquipmentId="equip-1"
      />
    );
    
    // Equipment name appears in both the item row and the selection footer
    expect(screen.getAllByText('Medium Laser').length).toBeGreaterThanOrEqual(1);
  });

  it('should accept onUnassignEquipment prop', () => {
    const allocated = createEquipment({
      instanceId: 'allocated-1',
      name: 'Allocated Laser',
      isAllocated: true,
      location: 'Right Torso',
    });
    
    render(
      <GlobalLoadoutTray
        {...defaultProps}
        equipment={[allocated]}
        onUnassignEquipment={jest.fn()}
        selectedEquipmentId="allocated-1"
      />
    );
    
    // Equipment name appears in both the item row and the selection footer
    expect(screen.getAllByText('Allocated Laser').length).toBeGreaterThanOrEqual(1);
  });

  it('should group equipment by category', () => {
    const equipment = [
      createEquipment({ instanceId: 'e1', name: 'Laser', category: EquipmentCategory.ENERGY_WEAPON }),
      createEquipment({ instanceId: 'e2', name: 'AC/20', category: EquipmentCategory.BALLISTIC_WEAPON }),
    ];
    
    render(<GlobalLoadoutTray {...defaultProps} equipment={equipment} />);
    
    expect(screen.getByText(/Energy/i)).toBeInTheDocument();
    expect(screen.getByText(/Ballistic/i)).toBeInTheDocument();
  });

  it('should display empty state when no equipment', () => {
    render(<GlobalLoadoutTray {...defaultProps} equipment={[]} equipmentCount={0} />);
    
    expect(screen.getByText(/No equipment/i)).toBeInTheDocument();
  });
});

