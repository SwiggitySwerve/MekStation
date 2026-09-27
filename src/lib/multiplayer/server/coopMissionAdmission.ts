import type { CreateCoopMissionMatchBody } from '@/lib/api/securitySchemas';

import {
  campaignLaunchHeadPorts,
  resolveCampaignLaunchHead,
} from '@/lib/campaign/authority/campaignLaunchHead';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { listCampaignSessionForceClaims } from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import {
  activeCampaignSessionMembership,
  listActiveCampaignSessionParticipants,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';

import type { ICampaignHostRegistryEntry } from './CampaignHostRegistry';
import type {
  IMatchCoopMission,
  IMatchUnitBootstrapEntry,
} from './IMatchStore';

export class CoopMissionRefusal extends Error {
  constructor(
    readonly status: 400 | 403 | 409,
    readonly code: string,
  ) {
    super(code);
    this.name = 'CoopMissionRefusal';
  }
}

export function requireCoopMissionMember(
  mission: Pick<IMatchCoopMission, 'campaignId' | 'sessionId'>,
  playerId: string,
): void {
  if (
    !activeCampaignSessionMembership(
      mission.campaignId,
      mission.sessionId,
      playerId,
    )
  ) {
    throw new CoopMissionRefusal(403, 'COOP_MISSION_FORBIDDEN');
  }
}

export function admitCoopMission(
  body: CreateCoopMissionMatchBody,
  entry: ICampaignHostRegistryEntry,
  actorId: string,
): {
  readonly unitBootstrap: readonly IMatchUnitBootstrapEntry[];
  readonly playerIds: readonly string[];
} {
  const mission = body.coopCampaign;
  requireCoopMissionMember(mission, actorId);
  const current = resolveCampaignLaunchHead(
    campaignLaunchHeadPorts(),
    mission.campaignId,
  );
  const expected = mission.expectedHead;
  if (
    entry.host.isClosed() ||
    current.kind !== 'head' ||
    current.branchId !== expected.branchId ||
    current.revision !== expected.revision ||
    current.effectiveGeneration !== expected.effectiveGeneration
  ) {
    throw new CoopMissionRefusal(409, 'COOP_MISSION_STALE_HEAD');
  }
  const campaign = readCampaign(mission.campaignId);
  if (
    campaign.kind !== 'ok' ||
    !campaign.record.body.missions.some(([id]) => id === mission.missionId)
  ) {
    throw new CoopMissionRefusal(400, 'COOP_MISSION_UNKNOWN');
  }
  const records = entry.getParticipationRecords(mission.missionId);
  const claims = listCampaignSessionForceClaims(
    mission.campaignId,
    mission.sessionId,
  ).filter((claim) => claim.missionId === mission.missionId);
  const members = listActiveCampaignSessionParticipants(
    mission.campaignId,
    mission.sessionId,
  );
  const contributions = mission.contributions;
  if (
    records.length !== contributions.length ||
    claims.length !== contributions.length ||
    members.some(
      (member) =>
        member.seat === 'player' &&
        !records.some((record) => record.playerId === member.participantId),
    )
  ) {
    throw new CoopMissionRefusal(400, 'COOP_MISSION_PARTICIPATION_REQUIRED');
  }
  const state = entry.host.getState();
  const owners = new Map<string, string>();
  const players = new Set<string>();
  for (const contribution of contributions) {
    const claim = claims.find((row) => row.forceId === contribution.forceId);
    const record = records.find((row) => row.force.id === contribution.forceId);
    const roster = state.forceUnits?.[contribution.forceId];
    if (
      !claim ||
      !record ||
      !roster ||
      record.playerId !== claim.participantId ||
      record.choice !== contribution.choice ||
      players.has(claim.participantId) ||
      !members.some((member) => member.participantId === claim.participantId) ||
      contribution.unitIds.length !== record.force.unitIds.length ||
      contribution.unitIds.some(
        (id) => !roster.includes(id) || !record.force.unitIds.includes(id),
      ) ||
      new Set(contribution.unitIds).size !== contribution.unitIds.length
    ) {
      throw new CoopMissionRefusal(400, 'COOP_MISSION_INVALID_CONTRIBUTION');
    }
    players.add(claim.participantId);
    if (contribution.choice === 'deploy') {
      for (const unitId of contribution.unitIds) {
        if (owners.has(unitId))
          throw new CoopMissionRefusal(400, 'COOP_MISSION_DUPLICATE_UNIT');
        owners.set(unitId, claim.participantId);
      }
    }
  }
  if (
    owners.size === 0 ||
    new Set(body.unitBootstrap.map((unit) => unit.unitId)).size !==
      body.unitBootstrap.length
  ) {
    throw new CoopMissionRefusal(400, 'COOP_MISSION_INVALID_UNITS');
  }
  const unitBootstrap = body.unitBootstrap.map(
    (unit): IMatchUnitBootstrapEntry => {
      const ownerPlayerId = owners.get(unit.unitId);
      if (unit.side === 'opponent') {
        if (state.rosterUnits[unit.unitId])
          throw new CoopMissionRefusal(400, 'COOP_MISSION_INVALID_OPFOR');
        return unit;
      }
      if (
        !ownerPlayerId ||
        state.rosterUnits[unit.unitId]?.unitRef !== unit.unitRef
      ) {
        throw new CoopMissionRefusal(400, 'COOP_MISSION_INVALID_UNIT_REF');
      }
      return { ...unit, ownerPlayerId };
    },
  );
  if (
    unitBootstrap.filter((unit) => unit.side === 'player').length !==
    owners.size
  ) {
    throw new CoopMissionRefusal(400, 'COOP_MISSION_INCOMPLETE_ROSTER');
  }
  return { unitBootstrap, playerIds: Array.from(players) };
}
