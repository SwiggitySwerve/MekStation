import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import React from 'react';

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { ISalvageAllocation } from '@/types/campaign/Salvage';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';
import type {
  IGmCampaignProjectedEffect,
  IGmTimeCascadeProjectedEffect,
} from '@/types/interventions';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { createCampaign } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { createInjury } from '@/types/campaign/Person';
import { DamageLevel } from '@/types/campaign/Salvage';
import { TransactionType } from '@/types/campaign/Transaction';

import { buildRepairCompletionCommand } from '../GmCampaignBaseFixCommands';
import { GmCampaignInterventionControlPlane } from '../GmCampaignInterventionControlPlane';
import { mergeLedgerRows } from '../GmCampaignInterventionControlPlane.helpers';
import { GmCampaignPlayerLedgerView } from '../GmCampaignPlayerLedgerView';

function fixedNow(): string {
  return '3025-01-01T00:00:00.000Z';
}

// The 8 equal-weight preview buttons collapsed into one "Generate correction"
// control + a correction-type <select>. Tests pick the type then fire the single
// control, mirroring how the GM now drives the screen.
function generateCorrection(correctionType: string): void {
  fireEvent.change(screen.getByTestId('gm-ledger-correction-type'), {
    target: { value: correctionType },
  });
  fireEvent.click(screen.getByTestId('gm-ledger-preview-btn'));
}

describe('GmCampaignInterventionControlPlane', () => {
  beforeEach(() => {
    useCampaignRosterStore.getState().reset();
  });

  afterEach(() => {
    act(() => {
      useCampaignRosterStore.getState().reset();
    });
  });

  it('hydrates player-safe rows from persisted campaign and time intervention events', () => {
    const campaign = {
      ...createCampaign('GM Ledger Reload Test', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      id: 'campaign-gm-reload',
      currentDate: new Date('3025-01-03T00:00:00.000Z'),
      updatedAt: '3025-01-03T00:00:00.000Z',
      gmInterventionEvents: [
        {
          type: 'gm.campaign.funds_transaction_corrected',
          domain: 'economy',
          family: 'funds-transaction',
          interventionId: 'gm-ledger-merchant-reversal',
          transactionId: 'gm-ledger-merchant-reversal',
          changedStateRefs: ['campaign:campaign-gm-reload:finances'],
          publicSummary: 'Merchant charge corrected by +2,500.00 C-bills.',
          before: {
            balanceCents: 100_000_000,
            transactionIds: [],
          },
          after: {
            balanceCents: 99_750_000,
            transaction: {
              id: 'gm-ledger-merchant-reversal',
              type: TransactionType.PartPurchase,
              amountCents: 250_000,
              date: '3025-01-03T00:00:00.000Z',
              description: 'GM merchant charge reversal',
            },
          },
        } satisfies IGmCampaignProjectedEffect,
      ],
      timeCascadeEvents: [
        {
          type: 'gm.campaign.time_cascade_applied',
          domain: 'time',
          family: 'time-advance',
          interventionId: 'gm-ledger-time-cascade',
          days: 2,
          before: {
            currentDate: '3025-01-03T00:00:00.000Z',
            updatedAt: '3025-01-03T00:00:00.000Z',
            currentSystemId: 'terra',
          },
          after: {
            currentDate: '3025-01-05T00:00:00.000Z',
            updatedAt: '3025-01-05T00:00:00.000Z',
            currentSystemId: 'terra',
          },
          afterCampaign: {
            ...createCampaign('GM Ledger Reload Test', 'mercenary', {
              startingFunds: 1_000_000,
            }),
            id: 'campaign-gm-reload',
            currentDate: new Date('3025-01-05T00:00:00.000Z'),
            updatedAt: '3025-01-05T00:00:00.000Z',
            currentSystemId: 'terra',
          },
          daySummaries: [],
          generatedEvents: [],
          changedStateRefs: [
            'campaign:campaign-gm-reload:currentDate',
            'campaign:campaign-gm-reload:repairQueue',
          ],
          externalEffects: [],
          publicSummary: 'Campaign time corrected by 2 days.',
        } satisfies IGmTimeCascadeProjectedEffect,
      ],
    };

    render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={jest.fn()}
        now={fixedNow}
      />,
    );

    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Merchant charge corrected by +2,500.00 C-bills.',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Campaign time corrected by 2 days.',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).not.toHaveTextContent(
      /Hidden campaign|Hidden time|black-market|GM-only/i,
    );
    expect(screen.getByTestId('gm-ledger-private-log')).toHaveTextContent(
      'Merchant charge corrected by +2,500.00 C-bills.',
    );
    expect(screen.getByTestId('gm-ledger-private-log')).toHaveTextContent(
      'Campaign time corrected by 2 days.',
    );
    expect(screen.getByTestId('gm-ledger-private-log')).not.toHaveTextContent(
      /Hidden campaign|Hidden time|black-market|GM-only/i,
    );
  });

  it('previews and approves a funds correction with player-safe output', async () => {
    const campaign = createCampaign('GM Ledger Test', 'mercenary', {
      startingFunds: 1_000_000,
    });
    const onApplyCampaignUpdate = jest.fn();

    render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
        now={fixedNow}
      />,
    );

    fireEvent.click(screen.getByTestId('gm-ledger-preview-btn'));

    expect(screen.getByTestId('gm-ledger-preview-status')).toHaveTextContent(
      'ready',
    );
    expect(
      screen.getByTestId('gm-ledger-preview-net-effect'),
    ).toHaveTextContent(
      '1,000,000.00 C-bills -> 1,002,500.00 C-bills (+2,500.00 C-bills)',
    );

    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));

    await waitFor(() => expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1));
    const updates = onApplyCampaignUpdate.mock.calls[0][0];
    expect(updates.finances.balance.format()).toBe('1,002,500.00 C-bills');
    expect(updates.finances.transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'gm-ledger-merchant-reversal',
          description: 'GM merchant charge reversal',
        }),
      ]),
    );

    const playerLog = within(screen.getByTestId('gm-ledger-player-log'));
    expect(
      await playerLog.findByText(/Merchant charge corrected/),
    ).toBeInTheDocument();
    expect(playerLog.queryByText(/Hidden campaign/)).not.toBeInTheDocument();

    const gmLog = within(screen.getByTestId('gm-ledger-private-log'));
    expect(
      gmLog.getByText(/Hidden campaign merchant reversal/),
    ).toBeInTheDocument();
    expect(
      gmLog.getByText(/duplicated merchant charge remains/),
    ).toBeInTheDocument();
  });

  it('previews and approves a time cascade with player-safe output', async () => {
    const campaign = {
      ...createCampaign('GM Time Ledger Test', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      currentDate: new Date('3025-02-02T00:00:00.000Z'),
      updatedAt: '2026-06-22T00:00:00.000Z',
      currentSystemId: 'terra',
    };
    const onApplyCampaignUpdate = jest.fn();

    render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
        now={fixedNow}
      />,
    );

    generateCorrection('time');

    expect(screen.getByTestId('gm-ledger-preview-status')).toHaveTextContent(
      'ready',
    );
    expect(
      screen.getByTestId('gm-ledger-preview-time-effect'),
    ).toHaveTextContent('3025-02-02 -> 3025-02-04 (2 days)');

    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));

    await waitFor(() => expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1));
    const updates = onApplyCampaignUpdate.mock.calls[0][0];
    expect(updates.currentDate.toISOString()).toBe('3025-02-04T00:00:00.000Z');
    expect(updates.timeCascadeEvents).toHaveLength(1);

    const playerLog = within(screen.getByTestId('gm-ledger-player-log'));
    expect(
      await playerLog.findByText(/Campaign time corrected by 2 days/),
    ).toBeInTheDocument();
    expect(
      playerLog.queryByText(/Hidden time cascade/),
    ).not.toBeInTheDocument();

    const gmLog = within(screen.getByTestId('gm-ledger-private-log'));
    expect(
      gmLog.getByText(/Hidden time cascade correction/),
    ).toBeInTheDocument();
    expect(gmLog.getByText(/previous timeline/)).toBeInTheDocument();
  });

  it('previews and approves repair, salvage, and unit reload corrections', async () => {
    const campaign = makeCampaignWithBaseFixes();
    const onApplyCampaignUpdate = jest.fn();

    render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
        now={fixedNow}
      />,
    );

    generateCorrection('repair');

    expect(screen.getByTestId('gm-ledger-preview-status')).toHaveTextContent(
      'ready',
    );
    expect(screen.getByTestId('gm-ledger-preview-summary')).toHaveTextContent(
      'Repair ticket ticket-1 corrected by the GM.',
    );
    expect(
      screen.getByTestId('gm-ledger-preview-state-summary'),
    ).toHaveTextContent('Repair ticket ticket-1: queued, 4h remaining');
    expect(
      screen.getByTestId('gm-ledger-preview-state-summary'),
    ).toHaveTextContent('Repair ticket ticket-1: completed, 0h remaining');

    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));

    await waitFor(() => expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1));
    expect(onApplyCampaignUpdate.mock.calls[0][0].repairQueue[0]).toMatchObject(
      {
        ticketId: 'ticket-1',
        status: 'completed',
        remainingHours: 0,
      },
    );
    await waitFor(() =>
      expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
        'Repair ticket ticket-1 corrected by the GM.',
      ),
    );
    expect(screen.getByTestId('gm-ledger-player-log')).not.toHaveTextContent(
      /Hidden repair|maintenance crew|GM-only/i,
    );
    expect(screen.getByTestId('gm-ledger-private-log')).toHaveTextContent(
      'Hidden repair correction',
    );

    generateCorrection('salvage');

    expect(
      screen.getByTestId('gm-ledger-preview-state-summary'),
    ).toHaveTextContent('Salvage allocation match-1: processed=false');
    expect(
      screen.getByTestId('gm-ledger-preview-state-summary'),
    ).toHaveTextContent('Salvage allocation match-1: processed=true');

    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));

    await waitFor(() => expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(2));
    expect(
      onApplyCampaignUpdate.mock.calls[1][0].salvageAllocations['match-1'],
    ).toMatchObject({
      processed: true,
    });
    await waitFor(() =>
      expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
        'Salvage allocation match-1 corrected by the GM.',
      ),
    );
    expect(screen.getByTestId('gm-ledger-private-log')).toHaveTextContent(
      'Hidden salvage correction',
    );

    generateCorrection('unit-reload');

    expect(
      screen.getByTestId('gm-ledger-preview-state-summary'),
    ).toHaveTextContent('Unit unit-1: combatReady=false');
    expect(
      screen.getByTestId('gm-ledger-preview-state-summary'),
    ).toHaveTextContent('Unit unit-1: combatReady=true');

    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));

    await waitFor(() => expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(3));
    expect(
      onApplyCampaignUpdate.mock.calls[2][0].unitCombatStates['unit-1'],
    ).toMatchObject({
      combatReady: true,
      lastUpdated: fixedNow(),
    });
    await waitFor(() =>
      expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
        'Unit unit-1 reload reconciliation recorded by the GM.',
      ),
    );
    expect(screen.getByTestId('gm-ledger-player-log')).not.toHaveTextContent(
      /Hidden unit reload|stale unit|GM-only/i,
    );
    expect(screen.getByTestId('gm-ledger-private-log')).toHaveTextContent(
      'Hidden unit reload reconciliation',
    );
  });

  it('previews and applies roster recovery external effects on time approval', async () => {
    const campaign = {
      ...createCampaign('GM Roster Recovery Test', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      id: 'campaign-roster-recovery',
      currentDate: new Date('3025-02-02T00:00:00.000Z'),
      updatedAt: '2026-06-22T00:00:00.000Z',
      currentSystemId: 'terra',
    };
    const onApplyCampaignUpdate = jest.fn();
    useCampaignRosterStore.getState().initRoster(campaign.id);
    useCampaignRosterStore.getState().addPilot(
      makeRosterEntry({
        pilotId: 'pilot-recovery',
        pilotName: 'Mira Holt',
        recoveryTime: 2,
        injuries: [
          createInjury({
            id: 'injury-1',
            type: 'Concussion',
            location: 'Head',
            severity: 2,
            daysToHeal: 2,
            acquired: new Date('3025-01-31T00:00:00.000Z'),
          }),
        ],
      }),
    );

    render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
        now={fixedNow}
      />,
    );

    generateCorrection('time');

    expect(screen.getByTestId('gm-ledger-preview-status')).toHaveTextContent(
      'ready',
    );
    expect(
      screen.getByTestId('gm-ledger-preview-external-effects'),
    ).toHaveTextContent(
      'Mira Holt recovery advanced 2 days: 2 -> 0 days remaining.',
    );

    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));

    await waitFor(() => expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1));
    const rosterPilot = useCampaignRosterStore
      .getState()
      .pilots.find((pilot) => pilot.pilotId === 'pilot-recovery');
    expect(rosterPilot).toMatchObject({
      status: CampaignPilotStatus.Active,
      recoveryTime: 0,
      injuries: [],
    });
    const updates = onApplyCampaignUpdate.mock.calls[0][0];
    expect(updates.timeCascadeEvents?.[0].externalEffects).toEqual([
      expect.objectContaining({
        ref: 'campaign:campaign-roster-recovery:roster:pilot-recovery:recovery',
        summary: expect.stringContaining('Mira Holt recovery advanced 2 days'),
      }),
    ]);

    const playerLog = within(screen.getByTestId('gm-ledger-player-log'));
    expect(
      await playerLog.findByText(/Campaign time corrected by 2 days/),
    ).toBeInTheDocument();
    expect(playerLog.queryByText(/Mira Holt recovery/)).not.toBeInTheDocument();
    expect(
      playerLog.queryByText(/Hidden time cascade/),
    ).not.toBeInTheDocument();
  });

  it('records an approval only once its apply succeeds, so a refusal leaves no row (S14)', async () => {
    const campaign = createCampaign('GM Ledger Refusal Test', 'mercenary', {
      startingFunds: 1_000_000,
    });
    const onApplyCampaignUpdate = jest
      .fn()
      .mockResolvedValueOnce('insufficient-funds')
      .mockResolvedValueOnce(null);

    render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
        now={fixedNow}
      />,
    );
    const playerRows = () =>
      screen
        .getByTestId('gm-ledger-player-log')
        .querySelectorAll('[data-testid^="gm-ledger-player-row-"]').length;

    fireEvent.click(screen.getByTestId('gm-ledger-preview-btn'));
    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('gm-ledger-approval-status')).toHaveTextContent(
        'Not applied to campaign state.',
      ),
    );
    expect(playerRows()).toBe(0);

    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('gm-ledger-approval-status')).toHaveTextContent(
        'Approved and applied to campaign state.',
      ),
    );
    expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(2);
    expect(playerRows()).toBe(1);
  });

  it('leaves the roster unpatched when a time approval is refused (S14)', async () => {
    const campaign = {
      ...createCampaign('GM Roster Refusal Test', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      id: 'campaign-roster-refusal',
      currentDate: new Date('3025-02-02T00:00:00.000Z'),
      updatedAt: '2026-06-22T00:00:00.000Z',
      currentSystemId: 'terra',
    };
    const onApplyCampaignUpdate = jest.fn(
      async () => 'no live host connection',
    );
    useCampaignRosterStore.getState().initRoster(campaign.id);
    useCampaignRosterStore
      .getState()
      .addPilot(makeRosterEntry({ pilotId: 'pilot-held', recoveryTime: 2 }));

    render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
        now={fixedNow}
      />,
    );

    generateCorrection('time');
    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('gm-ledger-approval-status')).toHaveTextContent(
        'Not applied to campaign state.',
      ),
    );

    expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1);
    expect(
      useCampaignRosterStore
        .getState()
        .pilots.find((pilot) => pilot.pilotId === 'pilot-held'),
    ).toMatchObject({ status: CampaignPilotStatus.Wounded, recoveryTime: 2 });
  });

  it('blocks conflicted approval and records manual takeover without mutating state', () => {
    const campaign = createCampaign('GM Ledger Manual Test', 'mercenary', {
      startingFunds: 1_000_000,
    });
    const onApplyCampaignUpdate = jest.fn();

    render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
        now={fixedNow}
      />,
    );

    generateCorrection('merchant-conflict');

    expect(screen.getByTestId('gm-ledger-preview-status')).toHaveTextContent(
      'requires-manual-takeover',
    );
    expect(screen.getByTestId('gm-ledger-approve-btn')).toBeDisabled();
    expect(screen.getByTestId('gm-ledger-manual-btn')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('gm-ledger-manual-btn'));

    expect(onApplyCampaignUpdate).not.toHaveBeenCalled();
    expect(screen.getByTestId('gm-ledger-manual-status')).toHaveTextContent(
      'no campaign state changed',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'No campaign state changed',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).not.toHaveTextContent(
      'Hidden campaign',
    );
    expect(screen.getByTestId('gm-ledger-private-log')).toHaveTextContent(
      'Manual takeover selected',
    );
  });
});

describe('GmCampaignInterventionControlPlane control state (K11)', () => {
  it.each(['merchant', 'repair', 'salvage', 'unit-reload', 'time'])(
    'blocks stale %s approval and enables approval only after regeneration',
    async (kind) => {
      const campaign = makeCampaignWithBaseFixes();
      const apply = jest.fn();
      const { rerender } = render(
        <GmCampaignInterventionControlPlane
          campaign={campaign}
          onApplyCampaignUpdate={apply}
          now={fixedNow}
        />,
      );
      generateCorrection(kind);
      expect(screen.getByTestId('gm-ledger-preview-status')).toHaveTextContent(
        'ready',
      );
      const current = { ...campaign, updatedAt: '2026-11-08T12:00:00.000Z' };
      rerender(
        <GmCampaignInterventionControlPlane
          campaign={current}
          onApplyCampaignUpdate={apply}
          now={fixedNow}
        />,
      );
      await act(async () => {
        fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
      });
      expect(apply).not.toHaveBeenCalled();
      expect(screen.getByTestId('gm-ledger-approval-status')).toHaveTextContent(
        'Approval blocked.',
      );
      expect(screen.getByTestId('gm-ledger-approve-btn')).toBeDisabled();
      expect(playerRowCount()).toBe(0);
      generateCorrection(kind);
      await act(async () => {
        fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
      });
      expect(apply).toHaveBeenCalledTimes(1);
      expect(playerRowCount()).toBe(1);
    },
  );

  it('blocks retry after a refusal if the campaign changed meanwhile', async () => {
    const campaign = makeCampaignWithBaseFixes();
    const apply = jest.fn(async () => 'host refused');
    const { rerender } = render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={apply}
        now={fixedNow}
      />,
    );
    generateCorrection('merchant');
    await act(async () => {
      fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
    });
    expect(screen.getByTestId('gm-ledger-approve-btn')).not.toBeDisabled();
    rerender(
      <GmCampaignInterventionControlPlane
        campaign={{ ...campaign, updatedAt: 'changed' }}
        onApplyCampaignUpdate={apply}
        now={fixedNow}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
    });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('gm-ledger-approval-status')).toHaveTextContent(
      'Approval blocked.',
    );
    expect(playerRowCount()).toBe(0);
  });

  beforeEach(() => {
    useCampaignRosterStore.getState().reset();
  });

  const playerRowCount = (): number =>
    screen
      .getByTestId('gm-ledger-player-log')
      .querySelectorAll('[data-testid^="gm-ledger-player-row-"]').length;

  /** An apply callback whose answer the test releases later. */
  function deferredApply(): {
    readonly apply: jest.Mock;
    readonly answer: (value?: string | null) => Promise<void>;
  } {
    let resolve: (value: string | null) => void = () => undefined;
    const apply = jest.fn(
      () =>
        new Promise<string | null>((done) => {
          resolve = done;
        }),
    );
    return {
      apply,
      answer: async (value = null) => {
        await act(async () => {
          resolve(value);
          for (let i = 0; i < 10; i += 1) await Promise.resolve();
        });
      },
    };
  }

  it('locks generate and approve while an approve is in flight, so an old answer never latches a new preview', async () => {
    const { apply, answer } = deferredApply();
    render(
      <GmCampaignInterventionControlPlane
        campaign={createCampaign('K11 In Flight', 'mercenary', {
          startingFunds: 1_000_000,
        })}
        onApplyCampaignUpdate={apply}
        now={fixedNow}
      />,
    );

    fireEvent.click(screen.getByTestId('gm-ledger-preview-btn'));
    // Two clicks in one turn: the second runs with the same render's handler,
    // so only the reducer's synchronous dispatch can refuse it.
    const approve = screen.getByTestId('gm-ledger-approve-btn');
    act(() => {
      approve.click();
      approve.click();
    });

    expect(apply).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('gm-ledger-preview-btn')).toBeDisabled();
    expect(screen.getByTestId('gm-ledger-approve-btn')).toBeDisabled();
    // A generate click that slips through is refused too.
    generateCorrection('repair');
    expect(screen.getByTestId('gm-ledger-preview-summary')).toHaveTextContent(
      'Merchant charge corrected',
    );

    await answer(null);

    expect(apply).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('gm-ledger-approval-status')).toHaveTextContent(
      'Approved and applied to campaign state.',
    );
    expect(screen.getByTestId('gm-ledger-preview-btn')).not.toBeDisabled();
    expect(playerRowCount()).toBe(1);
  });

  it('disables manual takeover once it is recorded', () => {
    render(
      <GmCampaignInterventionControlPlane
        campaign={createCampaign('K11 Manual', 'mercenary', {
          startingFunds: 1_000_000,
        })}
        onApplyCampaignUpdate={jest.fn()}
        now={fixedNow}
      />,
    );

    generateCorrection('merchant-conflict');
    // Two clicks in one turn: the second runs with the same render's handler,
    // so only the reducer's synchronous dispatch can refuse it.
    const manual = screen.getByTestId('gm-ledger-manual-btn');
    act(() => {
      manual.click();
      manual.click();
    });

    expect(screen.getByTestId('gm-ledger-manual-btn')).toBeDisabled();
    fireEvent.click(screen.getByTestId('gm-ledger-manual-btn'));
    expect(playerRowCount()).toBe(1);
    expect(screen.getByTestId('gm-ledger-approval-status')).toHaveTextContent(
      'Manual takeover recorded.',
    );
  });

  it('keeps persisted rows after the first action and merges a persisted row with its session row', async () => {
    const base = createCampaign('K11 Rows', 'mercenary', {
      startingFunds: 1_000_000,
    });
    const persisted = {
      ...base,
      id: 'campaign-k11-rows',
      gmInterventionEvents: [
        {
          type: 'gm.campaign.funds_transaction_corrected',
          domain: 'economy',
          family: 'funds-transaction',
          interventionId: 'gm-ledger-merchant-reversal-old',
          transactionId: 'gm-ledger-merchant-reversal-old',
          changedStateRefs: ['campaign:campaign-k11-rows:finances'],
          publicSummary: 'Earlier correction from the saved campaign.',
          before: { balanceCents: 99_000_000, transactionIds: [] },
          after: {
            balanceCents: 100_000_000,
            transaction: {
              id: 'gm-ledger-merchant-reversal-old',
              type: TransactionType.Miscellaneous,
              amountCents: 1_000_000,
              date: '3025-01-01T00:00:00.000Z',
              description: 'Earlier correction',
            },
          },
        } satisfies IGmCampaignProjectedEffect,
      ],
    };
    const onApplyCampaignUpdate = jest.fn();
    const { rerender } = render(
      <GmCampaignInterventionControlPlane
        campaign={persisted}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
        now={fixedNow}
      />,
    );
    expect(playerRowCount()).toBe(1);

    fireEvent.click(screen.getByTestId('gm-ledger-preview-btn'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
    });

    expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Earlier correction from the saved campaign.',
    );
    expect(playerRowCount()).toBe(2);

    // The store writes the approval's effect back; its persisted row and the
    // session row are one intervention, shown once, with the GM-private text.
    const updates = onApplyCampaignUpdate.mock.calls[0][0];
    rerender(
      <GmCampaignInterventionControlPlane
        campaign={{ ...persisted, ...updates }}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
        now={fixedNow}
      />,
    );

    expect(playerRowCount()).toBe(2);
    expect(screen.getByTestId('gm-ledger-private-log')).toHaveTextContent(
      'Hidden campaign merchant reversal',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Earlier correction from the saved campaign.',
    );
  });

  it('preserves distinct repair effects when the saved approval meets its session row', async () => {
    const campaign = makeCampaignWithBaseFixes();
    const onApplyCampaignUpdate = jest.fn();
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { rerender, unmount } = render(
        <GmCampaignInterventionControlPlane
          campaign={campaign}
          onApplyCampaignUpdate={onApplyCampaignUpdate}
          now={fixedNow}
        />,
      );
      generateCorrection('repair');
      await act(async () => {
        fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
      });
      expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1);
      const saved = { ...campaign, ...onApplyCampaignUpdate.mock.calls[0][0] };
      expect(saved.gmInterventionEvents).toHaveLength(2);
      rerender(
        <GmCampaignInterventionControlPlane
          campaign={saved}
          onApplyCampaignUpdate={onApplyCampaignUpdate}
          now={fixedNow}
        />,
      );
      const assertEffects = (): void => {
        const playerLog = screen.getByTestId('gm-ledger-player-log');
        expect(playerRowCount()).toBe(2);
        expect(playerLog).toHaveTextContent('Repairs - approved');
        expect(playerLog).toHaveTextContent('Unit readiness - approved');
        expect(playerLog).not.toHaveTextContent('Hidden repair correction');
      };
      assertEffects();
      const privateRows = screen
        .getByTestId('gm-ledger-private-log')
        .querySelectorAll('[data-testid^="gm-ledger-gm-row-"]');
      expect(privateRows).toHaveLength(2);
      expect(
        [...privateRows].filter((row) =>
          row.textContent?.includes('Hidden repair correction'),
        ),
      ).toHaveLength(1);
      unmount();
      render(<GmCampaignPlayerLedgerView campaign={saved} />);
      assertEffects();
      expect(
        errors.mock.calls.filter((call) =>
          call.map(String).join(' ').includes('same key'),
        ),
      ).toEqual([]);
    } finally {
      errors.mockRestore();
    }
  });

  it('keeps unique effect identities, legacy rows and unrelated session approvals', () => {
    const persisted = [
      {
        id: 'legacy',
        sequence: 1,
        interventionRecordId: undefined,
        family: 'legacy',
      },
      {
        id: 'repair-ticket',
        sequence: 2,
        interventionRecordId: 'repair',
        family: 'repair-ticket',
      },
      {
        id: 'repair-unit',
        sequence: 3,
        interventionRecordId: 'repair',
        family: 'base-unit-state',
      },
    ];
    const session = [
      {
        id: 'session-repair',
        sequence: 1,
        interventionRecordId: 'repair',
        family: 'repair-ticket',
      },
      {
        id: 'session-other',
        sequence: 2,
        interventionRecordId: 'other',
        family: 'salvage-allocation',
      },
    ];
    const rows = mergeLedgerRows(persisted, session);
    expect(rows.map((row) => row.id)).toEqual([
      'legacy',
      'session-repair',
      'repair-unit',
      'session-other',
    ]);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    expect(rows.map((row) => row.family)).toEqual([
      'legacy',
      'repair-ticket',
      'base-unit-state',
      'salvage-allocation',
    ]);
    expect(rows.map((row) => row.sequence)).toEqual([1, 2, 3, 4]);
    expect(mergeLedgerRows(persisted, [])).toEqual(persisted);
  });

  it('shows a throwing apply as failed, records nothing, and leaves no unhandled rejection', async () => {
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown): void => {
      rejections.push(reason);
    };
    process.on('unhandledRejection', onRejection);
    try {
      render(
        <GmCampaignInterventionControlPlane
          campaign={createCampaign('K11 Throw', 'mercenary', {
            startingFunds: 1_000_000,
          })}
          onApplyCampaignUpdate={jest.fn(async () => {
            throw new Error('disk full');
          })}
          now={fixedNow}
        />,
      );

      fireEvent.click(screen.getByTestId('gm-ledger-preview-btn'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
        for (let i = 0; i < 10; i += 1) await Promise.resolve();
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(screen.getByTestId('gm-ledger-approval-status')).toHaveTextContent(
        'Apply failed.',
      );
      expect(screen.getByTestId('gm-ledger-approval-reason')).toHaveTextContent(
        'disk full',
      );
      expect(screen.getByTestId('gm-ledger-approve-btn')).toBeDisabled();
      expect(playerRowCount()).toBe(0);
      expect(rejections).toEqual([]);
    } finally {
      process.off('unhandledRejection', onRejection);
    }
  });
});

function makeRosterEntry(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-1',
    pilotName: 'Alex Mason',
    status: CampaignPilotStatus.Wounded,
    wounds: 1,
    recoveryTime: 2,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01T00:00:00.000Z'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    injuries: [],
    ...overrides,
  };
}

function makeCampaignWithBaseFixes() {
  return {
    ...createCampaign('GM Base Fixes Test', 'mercenary', {
      startingFunds: 1_000_000,
    }),
    id: 'campaign-gm-base-fixes',
    updatedAt: '3025-02-01T00:00:00.000Z',
    repairQueue: [makeRepairTicket()],
    salvageAllocations: {
      'match-1': makeSalvageAllocation(),
    },
    unitCombatStates: {
      'unit-1': makeUnitCombatState({
        combatReady: false,
      }),
    },
  };
}

function makeRepairTicket(
  overrides: Partial<IRepairTicket> = {},
): IRepairTicket {
  return {
    ticketId: 'ticket-1',
    unitId: 'unit-1',
    kind: 'armor',
    location: 'CT',
    pointsToRestore: 8,
    expectedHours: 4,
    remainingHours: 4,
    partsRequired: [],
    source: 'combat',
    matchId: 'match-1',
    createdAt: '3025-02-01T00:00:00.000Z',
    status: 'queued',
    ...overrides,
  };
}

function makeSalvageAllocation(
  overrides: Partial<ISalvageAllocation> = {},
): ISalvageAllocation {
  const candidate = {
    source: 'part' as const,
    unitId: 'enemy-1',
    designation: 'Medium Laser',
    destroyedFromBattle: 'match-1',
    finalStatus: 'destroyed' as const,
    damageLevel: DamageLevel.Moderate,
    originalValue: 40_000,
    recoveredValue: 20_000,
    recoveryPercentage: 0.5,
    repairCostEstimate: 2_000,
    partId: 'medium-laser',
    location: 'RA',
    disposition: 'mercenary' as const,
    status: 'awarded' as const,
  };

  return {
    pool: {
      battleId: 'match-1',
      contractId: 'contract-1',
      candidates: [candidate],
      totalEstimatedValue: 20_000,
      hostileTerritory: false,
    },
    employerAward: {
      side: 'employer',
      candidates: [],
      totalValue: 0,
      estimatedRepairCost: 0,
    },
    mercenaryAward: {
      side: 'mercenary',
      candidates: [candidate],
      totalValue: 20_000,
      estimatedRepairCost: 2_000,
    },
    splitMethod: 'contract',
    processed: false,
    ...overrides,
  };
}

function makeUnitCombatState(
  overrides: Partial<IUnitCombatState> = {},
): IUnitCombatState {
  return {
    unitId: 'unit-1',
    currentArmorPerLocation: {
      CT: 20,
      RA: 8,
    },
    currentStructurePerLocation: {
      CT: 10,
      RA: 0,
    },
    destroyedLocations: ['RA'],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: {},
    combatReady: true,
    lastCombatOutcomeId: 'match-1',
    lastUpdated: '3025-02-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('GmCampaignPlayerLedgerView', () => {
  it('renders only player-safe persisted ledger rows', () => {
    const campaign = {
      ...createCampaign('GM Ledger Guest Mirror Test', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      id: 'campaign-gm-guest',
      updatedAt: '3025-01-03T00:00:00.000Z',
      gmInterventionEvents: [
        {
          type: 'gm.campaign.funds_transaction_corrected',
          domain: 'economy',
          family: 'funds-transaction',
          interventionId: 'gm-ledger-merchant-reversal',
          transactionId: 'gm-ledger-merchant-reversal',
          changedStateRefs: ['campaign:campaign-gm-guest:finances'],
          publicSummary: 'Merchant charge corrected by +2,500.00 C-bills.',
          before: {
            balanceCents: 100_000_000,
            transactionIds: [],
          },
          after: {
            balanceCents: 99_750_000,
            transaction: {
              id: 'gm-ledger-merchant-reversal',
              type: TransactionType.PartPurchase,
              amountCents: 250_000,
              date: '3025-01-03T00:00:00.000Z',
              description: 'GM merchant charge reversal',
            },
          },
        } satisfies IGmCampaignProjectedEffect,
      ],
      timeCascadeEvents: [
        {
          type: 'gm.campaign.time_cascade_applied',
          domain: 'time',
          family: 'time-advance',
          interventionId: 'gm-ledger-time-cascade',
          days: 2,
          before: {
            currentDate: '3025-01-03T00:00:00.000Z',
            updatedAt: '3025-01-03T00:00:00.000Z',
            currentSystemId: 'terra',
          },
          after: {
            currentDate: '3025-01-05T00:00:00.000Z',
            updatedAt: '3025-01-05T00:00:00.000Z',
            currentSystemId: 'terra',
          },
          afterCampaign: {
            ...createCampaign('GM Ledger Guest Mirror Test', 'mercenary', {
              startingFunds: 1_000_000,
            }),
            id: 'campaign-gm-guest',
            currentDate: new Date('3025-01-05T00:00:00.000Z'),
            updatedAt: '3025-01-05T00:00:00.000Z',
            currentSystemId: 'terra',
          },
          daySummaries: [],
          generatedEvents: [],
          changedStateRefs: [
            'campaign:campaign-gm-guest:currentDate',
            'campaign:campaign-gm-guest:repairQueue',
          ],
          externalEffects: [],
          publicSummary: 'Campaign time corrected by 2 days.',
        } satisfies IGmTimeCascadeProjectedEffect,
      ],
    };

    render(<GmCampaignPlayerLedgerView campaign={campaign} />);

    expect(
      screen.getByTestId('gm-ledger-player-only-notice'),
    ).toHaveTextContent(
      'GM controls are available only to the campaign owner or co-op host',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Merchant charge corrected by +2,500.00 C-bills.',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Campaign time corrected by 2 days.',
    );
    expect(
      screen.queryByTestId('gm-ledger-private-log'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('gm-ledger-preview-btn'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('gm-ledger-approve-btn'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('gm-ledger-manual-btn'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('gm-ledger-player-log')).not.toHaveTextContent(
      /Hidden campaign|Hidden time|black-market|GM-only|default outcome/i,
    );
  });
});

it('targets active repair work after completed and cancelled tickets', () => {
  const campaign = {
    ...makeCampaignWithBaseFixes(),
    repairQueue: [
      makeRepairTicket({ ticketId: 'done', status: 'completed' }),
      makeRepairTicket({ ticketId: 'cancelled', status: 'cancelled' }),
      makeRepairTicket({ ticketId: 'active' }),
    ],
  };
  expect(
    buildRepairCompletionCommand({ actorId: 'gm', campaign }).payload
      ?.correction,
  ).toMatchObject({ ticketId: 'active' });
});
