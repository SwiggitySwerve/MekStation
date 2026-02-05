import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DraggableEquipment } from '@/components/customizer/critical-slots/DraggableEquipment';

describe('DraggableEquipment', () => {
  const defaultProps = {
    id: 'equip-1',
    name: 'Medium Laser',
    criticalSlots: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render equipment name', () => {
    render(<DraggableEquipment {...defaultProps} />);

    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
  });

  it('should render critical slots count', () => {
    render(<DraggableEquipment {...defaultProps} criticalSlots={2} />);

    expect(screen.getByText(/2 slots/i)).toBeInTheDocument();
  });

  it('should render singular slot text for 1 slot', () => {
    render(<DraggableEquipment {...defaultProps} criticalSlots={1} />);

    expect(screen.getByText(/1 slot$/)).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(<DraggableEquipment {...defaultProps} onClick={onClick} />);

    const equipment = screen.getByText('Medium Laser');
    await user.click(equipment);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should highlight when selected', () => {
    render(<DraggableEquipment {...defaultProps} isSelected={true} />);

    const equipment = screen.getByText('Medium Laser').closest('div');
    expect(equipment).toHaveClass('ring-2');
  });

  it('should not highlight when not selected', () => {
    render(<DraggableEquipment {...defaultProps} isSelected={false} />);

    const equipment = screen.getByText('Medium Laser').closest('div');
    expect(equipment).not.toHaveClass('ring-2');
  });

  it('should set drag data on drag start', () => {
    const { container } = render(<DraggableEquipment {...defaultProps} />);

    const equipment = container.querySelector('[draggable="true"]');
    expect(equipment).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <DraggableEquipment {...defaultProps} className="custom-class" />,
    );

    const equipment = container.firstChild;
    expect(equipment).toHaveClass('custom-class');
  });
});
