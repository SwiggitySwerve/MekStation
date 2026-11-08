/**
 * C2 / Q1: an ejected player unit is a wreck left on the field. MekHQ keeps
 * it only when the player controls the field (`assignFoundEntity(wreck,
 * !control)`, ResolveScenarioTracker.java:637); MekStation uses the
 * post-battle winner as that control proxy. A unit that retreated is never
 * lost (ResolveScenarioTracker.java:595).
 */
import { describe, expect, it } from '@jest/globals';

import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { Money } from '@/types/campaign/Money';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import {
  GameEventType,
  GameSide,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  applyPostBattle,
  type ICampaignWithBattleState,
} from '../postBattleProcessor';

function campaign(): ICampaignWithBattleState {
  return {
    id: 'camp-1',
    name: 'Test Campaign',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '3024-12-01T00:00:00Z',
    updatedAt: '3025-06-14T00:00:00Z',
    unitCombatStates: {},
  };
}

function delta(overrides: Partial<IUnitCombatDelta> = {}): IUnitCombatDelta {
  return {
    unitId: 'unit-A',
    side: GameSide.Player,
    destroyed: false,
    finalStatus: UnitFinalStatus.Intact,
    armorRemaining: { CT: 20 },
    internalsRemaining: { CT: 10 },
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
    ...overrides,
  };
}

function outcome(
  winner: GameSide | 'draw',
  unitDelta: IUnitCombatDelta,
  log: IPostBattleReport['log'] = [],
): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: `match-${String(winner)}`,
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    report: {
      version: 1,
      matchId: `match-${String(winner)}`,
      winner,
      reason: 'destruction',
      turnCount: 5,
      units: [],
      mvpUnitId: null,
      log,
    },
    unitDeltas: [unitDelta],
    capturedAt: '3025-06-15T12:00:00Z',
  };
}

function combatReadyAfter(result: ICombatOutcome): boolean | undefined {
  return applyPostBattle(result, campaign()).campaign.unitCombatStates?.[
    'unit-A'
  ]?.combatReady;
}

describe('combatReady after an exit (Q1)', () => {
  it('an ejected player unit is lost when the player did not win', () => {
    expect(
      combatReadyAfter(
        outcome(GameSide.Opponent, delta({ exitReason: 'ejected' })),
      ),
    ).toBe(false);
    expect(
      combatReadyAfter(outcome('draw', delta({ exitReason: 'ejected' }))),
    ).toBe(false);
  });

  it('an ejected player unit is recovered when the player won', () => {
    expect(
      combatReadyAfter(
        outcome(GameSide.Player, delta({ exitReason: 'ejected' })),
      ),
    ).toBe(true);
  });

  it('a retreated player unit stays combat ready after a loss', () => {
    expect(
      combatReadyAfter(
        outcome(GameSide.Opponent, delta({ exitReason: 'retreated' })),
      ),
    ).toBe(true);
  });

  it('an older outcome without the field reads the ejection from report.log', () => {
    const ejected = {
      id: 'e-1',
      gameId: 'match',
      sequence: 0,
      timestamp: '3025-06-15T12:00:00Z',
      type: GameEventType.UnitEjected,
      turn: 2,
      phase: 'movement',
      payload: { unitId: 'unit-A', turn: 2, reason: 'player_declared' },
    } as unknown as IPostBattleReport['log'][number];
    expect(
      combatReadyAfter(outcome(GameSide.Opponent, delta(), [ejected])),
    ).toBe(false);
  });
});
