import { IHexCoordinate } from '@/types/gameplay';

import { hexDistance } from '../hexMath';
import {
  BAP_ECM_COUNTER_RANGE,
  BLOODHOUND_ECM_COUNTER_RANGE,
  CLAN_PROBE_ECM_COUNTER_RANGE,
} from './constants';
import { IActiveProbe, IElectronicWarfareState, IECMSuite } from './types';

export function getProbeECMCounterRange(
  probeType: IActiveProbe['type'],
): number {
  switch (probeType) {
    case 'beagle':
      return BAP_ECM_COUNTER_RANGE;
    case 'bloodhound':
      return BLOODHOUND_ECM_COUNTER_RANGE;
    case 'clan-active-probe':
      return CLAN_PROBE_ECM_COUNTER_RANGE;
  }
}

export function getBAPCounterSources(
  unitPosition: IHexCoordinate,
  unitTeamId: string,
  ewState: IElectronicWarfareState,
): readonly IActiveProbe[] {
  return ewState.activeProbes.filter(
    (probe) =>
      probe.teamId === unitTeamId &&
      probe.operational &&
      hexDistance(unitPosition, probe.position) === 0,
  );
}

export function canBAPCounterECM(
  probe: IActiveProbe,
  enemyECM: IECMSuite,
): boolean {
  if (!probe.operational) {
    return false;
  }

  const counterRange = getProbeECMCounterRange(probe.type);
  const distance = hexDistance(probe.position, enemyECM.position);

  if (enemyECM.type === 'guardian') {
    return distance <= counterRange;
  }

  if (probe.type === 'bloodhound') {
    return distance <= counterRange;
  }

  return false;
}
