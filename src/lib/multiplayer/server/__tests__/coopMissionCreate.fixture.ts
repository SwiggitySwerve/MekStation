import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';

import type { CreateCoopMissionMatchBody } from '@/lib/api/securitySchemas';

import {
  campaignLaunchHeadPorts,
  resolveCampaignLaunchHead,
} from '@/lib/campaign/authority/campaignLaunchHead';
import {
  appendCampaignGenesis,
  authoritativeStateFromSerializedCampaign,
} from '@/lib/campaign/authority/campaignSourceGenesis';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { writeCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { saveCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { claimCampaignSessionForce } from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

import type { ICampaignHostRegistryEntry } from '../CampaignHostRegistry';
import type {
  IMatchConfig,
  IMatchCoopCampaignRegistration,
} from '../IMatchStore';

import { canonicalTokenPayload } from '../auth';
import { admitCampaignParticipation } from '../authorizeCampaignParticipation';
import { derivePlayerId } from '../playerIdFromPublicKey';

export const FIXTURE_AT = '2026-09-27T00:00:00.000Z';

export function fixtureIdentity(): {
  readonly playerId: string;
  readonly wireToken: string;
} {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const bytes = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const playerId = derivePlayerId(bytes);
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
  const wireToken = encodeTokenForWire({
    playerId,
    issuedAt,
    expiresAt,
    publicKey: bytes.toString('base64'),
    signature: sign(
      null,
      Buffer.from(canonicalTokenPayload({ playerId, issuedAt, expiresAt })),
      privateKey,
    ).toString('base64'),
  });
  return { playerId, wireToken };
}

export async function seedCoopCampaign(
  campaignId: string,
): Promise<ReturnType<typeof authoritativeStateFromSerializedCampaign>> {
  const base = buildPopulatedCampaign();
  const template = Array.from(base.forces.values())[0];
  assert.ok(template);
  const campaign = {
    ...base,
    id: campaignId,
    rootForceId: 'force-host',
    forces: new Map([
      ['force-host', { ...template, id: 'force-host', unitIds: ['unit-host'] }],
      [
        'force-guest',
        { ...template, id: 'force-guest', unitIds: ['unit-guest'] },
      ],
    ]),
  };
  const envelope = buildSerializedCampaign(campaign, 'p1a-fixture', 0, {
    campaignId,
    units: [
      {
        unitId: 'unit-host',
        unitRef: 'atlas-as7-d',
        unitSource: 'canonical',
        unitName: 'Host Atlas',
        chassisVariant: 'AS7-D',
        readiness: 'Ready',
      },
      {
        unitId: 'unit-guest',
        unitRef: 'marauder-mad-3r',
        unitSource: 'canonical',
        unitName: 'Guest Marauder',
        chassisVariant: 'MAD-3R',
        readiness: 'Ready',
      },
    ],
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  assert.equal(saveCampaign(envelope, 0).kind, 'ok');
  const genesis = await appendCampaignGenesis(
    new SQLiteEventJournal(getSQLiteService().getDatabase(), () => FIXTURE_AT),
    writeCampaignMigrationMarker,
    { envelope, occurredAt: FIXTURE_AT },
  );
  assert.equal(genesis.kind, 'genesis-appended');
  return authoritativeStateFromSerializedCampaign(envelope);
}

export function vesselRequest(
  state: Awaited<ReturnType<typeof seedCoopCampaign>>,
): {
  readonly config: IMatchConfig;
  readonly layout: '1v1';
  readonly hostSeatKind: 'spectator';
  readonly coopCampaign: IMatchCoopCampaignRegistration;
} {
  return {
    config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
    layout: '1v1' as const,
    hostSeatKind: 'spectator' as const,
    coopCampaign: { campaignId: state.campaignId, state },
  };
}

export interface IFixtureContribution {
  readonly playerId: string;
  readonly forceId: string;
  readonly choice: 'deploy' | 'command-hq';
  readonly claim?: boolean;
  readonly publish?: boolean;
}

export function acceptFixtureParticipation(
  entry: ICampaignHostRegistryEntry,
  contributors: readonly IFixtureContribution[],
  missionId = 'mission-1',
): void {
  for (const contributor of contributors) {
    const bound = bindCampaignSessionParticipant({
      campaignId: entry.campaignId,
      sessionId: entry.matchId,
      participantId: contributor.playerId,
      seat: contributor.playerId === entry.hostPlayerId ? 'gm' : 'player',
      boundAt: FIXTURE_AT,
    });
    assert.ok(bound.kind === 'bound' || bound.kind === 'already-bound');
    const admitted = admitCampaignParticipation({
      matchId: entry.matchId,
      currentRevision: entry.revision,
      acknowledgedRevision: entry.revision,
      verifiedPlayerId: contributor.playerId,
      hostPlayerId: entry.hostPlayerId,
      forceUnits: entry.host.getState().forceUnits ?? {},
      records: entry.getParticipationRecords(missionId),
      payload: {
        missionId,
        forceId: contributor.forceId,
        choice: contributor.choice,
      },
    });
    assert.ok(admitted.ok);
    if (contributor.claim !== false) {
      const claimed = claimCampaignSessionForce({
        campaignId: entry.campaignId,
        sessionId: entry.matchId,
        missionId,
        forceId: contributor.forceId,
        participantId: contributor.playerId,
        claimedAt: FIXTURE_AT,
      });
      assert.ok(claimed.kind === 'claimed' || claimed.kind === 'already-held');
    }
    if (contributor.publish !== false)
      entry.publishParticipation(admitted.record);
  }
}

export function missionRequest(
  entry: ICampaignHostRegistryEntry,
  missionId = 'mission-1',
): CreateCoopMissionMatchBody {
  const head = resolveCampaignLaunchHead(
    campaignLaunchHeadPorts(),
    entry.campaignId,
  );
  assert.ok(head.kind === 'head');
  return {
    config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
    layout: '1v1' as const,
    coopCampaign: {
      campaignId: entry.campaignId,
      sessionId: entry.matchId,
      missionId,
      expectedHead: {
        branchId: head.branchId,
        revision: head.revision,
        effectiveGeneration: head.effectiveGeneration,
      },
      contributions: [
        { forceId: 'force-host', choice: 'deploy', unitIds: ['unit-host'] },
        { forceId: 'force-guest', choice: 'deploy', unitIds: ['unit-guest'] },
      ],
    },
    unitBootstrap: [
      { unitId: 'unit-host', unitRef: 'atlas-as7-d', side: 'player' },
      { unitId: 'unit-guest', unitRef: 'marauder-mad-3r', side: 'player' },
      { unitId: 'opfor-1', unitRef: 'locust-lct-1v', side: 'opponent' },
    ],
  };
}
