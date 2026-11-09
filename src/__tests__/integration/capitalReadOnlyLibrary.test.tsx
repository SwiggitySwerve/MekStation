import { mapCustomUnitIndexEntry } from '@/services/units/unitIndexMapper';
import { Era } from '@/types/enums/Era';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

describe('custom library index projection', () => {
  const row = {
    id: 'custom-capital',
    chassis: 'Union',
    variant: '',
    tonnage: 3600,
    techBase: TechBase.INNER_SPHERE,
    era: Era.STAR_LEAGUE,
    rulesLevel: RulesLevel.STANDARD,
    weightClass: WeightClass.ASSAULT,
    unitType: UnitType.DROPSHIP,
    currentVersion: 1,
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-09T00:00:00.000Z',
  };

  it('retains family, identity, blank model and version when opening a custom record', () => {
    expect(mapCustomUnitIndexEntry({ ...row, family: 'capital' })).toEqual({
      family: 'capital',
      id: row.id,
      chassis: 'Union',
      variant: '',
      tonnage: 3600,
      techBase: row.techBase,
      era: row.era,
      weightClass: row.weightClass,
      unitType: UnitType.DROPSHIP,
      name: 'Union ',
      filePath: '',
      source: 'custom',
      currentVersion: 1,
    });
  });

  it('preserves omission of the legacy default family', () => {
    expect(mapCustomUnitIndexEntry(row)).not.toHaveProperty('family');
  });
});
