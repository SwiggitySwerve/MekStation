import {
  type IEnvironmentalConditions,
  IGameState,
  IHexGrid,
  IToHitModifier,
} from '@/types/gameplay';
import { isEnergyWeapon } from '@/utils/gameplay/ammoTracking';
import { calculateEnvironmentalModifiers } from '@/utils/gameplay/environmentalModifiers';
import { isMissileWeapon } from '@/utils/gameplay/specialWeaponMechanics';
import { calculateToHit } from '@/utils/gameplay/toHit';

import type { IWeapon } from '../../ai/types';

import { modifiersToPayload } from './weaponAttackHelpers';
import { validateLineOfSightForAttack } from './weaponAttackLineOfSight';
import {
  calculateInterveningTerrainToHitModifier,
  calculateTargetTerrainToHitModifier,
} from './weaponAttackTerrainModifiers';

export function buildWeaponAttackModifierPayload(options: {
  readonly toHitCalc: ReturnType<typeof calculateToHit>;
  readonly indirectFirePenalty: number;
  readonly modeToHitModifier: IToHitModifier | null;
  readonly iNarcHomingModifier: IToHitModifier | null;
  readonly iNarcHaywireModifier: IToHitModifier | null;
  readonly grid: IHexGrid | undefined;
  readonly lineOfSight: ReturnType<typeof validateLineOfSightForAttack>;
  readonly targetPosition: IGameState['units'][string]['position'];
  readonly environmentalConditions: IEnvironmentalConditions | undefined;
  readonly weapon: IWeapon;
  readonly attacker: IGameState['units'][string];
  readonly target: IGameState['units'][string];
}): {
  readonly toHitNumber: number;
  readonly modifiers: ReturnType<typeof modifiersToPayload>;
} {
  const {
    attacker,
    environmentalConditions,
    grid,
    iNarcHaywireModifier,
    iNarcHomingModifier,
    indirectFirePenalty,
    lineOfSight,
    modeToHitModifier,
    target,
    targetPosition,
    toHitCalc,
    weapon,
  } = options;
  const baseModifiers = modifiersToPayload(toHitCalc.modifiers);
  const declaredModifiers =
    indirectFirePenalty > 0
      ? [
          ...baseModifiers,
          {
            name: 'Indirect fire',
            value: indirectFirePenalty,
            source: 'other' as const,
          },
        ]
      : baseModifiers;
  const modeAdjustedModifiers =
    modeToHitModifier !== null
      ? [...declaredModifiers, modeToHitModifier]
      : declaredModifiers;
  const guidanceAdjustedModifiers =
    iNarcHomingModifier !== null
      ? [...modeAdjustedModifiers, iNarcHomingModifier]
      : modeAdjustedModifiers;
  const iNarcAdjustedModifiers =
    iNarcHaywireModifier !== null
      ? [...guidanceAdjustedModifiers, iNarcHaywireModifier]
      : guidanceAdjustedModifiers;
  const interveningTerrainModifier = calculateInterveningTerrainToHitModifier(
    grid,
    lineOfSight.losResult,
  );
  const targetTerrainModifier = calculateTargetTerrainToHitModifier(
    grid,
    targetPosition,
  );
  const terrainAdjustedToHit =
    toHitCalc.finalToHit +
    indirectFirePenalty +
    (modeToHitModifier?.value ?? 0) +
    (iNarcHomingModifier?.value ?? 0) +
    (iNarcHaywireModifier?.value ?? 0) +
    (targetTerrainModifier?.value ?? 0) +
    (interveningTerrainModifier?.value ?? 0);
  const finalDeclaredModifiers = [
    ...iNarcAdjustedModifiers,
    ...(targetTerrainModifier ? [targetTerrainModifier] : []),
    ...(interveningTerrainModifier ? [interveningTerrainModifier] : []),
  ];
  const environmentalModifiers =
    environmentalConditions !== undefined
      ? calculateEnvironmentalModifiers(environmentalConditions, {
          isEnergyWeapon: isEnergyWeapon(weapon.name),
          isMissileWeapon:
            isMissileWeapon(weapon.id) || isMissileWeapon(weapon.name),
          pilotAbilities: attacker.abilities,
          designatedEnvironment: attacker.designatedEnvironment,
          targetIlluminated: target.isIlluminated,
        })
      : [];
  const environmentalModifierTotal = environmentalModifiers.reduce(
    (total, modifier) => total + modifier.value,
    0,
  );
  return {
    toHitNumber: terrainAdjustedToHit + environmentalModifierTotal,
    modifiers:
      environmentalModifiers.length > 0
        ? [
            ...finalDeclaredModifiers,
            ...modifiersToPayload(environmentalModifiers),
          ]
        : finalDeclaredModifiers,
  };
}
