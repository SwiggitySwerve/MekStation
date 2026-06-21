import { normalizeEquipmentId as normalizeMtfEquipmentId } from '@/services/conversion/MTFParser.mapping';
import { normalizeEquipmentId as normalizeUnitLoaderEquipmentId } from '@/services/units/unitLoaderService/equipmentResolution';
import { normalizeHydrationEquipmentId } from '@/simulation/runner/UnitHydrationText';
import { TechBase } from '@/types/enums/TechBase';
import { normalizeEquipmentId as normalizeCanonicalEquipmentId } from '@/utils/construction/equipmentBV/normalization';

describe('equipment normalization agreement', () => {
  const corpus = [
    ['Ultra AC/5', 'uac-5'],
    ['Clan ER PPC', 'clan-er-ppc'],
    ['LB 10-X AC', 'lb-10-x-ac'],
    ['Rotary AC/5', 'rac-5'],
    ['Streak SRM Ammo', 'streak-srm-ammo'],
  ] as const;

  it.each(corpus)(
    'routes %s through one canonical catalog key',
    (input, expected) => {
      const outputs = {
        canonical: normalizeCanonicalEquipmentId(input),
        mtf: normalizeMtfEquipmentId(input),
        unitLoader: normalizeUnitLoaderEquipmentId(input, TechBase.CLAN),
        hydration: normalizeHydrationEquipmentId(input),
      };

      expect(outputs).toEqual({
        canonical: expected,
        mtf: expected,
        unitLoader: expected,
        hydration: expected,
      });
    },
  );
});
