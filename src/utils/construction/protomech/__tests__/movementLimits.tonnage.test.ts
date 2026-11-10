/**
 * A tonnage edit keeps the walk, and is refused when the engine rating would be invalid.
 * MegaMekLab 62bf193: PMStructureTab.tonnageChanged recalculates the engine for the new
 * tonnage and refuses the change if it exceeds the maximum (PMStructureTab.java:446-456;
 * recalculateEngineRating :264-276). The refusal carries a reason; walk is never rewritten.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import { computeProtoEngineRating } from '../movementCaps';
import { protoMaxWalkMP, protoTonnageChangeError } from '../movementLimits';

describe('protoTonnageChangeError', () => {
  it('is undefined when the kept walk still has a valid engine', () => {
    expect(protoTonnageChangeError(15, 22, ProtoChassis.BIPED)).toBeUndefined(); // 33 x 15 = 495
    expect(protoTonnageChangeError(9, 4, ProtoChassis.BIPED)).toBeUndefined();
  });

  it('names the tonnage, the walk, the engine rating and the maximum when it refuses', () => {
    const reason = protoTonnageChangeError(15, 40, ProtoChassis.BIPED);
    expect(reason).toContain('15 t');
    expect(reason).toContain('walk 40');
    expect(reason).toContain('engine rating would be 900');
    expect(reason).toContain('500');
  });

  it.each([[ProtoChassis.BIPED], [ProtoChassis.QUAD], [ProtoChassis.GLIDER]])(
    'refuses exactly when the rating passes 500 (%s, every tonnage)',
    (chassis) => {
      for (let tonnage = 2; tonnage <= 15; tonnage++) {
        const walk = protoMaxWalkMP(5, chassis);
        const refused =
          protoTonnageChangeError(tonnage, walk, chassis) !== undefined;
        expect(refused).toBe(
          computeProtoEngineRating(tonnage, walk, chassis) > 500,
        );
      }
    },
  );
});
