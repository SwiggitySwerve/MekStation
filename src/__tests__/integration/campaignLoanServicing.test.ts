import type { ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import { createLoan } from '@/lib/finances/loanService';
import { takeLoan } from '@/stores/campaign/campaignCommandActions';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore as getCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import {
  PRESET_CASUAL,
  PRESET_FULL,
  PRESET_STANDARD,
} from '@/types/campaign/CampaignPreset';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';

function currentCampaign(): ICampaignWithCommand {
  const campaign = getCampaignStore().getState().getCampaign();
  if (!campaign) throw new Error('Campaign not created');
  return campaign;
}

/** Use the command and the store's registered day pipeline, including saves. */
function startCampaign(options: Partial<ICampaignOptions>) {
  const store = getCampaignStore();
  store.getState().createCampaign('Loan servicing', 'mercenary', {
    ...options,
    payForSalaries: false,
    payForMaintenance: false,
    useTaxes: false,
    useRandomEvents: false,
    useLifeEvents: false,
    usePrisonerEvents: false,
    turnoverCheckFrequency: 'never',
  });
  store.getState().updateCampaign({
    currentDate: new Date('3025-01-30T00:00:00Z'),
  });
  return store;
}

describe('campaign loan servicing through day advancement', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    resetCampaignStore();
    useCampaignRosterStore.getState().reset();
    useCampaignPersistenceStore.getState().reset();
    usePilotStore.setState({ pilots: [] });
    _resetDayPipeline();
    _resetBuiltinRegistration();
  });

  afterEach(() => {
    useCampaignPersistenceStore.getState().reset();
    resetCampaignStore();
    _resetDayPipeline();
    _resetBuiltinRegistration();
    jest.useRealTimers();
  });

  it.each([PRESET_STANDARD, PRESET_FULL, PRESET_CASUAL])(
    'repays a loan taken under $name once per day and persists settlement',
    async (preset) => {
      const store = startCampaign(preset.overrides);
      const startingBalance = currentCampaign().finances.balance.amount;

      expect(
        takeLoan({ principal: 90_000, interestRate: 0.1, termDays: 3 }).applied,
      ).toBe(true);
      expect(currentCampaign().finances.balance.amount).toBe(
        startingBalance + 90_000,
      );

      // Cross the month boundary: daily campaign loans must not also be
      // charged by the monthly amortized-loan processor.
      for (const remainingBalance of [66_000, 33_000, 0]) {
        const report = await store.getState().advanceDay();
        expect(report).not.toBeNull();
        expect(report?.costs.loanRepayment.amount).toBe(33_000);
        expect(currentCampaign().loans?.[0].remainingBalance).toBeCloseTo(
          remainingBalance,
          2,
        );
      }

      const settled = currentCampaign();
      expect(settled.loans?.[0].status).toBe('repaid');
      expect(settled.finances.balance.amount).toBe(startingBalance - 9_000);
      expect(
        settled.finances.transactions.filter(
          (tx) => tx.type === TransactionType.LoanPayment,
        ),
      ).toHaveLength(3);

      // Reload as a restarted app does (a new store rehydrates the saved
      // campaign), then advance once more.
      resetCampaignStore();
      const reloaded = getCampaignStore();
      expect(reloaded).not.toBe(store);
      expect(currentCampaign().loans?.[0]).toEqual(settled.loans?.[0]);
      const extraDay = await reloaded.getState().advanceDay();
      expect(extraDay?.costs.loanRepayment.amount).toBe(0);
      expect(reloaded.getState().getCampaign()?.finances.balance.amount).toBe(
        settled.finances.balance.amount,
      );
      expect(
        reloaded
          .getState()
          .getCampaign()
          ?.finances.transactions.filter(
            (tx) => tx.type === TransactionType.LoanPayment,
          ),
      ).toHaveLength(3);
    },
  );

  it.each([true, false])(
    'does not duplicate salaries or maintenance with role-based salaries %s',
    async (useRoleBasedSalaries) => {
      const store = startCampaign({
        ...PRESET_STANDARD.overrides,
        useRoleBasedSalaries,
      });
      const campaign = store.getState().getCampaign();
      const forces = store.getState().getForcesStore();
      if (!campaign || !forces) throw new Error('Campaign not created');
      store.getState().updateCampaign({
        options: {
          ...campaign.options,
          payForSalaries: true,
          payForMaintenance: true,
        },
      });
      forces
        .getState()
        .updateForce(campaign.rootForceId, { unitIds: ['unit-1'] });
      useCampaignRosterStore.setState({
        campaignId: campaign.id,
        pilots: [
          {
            pilotId: 'npc-1',
            pilotName: 'Test pilot',
            status: CampaignPilotStatus.Active,
            wounds: 0,
            recoveryTime: 0,
            xp: 0,
            campaignXpEarned: 0,
            campaignKills: 0,
            campaignMissions: 0,
            primaryRole: CampaignPersonnelRole.PILOT,
            rankIndex: 0,
            hireDate: new Date('3024-01-01T00:00:00Z'),
          },
        ],
      });
      await store.getState().saveCampaign();
      expect(
        takeLoan({ principal: 90_000, interestRate: 0, termDays: 3 }).applied,
      ).toBe(true);

      await store.getState().advanceDays(3);
      const transactions =
        store.getState().getCampaign()?.finances.transactions ?? [];
      expect(
        transactions.filter((tx) => tx.type === TransactionType.LoanPayment),
      ).toHaveLength(3);
      expect(
        transactions.filter((tx) => tx.type === TransactionType.Maintenance),
      ).toHaveLength(3);
      const salaries = transactions.filter(
        (tx) =>
          tx.description.startsWith('Daily salaries') ||
          tx.type === TransactionType.Salary,
      );
      expect(salaries).toHaveLength(useRoleBasedSalaries ? 1 : 3);
      expect(
        salaries.every((tx) =>
          tx.description.startsWith(
            useRoleBasedSalaries ? 'Monthly salaries' : 'Daily salaries',
          ),
        ),
      ).toBe(true);
    },
  );

  it.each([true, false])(
    'preserves the separate amortized-loan ledger with role-based salaries %s',
    async (useRoleBasedSalaries) => {
      const store = startCampaign({
        ...PRESET_STANDARD.overrides,
        useRoleBasedSalaries,
      });
      const campaign = store.getState().getCampaign();
      if (!campaign) throw new Error('Campaign not created');
      const amortizedLoan = createLoan(
        new Money(10_000),
        0.05,
        12,
        campaign.currentDate,
      );
      store.getState().updateCampaign({
        finances: { ...campaign.finances, loans: [amortizedLoan] },
      });
      expect(
        takeLoan({ principal: 90_000, interestRate: 0, termDays: 3 }).applied,
      ).toBe(true);

      // January 30 has no monthly payment due.
      await store.getState().advanceDay();
      expect(store.getState().getCampaign()?.finances.loans).toEqual([
        amortizedLoan,
      ]);
      expect(currentCampaign().loans?.[0].remainingBalance).toBe(60_000);
    },
  );
});
