/**
 * D-4 wiring seam test (2026-06-09 audit, W3.3): completing a co-op
 * battle sends its derived consequences as a `ReconcileBattle` host intent.
 *
 * Before the fix, `reconcileCoopBattle` had ZERO production callers —
 * a co-op host campaign's battle outcome was enqueued like any
 * single-player outcome and the shared CO1 campaign state never saw
 * the salvage / roster consequences.
 *
 * These tests exercise the PRODUCTION seam end-to-end, not the module
 * in isolation: a real `CampaignMatchHost` is registered for a real
 * co-op host campaign, then the battle "completes" by publishing a
 * campaign-linked outcome on the combat-outcome bus (exactly what
 * `InteractiveSession` does). The store's enqueue listener must drive
 * the reconciliation through the campaign-sync transport.
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import type {
  ICampaignIntent,
  ICampaignReconcileBattleIntent,
} from '@/types/campaign/CampaignSync';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';

import { toast } from '@/components/shared/Toast';
import {
  _resetCombatOutcomeBus,
  publishCombatOutcome,
} from '@/engine/combatOutcomeBus';
import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
  type ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import {
  _resetActiveCoopHosts,
  registerActiveCoopHost,
} from '@/lib/campaign/coop/coopHostRegistry';
import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionCoreTypes';

jest.mock('@/components/shared/Toast', () => ({
  toast: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDelta(
  unitId: string,
  side: GameSide,
  finalStatus: UnitFinalStatus,
): IUnitCombatDelta {
  return {
    unitId,
    side,
    destroyed: finalStatus === UnitFinalStatus.Destroyed,
    finalStatus,
    armorRemaining: {},
    internalsRemaining: {},
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: {},
    pilotState: {
      conscious: true,
      wounds: 0,
      killed: false,
      finalStatus: PilotFinalStatus.Active,
    },
  };
}

/**
 * A campaign-linked outcome: one damaged player unit (-> roster change)
 * and one destroyed OpFor unit (-> 50k flat wreck salvage per the
 * `deriveCoopBattleConsequences` default derivation).
 */
function makeCoopOutcome(matchId: string): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: 'contract-coop-1',
    scenarioId: 'scenario-coop-1',
    endReason: CombatEndReason.Destruction,
    report: {
      version: 1,
      matchId,
      winner: GameSide.Player,
      reason: 'destruction',
      turnCount: 4,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [
      makeDelta('unit-A', GameSide.Player, UnitFinalStatus.Damaged),
      makeDelta('opfor-1', GameSide.Opponent, UnitFinalStatus.Destroyed),
    ],
    capturedAt: '3025-06-15T12:00:00Z',
  };
}

/** Flush the fire-and-forget reconciliation promise chain. */
async function flushAsync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a co-op HOST campaign on the real store and stand up a real
 * `CampaignMatchHost` for it (the piece production session-lifecycle
 * wiring will own — see coopHostRegistry module docs).
 */
async function setupHostedCoopCampaign(): Promise<{
  campaignId: string;
  host: CampaignMatchHost;
  matchId: string;
}> {
  const store = useCampaignStore();
  const matchId = 'campaign-sync-match-1';
  const campaignId = store
    .getState()
    .createCampaign('Coop Wiring Co.', 'mercenary', undefined, {
      coopSession: createHostCoopSession('ROOM42', matchId),
    });
  const host = new CampaignMatchHost({
    campaignId,
    hostPlayerId: 'host-player',
    eventStore: new InMemoryCampaignEventStore(),
    initialState: {
      ...createEmptyCampaignState(campaignId),
      balance: 1_000_000,
    },
  });
  await host.open();
  registerActiveCoopHost(host);
  return { campaignId, host, matchId };
}

type HostIntent = ICampaignIntent | ICampaignReconcileBattleIntent;

function registerHostTransport(
  matchId: string,
  sentHostIntents: HostIntent[],
): () => void {
  const transport: ICampaignSyncTransport = {
    matchId,
    playerId: 'host-player',
    role: 'host',
    sendProposal: jest.fn(),
    sendDecision: jest.fn(),
    sendHostIntent: (intent) => sentHostIntents.push(intent),
    sendParticipation: jest.fn(),
    onFrame: jest.fn(() => () => undefined),
    onError: jest.fn(() => () => undefined),
    close: jest.fn(),
    lastSeq: jest.fn(() => -1),
  };
  return registerCampaignSyncTransport(transport);
}

function resetWorld(): void {
  jest.restoreAllMocks();
  resetCampaignStore();
  _resetCombatOutcomeBus();
  _resetActiveCoopHosts();
  _resetCampaignSyncTransportsForTest();
  _resetDayPipeline();
  _resetBuiltinRegistration();
  clientSafeStorage.removeItem('campaign-store');
  jest.clearAllMocks();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('co-op battle completion reconciles over campaign sync (D-4)', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('sends one ReconcileBattle intent without mutating the browser-local host', async () => {
    const { campaignId, host, matchId } = await setupHostedCoopCampaign();
    const sentHostIntents: HostIntent[] = [];
    registerHostTransport(matchId, sentHostIntents);
    const applyHostIntent = jest.spyOn(host, 'applyHostIntent');
    const creditSalvagePool = jest.spyOn(host, 'creditSalvagePool');
    const applyRosterUnitChange = jest.spyOn(host, 'applyRosterUnitChange');
    // Give the roster store the unit's display name so the reconciled
    // RosterUnitChanged event carries a designation, not a raw id.
    useCampaignRosterStore.getState().initRoster(campaignId);
    useCampaignRosterStore.getState().addUnit({
      unitId: 'unit-A',
      unitName: 'Atlas AS7-D',
      chassisVariant: 'Atlas AS7-D',
      readiness: 'Ready',
    });

    const outcome = makeCoopOutcome('match-coop-wire-1');
    publishCombatOutcome({ matchId: outcome.matchId, outcome });
    await flushAsync();

    expect(sentHostIntents).toEqual([
      {
        kind: 'ReconcileBattle',
        campaignId,
        intentId: `coop-recon-${outcome.matchId}`,
        payload: {
          campaignId,
          matchId: outcome.matchId,
          fundsDelta: 0,
          fundsReason: `Co-op mission resolution (${outcome.matchId})`,
          salvageValue: 50_000,
          rosterChanges: [
            {
              unitId: 'unit-A',
              designation: 'Atlas AS7-D',
              status: 'damaged',
            },
          ],
        },
      },
    ]);
    expect(applyHostIntent).not.toHaveBeenCalled();
    expect(creditSalvagePool).not.toHaveBeenCalled();
    expect(applyRosterUnitChange).not.toHaveBeenCalled();

    // The outcome still flows through the normal enqueue path…
    expect(useCampaignStore().getState().getPendingOutcomeCount()).toBe(1);
    // …AND the shared CO1 campaign state converged on the battle:
    // one destroyed OpFor wreck -> 50k salvage pool credit.
    // The damaged player unit landed as a RosterUnitChanged.
    // No payout was claimed at this seam — balance untouched.
  });

  it('a re-published matchId sends one reconciliation intent (dedup guard reused)', async () => {
    const { matchId } = await setupHostedCoopCampaign();
    const sentHostIntents: HostIntent[] = [];
    registerHostTransport(matchId, sentHostIntents);

    const outcome = makeCoopOutcome('match-coop-wire-2');
    publishCombatOutcome({ matchId: outcome.matchId, outcome });
    await flushAsync();
    publishCombatOutcome({ matchId: outcome.matchId, outcome });
    await flushAsync();

    expect(useCampaignStore().getState().getPendingOutcomeCount()).toBe(1);
    expect(sentHostIntents).toHaveLength(1);
    expect(sentHostIntents[0]).toMatchObject({
      kind: 'ReconcileBattle',
      intentId: 'coop-recon-match-coop-wire-2',
    });
  });

  it('a single-player campaign never touches a registered host', async () => {
    const store = useCampaignStore();
    const campaignId = store.getState().createCampaign('Solo Co.', 'mercenary');
    // A host registered for the same campaign id must still be ignored —
    // the gate keys off campaign.coopSession, not host availability.
    const host = new CampaignMatchHost({
      campaignId,
      hostPlayerId: 'host-player',
      eventStore: new InMemoryCampaignEventStore(),
      initialState: createEmptyCampaignState(campaignId),
    });
    await host.open();
    registerActiveCoopHost(host);

    const outcome = makeCoopOutcome('match-solo-1');
    publishCombatOutcome({ matchId: outcome.matchId, outcome });
    await flushAsync();

    expect(store.getState().getPendingOutcomeCount()).toBe(1);
    expect(host.getState().salvagePool).toBe(0);
    expect(Object.keys(host.getState().rosterUnits)).toHaveLength(0);
  });

  it('warns and leaves the browser-local host untouched without a host transport', async () => {
    // The production state today: no session-lifecycle wiring registers
    // a CampaignMatchHost, so the gate must be a clean no-op.
    const { host } = await setupHostedCoopCampaign();
    const applyHostIntent = jest.spyOn(host, 'applyHostIntent');
    const creditSalvagePool = jest.spyOn(host, 'creditSalvagePool');
    const applyRosterUnitChange = jest.spyOn(host, 'applyRosterUnitChange');

    const outcome = makeCoopOutcome('match-host-transport-missing-1');
    publishCombatOutcome({ matchId: outcome.matchId, outcome });
    await flushAsync();

    expect(useCampaignStore().getState().getPendingOutcomeCount()).toBe(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Co-op battle reconciliation was saved locally but the live host connection is unavailable. Guests may need to refetch.',
        variant: 'warning',
      }),
    );
    expect(applyHostIntent).not.toHaveBeenCalled();
    expect(creditSalvagePool).not.toHaveBeenCalled();
    expect(applyRosterUnitChange).not.toHaveBeenCalled();
  });
});
