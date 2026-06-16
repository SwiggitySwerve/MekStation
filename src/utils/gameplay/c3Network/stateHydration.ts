import type { IGameState } from '@/types/gameplay';

import type { IC3NetworkState } from './types';

import {
  createEmptyEWState,
  resolveC3ECMDisruption,
} from '../electronicWarfare';
import {
  updateC3UnitECMStatus,
  updateC3UnitOperationalStatus,
  updateC3UnitPosition,
} from './state';

function canUnitParticipateInC3(
  unit: IGameState['units'][string] | undefined,
): boolean {
  return (
    unit !== undefined &&
    !unit.destroyed &&
    !unit.hasEjected &&
    !unit.hasRetreated &&
    !unit.isWithdrawing &&
    unit.shutdown !== true &&
    unit.isPassenger !== true
  );
}

function pruneInactiveC3Networks(state: IC3NetworkState): IC3NetworkState {
  return {
    networks: state.networks.filter((network) => {
      const activeMemberCount = network.members.filter(
        (member) => member.operational,
      ).length;
      if (activeMemberCount < 2) return false;

      if (network.type === 'master-slave') {
        return network.members.some(
          (member) => member.role === 'master' && member.operational,
        );
      }

      return true;
    }),
  };
}

export function hydrateC3NetworkStateFromGameState(
  state: IGameState,
): IC3NetworkState | undefined {
  const c3State = state.c3Network;
  if (!c3State) return undefined;

  const members = c3State.networks.flatMap((network) =>
    network.members.map((member) => {
      const unit = state.units[member.entityId];

      return {
        entityId: member.entityId,
        teamId: member.teamId,
        position: unit?.position ?? member.position,
        operational: canUnitParticipateInC3(unit),
        iNarcPods: unit?.iNarcPods,
      };
    }),
  );
  const disruptions = resolveC3ECMDisruption(
    members,
    state.electronicWarfare ?? createEmptyEWState(),
  );

  const hydratedState = members.reduce((hydrated, member) => {
    const positioned = updateC3UnitPosition(
      hydrated,
      member.entityId,
      member.position,
    );
    const operational = updateC3UnitOperationalStatus(
      positioned,
      member.entityId,
      member.operational,
    );

    return updateC3UnitECMStatus(
      operational,
      member.entityId,
      disruptions.get(member.entityId) ?? false,
    );
  }, c3State);

  return pruneInactiveC3Networks(hydratedState);
}
