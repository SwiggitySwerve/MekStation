import type { IContract } from '@/types/campaign/Mission';

import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';

export function stagedContract(termDays = 90, baseCents = 10001): IContract {
  return {
    id: 'contract-s1',
    name: 'S1',
    type: 'contract',
    status: MissionStatus.ACTIVE,
    systemId: 'terra',
    scenarioIds: [],
    employerId: 'davion',
    targetId: 'liao',
    salvageRights: 'None',
    commandRights: 'Independent',
    startDate: '3025-01-01T00:00:00.000Z',
    endDate: new Date(Date.UTC(3025, 0, 1) + termDays * 86400000).toISOString(),
    createdAt: '3025-01-01T00:00:00.000Z',
    updatedAt: '3025-01-01T00:00:00.000Z',
    paymentTerms: createPaymentTerms({
      basePayment: Money.fromCents(baseCents),
      successPayment: Money.fromCents(71),
      partialPayment: Money.fromCents(37),
      failurePayment: Money.fromCents(11),
      transportPayment: Money.fromCents(5),
      supportPayment: Money.fromCents(3),
    }),
    lifecycleRulesVersion: 2,
    lifecycle: {
      termDays,
      results: [],
      installments: { paidThrough: 0, creditedCents: 0 },
    },
  };
}
