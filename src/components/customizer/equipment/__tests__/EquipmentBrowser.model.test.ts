import {
  countCatalogMounts,
  getCatalogCapacity,
  getCatalogWeightExcess,
} from '../EquipmentBrowser.model';

describe('catalog capacity annotations', () => {
  it.each([
    [3, 4, null],
    [4, 4, null],
    [7, 4, 3],
    [3, -2, 5],
    [0, 0, null],
  ])(
    'compares %s tons with %s tons remaining',
    (weight, remaining, expected) => {
      expect(getCatalogWeightExcess({ weight }, remaining)).toBe(expected);
    },
  );

  it('does not guess variable weights or missing unit capacity', () => {
    expect(
      getCatalogWeightExcess(
        { weight: 7, variableEquipmentId: 'targeting-computer' },
        4,
      ),
    ).toBeNull();
    expect(getCatalogWeightExcess({ weight: 7 }, undefined)).toBeNull();
  });

  it('projects existing totals without hiding deficits', () => {
    expect(
      getCatalogCapacity({
        weightRemaining: -2,
        criticalSlotsTotal: 78,
        criticalSlotsUsed: 62,
      }),
    ).toEqual({ remainingWeight: -2, remainingSlots: 16 });
  });

  it('counts loadout instances by exact equipment identity, including unassigned items', () => {
    const counts = countCatalogMounts([
      { equipmentId: 'medium-laser' },
      { equipmentId: 'medium-laser' },
      { equipmentId: 'medium-pulse-laser' },
    ]);
    expect(counts.get('medium-laser')).toBe(2);
    expect(counts.get('medium-pulse-laser')).toBe(1);
    expect(counts.has('large-laser')).toBe(false);
  });
});
