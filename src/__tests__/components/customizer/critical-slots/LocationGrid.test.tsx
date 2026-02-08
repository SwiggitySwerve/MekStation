import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { LocationGrid } from '@/components/customizer/critical-slots/LocationGrid';
import { MechLocation } from '@/types/construction';

// Mock SlotRow
jest.mock('@/components/customizer/critical-slots/SlotRow', () => ({
  SlotRow: ({
    slot,
    onClick,
  }: {
    slot: {
      index: number;
      type: string;
      name?: string;
      equipmentName?: string;
    };
    onClick: () => void;
  }) => (
    <div data-testid={`slot-${slot.index}`} onClick={onClick}>
      {slot.type === 'empty'
        ? 'Empty'
        : slot.equipmentName || slot.name || 'Unknown'}
    </div>
  ),
}));

describe('LocationGrid', () => {
  const defaultProps = {
    location: MechLocation.HEAD,
    data: {
      location: MechLocation.HEAD,
      slots: [] as { index: number; type: 'empty' | 'system' | 'equipment' }[],
      entries: [] as {
        index: number;
        primary: { index: number; type: 'empty' | 'system' | 'equipment' };
        isDoubleSlot: boolean;
      }[],
      isSuperheavy: false,
    },
    assignableSlots: [],
    onSlotClick: jest.fn(),
    onEquipmentDrop: jest.fn(),
    onEquipmentRemove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render location label', () => {
    render(<LocationGrid {...defaultProps} />);

    expect(screen.getByText('Head')).toBeInTheDocument();
  });

  it('should render all slots for location', () => {
    render(<LocationGrid {...defaultProps} location={MechLocation.HEAD} />);

    // Head has 6 slots
    expect(screen.getByTestId('slot-0')).toBeInTheDocument();
    expect(screen.getByTestId('slot-5')).toBeInTheDocument();
  });

  it('should render slots with equipment', () => {
    const data = {
      location: MechLocation.HEAD,
      slots: [
        {
          index: 0,
          type: 'equipment' as const,
          equipmentId: 'equip-1',
          equipmentName: 'Medium Laser',
        },
      ],
      entries: [
        {
          index: 0,
          primary: {
            index: 0,
            type: 'equipment' as const,
            equipmentId: 'equip-1',
            equipmentName: 'Medium Laser',
          },
          isDoubleSlot: false,
        },
      ],
      isSuperheavy: false,
    };

    render(<LocationGrid {...defaultProps} data={data} />);

    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
  });

  it('should call onSlotClick when slot is clicked', async () => {
    const user = userEvent.setup();
    render(<LocationGrid {...defaultProps} />);

    const slot = screen.getByTestId('slot-0');
    await user.click(slot);

    expect(defaultProps.onSlotClick).toHaveBeenCalledWith(0);
  });

  it('should highlight assignable slots', () => {
    render(<LocationGrid {...defaultProps} assignableSlots={[0, 1]} />);

    expect(screen.getByTestId('slot-0')).toBeInTheDocument();
    expect(screen.getByTestId('slot-1')).toBeInTheDocument();
  });

  it('should highlight selected equipment', () => {
    const data = {
      location: MechLocation.HEAD,
      slots: [
        {
          index: 0,
          type: 'equipment' as const,
          equipmentId: 'equip-1',
          equipmentName: 'Medium Laser',
        },
      ],
      entries: [
        {
          index: 0,
          primary: {
            index: 0,
            type: 'equipment' as const,
            equipmentId: 'equip-1',
            equipmentName: 'Medium Laser',
          },
          isDoubleSlot: false,
        },
      ],
      isSuperheavy: false,
    };

    render(
      <LocationGrid
        {...defaultProps}
        data={data}
        selectedEquipmentId="equip-1"
      />,
    );

    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
  });

  it('should render different location labels', () => {
    const { rerender } = render(
      <LocationGrid {...defaultProps} location={MechLocation.CENTER_TORSO} />,
    );
    expect(screen.getByText('Center Torso')).toBeInTheDocument();

    rerender(
      <LocationGrid {...defaultProps} location={MechLocation.LEFT_ARM} />,
    );
    expect(screen.getByText('Left Arm')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <LocationGrid {...defaultProps} className="custom-class" />,
    );

    const grid = container.firstChild;
    expect(grid).toHaveClass('custom-class');
  });
});
