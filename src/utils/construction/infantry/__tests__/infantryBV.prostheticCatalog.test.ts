import { NodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { calculateUnitBV } from '@/utils/construction/bvAdapter';
import { infantryCatalogFacts } from '@/utils/construction/infantry/infantrySourceMounts';

// Catalog counts share the enhancement's key; BV reads them as `<key>Count`.
it('keeps catalog prosthetic enhancement names apart from their counts', () => {
  const unit = new NodeCanonicalUnitService().getByIdSync(
    'manei-domini-attack-squad-tau-zombie',
    { family: 'infantry', strict: true },
  );
  if (!unit) throw new Error('Missing catalog unit');
  expect(infantryCatalogFacts(unit)?.tags).toMatchObject({
    prostheticEnhancement1: 'BALLISTIC',
    prostheticEnhancement1Count: '2',
    prostheticEnhancement2: 'GRAPPLER',
    prostheticEnhancement2Count: '2',
  });
  expect(calculateUnitBV(unit)).toBeGreaterThan(0);
});
