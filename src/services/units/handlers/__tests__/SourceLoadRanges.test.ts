import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { validateTonnage } from '@/utils/construction/aerospace/validationRules';

import { createSmallCraftHandler } from '../SmallCraftUnitHandler';
import { createVTOLHandler } from '../VTOLUnitHandler';
import { createMockBlkDocument as smallCraftDocument } from './SmallCraftUnitHandler.test-helpers';
import { createMockBlkDocument as vtolDocument } from './VTOLUnitHandler.test-helpers';

describe('existing source-family construction tonnage diagnostics', () => {
  const smallCraft = createSmallCraftHandler();
  const vtol = createVTOLHandler();

  it.each([
    [99, ['Small craft tonnage must be at least 100 tons']],
    [100, []],
    [200, []],
    [201, ['Small craft tonnage cannot exceed 200 tons']],
  ] as const)(
    'preserves SmallCraft diagnostics at %s tons',
    (tonnage, errors) => {
      const parsed = smallCraft.parse(smallCraftDocument());
      if (!parsed.success) throw new Error('Expected valid reference craft');
      expect(
        smallCraft.validate({
          ...parsed.data.unit,
          tonnage,
          totalWeight: tonnage,
        }).errors,
      ).toEqual(errors);
      const rules = validateTonnage(tonnage, AerospaceSubType.SMALL_CRAFT);
      expect(rules).toEqual(
        errors.length
          ? [
              {
                ruleId: 'VAL-AERO-TONNAGE',
                message: `SmallCraft tonnage must be 100–200 tons; got ${tonnage}t`,
              },
            ]
          : [],
      );
    },
  );

  it.each([
    [0.5, ['VTOL tonnage must be at least 1 tons']],
    [1, []],
    [30, []],
    // SuperHeavy VTOLs (VTOL.isSuperHeavy: weight > 30) reach 60 t (TestTank.maxTonnage)
    [31, []],
    [60, []],
    [61, ['VTOL tonnage cannot exceed 60 tons']],
  ] as const)('preserves VTOL diagnostics at %s tons', (tonnage, errors) => {
    const parsed = vtol.parse(vtolDocument({ armor: [0, 0, 0, 0, 0] }));
    if (!parsed.success) throw new Error('Expected valid reference VTOL');
    expect(
      vtol.validate({ ...parsed.data.unit, tonnage, totalWeight: tonnage })
        .errors,
    ).toEqual(errors);
  });
});
