import type { NextRouter } from 'next/router';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IForce } from '@/types/campaign/Force';
import type { IMission } from '@/types/campaign/Mission';
import type { IEncounter } from '@/types/encounter';

import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { EncounterStatus, TerrainPreset } from '@/types/encounter';

export function routeParam(
  value: string | string[] | undefined,
): string | null {
  const candidate = Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  if (!candidate || /^\[[^\]]+\]$/.test(candidate)) return null;
  return candidate;
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function missionRouteIdFromPath(asPath: string): string | null {
  const segments = asPath
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .map(decodePathSegment);
  const missionsIndex = segments.indexOf('missions');
  const missionId = missionsIndex >= 0 ? segments[missionsIndex + 1] : null;
  return missionId && segments[missionsIndex + 2] === 'launch'
    ? missionId
    : null;
}

export function searchParam(search: string, key: string): string | null {
  return routeParam(new URLSearchParams(search).get(key) ?? undefined);
}

export function missionKeyFromRouter(
  router: Pick<NextRouter, 'asPath' | 'query'>,
): string | null {
  return (
    routeParam(router.query.missionId) ??
    browserMissionRouteId() ??
    missionRouteIdFromPath(router.asPath)
  );
}

export function customizerResultFromRouter(
  router: Pick<NextRouter, 'query'>,
): string | null {
  return (
    routeParam(router.query.customizerResult) ??
    browserSearchParam('customizerResult')
  );
}

function browserMissionRouteId(): string | null {
  if (typeof window === 'undefined') return null;
  return missionRouteIdFromPath(window.location.pathname);
}

function browserSearchParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return searchParam(window.location.search, name);
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
