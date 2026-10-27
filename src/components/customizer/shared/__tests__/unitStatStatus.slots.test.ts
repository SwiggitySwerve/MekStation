import { describeSlotFill, getSlotFillStatus } from '../unitStatStatus';

describe('slot fill readout', () => {
  const placed = { used: 66, total: 78 };

  it('is normal when everything is placed and under capacity', () => {
    expect(getSlotFillStatus(placed)).toBe('normal');
    expect(describeSlotFill(placed)).toBe('66 of 78 slots filled, 12 free.');
  });

  it('stays neutral while an item is unplaced and counts only placed slots', () => {
    const fill = {
      used: 69,
      total: 78,
      placed: 66,
      pendingSlots: 3,
      unplacedItems: 1,
    };
    // The Unplaced equipment warning carries it; the budget is not a second one.
    expect(getSlotFillStatus(fill)).toBe('normal');
    expect(describeSlotFill(fill)).toBe(
      '66 of 78 slots filled \u00b7 3 pending (1 unplaced item).',
    );
    expect(
      describeSlotFill({ ...fill, pendingSlots: 5, unplacedItems: 2 }),
    ).toBe('66 of 78 slots filled \u00b7 5 pending (2 unplaced items).');
    expect(describeSlotFill(fill, false)).toBe(
      '66 of 78 slots filled \u00b7 3 pending.',
    );
  });

  it('stays an error over capacity, pending or not', () => {
    expect(
      getSlotFillStatus({ used: 80, total: 78, placed: 77, pendingSlots: 3 }),
    ).toBe('error');
    expect(getSlotFillStatus({ used: 80, total: 78 })).toBe('error');
  });
});
