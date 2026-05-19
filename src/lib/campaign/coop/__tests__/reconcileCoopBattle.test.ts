/**
 * Tests for `reconcileCoopBattle` — co-op post-battle reconciliation
 * (CO2, tasks 8.4).
 *
 * Covers: post-battle consequences become CO1 campaign events through
 * the host; the derivation reads salvage/roster facts from the combat
 * outcome; combat and campaign logs stay separate.
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 */

import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionCoreTypes';

import {
  deriveCoopBattleConsequences,
  reconcileCoopBattle,
} from '../reconcileCoopBattle';

const CAMPAIGN_ID = 'campaign-recon';
const HOST_ID = 'host-player';

function stateWith(
  patch: Partial<ICampaignAuthoritativeState>,
): ICampaignAuthoritativeState {
  return { ...createEmptyCampaignState(CAMPAIGN_ID), ...patch };
}

async function makeHost(
  initialState: ICampaignAuthoritativeState,
): Promise<{ host: CampaignMatchHost; received: ICampaignEvent[] }> {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState,
  });
  const received: ICampaignEvent[] = [];
  host.subscribe((event) => received.push(event));
  await host.open();
  received.length = 0;
  return { host, received };
}

describe('reconcileCoopBattle — emits CO1 campaign events', () => {
  it('reconciles salvage, funds, and roster changes through the host', async () => {
    const { host, received } = await makeHost(
      stateWith({ balance: 1_000_000 }),
    );

    const result = await reconcileCoopBattle(host, {
      campaignId: CAMPAIGN_ID,
      matchId: 'match-coop-1',
      fundsDelta: -200_000,
      fundsReason: 'Repair costs',
      salvageValue: 150_000,
      rosterChanges: [
        { unitId: 'u-1', designation: 'Atlas AS7-D', status: 'damaged' },
        { unitId: 'u-2', designation: 'Locust LCT-1V', status: 'destroyed' },
      ],
    });

    expect(result.ok).toBe(true);
    // Funds debited, salvage pool credited, two roster events.
    const types = received.map((e) => e.type);
    expect(types).toEqual([
      'FundsChanged',
      'SalvageAllocated',
      'RosterUnitChanged',
      'RosterUnitChanged',
    ]);
    expect(host.getState().balance).toBe(800_000);
    expect(host.getState().salvagePool).toBe(150_000);
    // The destroyed unit was removed; the damaged one persists as damaged.
    expect(host.getState().rosterUnits['u-2']).toBeUndefined();
    expect(host.getState().rosterUnits['u-1']?.status).toBe('damaged');
  });

  it('credits a positive funds delta into the salvage pool', async () => {
    const { host } = await makeHost(stateWith({ balance: 500_000 }));
    const result = await reconcileCoopBattle(host, {
      campaignId: CAMPAIGN_ID,
      matchId: 'match-coop-2',
      fundsDelta: 300_000,
      fundsReason: 'Mission payout',
      salvageValue: 50_000,
      rosterChanges: [],
    });
    expect(result.ok).toBe(true);
    // Payout + salvage both feed the pool; the balance is untouched.
    expect(host.getState().salvagePool).toBe(350_000);
    expect(host.getState().balance).toBe(500_000);
  });

  it('keeps the campaign event log separate — only campaign events are appended', async () => {
    const { host, received } = await makeHost(
      stateWith({ balance: 1_000_000 }),
    );
    await reconcileCoopBattle(host, {
      campaignId: CAMPAIGN_ID,
      matchId: 'match-coop-3',
      fundsDelta: 0,
      fundsReason: 'No funds change',
      salvageValue: 10_000,
      rosterChanges: [],
    });
    // Every appended event is a campaign event type — no combat event
    // leaked into the campaign log.
    const campaignTypes = new Set([
      'CampaignDayAdvanced',
      'FundsChanged',
      'PilotHired',
      'ContractAccepted',
      'RosterUnitChanged',
      'SalvageAllocated',
      'CampaignSnapshotPublished',
    ]);
    for (const event of received) {
      expect(campaignTypes.has(event.type)).toBe(true);
    }
  });
});

describe('deriveCoopBattleConsequences — from a combat outcome', () => {
  function outcomeWith(): ICombatOutcome {
    return {
      version: COMBAT_OUTCOME_VERSION,
      matchId: 'match-derive-1',
      contractId: 'contract-1',
      scenarioId: 'scenario-1',
      endReason: CombatEndReason.Destruction,
      report: {} as ICombatOutcome['report'],
      capturedAt: '2026-05-19T12:00:00.000Z',
      unitDeltas: [
        {
          unitId: 'player-intact',
          side: GameSide.Player,
          destroyed: false,
          finalStatus: UnitFinalStatus.Intact,
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
        },
        {
          unitId: 'player-damaged',
          side: GameSide.Player,
          destroyed: false,
          finalStatus: UnitFinalStatus.Damaged,
          armorRemaining: {},
          internalsRemaining: {},
          destroyedLocations: [],
          destroyedComponents: [],
          heatEnd: 0,
          ammoRemaining: {},
          pilotState: {
            conscious: true,
            wounds: 1,
            killed: false,
            finalStatus: PilotFinalStatus.Wounded,
          },
        },
        {
          unitId: 'opfor-wreck',
          side: GameSide.Opponent,
          destroyed: true,
          finalStatus: UnitFinalStatus.Destroyed,
          armorRemaining: {},
          internalsRemaining: {},
          destroyedLocations: [],
          destroyedComponents: [],
          heatEnd: 0,
          ammoRemaining: {},
          pilotState: {
            conscious: false,
            wounds: 3,
            killed: true,
            finalStatus: PilotFinalStatus.KIA,
          },
        },
      ],
    };
  }

  it('reads damaged player units and OpFor wreck salvage', () => {
    const consequences = deriveCoopBattleConsequences({
      outcome: outcomeWith(),
      campaignId: CAMPAIGN_ID,
      playerSide: GameSide.Player,
      missionPayout: 400_000,
      designations: { 'player-damaged': 'Atlas AS7-D' },
    });

    // The intact player unit produces no roster change.
    expect(consequences.rosterChanges).toHaveLength(1);
    expect(consequences.rosterChanges[0].unitId).toBe('player-damaged');
    expect(consequences.rosterChanges[0].status).toBe('damaged');
    expect(consequences.rosterChanges[0].designation).toBe('Atlas AS7-D');
    // One destroyed OpFor unit → one wreck of salvage.
    expect(consequences.salvageValue).toBe(50_000);
    expect(consequences.fundsDelta).toBe(400_000);
    expect(consequences.matchId).toBe('match-derive-1');
  });

  it('feeds the derived consequences through reconciliation', async () => {
    const { host } = await makeHost(stateWith({ balance: 1_000_000 }));
    const consequences = deriveCoopBattleConsequences({
      outcome: outcomeWith(),
      campaignId: CAMPAIGN_ID,
      playerSide: GameSide.Player,
      missionPayout: 400_000,
      designations: {},
    });
    const result = await reconcileCoopBattle(host, consequences);
    expect(result.ok).toBe(true);
    // 400k payout + 50k salvage → 450k pool.
    expect(host.getState().salvagePool).toBe(450_000);
  });
});
