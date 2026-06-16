import { IHexCoordinate } from '@/types/gameplay';

import { hexDistance } from '../hexMath';
import {
  BAP_ECM_COUNTER_RANGE,
  BLOODHOUND_ECM_COUNTER_RANGE,
  CLAN_PROBE_ECM_COUNTER_RANGE,
  LIGHT_PROBE_ECM_COUNTER_RANGE,
  NOVA_CEWS_ECM_COUNTER_RANGE,
  WATCHDOG_CEWS_ECM_COUNTER_RANGE,
} from './constants';
import { IActiveProbe, IElectronicWarfareState, IECMSuite } from './types';

function probeTypeFrom(
  probe: IActiveProbe | IActiveProbe['type'],
): IActiveProbe['type'] {
  return typeof probe === 'string' ? probe : probe.type;
}

export function getProbeECMCounterRange(
  probe: IActiveProbe | IActiveProbe['type'],
): number {
  const probeType = probeTypeFrom(probe);
  const eagleEyesBonus =
    typeof probe === 'string' || probe.eagleEyesRangeBonus !== true ? 0 : 1;

  switch (probeType) {
    case 'beagle':
      return BAP_ECM_COUNTER_RANGE + eagleEyesBonus;
    case 'bloodhound':
      return BLOODHOUND_ECM_COUNTER_RANGE + eagleEyesBonus;
    case 'clan-active-probe':
      return CLAN_PROBE_ECM_COUNTER_RANGE + eagleEyesBonus;
    case 'light-active-probe':
      return LIGHT_PROBE_ECM_COUNTER_RANGE + eagleEyesBonus;
    case 'watchdog-cews':
      return WATCHDOG_CEWS_ECM_COUNTER_RANGE + eagleEyesBonus;
    case 'nova-cews':
      return NOVA_CEWS_ECM_COUNTER_RANGE + eagleEyesBonus;
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

  const counterRange = getProbeECMCounterRange(probe);
  const distance = hexDistance(probe.position, enemyECM.position);

  if (enemyECM.type === 'guardian') {
    return distance <= counterRange;
  }

  if (probe.type === 'bloodhound') {
    return distance <= counterRange;
  }

  return false;
}
