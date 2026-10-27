import { fireEvent, render, screen } from '@testing-library/react';

import { MechLocation } from '@/types/construction';

import type { SlotContent } from '../criticalSlotTypes';

import { LocationGrid } from '../LocationGrid';

it('keeps every row in a merged block individually named, selectable, removable and draggable', () => {
  const slots: SlotContent[] = Array.from({ length: 10 }, (_, index) => ({
    index,
    type: 'equipment',
    name: 'AC/20',
    equipmentId: 'ac20',
    totalSlots: 10,
    isFirstSlot: index === 0,
    isLastSlot: index === 9,
  }));
  const onSlotClick = jest.fn();
  const onEquipmentRemove = jest.fn();
  const onEquipmentDrop = jest.fn();
  const onEquipmentDragStart = jest.fn();
  render(
    <LocationGrid
      location={MechLocation.RIGHT_TORSO}
      data={{
        location: MechLocation.RIGHT_TORSO,
        slots,
        entries: [],
        isSuperheavy: false,
      }}
      selectedEquipmentId="ac20"
      assignableSlots={[10, 11]}
      onSlotClick={onSlotClick}
      onEquipmentRemove={onEquipmentRemove}
      onEquipmentDrop={onEquipmentDrop}
      onEquipmentDragStart={onEquipmentDragStart}
    />,
  );
  expect(screen.getAllByText('AC/20')).toHaveLength(1);
  expect(screen.getByText('10 slots')).toBeInTheDocument();
  expect(screen.getByText('1–10')).toBeInTheDocument();
  for (let slot = 1; slot <= 10; slot++)
    expect(
      screen.queryByText(String(slot), { exact: true }),
    ).not.toBeInTheDocument();
  expect(screen.queryByText('↳')).not.toBeInTheDocument();
  slots.forEach(({ index }) => {
    const cell = screen.getByRole('gridcell', {
      name: `Slot ${index + 1}: AC/20`,
    });
    expect(cell).toHaveAttribute('tabindex', '0');
    expect(cell).toHaveAttribute('aria-selected', 'true');
    cell.focus();
    fireEvent.keyDown(cell, { key: 'Enter' });
    expect(onSlotClick).toHaveBeenLastCalledWith(index);
    fireEvent.keyDown(cell, { key: ' ' });
    expect(onSlotClick).toHaveBeenLastCalledWith(index);
    fireEvent.keyDown(cell, { key: 'Delete' });
    expect(onEquipmentRemove).toHaveBeenLastCalledWith(index);
    const setData = jest.fn();
    fireEvent.dragStart(cell, { dataTransfer: { setData } });
    expect(setData).toHaveBeenCalledWith('text/equipment-id', 'ac20');
    expect(onEquipmentDragStart).toHaveBeenLastCalledWith('ac20');
    fireEvent.drop(cell, {
      dataTransfer: { getData: () => 'other-equipment' },
    });
    expect(onEquipmentDrop).not.toHaveBeenCalled();
  });
  fireEvent.drop(screen.getByRole('gridcell', { name: 'Empty slot 11' }), {
    dataTransfer: { getData: () => 'other-equipment' },
  });
  expect(onEquipmentDrop).toHaveBeenCalledWith(10, 'other-equipment');
});
