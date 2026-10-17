import type Database from 'better-sqlite3';

import { createHash } from 'node:crypto';

import type {
  CreateCoopMissionMatchBody,
  CreateMultiplayerMatchBody,
} from '@/lib/api/securitySchemas';
import type {
  CampaignLaunchVerdict,
  CampaignLaunchView,
} from '@/lib/campaign/sync/campaignPublicAppliedView';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type {
  IMatchMeta,
  IMatchStore,
  MatchPreparedCreateResult,
} from './IMatchStore';
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

/** The match was durably written; what failed is named, never a zero-create. */
export class CoopMissionCommitError extends AggregateError {
  constructor(
    readonly matchId: string,
    readonly outcome: 'committed' | 'uncertain',
    errors: readonly unknown[],
  ) {
    super(errors, `COOP_MISSION_COMMIT_${outcome.toUpperCase()}`);
    this.name = 'CoopMissionCommitError';
  }
}

/** Writes one proposal after its last async step; resolves the stored meta. */
type CoopMissionWrite = (
  store: IMatchStore,
  proposed: IMatchMeta,
  opening: readonly IGameEvent[],
  readmit: () => void,
) => Promise<IMatchMeta>;

async function storedOrThrow(
  store: IMatchStore,
  matchId: string,
  error: unknown,
): Promise<IMatchMeta> {
  const meta = await readMission(store, matchId);
  if (!meta) throw error;
  return meta;
}

/** The only route-reached write: async create, commit before yielding. */
const createDirect: CoopMissionWrite = async (
  store,
  proposed,
  opening,
  readmit,
) => {
  readmit();
  try {
    await store.createMatch(proposed, opening);
    return proposed;
  } catch (error) {
    return storedOrThrow(store, proposed.matchId, error);
  }
};

export function createCoopMissionMatch(
  body: CreateCoopMissionMatchBody,
  actorId: string,
): Promise<IMatchMeta> {
  return runCoopMissionCreate(body, actorId, createDirect);
}

const launchRefusal = (verdict: CampaignLaunchVerdict) =>
  new CoopMissionRefusal(
    409,
    verdict.kind === 'not-converged'
      ? 'COOP_MISSION_NOT_CONVERGED'
      : 'COOP_MISSION_LAUNCH_REFUSED',
  );

/**
 * P2CG1C prepared create, callable and not route-reached. After all async
 * work, holds campaign C then match M IMMEDIATE, revalidates the P2CB
 * preparation on C while M is held, and commits M before releasing C.
 * Two files, two commits: no cross-file atomicity is claimed. `launch`
 * must be this graph's view; any other refuses context-mismatch.
 */
export function createPreparedCoopMissionMatch(
  body: CreateCoopMissionMatchBody,
  actorId: string,
  launch: CampaignLaunchView | null,
): Promise<IMatchMeta> {
  const matches = getDefaultMatchStore();
  const create = matches.createMatchPrepared?.bind(matches);
  if (!launch || !create) {
    return Promise.reject(
      new CoopMissionRefusal(409, 'COOP_MISSION_LAUNCH_UNSUPPORTED'),
    );
  }
  const { campaignId, sessionId } = body.coopCampaign;
  return runCoopMissionCreate(
    body,
    actorId,
    async (store, proposed, opening, readmit) => {
      const prepared = await launch.prepare({ campaignId, sessionId });
      if (prepared.verdict.kind !== 'ready')
        throw launchRefusal(prepared.verdict);
      readmit();
      const campaign = getSQLiteService().getDatabase();
      const settled = holdCampaign(campaign, () =>
        create(proposed, opening, () => {
          const verdict = launch.revalidate(campaign, prepared);
          return verdict.kind === 'ready' ? null : verdict;
        }),
      );
      return settlePreparedCreate(store, proposed, settled);
    },
  );
}

type HeldCreate =
  | MatchPreparedCreateResult<CampaignLaunchVerdict>
  | { readonly kind: 'threw'; readonly error: unknown };

/** Runs `write` inside BEGIN IMMEDIATE on C, then releases C unwritten. */
function holdCampaign(
  campaign: Database.Database,
  write: () => MatchPreparedCreateResult<CampaignLaunchVerdict>,
): { readonly result: HeldCreate; readonly releaseErrors: unknown[] } {
  if (campaign.inTransaction) {
    throw new Error('Prepared create needs an idle campaign connection');
  }
  campaign.exec('BEGIN IMMEDIATE');
  let result: HeldCreate;
  try {
    result = write();
  } catch (error) {
    result = { kind: 'threw', error };
  }
  try {
    if (campaign.inTransaction) campaign.exec('ROLLBACK');
    return { result, releaseErrors: [] };
  } catch (releaseError) {
    return { result, releaseErrors: [releaseError] };
  }
}

/** Committed M is never compensated or reported as a refusal. */
function settlePreparedCreate(
  store: IMatchStore,
  proposed: IMatchMeta,
  { result, releaseErrors }: ReturnType<typeof holdCampaign>,
): Promise<IMatchMeta> {
  if (result.kind === 'committed' && releaseErrors.length === 0) {
    return Promise.resolve(proposed);
  }
  if (result.kind === 'committed' || result.kind === 'uncertain') {
    const errors = result.kind === 'uncertain' ? [result.error] : [];
    throw new CoopMissionCommitError(proposed.matchId, result.kind, [
      ...errors,
      ...releaseErrors,
    ]);
  }
  const original =
    result.kind === 'refused' ? launchRefusal(result.refusal) : result.error;
  if (releaseErrors.length > 0) {
    throw new AggregateError([original, ...releaseErrors], 'C release failed');
  }
  if (result.kind === 'refused') throw original;
  return storedOrThrow(store, proposed.matchId, original);
}

async function runCoopMissionCreate(
  body: CreateCoopMissionMatchBody,
  actorId: string,
  write: CoopMissionWrite,
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
      // Re-admit after catalog IO; each write commits synchronously after it.
      meta = await write(store, proposed, opening, () => {
        if (
          fingerprintFor(
            admitCoopMission(body, entry, actorId).unitBootstrap,
          ) !== fingerprint
        ) {
          throw new CoopMissionRefusal(409, 'COOP_MISSION_STALE_HEAD');
        }
      });
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
