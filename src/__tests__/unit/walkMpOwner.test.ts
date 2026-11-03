/**
 * Follow-up 76: every walk-MP surface agrees with the single owner
 * `calculateRatedWalkMP` (MegaMek 48fcb2f6 Mek.calculateWalk(): a primitive
 * engine's rating is divided by 1.2 and rounded up to five).
 *
 * 25t, rating 100: plain walk 4; primitive ceil(100/1.2/5)*5 = 85 -> walk 3.
 */
import { renderHook } from '@testing-library/react';

import {
  calculateWalkMP as hookCalculateWalkMP,
  useMovementCalculations,
} from '@/hooks/useMovementCalculations';
import { createDefaultUnitState } from '@/stores/unitState';
import { createUnitStore } from '@/stores/useUnitStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { TechBase } from '@/types/enums/TechBase';
import { calculateEngine } from '@/utils/construction/constructionRules/components';
import { validateConstruction } from '@/utils/construction/constructionRules/validation';
import { calculateWalkMP } from '@/utils/construction/engineCalculations';
import { JumpJetType } from '@/utils/construction/movementCalculations';

const PRIMITIVE = CockpitType.PRIMITIVE;

function primitiveStore() {
  const store = createUnitStore(
    createDefaultUnitState({
      name: 'Commando',
      tonnage: 25,
      techBase: TechBase.INNER_SPHERE,
    }),
  );
  store.setState({ engineRating: 100, cockpitType: PRIMITIVE });
  return store;
}

describe('walk MP has one owner', () => {
  it('engineCalculations.calculateWalkMP takes the cockpit', () => {
    expect(calculateWalkMP(100, 25)).toBe(4);
    expect(calculateWalkMP(100, 25, PRIMITIVE)).toBe(3);
    expect(calculateWalkMP(0, 25, PRIMITIVE)).toBe(0);
  });

  it('hook calculateWalkMP and useMovementCalculations take the cockpit', () => {
    expect(hookCalculateWalkMP(100, 25)).toBe(4);
    expect(hookCalculateWalkMP(100, 25, PRIMITIVE)).toBe(3);
    const input = {
      tonnage: 25,
      engineRating: 100,
      jumpMP: 0,
      jumpJetType: JumpJetType.STANDARD,
      enhancement: null,
    };
    expect(
      renderHook(() => useMovementCalculations(input)).result.current.walkMP,
    ).toBe(4);
    expect(
      renderHook(() =>
        useMovementCalculations({ ...input, cockpitType: PRIMITIVE }),
      ).result.current,
    ).toMatchObject({ walkMP: 3, runMP: 5, maxJumpMP: 3 });
  });

  it('store jump MP and jump-jet type clamp to the primitive walk MP', () => {
    const store = primitiveStore();
    store.getState().setJumpMP(10);
    expect(store.getState().jumpMP).toBe(3);

    const other = primitiveStore();
    other.setState({ jumpMP: 5, jumpJetType: JumpJetType.IMPROVED });
    other.getState().setJumpJetType(JumpJetType.STANDARD);
    expect(other.getState().jumpMP).toBe(3);
  });

  it('store keeps a non-primitive mech unchanged', () => {
    const store = primitiveStore();
    store.setState({ cockpitType: CockpitType.STANDARD });
    store.getState().setJumpMP(10);
    expect(store.getState().jumpMP).toBe(4);
  });

  it('construction rules judge the primitive walk MP', () => {
    // Rating 105 in a 100t mech: plain walk 1, primitive ceil(105/1.2/5)*5 = 90 -> 0.
    expect(calculateEngine(100, 105, EngineType.STANDARD).errors).toEqual([]);
    expect(
      calculateEngine(100, 105, EngineType.STANDARD, PRIMITIVE).errors,
    ).toEqual(['Engine rating 105 provides less than 1 walk MP for 100t mech']);

    const config = {
      tonnage: 100,
      engineRating: 105,
      engineType: EngineType.STANDARD,
      gyroType: GyroType.STANDARD,
      internalStructureType: InternalStructureType.STANDARD,
      armorType: ArmorTypeEnum.STANDARD,
      totalArmorPoints: 0,
      cockpitType: PRIMITIVE,
      heatSinkType: HeatSinkType.SINGLE,
      totalHeatSinks: 10,
      jumpMP: 0,
    };
    expect(validateConstruction(config).errors.join('\n')).toContain(
      'less than 1 walk MP',
    );
    expect(
      validateConstruction({
        ...config,
        cockpitType: CockpitType.STANDARD,
      }).errors.join('\n'),
    ).not.toContain('less than 1 walk MP');
  });
});
