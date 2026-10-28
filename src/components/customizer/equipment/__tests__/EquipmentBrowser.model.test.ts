import {
  countCatalogMounts,
  describeCatalogWeightExcess,
  getCatalogCapacity,
  getCatalogCapacityNotice,
  getCatalogWeightExcess,
  getCompactAvailabilitySummary,
  getRowFillPadding,
  getWholeRowListHeight,
  isCatalogWeightExhausted,
  isVariableSizeEquipment,
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
      state: 'free',
    });
    expect(
      getCatalogCapacityNotice({ remainingWeight: 0.5, remainingSlots: 1 })
        .slotsText,
    ).toBe('1 slot free');
  });

  it('reads a plain status with tonnage free and a separate limit note when exactly full', () => {
    const free = getCatalogCapacityNotice({
      remainingWeight: 4,
      remainingSlots: 16,
    });
    expect(free).toMatchObject({ state: 'free', weightText: '4.0 t free' });
    expect(free.limitText).toBeUndefined();
    expect(
      getCatalogCapacityNotice({ remainingWeight: 0, remainingSlots: 12 }),
    ).toMatchObject({
      state: 'full',
      weightText: '0.0 t free',
      compactWeightText: '0.0 t free',
      slotsText: '12 slots free',
      limitText: 'At tonnage limit',
    });
    expect(
      getCatalogCapacityNotice({
        remainingWeight: 0,
        remainingSlots: 12,
        tonnage: 100,
      }).limitReason,
    ).toBe('adding equipment will exceed 100.0 t');
    expect(
      getCatalogCapacityNotice({ remainingWeight: 0, remainingSlots: 12 })
        .limitReason,
    ).toBeUndefined();
    expect(
      getCatalogCapacityNotice({
        remainingWeight: 4,
        remainingSlots: 16,
        tonnage: 100,
      }).limitReason,
    ).toBeUndefined();
  });

  it.each([0.004, -0.004, 0.0049])(
    'treats %s t as exactly full, never as free or over',
    (remainingWeight) => {
      expect(
        getCatalogCapacityNotice({ remainingWeight, remainingSlots: 2 }),
      ).toMatchObject({
        state: 'full',
        weightText: '0.0 t free',
        limitText: 'At tonnage limit',
      });
    },
  );

  it('names the deficit and the fix only when the unit is over its limit', () => {
    expect(
      getCatalogCapacityNotice({ remainingWeight: -7, remainingSlots: 3 }),
    ).toMatchObject({
      state: 'over',
      weightText: 'Over by 7.0 t \u2014 remove equipment or armor',
      compactWeightText: 'Over by 7.0 t',
      slotsText: '3 slots free',
    });
    expect(
      getCatalogCapacityNotice({ remainingWeight: -0.5, remainingSlots: 3 })
        .weightText,
    ).toBe('Over by 0.5 t \u2014 remove equipment or armor');
  });
  it('projects existing totals without hiding deficits', () => {
    expect(
      getCatalogCapacity({
        weightRemaining: -2,
        criticalSlotsTotal: 78,
        criticalSlotsUsed: 62,
        tonnage: 100,
      }),
    ).toEqual({ remainingWeight: -2, remainingSlots: 16, tonnage: 100 });
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

describe('isVariableSizeEquipment', () => {
  it.each([
    [{ variableEquipmentId: 'masc-is' }, true],
    [{ special: ['Variable weight', 'Variable critical slots'] }, true],
    [{ special: ['Variable critical slots'] }, true],
    [{ special: ['Designates targets'] }, false],
    [{}, false],
  ])('classifies %j as variable=%s', (item, expected) => {
    expect(isVariableSizeEquipment(item)).toBe(expected);
  });
});

describe('compact availability summary', () => {
  it.each([
    ['Inner Sphere', 3028, 'IS · 3028'],
    ['Clan', 3060, 'Clan · 3060'],
    [null, 3028, '3028'],
    ['Inner Sphere', null, 'IS'],
    [null, null, ''],
  ])('summarises %s / %s as "%s"', (techBase, year, expected) => {
    expect(getCompactAvailabilitySummary(techBase, year)).toBe(expected);
  });
});

describe('getWholeRowListHeight', () => {
  it('ends the list on the last row that fits', () => {
    expect(getWholeRowListHeight([73, 126, 199, 252], 230)).toBe(199);
  });

  it('keeps the full height when every row fits or none does', () => {
    expect(getWholeRowListHeight([73, 126], 230)).toBeNull();
    expect(getWholeRowListHeight([], 230)).toBeNull();
    expect(getWholeRowListHeight([300, 360], 230)).toBeNull();
  });

  it('keeps a row that ends exactly at the edge', () => {
    expect(getWholeRowListHeight([100, 200, 300], 200)).toBe(200);
  });
});

describe('getRowFillPadding', () => {
  it('spreads the band above the pager over the rows that fit', () => {
    // Header 28 + 45px rows. At 180px three rows fit with a 17px band, so
    // each grows by 5.5px; at 205px the 42px band would need 14px a row,
    // over the cap, so the rows keep their height.
    expect(getRowFillPadding([73, 118, 163, 208], 180)).toBe(5.5);
    expect(getRowFillPadding([73, 118, 163, 208], 205)).toBe(0);
  });

  it('rounds down so the last fitting row never crosses the edge', () => {
    const extra = getRowFillPadding([73, 118, 163, 208], 170);
    expect(extra).toBe(2.25);
    expect(163 + 3 * extra).toBeLessThanOrEqual(170);
  });

  it('adds nothing when every row fits or none does', () => {
    expect(getRowFillPadding([73, 118], 230)).toBe(0);
    expect(getRowFillPadding([300, 360], 230)).toBe(0);
    expect(getRowFillPadding([], 230)).toBe(0);
  });

  it('adds nothing when the rows already end at the edge', () => {
    expect(getRowFillPadding([100, 200, 300], 200)).toBe(0);
  });
});
