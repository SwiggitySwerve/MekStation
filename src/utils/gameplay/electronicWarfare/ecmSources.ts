import { IHexCoordinate } from '@/types/gameplay';

import { hexDistance } from '../hexMath';
import { ECM_RADIUS } from './constants';
import { IECMSuite, IElectronicWarfareState } from './types';

export function isInECMBubble(
  position: IHexCoordinate,
  ecmSource: IECMSuite,
): boolean {
  if (!ecmSource.operational || ecmSource.mode !== 'ecm') {
    return false;
  }

  return hexDistance(position, ecmSource.position) <= ECM_RADIUS;
}

export function getFriendlyECMSources(
  position: IHexCoordinate,
  teamId: string,
  ewState: IElectronicWarfareState,
): readonly IECMSuite[] {
  return ewState.ecmSuites.filter(
    (ecm) =>
      ecm.teamId === teamId &&
      ecm.mode === 'ecm' &&
      ecm.operational &&
      hexDistance(position, ecm.position) <= ECM_RADIUS,
  );
}

export function getEnemyECMSources(
  position: IHexCoordinate,
  teamId: string,
  ewState: IElectronicWarfareState,
): readonly IECMSuite[] {
  return ewState.ecmSuites.filter(
    (ecm) =>
      ecm.teamId !== teamId &&
      ecm.mode === 'ecm' &&
      ecm.operational &&
      hexDistance(position, ecm.position) <= ECM_RADIUS,
  );
}

export function getFriendlyECCMSources(
  position: IHexCoordinate,
  teamId: string,
  ewState: IElectronicWarfareState,
): readonly IECMSuite[] {
  return ewState.ecmSuites.filter(
    (ecm) =>
      ecm.teamId === teamId &&
      ecm.mode === 'eccm' &&
      ecm.operational &&
      hexDistance(position, ecm.position) <= ECM_RADIUS,
  );
}
