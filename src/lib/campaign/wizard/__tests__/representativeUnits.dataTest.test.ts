import path from 'path';

import { prewarmCatalogBV } from '@/services/encounter/bvCatalogPrewarmer';
import { NodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { WeightClass } from '@/types/enums/WeightClass';

import { WIZARD_REPRESENTATIVE_UNITS } from '../representativeUnits';

const PROJECT_ROOT = path.resolve(__dirname, '../../../../../');
const PLACEHOLDER_BV = 1000;

describe('wizard representative units', () => {
  it('keeps one resolvable canonical unit with positive BV per standard weight class', async () => {
    const service = new NodeCanonicalUnitService(PROJECT_ROOT);
    const catalog = await service.getIndex();
    const prewarmed = await prewarmCatalogBV(
      catalog,
      service,
      service.getCatalogVersion(),
      { skipCache: true },
    );
    const catalogById = new Map(
      prewarmed.catalog.map((entry) => [entry.id, entry]),
    );

    expect(WIZARD_REPRESENTATIVE_UNITS).toHaveLength(4);
    expect(WIZARD_REPRESENTATIVE_UNITS.map((unit) => unit.weightClass)).toEqual(
      [
        WeightClass.LIGHT,
        WeightClass.MEDIUM,
        WeightClass.HEAVY,
        WeightClass.ASSAULT,
      ],
    );
    expect(
      new Set(WIZARD_REPRESENTATIVE_UNITS.map((unit) => unit.unitRef)).size,
    ).toBe(WIZARD_REPRESENTATIVE_UNITS.length);

    for (const representativeUnit of WIZARD_REPRESENTATIVE_UNITS) {
      const fullUnit = await service.getById(representativeUnit.unitRef);
      const catalogEntry = catalogById.get(representativeUnit.unitRef);

      expect(fullUnit).not.toBeNull();
      expect(catalogEntry).toBeDefined();
      expect(catalogEntry?.name).toBe(representativeUnit.unitName);
      expect(catalogEntry?.weightClass).toBe(representativeUnit.weightClass);
      expect(catalogEntry?.tonnage).toBeGreaterThan(0);
      expect(fullUnit?.tonnage).toBe(catalogEntry?.tonnage);
      expect(catalogEntry?.bv ?? 0).toBeGreaterThan(0);
      expect(catalogEntry?.bv).not.toBe(PLACEHOLDER_BV);
    }
  });
});
