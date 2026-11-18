/**
 * T1 review N3: an unapplied legacy delta is never lost. Until its
 * quarantine write is confirmed, the campaign payload carries a marker with
 * the delta itself; the marker does not depend on `recentlyAppliedOutcomes`
 * (pruned after 31 campaign days) or on the user's flags (dismissable), and
 * every load re-quarantines whatever is still pending.
 */
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { applyPostBattle } from '@/lib/campaign/processors/postBattleProcessor';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { Money } from '@/types/campaign/Money';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { ensureCampaignCombatStateMigration } from '../campaignCombatStateMigration';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { resetCampaignStore, useCampaignStore } from '../useCampaignStore';

const mockCommitPointPut = jest.fn();
jest.mock('@/services/persistence/legacyCombatStateQuarantineStore', () => ({
  createIndexedDbLegacyCombatStateQuarantineStore: () => ({
    put: mockCommitPointPut,
    get: async () => [],
  }),
}));

const MATCH = 'match-legacy';
const SESSION_ID = 'player-1-atlas-as7-d';

function campaign(): ICampaign {
  return {
    id: 'camp-n3',
    name: 'N3',
    currentDate: new Date('3025-06-15T00:00:00.000Z'),
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
    unitCombatStates: {},
  } as ICampaign;
}

/** A legacy battle (no launch manifest) whose player unit no roster unit matches. */
const outcome: ICombatOutcome = {
  version: COMBAT_OUTCOME_VERSION,
  matchId: MATCH,
  contractId: null,
  scenarioId: null,
  endReason: CombatEndReason.Destruction,
  report: {
    version: 1,
    matchId: MATCH,
    winner: GameSide.Player,
    reason: 'destruction',
    turnCount: 3,
    units: [],
    mvpUnitId: null,
    log: [],
  },
  unitDeltas: [
    {
      unitId: SESSION_ID,
      unitRef: 'atlas-as7-d',
      side: GameSide.Player,
      destroyed: false,
      finalStatus: UnitFinalStatus.Damaged,
      armorRemaining: { CT: 12 },
      internalsRemaining: { CT: 20 },
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
  ],
  capturedAt: '3025-06-15T00:00:00.000Z',
};

async function settle(): Promise<void> {
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
}

/** Apply the battle with the commit-point quarantine write failing. */
async function applyWithFailedWrite(): Promise<ICampaign> {
  mockCommitPointPut.mockRejectedValueOnce(new Error('storage unavailable'));
  const { campaign: applied } = applyPostBattle(outcome, campaign());
  await settle();
  return applied;
}

function install(c: ICampaign): void {
  useCampaignStore().setState({ campaign: c });
  useCampaignRosterStore.setState({ campaignId: c.id, units: [] });
}

function quarantinedDelta() {
  return expect.objectContaining({
    source: 'unapplied-delta',
    matchId: MATCH,
    sessionUnitId: SESSION_ID,
    delta: outcome.unitDeltas[0],
  });
}

describe('unapplied legacy deltas survive until their quarantine is confirmed (N3)', () => {
  beforeEach(() => {
    resetCampaignStore();
    mockCommitPointPut.mockReset();
  });
  afterEach(() => {
    resetCampaignStore();
    useCampaignRosterStore.getState().reset();
  });

  it('a failed write, then 32 days with the outcome pruned, then a reload: still quarantined', async () => {
    const applied = await applyWithFailedWrite();
    // Everything the old repair read is gone: the applied outcome aged out
    // of `recentlyAppliedOutcomes` and the campaign moved on 32 days.
    install({
      ...applied,
      recentlyAppliedOutcomes: [],
      currentDate: new Date('3025-07-17T00:00:00.000Z'),
    });

    const quarantine = { get: jest.fn(), put: jest.fn(async () => {}) };
    await ensureCampaignCombatStateMigration(quarantine);

    expect(quarantine.put).toHaveBeenCalledWith('camp-n3', [
      quarantinedDelta(),
    ]);
    // Confirmed, so the payload marker is released.
    expect(
      useCampaignStore().getState().campaign?.pendingQuarantineRecords ?? [],
    ).toEqual([]);
  });

  it('dismissing the flag before the write is confirmed, then a reload: still quarantined', async () => {
    const applied = await applyWithFailedWrite();
    install(applied);
    // The dashboard's Dismiss.
    useCampaignStore()
      .getState()
      .updateCampaign({ legacyCombatStateFlags: [] });

    const quarantine = { get: jest.fn(), put: jest.fn(async () => {}) };
    await ensureCampaignCombatStateMigration(quarantine);

    expect(quarantine.put).toHaveBeenCalledWith('camp-n3', [
      quarantinedDelta(),
    ]);
  });

  it('keeps the marker, and warns, when the reload write fails too', async () => {
    const applied = await applyWithFailedWrite();
    install(applied);
    const quarantine = {
      get: jest.fn(),
      put: jest.fn(async () => {
        throw new Error('still unavailable');
      }),
    };
    await ensureCampaignCombatStateMigration(quarantine);

    expect(
      useCampaignStore().getState().campaign?.pendingQuarantineRecords,
    ).toEqual([quarantinedDelta()]);
  });

  it('releases the marker once the commit-point write is confirmed', async () => {
    mockCommitPointPut.mockResolvedValueOnce(undefined);
    const { campaign: applied } = applyPostBattle(outcome, campaign());
    expect(applied.pendingQuarantineRecords).toEqual([quarantinedDelta()]);
    install(applied);
    await settle();

    expect(mockCommitPointPut).toHaveBeenCalledWith('camp-n3', [
      quarantinedDelta(),
    ]);
    expect(
      useCampaignStore().getState().campaign?.pendingQuarantineRecords ?? [],
    ).toEqual([]);
  });
});
