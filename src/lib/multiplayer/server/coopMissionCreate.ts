import { createHash } from 'node:crypto';

import type {
  CreateCoopMissionMatchBody,
  CreateMultiplayerMatchBody,
} from '@/lib/api/securitySchemas';

import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type { IMatchMeta, IMatchStore } from './IMatchStore';
import type { IMatchHostBootstrap } from './ServerMatchHostBootstrap';

import { getCampaignHostRegistry } from './CampaignHostRegistry';
import {
  admitCoopMission,
  CoopMissionRefusal,
  coopUnitIdentity,
  requireCoopMissionMember,
  validatePersistedCoopRoster,
} from './coopMissionAdmission';
import { getDefaultMatchStore } from './getDefaultMatchStore';
import { getMatchHostRegistry } from './MatchHostRegistry';
import {
  buildMatchHostBootstrapFromMeta,
  MatchUnitReferenceError,
} from './matchUnitBootstrap';
import { buildHostSession } from './ServerMatchHostBootstrap';

export function isCoopMissionBody(
  body: CreateMultiplayerMatchBody | CreateCoopMissionMatchBody,
): body is CreateCoopMissionMatchBody {
  return body.coopCampaign !== undefined && 'missionId' in body.coopCampaign;
}

async function readMission(
  store: IMatchStore,
  matchId: string,
): Promise<IMatchMeta | null> {
  try {
    return await store.getMatchMeta(matchId);
  } catch (error) {
    // REST and server.js load separate class graphs around the shared store.
    if (error instanceof Error && error.name === 'MatchNotFoundError')
      return null;
    throw error;
  }
}

export async function createCoopMissionMatch(
  body: CreateCoopMissionMatchBody,
  actorId: string,
): Promise<IMatchMeta> {
  getSQLiteService().initialize();
  const mission = body.coopCampaign;
  requireCoopMissionMember(mission, actorId);
  const entry = await getCampaignHostRegistry().getOrCreate(mission.sessionId);
  if (
    !entry ||
    entry.campaignId !== mission.campaignId ||
    entry.host.isClosed()
  ) {
    throw new CoopMissionRefusal(400, 'COOP_MISSION_INVALID_SESSION');
  }
  const store = getDefaultMatchStore();
  const matchId =
    'coop-' +
    createHash('sha256')
      .update(
        JSON.stringify([
          mission.campaignId,
          mission.sessionId,
          mission.missionId,
        ]),
      )
      .digest('hex');
  const config = { ...body.config, fogOfWar: body.config.fogOfWar ?? false };
  const created = await entry.host.runBatchExclusive(async () => {
    requireCoopMissionMember(mission, actorId);
    const fingerprintFor = (units: NonNullable<IMatchMeta['unitBootstrap']>) =>
      createHash('sha256')
        .update(
          JSON.stringify({
            mission,
            config,
            units: units.map(coopUnitIdentity),
          }),
        )
        .digest('hex');
    let meta = await readMission(store, matchId);
    if (!meta) {
      const admitted = admitCoopMission(body, entry, actorId);
      const fingerprint = fingerprintFor(admitted.unitBootstrap);
      const now = new Date().toISOString();
      const proposed: IMatchMeta = {
        matchId,
        hostPlayerId: entry.hostPlayerId,
        playerIds: Array.from(
          new Set([entry.hostPlayerId, ...admitted.playerIds]),
        ),
        sideAssignments: admitted.playerIds.map((playerId) => ({
          playerId,
          side: 'player',
        })),
        status: 'active',
        createdAt: now,
        updatedAt: now,
        config,
        unitBootstrap: admitted.unitBootstrap,
        coopMission: {
          campaignId: mission.campaignId,
          sessionId: mission.sessionId,
          missionId: mission.missionId,
          acceptedHead: mission.expectedHead,
          requestFingerprint: fingerprint,
          deployingPlayerIds: Object.freeze(
            Array.from(
              new Set(
                admitted.unitBootstrap.flatMap((unit) =>
                  unit.side === 'player' && unit.ownerPlayerId !== undefined
                    ? [unit.ownerPlayerId]
                    : [],
                ),
              ),
            ).sort(),
          ),
        },
      };
      let bootstrap: IMatchHostBootstrap;
      try {
        bootstrap = await buildMatchHostBootstrapFromMeta(proposed);
      } catch (error) {
        if (error instanceof MatchUnitReferenceError) {
          throw new CoopMissionRefusal(400, 'COOP_MISSION_INVALID_UNIT_REF');
        }
        throw error;
      }
      const { session } = buildHostSession(bootstrap);
      const opening = session.getSession().events;
      // Re-admit after catalog IO; createMatch commits synchronously before yielding.
      if (
        fingerprintFor(admitCoopMission(body, entry, actorId).unitBootstrap) !==
        fingerprint
      ) {
        throw new CoopMissionRefusal(409, 'COOP_MISSION_STALE_HEAD');
      }
      try {
        await store.createMatch(proposed, opening);
        meta = proposed;
      } catch (error) {
        meta = await readMission(store, matchId);
        if (!meta) throw error;
      }
      if (meta === proposed)
        await store.seedJournalFromInitialEvents?.(matchId, opening);
    }
    const roster = meta.unitBootstrap ?? [];
    validatePersistedCoopRoster(body, roster);
    if (meta.coopMission?.requestFingerprint !== fingerprintFor(roster)) {
      throw new CoopMissionRefusal(409, 'COOP_MISSION_IDENTITY_CONFLICT');
    }
    if (
      meta.status === 'active' &&
      !(await getMatchHostRegistry().getOrCreate(matchId))
    ) {
      throw new CoopMissionRefusal(409, 'COOP_MISSION_RECOVERY_REFUSED');
    }
    requireCoopMissionMember(mission, actorId);
    return meta;
  });
  // A retry reaches this door from the stored match even if the first append failed.
  try {
    await entry.host.announceMissionLaunched(created);
  } catch (error) {
    // Like readMission, this boundary also receives the socket graph's errors.
    if (
      error instanceof Error &&
      error.name === 'CampaignMissionLaunchRefusal'
    ) {
      throw new CoopMissionRefusal(409, error.message);
    }
    throw error;
  }
  return created;
}
