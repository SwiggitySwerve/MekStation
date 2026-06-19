import type { InteractiveSession } from '@/engine/GameEngine';
import type { ISelectedUnitProjection } from '@/stores/useGameplayStore';
import type { IPhysicalAttackPlan } from '@/stores/useGameplayStore.combatFlows';
import type {
  IPhysicalAttackInput,
  IPhysicalAttackOption,
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import {
  MovementType,
  type IGameSession,
  type IINarcPodState,
  type IUnitGameState,
} from '@/types/gameplay';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { buildPhysicalElevationContext } from '@/utils/gameplay/physicalAttacks/elevation';
import { getEligiblePhysicalAttacks } from '@/utils/gameplay/physicalAttacks/eligibility';
import { buildPhysicalTerrainContext } from '@/utils/gameplay/physicalAttacks/terrain';
import { isZweihanderPhysicalAttackType } from '@/utils/gameplay/physicalAttacks/types';
import { isAirborneVTOLOrWiGEForPhysicalAttack } from '@/utils/gameplay/physicalAttacks/unitState';
import { hasSPA } from '@/utils/gameplay/spaModifiers';
import {
  buildINarcPodBrushOffTargetOptions,
  iNarcPodTargetKey,
} from '@/utils/gameplay/specialWeaponMechanics';

import type { PhysicalAttackIntent } from './PhysicalAttackPanel';
import type { MeleeTarget } from './PhysicalAttackPanel.renderers';

import { EMPTY_DAMAGE, intentVariantFor } from './PhysicalAttackPanel.helpers';

type PhysicalGrid = ReturnType<InteractiveSession['getGrid']>;

interface PhysicalAttackProjectionArgs {
  selected: ISelectedUnitProjection | null;
  session: IGameSession | null;
}

export function buildMeleeTargets({
  selected,
  session,
}: PhysicalAttackProjectionArgs): MeleeTarget[] {
  if (!selected || !session) return [];

  const list: MeleeTarget[] = [];
  for (const [unitId, unitState] of Object.entries(
    session.currentState.units,
  )) {
    if (unitState.side === selected.unit.side) continue;
    if (unitState.destroyed) continue;
    if (hexDistance(selected.state.position, unitState.position) !== 1) {
      continue;
    }

    const carrierName =
      session.units.find((u) => u.id === unitId)?.name ?? unitId;
    list.push({
      id: unitId,
      carrierUnitId: unitId,
      name: carrierName,
      position: unitState.position,
    });
    list.push(
      ...buildINarcPodBrushOffTargetOptions({
        carrierUnitId: unitId,
        carrierName,
        pods: unitState.iNarcPods,
      }).map((target) => ({
        id: target.id,
        carrierUnitId: target.carrierUnitId,
        name: target.name,
        position: unitState.position,
        selectedINarcPod: target.selectedINarcPod,
      })),
    );
  }
  return list;
}

export function selectCurrentMeleeTarget(
  meleeTargets: readonly MeleeTarget[],
  physicalAttackPlan: IPhysicalAttackPlan,
): MeleeTarget | null {
  const selectedPodKey = physicalAttackPlan.selectedINarcPod
    ? iNarcPodTargetKey(physicalAttackPlan.selectedINarcPod)
    : undefined;
  return (
    meleeTargets.find((target) =>
      isSelectedMeleeTarget(
        target,
        physicalAttackPlan.targetUnitId,
        selectedPodKey,
      ),
    ) ?? null
  );
}

function isSelectedMeleeTarget(
  target: MeleeTarget,
  targetUnitId: string | null,
  selectedPodKey: string | undefined,
): boolean {
  if (target.carrierUnitId !== targetUnitId) return false;
  if (!target.selectedINarcPod) return selectedPodKey === undefined;
  return selectedPodKey === iNarcPodTargetKey(target.selectedINarcPod);
}

export function selectedINarcPodKeyFor(
  physicalAttackPlan: IPhysicalAttackPlan,
  targetINarcPods: readonly IINarcPodState[],
): string {
  if (physicalAttackPlan.selectedINarcPod) {
    return iNarcPodTargetKey(physicalAttackPlan.selectedINarcPod);
  }
  return targetINarcPods[0] ? iNarcPodTargetKey(targetINarcPods[0]) : '';
}

export function findPhysicalAttackTargetState(
  session: IGameSession | null,
  targetUnitId: string | null,
): IUnitGameState | null {
  if (!session || !targetUnitId) return null;
  return session.currentState.units[targetUnitId] ?? null;
}

interface BuildPhysicalAttackOptionsArgs {
  selected: ISelectedUnitProjection | null;
  targetState: IUnitGameState | null;
  session: IGameSession | null;
  physicalAttackPlan: IPhysicalAttackPlan;
  selectedTargetIsINarcPod: boolean;
  attackerTonnage: number;
  meleeWeaponsEquipped?: readonly PhysicalAttackType[];
  physicalGrid: PhysicalGrid | null;
}

export function buildPhysicalAttackOptions({
  selected,
  targetState,
  session,
  physicalAttackPlan,
  selectedTargetIsINarcPod,
  attackerTonnage,
  meleeWeaponsEquipped,
  physicalGrid,
}: BuildPhysicalAttackOptionsArgs): readonly IPhysicalAttackOption[] {
  if (!selected || !targetState) return [];

  const targetUnit = findSessionUnit(session, physicalAttackPlan.targetUnitId);
  const projected = getEligiblePhysicalAttacks(selected.state, targetState, {
    attackerTonnage,
    attackerPilotingSkill: selected.unit.piloting,
    targetTonnage: attackerTonnage,
    attackerUnitType: selected.unit.unitType,
    attackerMovementMode: selected.unit.movementMode,
    optionalRules: session?.config.optionalRules,
    targetUnitType: targetUnit?.unitType,
    targetIsINarcPod: selectedTargetIsINarcPod,
    weaponsFiredFromLeftArm: selected.state.weaponsFiredThisTurn,
    weaponsFiredFromRightArm: selected.state.weaponsFiredThisTurn,
    limbsUsedThisTurn: undefined,
    attackerRanThisTurn: selected.state.movementThisTurn === MovementType.Run,
    attackerJumpedThisTurn:
      selected.state.movementThisTurn === MovementType.Jump,
    meleeWeaponsEquipped,
    elevationContext: physicalGrid
      ? buildPhysicalElevationContext(
          selected.state,
          targetState,
          physicalGrid,
          {
            targetUnit,
          },
        )
      : undefined,
    terrainContext: physicalGrid
      ? buildPhysicalTerrainContext(selected.state, targetState, physicalGrid)
      : undefined,
  });
  return selectedTargetIsINarcPod
    ? projected.filter((option) => option.attackType === 'brush-off')
    : projected;
}

interface BuildForecastInputArgs extends BuildPhysicalAttackOptionsArgs {
  emptyDamage: IPhysicalAttackInput['componentDamage'];
}

export function buildPhysicalAttackForecastInput({
  selected,
  targetState,
  session,
  physicalAttackPlan,
  attackerTonnage,
  physicalGrid,
  emptyDamage,
}: BuildForecastInputArgs): IPhysicalAttackInput | null {
  if (!selected || !physicalAttackPlan.attackType) return null;

  const targetUnit = findSessionUnit(session, physicalAttackPlan.targetUnitId);
  return {
    attackerTonnage,
    pilotingSkill: selected.unit.piloting,
    componentDamage: selected.state.componentDamage ?? emptyDamage,
    attackType: physicalAttackPlan.attackType,
    limb: physicalAttackPlan.limb ?? undefined,
    arm: armForPhysicalLimb(physicalAttackPlan.limb),
    twoHandedZweihander:
      isZweihanderPhysicalAttackType(physicalAttackPlan.attackType) &&
      physicalAttackPlan.twoHandedZweihander,
    heat: selected.state.heat,
    attackerProne: selected.state.prone,
    attackerUnitType: selected.unit.unitType,
    attackerMovementMode: selected.unit.movementMode,
    attackerConversionMode: selected.state.conversionMode,
    attackerIsAirborneVTOLOrWiGE: isAirborneVTOLOrWiGEForPhysicalAttack(
      selected.state,
      selected.unit.movementMode,
    ),
    optionalRules: session?.config.optionalRules,
    attackerDestroyedLocations: selected.state.destroyedLocations,
    targetUnitType: targetUnit?.unitType,
    targetProne: targetState?.prone,
    hexesMoved: selected.state.hexesMovedThisTurn,
    weaponsFiredFromArm: selected.state.weaponsFiredThisTurn,
    attackerRanThisTurn: selected.state.movementThisTurn === MovementType.Run,
    attackerJumpedThisTurn:
      selected.state.movementThisTurn === MovementType.Jump,
    elevationContext: buildOptionalElevationContext({
      selected,
      targetState,
      physicalGrid,
      targetUnit,
    }),
    terrainContext: buildOptionalTerrainContext({
      selected,
      targetState,
      physicalGrid,
    }),
  };
}

interface OptionalPhysicalContextArgs {
  selected: ISelectedUnitProjection;
  targetState: IUnitGameState | null;
  physicalGrid: PhysicalGrid | null;
  targetUnit?: IGameSession['units'][number];
}

export function buildOptionalElevationContext({
  selected,
  targetState,
  physicalGrid,
  targetUnit,
}: OptionalPhysicalContextArgs): IPhysicalAttackInput['elevationContext'] {
  if (!targetState || !physicalGrid) return undefined;
  return buildPhysicalElevationContext(
    selected.state,
    targetState,
    physicalGrid,
    {
      targetUnit,
    },
  );
}

export function buildOptionalTerrainContext({
  selected,
  targetState,
  physicalGrid,
}: OptionalPhysicalContextArgs): IPhysicalAttackInput['terrainContext'] {
  if (!targetState || !physicalGrid) return undefined;
  return buildPhysicalTerrainContext(selected.state, targetState, physicalGrid);
}

export function buildPhysicalAttackIntent(
  option: IPhysicalAttackOption,
  selected: ISelectedUnitProjection | null,
  targetState: IUnitGameState | null,
): PhysicalAttackIntent | null {
  if (!selected || !targetState) return null;

  const variant = intentVariantFor(option.attackType);
  if (!variant) return null;
  return {
    variant,
    from: selected.state.position,
    to: targetState.position,
  };
}

interface SelectPhysicalAttackTargetArgs {
  target: MeleeTarget;
  setPhysicalAttackTarget: (unitId: string | null) => void;
  setPhysicalAttackType: (
    attackType: PhysicalAttackType | null,
    limb?: PhysicalAttackLimb | null,
  ) => void;
  setPhysicalAttackINarcPod: (pod: IINarcPodState | undefined) => void;
  clearIntent: () => void;
}

export function selectPhysicalAttackTarget({
  target,
  setPhysicalAttackTarget,
  setPhysicalAttackType,
  setPhysicalAttackINarcPod,
  clearIntent,
}: SelectPhysicalAttackTargetArgs): void {
  setPhysicalAttackTarget(target.carrierUnitId);
  setPhysicalAttackType(null);
  setPhysicalAttackINarcPod(target.selectedINarcPod);
  clearIntent();
}

interface SelectINarcPodArgs {
  podKey: string;
  targetINarcPods: readonly IINarcPodState[];
  setPhysicalAttackINarcPod: (pod: IINarcPodState | undefined) => void;
}

export function selectPhysicalAttackINarcPod({
  podKey,
  targetINarcPods,
  setPhysicalAttackINarcPod,
}: SelectINarcPodArgs): void {
  setPhysicalAttackINarcPod(
    targetINarcPods.find((pod) => iNarcPodTargetKey(pod) === podKey),
  );
}

interface DeclarePhysicalAttackOptionArgs {
  option: IPhysicalAttackOption;
  selectedINarcPod: IPhysicalAttackPlan['selectedINarcPod'];
  targetINarcPods: readonly IINarcPodState[];
  setPhysicalAttackType: (
    attackType: PhysicalAttackType | null,
    limb?: PhysicalAttackLimb | null,
  ) => void;
  setPhysicalAttackTwoHandedZweihander: (enabled: boolean) => void;
  setPhysicalAttackINarcPod: (pod: IINarcPodState | undefined) => void;
}

export function declarePhysicalAttackOption({
  option,
  selectedINarcPod,
  targetINarcPods,
  setPhysicalAttackType,
  setPhysicalAttackTwoHandedZweihander,
  setPhysicalAttackINarcPod,
}: DeclarePhysicalAttackOptionArgs): void {
  setPhysicalAttackType(option.attackType, option.limb ?? null);
  setPhysicalAttackTwoHandedZweihander(false);
  if (option.attackType === 'brush-off' && selectedINarcPod === undefined) {
    setPhysicalAttackINarcPod(targetINarcPods[0]);
  }
}

export function physicalAttackAnnouncement(
  meleeTargetCount: number,
  hasTarget: boolean,
  eligibleCount: number,
): string {
  if (meleeTargetCount === 0) {
    return 'Physical Attack phase — no eligible targets in adjacent hexes';
  }
  if (!hasTarget) {
    return `Physical Attack phase — ${meleeTargetCount} adjacent target${meleeTargetCount === 1 ? '' : 's'}`;
  }
  return `Physical Attack phase — ${eligibleCount} eligible option${eligibleCount === 1 ? '' : 's'}`;
}

export function eligiblePhysicalAttackOptionCount(
  options: readonly IPhysicalAttackOption[],
): number {
  return options.filter((option) => option.restrictionsFailed.length === 0)
    .length;
}

export function showZweihanderToggleFor(
  attackType: PhysicalAttackType | null,
  abilities: readonly string[] | undefined,
): boolean {
  return (
    isZweihanderPhysicalAttackType(attackType) &&
    hasSPA(abilities ?? [], 'zweihander')
  );
}

export function forecastTargetName(
  meleeTargets: readonly MeleeTarget[],
  targetUnitId: string | null,
): string | undefined {
  return meleeTargets.find((t) => t.id === targetUnitId)?.name;
}

export { EMPTY_DAMAGE };

function armForPhysicalLimb(
  limb: PhysicalAttackLimb | null,
): 'left' | 'right' | undefined {
  if (limb === 'leftArm') return 'left';
  if (limb === 'rightArm') return 'right';
  return undefined;
}

export function findSessionUnit(
  session: IGameSession | null,
  unitId: string | null,
): IGameSession['units'][number] | undefined {
  if (!session || !unitId) return undefined;
  return session.units.find((unit) => unit.id === unitId);
}
