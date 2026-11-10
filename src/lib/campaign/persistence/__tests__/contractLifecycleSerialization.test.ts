import type { IContract } from '@/types/campaign/Mission';

import {
  getContractLifecyclePolicy,
  hasContractLifecycleRule,
} from '@/types/campaign/ContractLifecycleRules';
import { isContract } from '@/types/campaign/Mission';

import { stagedContract } from '../../contracts/__tests__/contractCompletion.fixtures';
import {
  rehydrateCampaignMission,
  rehydrateContractMarket,
  rehydrateMissionMap,
} from '../missionSerialization';
import {
  deserializeCampaignBody,
  serializeCampaign,
} from '../serializeCampaign';
import { buildPopulatedCampaign } from './campaignFixture';

describe('contract lifecycle load boundary', () => {
  it.each([undefined, 1])(
    'keeps legacy version %s byte-identical through mission and campaign serialization',
    (version) => {
      const {
        lifecycle: _state,
        lifecycleRulesVersion: _version,
        ...legacy
      } = stagedContract();
      const contract: IContract = {
        ...legacy,
        ...(version === undefined ? {} : { lifecycleRulesVersion: version }),
      };
      const bytes = JSON.stringify(contract);
      const loaded = rehydrateCampaignMission(JSON.parse(bytes));
      expect(
        getContractLifecyclePolicy(
          isContract(loaded) ? loaded.lifecycleRulesVersion : null,
        ),
      ).toEqual({ kind: 'legacy', version: 1 });
      expect(JSON.stringify(loaded)).toBe(bytes);
      const base = buildPopulatedCampaign();
      const saved = serializeCampaign({
        ...base,
        missions: new Map([[contract.id, contract]]),
      });
      expect(
        JSON.stringify(serializeCampaign(deserializeCampaignBody(saved))),
      ).toBe(JSON.stringify(saved));
      expect(hasContractLifecycleRule(contract, 'stagedCompletion')).toBe(
        false,
      );
      expect(hasContractLifecycleRule(contract, 'installments')).toBe(false);
    },
  );

  it.each([3, 99, 0, -1, 1.5, null, '2'])(
    'keeps unsupported version %s unsupported',
    (version) => {
      const raw = {
        ...stagedContract(),
        lifecycleRulesVersion: version,
        lifecycle: { future: true },
      };
      const loaded = rehydrateCampaignMission(JSON.parse(JSON.stringify(raw)));
      expect(
        getContractLifecyclePolicy(
          isContract(loaded) ? loaded.lifecycleRulesVersion : null,
        ),
      ).toEqual({ kind: 'unsupported', version });
      expect(JSON.stringify(loaded)).toBe(JSON.stringify(raw));
    },
  );

  it('validates v2 at every load entry and preserves valid bytes', () => {
    const contract = stagedContract();
    expect(JSON.stringify(rehydrateCampaignMission(contract))).toBe(
      JSON.stringify(contract),
    );
    const invalid = JSON.parse(
      JSON.stringify({
        ...contract,
        lifecycle: { ...contract.lifecycle, termDays: 0 },
      }),
    );
    expect(() => rehydrateCampaignMission(invalid)).toThrow(/lifecycle/i);
    expect(() => rehydrateMissionMap([[contract.id, invalid]])).toThrow(
      /lifecycle/i,
    );
    expect(() =>
      rehydrateContractMarket({ offers: [invalid], declinedOfferIds: [] }),
    ).toThrow(/lifecycle/i);
  });

  it.each([
    undefined,
    {
      termDays: 90,
      results: [],
      installments: { paidThrough: 0, creditedCents: 0.5 },
    },
    {
      termDays: 90,
      results: [],
      installments: { paidThrough: -1, creditedCents: 0 },
    },
    {
      termDays: 90,
      results: [{ matchId: 'm', appliedOn: 'bad', result: 'victory' }],
      installments: { paidThrough: 0, creditedCents: 0 },
    },
    {
      termDays: 90,
      results: [
        { matchId: 'm', appliedOn: '3025-01-01', result: 'victory' },
        { matchId: 'm', appliedOn: '3025-01-01', result: 'defeat' },
      ],
      installments: { paidThrough: 0, creditedCents: 0 },
    },
  ])('rejects malformed known-version lifecycle %p', (lifecycle) => {
    expect(() =>
      rehydrateCampaignMission(
        JSON.parse(JSON.stringify({ ...stagedContract(), lifecycle })),
      ),
    ).toThrow(/lifecycle/i);
  });
});
