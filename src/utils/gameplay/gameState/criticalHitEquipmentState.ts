import type {
  ICriticalHitResolvedPayload,
  IUnitGameState,
} from '@/types/gameplay';
import type { IElectronicWarfareState } from '@/utils/gameplay/electronicWarfare';

import { applyDamagedPhysicalEquipmentCritical } from '@/utils/gameplay/physicalAttacks/equipmentLifecycle';

import {
  artemisFcsKindForComponent,
  isActiveProbeCriticalComponent,
  isECMCriticalComponent,
  isGenericActiveProbeCriticalComponent,
  isGenericECMCriticalComponent,
  isRiscLaserPulseModuleLinkedCritical,
  normalizeEquipmentText,
} from './criticalHitPayloadPredicates';

export function applyCriticalHitEquipmentState(
  unit: IUnitGameState,
  payload: ICriticalHitResolvedPayload,
): IUnitGameState {
  return applyDestroyedArtemisFcsState(
    applyGenericEquipmentDestroyedState(
      applyDamagedPhysicalEquipmentCritical(unit, payload),
      payload,
    ),
    payload,
  );
}

export function applyElectronicWarfareEquipmentCritical(
  electronicWarfare: IElectronicWarfareState | undefined,
  payload: ICriticalHitResolvedPayload,
): IElectronicWarfareState | undefined {
  if (
    !electronicWarfare ||
    payload.componentType !== 'equipment' ||
    payload.destroyed !== true
  ) {
    return electronicWarfare;
  }

  const isECMCritical = isECMCriticalComponent(payload.componentName);
  const isProbeCritical = isActiveProbeCriticalComponent(payload.componentName);
  if (!isECMCritical && !isProbeCritical) {
    return electronicWarfare;
  }

  return {
    ...electronicWarfare,
    ecmSuites: isECMCritical
      ? electronicWarfare.ecmSuites.map((suite) =>
          ecmSuiteMatchesCritical(suite, payload.unitId, payload.componentName)
            ? { ...suite, operational: false }
            : suite,
        )
      : electronicWarfare.ecmSuites,
    activeProbes: isProbeCritical
      ? electronicWarfare.activeProbes.map((probe) =>
          activeProbeMatchesCritical(
            probe,
            payload.unitId,
            payload.componentName,
          )
            ? { ...probe, operational: false }
            : probe,
        )
      : electronicWarfare.activeProbes,
  };
}

function applyGenericEquipmentDestroyedState(
  unit: IUnitGameState,
  payload: ICriticalHitResolvedPayload,
): IUnitGameState {
  if (payload.componentType !== 'equipment' || payload.destroyed !== true) {
    return unit;
  }
  if (isRiscLaserPulseModuleLinkedCritical(payload)) {
    return unit;
  }

  if (unit.destroyedEquipment.includes(payload.componentName)) {
    return unit;
  }

  return {
    ...unit,
    destroyedEquipment: [...unit.destroyedEquipment, payload.componentName],
  };
}

function applyDestroyedArtemisFcsState(
  unit: IUnitGameState,
  payload: ICriticalHitResolvedPayload,
): IUnitGameState {
  if (payload.componentType !== 'equipment' || payload.destroyed !== true) {
    return unit;
  }

  const kind = artemisFcsKindForComponent(payload.componentName);
  if (kind === undefined) {
    return unit;
  }

  const previous = unit.destroyedArtemisFcs ?? [];
  const alreadyRecorded = previous.some(
    (entry) =>
      entry.kind === kind &&
      entry.location === payload.location &&
      entry.linkedWeaponId === payload.linkedCriticalWeaponId,
  );
  if (alreadyRecorded) {
    return unit;
  }

  return {
    ...unit,
    destroyedArtemisFcs: [
      ...previous,
      {
        kind,
        location: payload.location,
        ...(payload.linkedCriticalWeaponId !== undefined
          ? { linkedWeaponId: payload.linkedCriticalWeaponId }
          : {}),
        componentName: payload.componentName,
      },
    ],
  };
}

function ecmSuiteMatchesCritical(
  suite: IElectronicWarfareState['ecmSuites'][number],
  unitId: string,
  componentName: string,
): boolean {
  if (!suite.entityId.startsWith(`${unitId}:`)) return false;

  const component = normalizeEquipmentText(componentName);
  const suiteId = normalizeEquipmentText(suite.entityId);
  return (
    suiteId.includes(component) ||
    component.includes(suite.type) ||
    isGenericECMCriticalComponent(component)
  );
}

function activeProbeMatchesCritical(
  probe: IElectronicWarfareState['activeProbes'][number],
  unitId: string,
  componentName: string,
): boolean {
  if (!probe.entityId.startsWith(`${unitId}:`)) return false;

  const component = normalizeEquipmentText(componentName);
  const probeId = normalizeEquipmentText(probe.entityId);
  const probeType = normalizeEquipmentText(probe.type);
  return (
    probeId.includes(component) ||
    component.includes(probeType) ||
    isGenericActiveProbeCriticalComponent(component)
  );
}
