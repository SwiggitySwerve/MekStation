import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { validateSavedBattleMechIndex } from '../savedCustomUnitCampaignAdapter';

const valid = {
  id: 'custom-whm-6r-saved',
  name: 'Warhammer WHM-6R Custom',
  tonnage: 70,
  unitType: UnitType.BATTLEMECH,
};

describe('validateSavedBattleMechIndex', () => {
  it('maps exact identity and excludes invalid rows without inference', () => {
    const result = validateSavedBattleMechIndex([
      { ...valid, chassis: 'Ignored' },
      { ...valid, id: '' },
      { ...valid, id: 'veh-1', unitType: UnitType.VEHICLE },
      { ...valid, id: 'nameless', name: '   ' },
      { ...valid, id: 'zero-t', tonnage: 0 },
      { ...valid, id: 'inf-t', tonnage: Number.POSITIVE_INFINITY },
      { ...valid, id: 'str-t', tonnage: '70' },
    ]);
    expect(result.options).toEqual([
      {
        id: valid.id,
        name: valid.name,
        tonnage: 70,
        currentVersion: 1,
      },
    ]);
    expect(result.options[0]?.id).not.toContain('Warhammer');
    expect(result.rejected.map((entry) => entry.reason)).toEqual([
      'empty-id',
      'non-battlemech',
      'empty-name',
      'invalid-tonnage',
      'invalid-tonnage',
      'invalid-tonnage',
    ]);
  });
});
