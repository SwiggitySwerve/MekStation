import type { ICampaign } from '@/types/campaign/Campaign';
import type { IContract } from '@/types/campaign/Mission';

/**
 * Unit tests for the monthly contract morale processor in isolation.
 * Pin: MekHQ e7adc2c `CampaignNewDayManager.java:475-477, 1264-1271`; rules in `scenario/contractMorale.ts`.
 *
 * @spec openspec/changes/add-contract-morale-monthly-check/specs/mission-contracts/spec.md
 */
import { DayPhase } from '@/lib/campaign/dayPipeline';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { Money } from '@/types/campaign/Money';
import { AtBMoraleLevel as L } from '@/types/campaign/scenario/scenarioTypes';

import { createDailyRandom } from '../../utils/campaignRng';
import { contractMoraleProcessor } from '../contractMoraleProcessor';

const FIRST = new Date('3025-07-01T12:00:00.000Z');
const SECOND = new Date('3025-07-02T12:00:00.000Z');

function contract(over: Partial<IContract> = {}): IContract {
  return {
    id: 'c1',
    name: 'Contract c1',
    status: MissionStatus.ACTIVE,
    type: 'contract',
    systemId: 'sys',
    scenarioIds: [],
    startDate: '3025-01-01',
    endDate: '3026-12-31',
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
    employerId: 'davion',
    targetId: 'liao',
    paymentTerms: {
      basePayment: new Money(1),
      successPayment: new Money(0),
      partialPayment: new Money(0),
      failurePayment: new Money(0),
      salvagePercent: 50,
      transportPayment: new Money(0),
      supportPayment: new Money(0),
    },
    salvageRights: 'Integrated',
    commandRights: 'Independent',
    ...over,
  };
}
function campaign(
  date: Date,
  contracts: IContract[],
  atb = true,
  seed = 1,
): ICampaign {
  return {
    id: 'camp',
    name: 'Camp',
    currentDate: date,
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'r',
    missions: new Map(contracts.map((c) => [c.id, c])),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    options: { ...createDefaultCampaignOptions(), useAtBScenarios: atb },
    campaignType: CampaignType.MERCENARY,
    createdAt: '',
    updatedAt: '',
    unitCombatStates: {},
    rngSeed: seed,
  } as unknown as ICampaign;
}
function rollFor(seed: number, date: Date, id: string): number {
  const r = createDailyRandom(
    { id: 'p', rngSeed: seed } as unknown as ICampaign,
    date,
    `contract-morale:${id}`,
  );
  return Math.floor(r() * 6) + 1 + Math.floor(r() * 6) + 1;
}
function seedWith(roll: number): number {
  for (let s = 1; s < 100_000; s++)
    if (rollFor(s, FIRST, 'c1') === roll) return s;
  throw new Error('no seed');
}

describe('contractMoraleProcessor', () => {
  it('is the contract-morale processor, after the contract processor and before scenario generation', () => {
    expect(contractMoraleProcessor.id).toBe('contract-morale');
    expect(contractMoraleProcessor.phase).toBe(DayPhase.MISSIONS + 10);
    expect(contractMoraleProcessor.phase).toBeGreaterThan(
      DayPhase.MISSIONS - 50,
    ); // after post-battle
    expect(contractMoraleProcessor.phase).toBeGreaterThan(DayPhase.MISSIONS); // after the expiry pass
    expect(contractMoraleProcessor.phase).toBeLessThan(DayPhase.EVENTS); // before scenario generation
  });

  it('never consults Math.random: it throws if it does', () => {
    const spy = jest.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random used');
    });
    try {
      const c = campaign(
        FIRST,
        [contract({ moraleLevel: L.STALEMATE })],
        true,
        seedWith(10),
      );
      expect(() => contractMoraleProcessor.process(c, FIRST)).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  it('returns the same campaign object and no events when nothing changes (a held roll, or not the 1st)', () => {
    const held = campaign(FIRST, [contract()], true, seedWith(7));
    const heldResult = contractMoraleProcessor.process(held, FIRST);
    expect(heldResult.campaign).toBe(held);
    expect(heldResult.events).toEqual([]);

    const notFirst = campaign(SECOND, [contract()], true, seedWith(10));
    const notFirstResult = contractMoraleProcessor.process(notFirst, SECOND);
    expect(notFirstResult.campaign).toBe(notFirst);
    expect(notFirstResult.events).toEqual([]);
  });

  it('emits one contract_morale_changed event, on change only, with the roll', () => {
    const c = campaign(FIRST, [contract()], true, seedWith(10));
    const { events, campaign: next } = contractMoraleProcessor.process(
      c,
      FIRST,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'contract_morale_changed',
      severity: 'info',
      data: { contractId: 'c1', from: L.STALEMATE, to: L.WEAKENED, roll: 10 },
    });
    expect((next.missions.get('c1') as IContract).moraleLevel).toBe(L.WEAKENED);
    expect((c.missions.get('c1') as IContract).moraleLevel).toBeUndefined(); // input untouched
  });

  it('does nothing when the AtB scenarios option is off', () => {
    const c = campaign(FIRST, [contract()], false, seedWith(10));
    expect(contractMoraleProcessor.process(c, FIRST).campaign).toBe(c);
  });

  it('checks a plain contract with no AtB contract type', () => {
    const plain = contract();
    expect(plain.atbContractType).toBeUndefined();
    const c = campaign(FIRST, [plain], true, seedWith(10));
    expect(
      (
        contractMoraleProcessor
          .process(c, FIRST)
          .campaign.missions.get('c1') as IContract
      ).moraleLevel,
    ).toBe(L.WEAKENED);
  });
});
