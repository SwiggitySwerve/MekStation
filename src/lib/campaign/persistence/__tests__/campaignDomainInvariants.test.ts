/** @spec openspec/changes/campaign-refit-domain-invariants/specs/campaign-persistence/spec.md */
import {
  CAMPAIGN_DOMAIN_INVARIANTS,
  checkCampaignDomainInvariants,
  campaignInvariantRefusal,
} from '../campaignDomainInvariants';
import { buildSerializedCampaign } from '../campaignEnvelope';
import { buildPopulatedCampaign } from './campaignFixture';
import { refitOrders } from './refitInvariantTestHelpers';

describe('campaign domain invariants', () => {
  it('registers only the approved refit rule', () => {
    expect(CAMPAIGN_DOMAIN_INVARIANTS.map((rule) => rule.id)).toEqual([
      'refit-one-open-per-unit',
    ]);
  });
  it.each([
    [0, 0, false],
    [0, 1, false],
    [0, 2, true],
    [1, 2, true],
    [2, 0, false],
    [2, 1, false],
    [2, 2, false],
    [2, 3, true],
  ])('ratchet stored %i to next %i (refused=%s)', (stored, next, refused) => {
    const violations = checkCampaignDomainInvariants(
      { refitOrders: refitOrders(next) },
      { refitOrders: refitOrders(stored) },
    );
    expect(violations.length > 0).toBe(refused);
    if (refused)
      expect(violations[0]).toMatchObject({
        openCount: next,
        allowedMax: Math.max(1, stored),
      });
  });
  it('accepts absent orders, terminal history and one open per unit', () => {
    expect(checkCampaignDomainInvariants({}, null)).toEqual([]);
    const history = refitOrders(2).map((order, index) => ({
      ...order,
      status: index === 0 ? ('completed' as const) : ('cancelled' as const),
    }));
    expect(
      checkCampaignDomainInvariants(
        {
          refitOrders: [
            ...refitOrders(1),
            ...history,
            ...refitOrders(1, 'other'),
          ],
        },
        null,
      ),
    ).toEqual([]);
  });
  it('cannot transfer a legacy allowance to another unit', () => {
    expect(
      checkCampaignDomainInvariants(
        { refitOrders: [...refitOrders(2), ...refitOrders(2, 'other')] },
        { refitOrders: refitOrders(2) },
      ),
    ).toEqual([
      {
        invariant: 'refit-one-open-per-unit',
        unitId: 'other',
        openCount: 2,
        allowedMax: 1,
        orderIds: ['other-refit-0', 'other-refit-1'],
      },
    ]);
  });
  it('has identical client and serialized results without mutating either', () => {
    const campaign = {
      ...buildPopulatedCampaign(),
      refitOrders: refitOrders(2),
    };
    const body = buildSerializedCampaign(campaign, 'test', 1).body;
    const before = JSON.stringify(campaign.refitOrders);
    expect(checkCampaignDomainInvariants(campaign, null)).toEqual(
      checkCampaignDomainInvariants(body, null),
    );
    expect(JSON.stringify(campaign.refitOrders)).toBe(before);
  });
  it('caps order IDs at ten and the error sentence at three units without hiding violations', () => {
    const violations = checkCampaignDomainInvariants(
      {
        refitOrders: ['a', 'b', 'c', 'd'].flatMap((unit) =>
          refitOrders(12, unit),
        ),
      },
      null,
    );
    expect(violations).toHaveLength(4);
    expect(violations[0].orderIds).toHaveLength(10);
    const refusal = campaignInvariantRefusal(violations, 4);
    expect(refusal.error).toContain('Unit c');
    expect(refusal.error).not.toContain('Unit d');
    expect(refusal.currentVersion).toBe(4);
  });
});
