import type { ICampaignContractMarket } from '@/types/campaign/CampaignCommandExtensions';
import type { IContract, IMission } from '@/types/campaign/Mission';
import type { IPaymentTerms } from '@/types/campaign/PaymentTerms';

import {
  MissionStatus,
  parseMissionStatus,
} from '@/types/campaign/enums/MissionStatus';
import { isContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';
import { logger } from '@/utils/logger';

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

/**
 * Every persisted mission (SQLite body, IndexedDB/localStorage, the
 * missions store, the durable accept row) loads through here, so this is the
 * one place an old status string is brought into the `MissionStatus` union.
 * A value the union does not know loads as inert PENDING rather than as an
 * untyped string, and says so.
 */
function loadedStatus(mission: IMission): MissionStatus {
  const parsed = parseMissionStatus(mission.status);
  if (parsed !== undefined) return parsed;
  logger.warn(
    `[missionSerialization] Mission "${mission.id}" has unknown status ${JSON.stringify(mission.status)}; loading it as ${MissionStatus.PENDING}.`,
  );
  return MissionStatus.PENDING;
}

export function rehydrateCampaignMission(stored: IMission): IMission {
  const status = loadedStatus(stored);
  const mission = status === stored.status ? stored : { ...stored, status };
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
