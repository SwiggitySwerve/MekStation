import { IHexCoordinate } from '@/types/gameplay';

import {
  ECMMode,
  IActiveProbe,
  IECMSuite,
  IElectronicWarfareState,
} from './types';

export function createEmptyEWState(): IElectronicWarfareState {
  return {
    ecmSuites: [],
    activeProbes: [],
  };
}

export function createEWState(
  ecmSuites: readonly IECMSuite[],
  activeProbes: readonly IActiveProbe[],
): IElectronicWarfareState {
  return { ecmSuites, activeProbes };
}

export function addECMSuite(
  state: IElectronicWarfareState,
  suite: IECMSuite,
): IElectronicWarfareState {
  return {
    ...state,
    ecmSuites: [...state.ecmSuites, suite],
  };
}

export function addActiveProbe(
  state: IElectronicWarfareState,
  probe: IActiveProbe,
): IElectronicWarfareState {
  return {
    ...state,
    activeProbes: [...state.activeProbes, probe],
  };
}

export function setECMMode(
  state: IElectronicWarfareState,
  entityId: string,
  mode: ECMMode,
): IElectronicWarfareState {
  return {
    ...state,
    ecmSuites: state.ecmSuites.map((ecm) =>
      ecm.entityId === entityId ? { ...ecm, mode } : ecm,
    ),
  };
}

export function updateECMPosition(
  state: IElectronicWarfareState,
  entityId: string,
  newPosition: IHexCoordinate,
): IElectronicWarfareState {
  return {
    ...state,
    ecmSuites: state.ecmSuites.map((ecm) =>
      ecm.entityId === entityId ? { ...ecm, position: newPosition } : ecm,
    ),
    activeProbes: state.activeProbes.map((probe) =>
      probe.entityId === entityId ? { ...probe, position: newPosition } : probe,
    ),
  };
}

export function destroyEquipment(
  state: IElectronicWarfareState,
  entityId: string,
  equipmentType: 'ecm' | 'probe',
): IElectronicWarfareState {
  if (equipmentType === 'ecm') {
    return {
      ...state,
      ecmSuites: state.ecmSuites.map((ecm) =>
        ecm.entityId === entityId ? { ...ecm, operational: false } : ecm,
      ),
    };
  }

  return {
    ...state,
    activeProbes: state.activeProbes.map((probe) =>
      probe.entityId === entityId ? { ...probe, operational: false } : probe,
    ),
  };
}
