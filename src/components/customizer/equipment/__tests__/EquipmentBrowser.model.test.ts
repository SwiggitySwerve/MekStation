import {
  countCatalogMounts,
  describeCatalogWeightExcess,
  getCatalogCapacity,
  getCatalogCapacityNotice,
  getCatalogWeightExcess,
  isCatalogWeightExhausted,
} from '../EquipmentBrowser.model';

describe('catalog capacity annotations', () => {
  it.each([
    [3, 4, null],
    [4, 4, null],
    [7, 4, 3],
    [4.5, 4, 0.5],
    // With nothing free (or already overweight) the capacity notice covers
    // every row, so no row is annotated individually.
    [3, 0, null],
    [3, -2, null],
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

  it('describes an excess for assistive technology', () => {
    expect(describeCatalogWeightExcess(3)).toBe('exceeds free weight by 3.0 t');
    expect(describeCatalogWeightExcess(0.5)).toBe(
      'exceeds free weight by 0.5 t',
    );
  });

  it.each([
    [0, true],
    [0.001, true],
    [-2, true],
    [0.5, false],
    [4, false],
    [undefined, false],
  ])('treats %s t free as exhausted: %s', (remaining, expected) => {
    expect(isCatalogWeightExhausted(remaining)).toBe(expected);
  });

  it('shows the plain capacity line while tonnage is free', () => {
    expect(
      getCatalogCapacityNotice({ remainingWeight: 4, remainingSlots: 16 }),
    ).toMatchObject({
      weightText: '4.0 t free',
      slotsText: '16 slots free',
      exhausted: false,
    });
    expect(
      getCatalogCapacityNotice({ remainingWeight: 0.5, remainingSlots: 1 })
        .slotsText,
    ).toBe('1 slot free');
  });

  it('warns once when no tonnage is free', () => {
    expect(
      getCatalogCapacityNotice({ remainingWeight: 0, remainingSlots: 12 }),
    ).toMatchObject({
      weightText:
        '0.0 t free — no tonnage left; anything with weight makes the unit overweight',
      slotsText: '12 slots free',
      exhausted: true,
    });
  });

  it('keeps a deficit as a negative number when the unit is already overweight', () => {
    expect(
      getCatalogCapacityNotice({ remainingWeight: -2, remainingSlots: 3 }),
    ).toMatchObject({
      weightText: '-2.0 t free',
      compactWeightText: '-2.0 t free',
      exhausted: true,
    });
  });

  it('keeps the phone wording short while the full sentence stays available', () => {
    const notice = getCatalogCapacityNotice({
      remainingWeight: 0,
      remainingSlots: 12,
    });
    expect(notice.compactWeightText).toBe('0.0 t free — no tonnage left');
    expect(notice.weightText.startsWith('0.0 t free — no tonnage left;')).toBe(
      true,
    );
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
