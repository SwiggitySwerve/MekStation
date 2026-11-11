import type { IInteractiveSessionLinkage } from '@/engine/InteractiveSession.types';
import type { IEncounter } from '@/types/encounter/EncounterInterfaces';

import { isReplayBvTotal } from '@/replay-library/eventMetadata';
import { calculateForceTotals } from '@/types/quickgame/QuickGameInterfaces';

export interface IPreBattleLaunchLinkageInput {
  readonly encounter: IEncounter;
  readonly campaignId?: string | readonly string[] | null;
  readonly missionId?: string | readonly string[] | null;
}

function queryValue(
  value: string | readonly string[] | null | undefined,
): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== 'string') {
    return null;
  }
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function forceSummary(force: IEncounter['playerForce']): string {
  if (!force) {
    return '(missing force)';
  }
  return `${force.forceName} (${force.totalBV} BV, ${force.unitCount} units)`;
}

function opponentSummary(encounter: IEncounter): string {
  if (encounter.opponentForce !== undefined) {
    return forceSummary(encounter.opponentForce);
  }
  if (encounter.opForConfig) {
    return 'Generated OpFor';
  }
  return '(no opponent)';
}

export function buildPreBattleLaunchLinkage({
  encounter,
  campaignId,
  missionId,
}: IPreBattleLaunchLinkageInput): IInteractiveSessionLinkage & {
  readonly missionId?: string | null;
} {
  const routeCampaignId = queryValue(campaignId);
  const routeMissionId = queryValue(missionId);
  const meta = encounter.campaignMeta;

  const resolvedCampaignId = meta?.campaignId ?? routeCampaignId;
  const resolvedContractId =
    meta?.contractId ?? (routeCampaignId ? routeMissionId : null);
  const resolvedScenarioId =
    meta?.scenarioId ??
    (resolvedCampaignId && routeMissionId ? encounter.id : null);

  const player = encounter.playerForce;
  const opponent = encounter.opponentForce;
  const bvTotal =
    player &&
    opponent &&
    isReplayBvTotal(player.totalBV) &&
    isReplayBvTotal(opponent.totalBV)
      ? calculateForceTotals([
          { bv: player.totalBV, tonnage: 0 },
          { bv: opponent.totalBV, tonnage: 0 },
        ]).totalBV
      : undefined;

  return {
    ...(bvTotal !== undefined ? { quickMeta: { bvTotal } } : {}),
    encounterId: encounter.id,
    campaignId: resolvedCampaignId ?? null,
    contractId: resolvedContractId ?? null,
    scenarioId: resolvedScenarioId ?? null,
    missionId: routeMissionId ?? meta?.contractId ?? null,
    encounterMeta: {
      encounterId: encounter.id,
      encounterName: encounter.name,
      templateType: encounter.template ?? null,
      playerForceSummary: forceSummary(encounter.playerForce),
      opponentSummary: opponentSummary(encounter),
    },
  };
}
