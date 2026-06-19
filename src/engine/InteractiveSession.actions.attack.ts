import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';

import { calculateFiringArc } from '@/utils/gameplay/firingArc';
import { determineArc } from '@/utils/gameplay/firingArcs';
import { declareAttack, lockAttack } from '@/utils/gameplay/gameSession';
import { coordToKey, hexDistance } from '@/utils/gameplay/hexMath';
import { isRepresentedVehicleAttacker } from '@/utils/gameplay/hullDownRestrictions';
import {
  gameUnitUsesMekHorizontalCover,
  gameUnitUsesMekWaterCover,
  getTargetCoverInfo,
} from '@/utils/gameplay/terrainCover';
import { calculateTargetTerrainModifierFromHex } from '@/utils/gameplay/toHit';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import type { IApplyAttackInput } from './InteractiveSession.actions.attackTypes';

import { buildSelectedAMSWeaponMounts } from './InteractiveSession.actions.attackAms';
import {
  attackPreResolutionForInteractiveAttack,
  deriveCommittedAttackProjection,
  enrichAttackDeclaredEventFromProjection,
  indirectInterveningTerrainEffects,
} from './InteractiveSession.actions.attackProjection';
import { bestAttackRangeBracket } from './InteractiveSession.actions.attackRange';
import {
  appendInteractiveAttackInvalid,
  classifyInteractiveAttackWeapons,
  initialAttackInvalidSession,
  noLineOfSightInvalidSession,
  rangeAndArcInvalidSession,
} from './InteractiveSession.actions.attackValidation';

export function applyInteractiveSessionAttack(
  input: IApplyAttackInput,
): IGameSession {
  const unitWeapons = input.weaponsByUnit.get(input.attackerId) ?? [];
  const weaponAttacks: IWeaponAttack[] = buildWeaponAttacks(
    input.weaponIds,
    unitWeapons,
    input.attackerId,
    input.weaponModesByWeaponId,
    {
      calledShots: input.calledShots,
      teammateCalledShots: input.teammateCalledShots,
    },
  );
  const attackerUnit = input.session.currentState.units[input.attackerId];
  const targetUnit = input.session.currentState.units[input.targetId];
  const initialInvalidSession = initialAttackInvalidSession({
    input,
    weaponAttacks,
    attackerUnit,
    targetUnit,
  });
  if (initialInvalidSession) return initialInvalidSession;
  if (!attackerUnit || !targetUnit) return input.session;

  const attackerGameUnit = input.session.units.find(
    (unit) => unit.id === input.attackerId,
  );
  const attackerIsRepresentedVehicle = isRepresentedVehicleAttacker({
    unitType: attackerGameUnit?.unitType,
    combatStateKind: attackerUnit.combatState?.kind,
  });

  const resolvedTargetHex = input.targetHex ?? targetUnit.position;
  const attackRange = hexDistance(attackerUnit.position, resolvedTargetHex);
  if (attackRange === 0) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'SameHex',
      'Attacker and target occupy the same hex',
      input.weaponIds[0],
    );
  }

  const targetArc = determineArc(
    {
      unitId: input.attackerId,
      coord: attackerUnit.position,
      facing: attackerUnit.facing,
      prone: false,
    },
    resolvedTargetHex,
  ).arc;
  const {
    weaponsInRange,
    weaponsInArc,
    usableWeaponAttacks,
    waterAttackInvalidState,
    groundToAirIndirectInvalidWeapon,
    hullDownLegWeaponInvalidWeapon,
    hullDownVehicleFrontWeaponInvalidWeapon,
  } = classifyInteractiveAttackWeapons({
    input,
    weaponAttacks,
    attackRange,
    targetArc,
    attackerUnit,
    targetUnit,
    attackerIsRepresentedVehicle,
    resolvedTargetHex,
  });
  const committedAttackProjection = deriveCommittedAttackProjection({
    input,
    weaponAttacks,
    targetHex: resolvedTargetHex,
  });
  const attackPreResolution = attackPreResolutionForInteractiveAttack({
    input,
    committedAttackProjection,
    usableWeaponAttacks,
  });
  const indirectFireResolution: IIndirectFireResolution | undefined =
    attackPreResolution?.kind === 'indirect'
      ? attackPreResolution.resolution
      : undefined;
  if (weaponsInRange.length === 0) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'OutOfRange',
      `Target at ${attackRange} hexes is outside the selected weapons' range`,
      input.weaponIds[0],
    );
  }
  if (weaponsInArc.length === 0 || usableWeaponAttacks.length === 0) {
    return rangeAndArcInvalidSession({
      input,
      targetArc,
      waterAttackInvalidState,
      hullDownLegWeaponInvalidWeapon,
      hullDownVehicleFrontWeaponInvalidWeapon,
      groundToAirIndirectInvalidWeapon,
      attackerUnit,
      attackerIsRepresentedVehicle,
    });
  }

  const attackRangeBracket = bestAttackRangeBracket(
    attackRange,
    usableWeaponAttacks,
  );

  const losValidation = noLineOfSightInvalidSession({
    input,
    attackerUnit,
    targetUnit,
    resolvedTargetHex,
    usableWeaponAttacks,
    indirectFireResolution,
  });
  if (losValidation.invalidSession) return losValidation.invalidSession;
  const directLos = losValidation.directLos;

  const targetPartialCover =
    input.grid && resolvedTargetHex
      ? getTargetCoverInfo(
          input.grid,
          attackerUnit.position,
          resolvedTargetHex,
          {
            horizontalCoverEligible: gameUnitUsesMekHorizontalCover(
              input.session.units.find((unit) => unit.id === input.targetId),
            ),
            targetHexWaterCoverEligible: gameUnitUsesMekWaterCover(
              input.session.units.find((unit) => unit.id === input.targetId),
            ),
          },
        ).partialCover
      : false;
  const targetTerrainModifier =
    input.grid && resolvedTargetHex
      ? calculateTargetTerrainModifierFromHex(
          input.grid.hexes.get(coordToKey(resolvedTargetHex)),
        )
      : null;
  const selectedAMSValidation = buildSelectedAMSWeaponMounts({
    selectedAMSWeaponIds: input.selectedAMSWeaponIds,
    incomingWeapons: usableWeaponAttacks,
    targetWeapons: input.weaponsByUnit.get(input.targetId) ?? [],
    targetState: targetUnit,
    incomingAttackArc: calculateFiringArc(
      attackerUnit.position,
      targetUnit.position,
      targetUnit.facing,
    ),
    optionalRules: input.session.config.optionalRules,
  });
  if (selectedAMSValidation.invalid) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'InvalidTarget',
      selectedAMSValidation.invalid.details,
      selectedAMSValidation.invalid.incomingWeaponId,
    );
  }
  const selectedAMSWeaponMounts = selectedAMSValidation.mounts;

  let session = declareAttack(
    input.session,
    input.attackerId,
    input.targetId,
    usableWeaponAttacks,
    attackRange,
    attackRangeBracket,
    attackPreResolution,
    resolvedTargetHex,
    targetPartialCover,
    directLos?.hasLOS
      ? directLos.interveningTerrainEffects
      : input.grid
        ? indirectInterveningTerrainEffects({
            session: input.session,
            grid: input.grid,
            targetHex: resolvedTargetHex,
            indirectFireResolution,
          })
        : [],
    targetTerrainModifier,
    input.selectedAMSWeaponIds,
    selectedAMSWeaponMounts,
  );
  session = enrichAttackDeclaredEventFromProjection({
    session,
    attackerId: input.attackerId,
    targetId: input.targetId,
    projection: committedAttackProjection,
    weaponAttacks: usableWeaponAttacks,
  });
  session = lockAttack(session, input.attackerId);
  return session;
}
