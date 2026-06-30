import type { ICampaign } from '@/types/campaign/Campaign';
import type { IForce } from '@/types/campaign/Force';
import type { IMission } from '@/types/campaign/Mission';
import type { IEncounter } from '@/types/encounter';

import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { EncounterStatus, TerrainPreset } from '@/types/encounter';

export function routeParam(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function campaignEncounterHref({
  encounterId,
  campaignId,
  missionId,
}: {
  readonly encounterId: string;
  readonly campaignId: string;
  readonly missionId: string;
}): string {
  const params = new URLSearchParams({ campaignId, missionId });
  return `/gameplay/encounters/${encodeURIComponent(
    encounterId,
  )}?${params.toString()}`;
}

function fallbackRootForce(campaign: ICampaign): IForce {
  return {
    id: campaign.rootForceId,
    name: `${campaign.name} Command`,
    subForceIds: [],
    unitIds: [],
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.REGIMENT,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

export function rootForceForCampaign(campaign: ICampaign): IForce {
  return (
    campaign.forces.get(campaign.rootForceId) ?? fallbackRootForce(campaign)
  );
}

export function buildLaunchEncounter(
  campaign: ICampaign,
  missionId: string,
): IEncounter {
  const mission = campaign.missions.get(missionId);
  const rootForce = rootForceForCampaign(campaign);
  return {
    id: `enc-${missionId}`,
    name: mission?.name ?? `Mission ${missionId}`,
    description: mission?.description ?? `Co-op campaign mission ${missionId}.`,
    status: EncounterStatus.Ready,
    playerForce: {
      forceId: rootForce.id,
      forceName: rootForce.name,
      totalBV: 0,
      unitCount: rootForce.unitIds.length,
    },
    mapConfig: {
      radius: 8,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [],
    optionalRules: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    campaignMeta: {
      campaignId: campaign.id,
      contractId: mission?.id ?? missionId,
      scenarioId: mission?.scenarioIds[0] ?? missionId,
    },
  };
}

export function withMissionScenario(
  mission: IMission,
  encounterId: string,
): IMission {
  if (mission.scenarioIds.includes(encounterId)) {
    return mission;
  }
  return {
    ...mission,
    scenarioIds: [encounterId, ...mission.scenarioIds],
    updatedAt: new Date().toISOString(),
  };
}
