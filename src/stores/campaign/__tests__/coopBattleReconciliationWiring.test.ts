/**
 * D-4 wiring seam test (2026-06-09 audit, W3.3): completing a co-op
 * battle reconciles state via `reconcileCoopBattle`.
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
 * the reconciliation through the host.
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';

import {
  _resetCombatOutcomeBus,
  publishCombatOutcome,
} from '@/engine/combatOutcomeBus';
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
}> {
  const store = useCampaignStore();
  const campaignId = store
    .getState()
    .createCampaign('Coop Wiring Co.', 'mercenary', undefined, {
      coopSession: createHostCoopSession('ROOM42'),
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
  return { campaignId, host };
}

function resetWorld(): void {
  resetCampaignStore();
  _resetCombatOutcomeBus();
  _resetActiveCoopHosts();
  _resetDayPipeline();
  _resetBuiltinRegistration();
  clientSafeStorage.removeItem('campaign-store');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('co-op battle completion reconciles via reconcileCoopBattle (D-4)', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('a completed co-op battle reconciles salvage + roster into the host state', async () => {
    const { campaignId, host } = await setupHostedCoopCampaign();
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

    // The outcome still flows through the normal enqueue path…
    expect(useCampaignStore().getState().getPendingOutcomeCount()).toBe(1);
    // …AND the shared CO1 campaign state converged on the battle:
    // one destroyed OpFor wreck -> 50k salvage pool credit.
    expect(host.getState().salvagePool).toBe(50_000);
    // The damaged player unit landed as a RosterUnitChanged.
    expect(host.getState().rosterUnits['unit-A']?.status).toBe('damaged');
    expect(host.getState().rosterUnits['unit-A']?.designation).toBe(
      'Atlas AS7-D',
    );
    // No payout was claimed at this seam — balance untouched.
    expect(host.getState().balance).toBe(1_000_000);
  });

  it('a re-published matchId never double-reconciles (dedup guard reused)', async () => {
    const { host } = await setupHostedCoopCampaign();

    const outcome = makeCoopOutcome('match-coop-wire-2');
    publishCombatOutcome({ matchId: outcome.matchId, outcome });
    await flushAsync();
    publishCombatOutcome({ matchId: outcome.matchId, outcome });
    await flushAsync();

    expect(useCampaignStore().getState().getPendingOutcomeCount()).toBe(1);
    // Salvage credited exactly once.
    expect(host.getState().salvagePool).toBe(50_000);
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

  it('a co-op host campaign with no live host enqueues without throwing', async () => {
    // The production state today: no session-lifecycle wiring registers
    // a CampaignMatchHost, so the gate must be a clean no-op.
    const store = useCampaignStore();
    store
      .getState()
      .createCampaign('Hostless Coop Co.', 'mercenary', undefined, {
        coopSession: createHostCoopSession('ROOM43'),
      });

    const outcome = makeCoopOutcome('match-hostless-1');
    publishCombatOutcome({ matchId: outcome.matchId, outcome });
    await flushAsync();

    expect(store.getState().getPendingOutcomeCount()).toBe(1);
  });
});
