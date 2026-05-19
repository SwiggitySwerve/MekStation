/**
 * Tests for the automatic outcome enqueue trigger.
 *
 * Per `add-campaign-combat-loop` task 4.4: a campaign-linked session
 * completion enqueues exactly once; a standalone skirmish is ignored;
 * a duplicate `matchId` is dropped.
 *
 * @spec openspec/changes/add-campaign-combat-loop/specs/campaign-combat-loop/spec.md
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
import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { isCampaignLinkedOutcome } from '@/stores/campaign/useCampaignStore.outcomes';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDelta(unitId: string): IUnitCombatDelta {
  return {
    unitId,
    side: GameSide.Player,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: { CT: 18 },
    internalsRemaining: { CT: 10 },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 4,
    ammoRemaining: {},
    pilotState: {
      conscious: true,
      wounds: 0,
      killed: false,
      finalStatus: PilotFinalStatus.Active,
    },
  };
}

function makeOutcome(opts: {
  matchId: string;
  contractId: string | null;
  scenarioId: string | null;
}): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: opts.matchId,
    contractId: opts.contractId,
    scenarioId: opts.scenarioId,
    endReason: CombatEndReason.Destruction,
    report: {
      version: 1,
      matchId: opts.matchId,
      winner: GameSide.Player,
      reason: 'destruction',
      turnCount: 5,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [makeDelta('unit-A')],
    capturedAt: '3025-06-15T12:00:00Z',
  };
}

function resetWorld(): void {
  resetCampaignStore();
  _resetCombatOutcomeBus();
  _resetDayPipeline();
  _resetBuiltinRegistration();
  // The campaign store's `persist` middleware rehydrates from the
  // `campaign-store` key — clear it so a prior test's persisted
  // `pendingBattleOutcomes` cannot leak into the next test's fresh
  // store instance.
  clientSafeStorage.removeItem('campaign-store');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('isCampaignLinkedOutcome', () => {
  it('is true when the outcome carries a contractId', () => {
    expect(
      isCampaignLinkedOutcome(
        makeOutcome({ matchId: 'm', contractId: 'c-1', scenarioId: null }),
      ),
    ).toBe(true);
  });

  it('is true when the outcome carries a scenarioId', () => {
    expect(
      isCampaignLinkedOutcome(
        makeOutcome({ matchId: 'm', contractId: null, scenarioId: 's-1' }),
      ),
    ).toBe(true);
  });

  it('is false for a standalone skirmish (no linkage)', () => {
    expect(
      isCampaignLinkedOutcome(
        makeOutcome({ matchId: 'm', contractId: null, scenarioId: null }),
      ),
    ).toBe(false);
  });

  it('is false when linkage fields are blank strings', () => {
    expect(
      isCampaignLinkedOutcome(
        makeOutcome({ matchId: 'm', contractId: '  ', scenarioId: '' }),
      ),
    ).toBe(false);
  });
});

describe('automatic outcome enqueue trigger (D7)', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('a campaign-linked session completion enqueues the outcome exactly once', () => {
    const store = useCampaignStore();
    store.getState().createCampaign('Enqueue Test Co.', 'mercenary');

    const outcome = makeOutcome({
      matchId: 'match-linked-1',
      contractId: 'contract-1',
      scenarioId: 'scn-1',
    });
    publishCombatOutcome({ matchId: outcome.matchId, outcome });

    expect(store.getState().getPendingOutcomeCount()).toBe(1);
    expect(store.getState().getPendingOutcomes()[0].matchId).toBe(
      'match-linked-1',
    );
  });

  it('a standalone skirmish is ignored — pendingBattleOutcomes does not change', () => {
    const store = useCampaignStore();
    store.getState().createCampaign('Skirmish Test Co.', 'mercenary');

    const outcome = makeOutcome({
      matchId: 'match-standalone-1',
      contractId: null,
      scenarioId: null,
    });
    publishCombatOutcome({ matchId: outcome.matchId, outcome });

    expect(store.getState().getPendingOutcomeCount()).toBe(0);
  });

  it('a duplicate matchId is dropped — the queue stays unchanged', () => {
    const store = useCampaignStore();
    store.getState().createCampaign('Dedupe Test Co.', 'mercenary');

    const outcome = makeOutcome({
      matchId: 'match-dup-1',
      contractId: 'contract-1',
      scenarioId: 'scn-1',
    });
    publishCombatOutcome({ matchId: outcome.matchId, outcome });
    // Re-publish the SAME matchId.
    publishCombatOutcome({ matchId: outcome.matchId, outcome });

    expect(store.getState().getPendingOutcomeCount()).toBe(1);
  });
});
