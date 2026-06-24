import type { ICampaignContractMarket } from '@/types/campaign/CampaignCommandExtensions';
import type { IContract, IMission } from '@/types/campaign/Mission';
import type { IPaymentTerms } from '@/types/campaign/PaymentTerms';

import { isContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';

type SerializedMoneyLike =
  | Money
  | number
  | {
      readonly amount?: number;
      readonly centsValue?: number;
    }
  | null
  | undefined;

function rehydrateMoney(value: SerializedMoneyLike): Money {
  if (value instanceof Money) return value;
  if (typeof value === 'number') return new Money(value);
  if (value && typeof value.amount === 'number') return new Money(value.amount);
  if (value && typeof value.centsValue === 'number') {
    return Money.fromCents(value.centsValue);
  }
  return Money.ZERO;
}

function rehydratePaymentTerms(
  terms: IContract['paymentTerms'],
): IPaymentTerms {
  return createPaymentTerms({
    basePayment: rehydrateMoney(terms.basePayment as SerializedMoneyLike),
    successPayment: rehydrateMoney(terms.successPayment as SerializedMoneyLike),
    partialPayment: rehydrateMoney(terms.partialPayment as SerializedMoneyLike),
    failurePayment: rehydrateMoney(terms.failurePayment as SerializedMoneyLike),
    salvagePercent: terms.salvagePercent,
    transportPayment: rehydrateMoney(
      terms.transportPayment as SerializedMoneyLike,
    ),
    supportPayment: rehydrateMoney(terms.supportPayment as SerializedMoneyLike),
  });
}

export function rehydrateCampaignMission(mission: IMission): IMission {
  if (!isContract(mission)) return mission;
  const contract: IContract = mission;

  const rehydrated: IContract = {
    ...contract,
    paymentTerms: rehydratePaymentTerms(contract.paymentTerms),
  };
  return rehydrated;
}

export function rehydrateMissionMap(
  entries: ReadonlyArray<readonly [string, IMission]> | undefined,
): Map<string, IMission> {
  return new Map(
    (entries ?? []).map(([id, mission]) => [
      id,
      rehydrateCampaignMission(mission),
    ]),
  );
}

export function rehydrateContractMarket(
  market: ICampaignContractMarket | undefined,
): ICampaignContractMarket | undefined {
  if (!market) return undefined;

  return {
    ...market,
    offers: market.offers.map(
      (offer): IContract => rehydrateCampaignMission(offer) as IContract,
    ),
  };
}
