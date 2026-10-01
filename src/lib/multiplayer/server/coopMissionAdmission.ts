import { createHash } from 'node:crypto';

import type { CreateCoopMissionMatchBody } from '@/lib/api/securitySchemas';

import {
  campaignLaunchHeadPorts,
  resolveCampaignLaunchHead,
} from '@/lib/campaign/authority/campaignLaunchHead';
import { selectOpponentUnits } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits';
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
  const playerUnits = body.unitBootstrap
    .filter((unit) => unit.side === 'player')
    .map((unit): IMatchUnitBootstrapEntry => {
      const ownerPlayerId = owners.get(unit.unitId);
      if (
        !ownerPlayerId ||
        state.rosterUnits[unit.unitId]?.unitRef !== unit.unitRef
      ) {
        throw new CoopMissionRefusal(400, 'COOP_MISSION_INVALID_UNIT_REF');
      }
      return { ...unit, ownerPlayerId };
    });
  if (playerUnits.length !== owners.size) {
    throw new CoopMissionRefusal(400, 'COOP_MISSION_INCOMPLETE_ROSTER');
  }
  const opponents = selectOpponentUnits({
    count: owners.size,
    seed: `${mission.campaignId}:${mission.missionId}`,
  }).map(
    (unit, index): IMatchUnitBootstrapEntry => ({
      unitId: `coop-opponent:${createHash('sha256')
        .update(JSON.stringify([mission.campaignId, mission.missionId, index]))
        .digest('hex')}`,
      unitRef: unit.unitRef,
      side: 'opponent',
    }),
  );
  const unitBootstrap = [...playerUnits, ...opponents];
  if (unitBootstrap.length > 24) {
    throw new CoopMissionRefusal(400, 'COOP_MISSION_ROSTER_LIMIT');
  }
  if (
    opponents.some((unit) => state.rosterUnits[unit.unitId]) ||
    new Set(unitBootstrap.map((unit) => unit.unitId)).size !==
      unitBootstrap.length
  ) {
    throw new CoopMissionRefusal(400, 'COOP_MISSION_INVALID_OPFOR');
  }
  assertCoopOpponentRows(body, opponents);
  return { unitBootstrap, playerIds: Array.from(players) };
}

/** Fixed field order makes persisted rows independent of object key order. */
export function coopUnitIdentity(unit: IMatchUnitBootstrapEntry): string {
  return JSON.stringify([
    unit.unitId,
    unit.unitRef,
    unit.side,
    unit.ownerPlayerId,
    unit.name,
    unit.pilotRef,
    unit.gunnery,
    unit.piloting,
    unit.startHex ? [unit.startHex.q, unit.startHex.r] : null,
  ]);
}

function assertCoopOpponentRows(
  body: CreateCoopMissionMatchBody,
  opponents: readonly IMatchUnitBootstrapEntry[],
): void {
  const supplied = body.unitBootstrap.filter(
    (unit) => unit.side === 'opponent',
  );
  if (supplied.length === 0) return;
  const expected = new Map(
    opponents.map((unit) => [unit.unitId, coopUnitIdentity(unit)]),
  );
  if (
    supplied.length !== opponents.length ||
    new Set(supplied.map((unit) => unit.unitId)).size !== supplied.length ||
    supplied.some(
      (unit) => expected.get(unit.unitId) !== coopUnitIdentity(unit),
    )
  ) {
    throw new CoopMissionRefusal(400, 'COOP_MISSION_INVALID_OPFOR');
  }
}

/** Retry authority is the immutable bootstrap, never a newly advanced head. */
export function validatePersistedCoopRoster(
  body: CreateCoopMissionMatchBody,
  roster: readonly IMatchUnitBootstrapEntry[],
): void {
  const players = roster.filter((unit) => unit.side === 'player');
  const supplied = body.unitBootstrap.filter((unit) => unit.side === 'player');
  if (
    supplied.length !== players.length ||
    new Set(body.unitBootstrap.map((unit) => unit.unitId)).size !==
      body.unitBootstrap.length ||
    supplied.some((unit) => {
      const stored = players.find((row) => row.unitId === unit.unitId);
      return (
        !stored?.ownerPlayerId ||
        coopUnitIdentity({ ...unit, ownerPlayerId: stored.ownerPlayerId }) !==
          coopUnitIdentity(stored)
      );
    })
  ) {
    throw new CoopMissionRefusal(409, 'COOP_MISSION_IDENTITY_CONFLICT');
  }
  assertCoopOpponentRows(
    body,
    roster.filter((unit) => unit.side === 'opponent'),
  );
}
