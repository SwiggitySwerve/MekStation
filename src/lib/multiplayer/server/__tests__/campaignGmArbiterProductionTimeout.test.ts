/**
 * Production GM-arbiter proposal timeout is armed at the two construction
 * sites, auto-vetoes through the existing guest outcome path, cancels on
 * decide, and releases timers on host close.
 */

import { EventEmitter } from 'node:events';

import type { IGuestProposal } from '@/types/campaign/CoopCampaign';
import type { IForce } from '@/types/campaign/Force';
import type {
  IClientMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { _resetActiveCoopHosts } from '@/lib/campaign/coop/coopHostRegistry';
import {
  _resetCoopRuntimeSessions,
  openCoopRuntimeSession,
  submitGuestProposalToHost,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { createCampaign } from '@/types/campaign/Campaign';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import { PRODUCTION_PROPOSAL_TIMEOUT_MS } from '../CampaignGmArbiter';
import { CampaignHostRegistry } from '../CampaignHostRegistry';

const MATCH_ID = 'match-timeout-armed';
const CAMPAIGN_ID = 'campaign-timeout-prod';
const RUNTIME_MATCH_ID = 'match-timeout-runtime';
const RUNTIME_CAMPAIGN_ID = 'campaign-timeout-runtime';

class MockWireSocket extends EventEmitter implements IMatchSocket {
  readonly sent: IServerMessage[] = [];
  readonly closes: Array<{ code?: number; reason?: string }> = [];
  readyState = 1;

  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.closes.push({ code, reason });
    this.emit('close');
  }

  inbound(message: IClientMessage | Record<string, unknown> | string): void {
    this.emit(
      'message',
      typeof message === 'string' ? message : JSON.stringify(message),
    );
  }
}

const quietLogger = {
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

function registrySnapshot(campaignId: string) {
  return {
    campaignId,
    hostPlayerId: 'pid_host',
    roomCode: 'ABC234',
    arbitrationMode: 'host-review' as const,
    state: {
      ...createEmptyCampaignState(campaignId),
      balance: 1_000_000,
      rosterUnits: {
        'unit-guest': {
          unitId: 'unit-guest',
          designation: 'Guest Mech',
          status: 'operational' as const,
          unitRef: 'guest-mech',
          unitSource: 'canonical' as const,
        },
      },
      forceUnits: { 'force-guest': ['unit-guest'] },
    },
  };
}

function spendProposal(
  campaignId: string,
  proposalId: string,
  amount = 50_000,
): IGuestProposal {
  return {
    proposalId,
    campaignId,
    proposingPlayerId: 'pid_guest',
    ts: '2026-09-02T00:00:00.000Z',
    intent: {
      kind: 'SpendFunds',
      campaignId,
      intentId: `${proposalId}-intent`,
      payload: { amount, reason: 'Ammo' },
    },
  };
}

async function flushAsyncHandlers(): Promise<void> {
  for (let i = 0; i < 32; i += 1) {
    await Promise.resolve();
  }
}

function makeForce(id: string, unitIds: string[]): IForce {
  return {
    id,
    name: `Force ${id}`,
    subForceIds: [],
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  };
}

function timeoutDecision(socket: MockWireSocket, proposalId: string): boolean {
  return socket.sent.some((message) => {
    if (message.kind !== 'CampaignDecision' || !('result' in message)) {
      return false;
    }
    if (message.proposalId !== proposalId) return false;
    const result = message.result;
    if (typeof result !== 'object' || result === null) return false;
    if (!('status' in result) || result.status !== 'vetoed') return false;
    if (!('error' in result) || typeof result.error !== 'object') return false;
    const error = result.error;
    return (
      error !== null &&
      'reason' in error &&
      error.reason === 'host-review-timeout'
    );
  });
}

describe('production GM arbiter proposal timeout', () => {
  afterEach(() => {
    _resetActiveCoopHosts();
    _resetCoopRuntimeSessions();
    jest.useRealTimers();
  });

  it('R1: a proposal left undecided past the production timeout is auto-vetoed and the guest is told', async () => {
    // Date stays real so the campaign heartbeat idle check does not reap
    // sockets when we fast-forward the arbiter's production timeout.
    jest.useFakeTimers({ doNotFake: ['Date'] });
    const hostSocket = new MockWireSocket();
    const guestSocket = new MockWireSocket();
    const registry = new CampaignHostRegistry();
    await registry.register(MATCH_ID, registrySnapshot(CAMPAIGN_ID));

    await bindCampaignSyncConnection({
      socket: hostSocket,
      registry,
      matchId: MATCH_ID,
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: MATCH_ID,
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    hostSocket.inbound({
      kind: 'CampaignJoin',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    guestSocket.inbound({
      kind: 'CampaignJoin',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    guestSocket.inbound({
      kind: 'CampaignProposal',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'pid_guest',
      proposal: spendProposal(CAMPAIGN_ID, 'proposal-timeout'),
    });
    await flushAsyncHandlers();

    expect(guestSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignDecision',
        proposalId: 'proposal-timeout',
        result: { status: 'pending', proposalId: 'proposal-timeout' },
      }),
    );

    jest.advanceTimersByTime(PRODUCTION_PROPOSAL_TIMEOUT_MS);
    await flushAsyncHandlers();

    expect(timeoutDecision(guestSocket, 'proposal-timeout')).toBe(true);
    expect(registry.get(MATCH_ID)?.arbiter.getPendingProposals()).toHaveLength(
      0,
    );
    expect(registry.get(MATCH_ID)?.host.getState().balance).toBe(1_000_000);

    hostSocket.close();
    guestSocket.close();
    registry.dispose(MATCH_ID);
  });

  it('R2: a decision before the timeout cancels the timer (no late veto after an approval)', async () => {
    jest.useFakeTimers();
    const registry = new CampaignHostRegistry();
    const entry = await registry.register(
      MATCH_ID,
      registrySnapshot(CAMPAIGN_ID),
    );
    const baseline = jest.getTimerCount();

    await entry.arbiter.submitProposal(
      spendProposal(CAMPAIGN_ID, 'proposal-approve'),
    );
    expect(jest.getTimerCount()).toBeGreaterThan(baseline);

    const decision = await entry.arbiter.decide('proposal-approve', 'approve');
    expect(decision?.status).toBe('committed');
    expect(jest.getTimerCount()).toBe(baseline);

    jest.advanceTimersByTime(PRODUCTION_PROPOSAL_TIMEOUT_MS);
    expect(entry.arbiter.getPendingProposals()).toHaveLength(0);
    expect(entry.host.getState().balance).toBe(950_000);

    registry.dispose(MATCH_ID);
  });

  it('R3: a host that closes releases its timers', async () => {
    jest.useFakeTimers();
    const registry = new CampaignHostRegistry();
    const entry = await registry.register(
      MATCH_ID,
      registrySnapshot(CAMPAIGN_ID),
    );
    const baseline = jest.getTimerCount();

    await entry.arbiter.submitProposal(
      spendProposal(CAMPAIGN_ID, 'proposal-close'),
    );
    expect(jest.getTimerCount()).toBeGreaterThan(baseline);

    registry.dispose(MATCH_ID);
    expect(jest.getTimerCount()).toBe(baseline);
  });

  it('R4: both production construction sites arm the exported production timeout', async () => {
    const registry = new CampaignHostRegistry();
    const entry = await registry.register(
      MATCH_ID,
      registrySnapshot(CAMPAIGN_ID),
    );

    const campaign = {
      ...createCampaign('Runtime Timeout', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      id: RUNTIME_CAMPAIGN_ID,
      coopSession: createHostCoopSession('ABC234', RUNTIME_MATCH_ID),
    };
    const force = makeForce(campaign.rootForceId, ['u-host-1']);
    const runtime = await openCoopRuntimeSession(
      { ...campaign, forces: new Map([[force.id, force]]) },
      {
        matchId: RUNTIME_MATCH_ID,
        roomCode: 'ABC234',
        hostPlayerId: 'host',
        arbitrationMode: 'host-review',
      },
    );

    expect(entry.arbiter.proposalTimeoutMs).toBe(
      PRODUCTION_PROPOSAL_TIMEOUT_MS,
    );
    expect(runtime?.arbiter.proposalTimeoutMs).toBe(
      PRODUCTION_PROPOSAL_TIMEOUT_MS,
    );

    registry.dispose(MATCH_ID);
  });

  it('runtime waiters hear the timeout through the existing outcome path', async () => {
    jest.useFakeTimers();
    const campaign = {
      ...createCampaign('Runtime Timeout Waiter', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      id: RUNTIME_CAMPAIGN_ID,
      coopSession: createHostCoopSession('ABC234', RUNTIME_MATCH_ID),
    };
    const force = makeForce(campaign.rootForceId, ['u-host-1']);
    await openCoopRuntimeSession(
      { ...campaign, forces: new Map([[force.id, force]]) },
      {
        matchId: RUNTIME_MATCH_ID,
        roomCode: 'ABC234',
        hostPlayerId: 'host',
        arbitrationMode: 'host-review',
      },
    );

    const pending = submitGuestProposalToHost(
      RUNTIME_MATCH_ID,
      spendProposal(RUNTIME_CAMPAIGN_ID, 'proposal-runtime-timeout'),
    );
    await flushAsyncHandlers();

    jest.advanceTimersByTime(PRODUCTION_PROPOSAL_TIMEOUT_MS);
    await expect(pending).resolves.toMatchObject({
      status: 'vetoed',
      proposalId: 'proposal-runtime-timeout',
      error: { reason: 'host-review-timeout' },
    });
  });
});
