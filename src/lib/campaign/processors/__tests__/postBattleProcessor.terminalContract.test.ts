import type { ICampaign } from '@/types/campaign/Campaign';
import type { IContract } from '@/types/campaign/Mission';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { createCampaign } from '@/types/campaign/Campaign';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { subscribeToContractFulfilled } from '../../contractFulfillmentBus';
import { contractProcessor } from '../contractProcessor';
import { applyPostBattle } from '../postBattleProcessor';
import { applyContractDelta } from '../postBattleProcessor.helpers';

function testContract(status = MissionStatus.ACTIVE): IContract {
  return {
    ...createContract({
      id: 'contract-1',
      name: 'Settle Once',
      employerId: 'davion',
      targetId: 'liao',
      status,
      endDate: '3025-06-14',
      paymentTerms: createPaymentTerms({
        basePayment: new Money(400),
        failurePayment: new Money(50),
        successPayment: new Money(600),
      }),
    }),
    updatedAt: '3025-06-13T00:00:00Z',
  };
}

function campaignFor(contract: IContract): ICampaign {
  return {
    ...createCampaign('Terminal contract tests', 'mercenary', {
      startingFunds: 0,
    }),
    currentDate: new Date('3025-06-15T00:00:00Z'),
    missions: new Map([[contract.id, contract]]),
  };
}

function outcome(
  matchId: string,
  winner: GameSide = GameSide.Player,
  endReason: CombatEndReason = CombatEndReason.Destruction,
): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: 'contract-1',
    scenarioId: null,
    endReason,
    report: {
      version: 1,
      matchId,
      winner,
      reason: 'destruction',
      turnCount: 5,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [],
    capturedAt: '3025-06-15T12:00:00Z',
  };
}

describe.each([
  MissionStatus.SUCCESS,
  MissionStatus.PARTIAL,
  MissionStatus.FAILED,
  MissionStatus.BREACH,
])('a contract already settled as %s', (status) => {
  it.each(Object.values(CombatEndReason))(
    'ignores a later %s result without writing the mission or recording a flip',
    (endReason) => {
      const contract = testContract(status);
      const campaign = campaignFor(contract);
      const original = { ...contract };

      const delta = applyContractDelta(
        campaign,
        campaign.missions,
        outcome('match-later', GameSide.Player, endReason),
      );

      expect(delta).toEqual({
        contract,
        previousStatus: status,
        flippedToTerminal: false,
      });
      expect(delta?.contract).toBe(contract);
      expect(campaign.missions.get(contract.id)).toBe(contract);
      expect(contract).toEqual(original);
    },
  );
});

it('settles FAILED once and ignores a later SUCCESS result with no second payment', () => {
  const contract = testContract();
  const fulfilled = jest.fn();
  const unsubscribe = subscribeToContractFulfilled(fulfilled);
  try {
    const failed = applyPostBattle(
      outcome('match-loss', GameSide.Opponent),
      campaignFor(contract),
    );
    const settledContract = failed.campaign.missions.get(contract.id);
    expect(settledContract?.status).toBe(MissionStatus.FAILED);
    expect(failed.campaign.finances.balance.amount).toBe(450);
    expect(failed.campaign.finances.transactions).toHaveLength(1);
    expect(fulfilled).toHaveBeenCalledTimes(1);

    const laterWin = applyPostBattle(outcome('match-win'), failed.campaign);

    expect(laterWin.campaign.finances.balance.amount).toBe(450);
    expect(laterWin.campaign.finances).toBe(failed.campaign.finances);
    expect(laterWin.campaign.missions.get(contract.id)).toBe(settledContract);
    expect(laterWin.campaign.missions.get(contract.id)?.status).toBe(
      MissionStatus.FAILED,
    );
    expect(laterWin.campaign.processedFulfilledContractIds).toEqual([
      contract.id,
    ]);
    expect(laterWin.campaign.processedBattleIds).toEqual([
      'match-loss',
      'match-win',
    ]);
    expect(laterWin.summary.skippedDuplicate).toBe(false);
    expect(laterWin.events.map((event) => event.type)).toEqual([
      'post_battle_applied',
    ]);
    expect(fulfilled).toHaveBeenCalledTimes(1);
  } finally {
    unsubscribe();
  }
});

it.each([
  [GameSide.Player, CombatEndReason.Destruction],
  [GameSide.Opponent, CombatEndReason.Destruction],
  [GameSide.Opponent, CombatEndReason.TurnLimit],
] as const)(
  'keeps expired SUCCESS unpaid after a %s battle ending in %s',
  (winner, endReason) => {
    const contract = testContract();
    const campaign = campaignFor(contract);
    const expired = contractProcessor.process(campaign, campaign.currentDate);
    expect(expired.campaign.missions.get(contract.id)?.status).toBe(
      MissionStatus.SUCCESS,
    );
    expect(expired.campaign.finances.balance.amount).toBe(0);
    expect(expired.campaign.finances.transactions).toHaveLength(0);

    const laterBattle = applyPostBattle(
      outcome('match-after-expiry', winner, endReason),
      expired.campaign,
    );
    expect(laterBattle.campaign.missions.get(contract.id)).toBe(
      expired.campaign.missions.get(contract.id),
    );
    expect(laterBattle.campaign.finances).toBe(expired.campaign.finances);
    expect(laterBattle.campaign.missions.get(contract.id)?.status).toBe(
      MissionStatus.SUCCESS,
    );
    expect(laterBattle.campaign.finances.balance.amount).toBe(0);
    expect(laterBattle.campaign.finances.transactions).toHaveLength(0);
    expect(laterBattle.events.map((event) => event.type)).toEqual([
      'post_battle_applied',
    ]);
  },
);
