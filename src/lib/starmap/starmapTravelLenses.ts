import type { ICampaign } from '@/types/campaign/Campaign';
import type { IMission } from '@/types/campaign/Mission';
import type { IStarSystem } from '@/types/starmap/StarSystem';

import { MissionStatus } from '@/types/campaign/enums/MissionStatus';

import { findSystemById, loadInnerSphereSeed } from './loadInnerSphereSeed';
import { distanceBetweenSystems } from './starmapTravelRoute';
import {
  DEFAULT_STARMAP_TRAVEL_RULES,
  type IStarmapTravelRules,
} from './starmapTravelRules';

export type StarmapMarketQuality = 'capital' | 'industrial' | 'frontier';
export type StarmapRiskLevel = 'low' | 'medium' | 'high';

export interface IStarmapSystemLens {
  readonly systemId: string;
  readonly systemName: string;
  readonly faction: string;
  readonly directDistanceLy: number;
  readonly jumpsRequired: number;
  readonly inSingleJumpRange: boolean;
  readonly withinTravelOrderRange: boolean;
  readonly contractCount: number;
  readonly nearestDeadlineDate?: string;
  readonly marketQuality: StarmapMarketQuality;
  readonly supplyQuality: StarmapMarketQuality;
  readonly riskLevel: StarmapRiskLevel;
  readonly badges: readonly string[];
}

export function buildStarmapSystemLenses(
  campaign: ICampaign,
  systems: readonly IStarSystem[] = loadInnerSphereSeed().systems,
  rules: IStarmapTravelRules = DEFAULT_STARMAP_TRAVEL_RULES,
): readonly IStarmapSystemLens[] {
  const current = findSystemById(campaign.currentSystemId ?? 'terra');
  if (!current) return [];

  return systems.map((system) => {
    const directDistanceLy =
      system.id === current.id ? 0 : distanceBetweenSystems(current, system);
    const jumpsRequired =
      directDistanceLy === 0
        ? 0
        : Math.max(1, Math.ceil(directDistanceLy / rules.maxJumpDistanceLy));
    const contracts = Array.from(campaign.missions.values()).filter(
      (mission) =>
        mission.systemId === system.id && !isTerminalMission(mission),
    );
    const nearestDeadlineDate = contracts
      .map((mission) => mission.endDate)
      .filter((date): date is string => typeof date === 'string')
      .sort()[0];
    const marketQuality = marketQualityFor(system);
    const riskLevel = riskLevelFor(campaign, system, contracts.length);
    const badges = [
      jumpsRequired === 1 ? '1 jump' : `${jumpsRequired} jumps`,
      contracts.length > 0
        ? `${contracts.length} contract${contracts.length === 1 ? '' : 's'}`
        : null,
      nearestDeadlineDate ? 'deadline' : null,
      riskLevel === 'high'
        ? 'high risk'
        : riskLevel === 'medium'
          ? 'medium risk'
          : null,
    ].filter((badge): badge is string => Boolean(badge));

    return {
      systemId: system.id,
      systemName: system.name,
      faction: system.faction,
      directDistanceLy,
      jumpsRequired,
      inSingleJumpRange: directDistanceLy <= rules.maxJumpDistanceLy,
      withinTravelOrderRange: jumpsRequired <= rules.maxJumpsPerTravelOrder,
      contractCount: contracts.length,
      nearestDeadlineDate,
      marketQuality,
      supplyQuality: marketQuality,
      riskLevel,
      badges,
    };
  });
}

function marketQualityFor(system: IStarSystem): StarmapMarketQuality {
  const population = system.population ?? 0;
  if (population >= 4_000_000_000) return 'capital';
  if (population >= 1_000_000_000) return 'industrial';
  return 'frontier';
}

function riskLevelFor(
  campaign: ICampaign,
  system: IStarSystem,
  contractCount: number,
): StarmapRiskLevel {
  if (contractCount > 0) return 'high';
  if (
    system.faction.toLowerCase() === campaign.factionId.toLowerCase() ||
    system.faction === 'ComStar'
  ) {
    return 'low';
  }
  return system.faction === 'Independent' ? 'medium' : 'high';
}

function isTerminalMission(mission: IMission): boolean {
  return [
    MissionStatus.SUCCESS,
    MissionStatus.PARTIAL,
    MissionStatus.FAILED,
    MissionStatus.BREACH,
    MissionStatus.CANCELLED,
    MissionStatus.ABORTED,
  ].includes(mission.status);
}
