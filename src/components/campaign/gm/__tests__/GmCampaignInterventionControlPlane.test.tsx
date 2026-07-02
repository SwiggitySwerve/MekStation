import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

import { GmCampaignInterventionControlPlane } from '../GmCampaignInterventionControlPlane';
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

  it('previews and approves a funds correction with player-safe output', () => {
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

    expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1);
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
      playerLog.getByText(/Merchant charge corrected/),
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

  it('previews and approves a time cascade with player-safe output', () => {
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

    expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1);
    const updates = onApplyCampaignUpdate.mock.calls[0][0];
    expect(updates.currentDate.toISOString()).toBe('3025-02-04T00:00:00.000Z');
    expect(updates.timeCascadeEvents).toHaveLength(1);

    const playerLog = within(screen.getByTestId('gm-ledger-player-log'));
    expect(
      playerLog.getByText(/Campaign time corrected by 2 days/),
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

  it('previews and approves repair, salvage, and unit reload corrections', () => {
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

    expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1);
    expect(onApplyCampaignUpdate.mock.calls[0][0].repairQueue[0]).toMatchObject(
      {
        ticketId: 'ticket-1',
        status: 'completed',
        remainingHours: 0,
      },
    );
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Repair ticket ticket-1 corrected by the GM.',
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

    expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(2);
    expect(
      onApplyCampaignUpdate.mock.calls[1][0].salvageAllocations['match-1'],
    ).toMatchObject({
      processed: true,
    });
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Salvage allocation match-1 corrected by the GM.',
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

    expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(3);
    expect(
      onApplyCampaignUpdate.mock.calls[2][0].unitCombatStates['unit-1'],
    ).toMatchObject({
      combatReady: true,
      lastUpdated: fixedNow(),
    });
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Unit unit-1 reload reconciliation recorded by the GM.',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).not.toHaveTextContent(
      /Hidden unit reload|stale unit|GM-only/i,
    );
    expect(screen.getByTestId('gm-ledger-private-log')).toHaveTextContent(
      'Hidden unit reload reconciliation',
    );
  });

  it('previews and applies roster recovery external effects on time approval', () => {
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

    const rosterPilot = useCampaignRosterStore
      .getState()
      .pilots.find((pilot) => pilot.pilotId === 'pilot-recovery');
    expect(rosterPilot).toMatchObject({
      status: CampaignPilotStatus.Active,
      recoveryTime: 0,
      injuries: [],
    });
    expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1);
    const updates = onApplyCampaignUpdate.mock.calls[0][0];
    expect(updates.timeCascadeEvents?.[0].externalEffects).toEqual([
      expect.objectContaining({
        ref: 'campaign:campaign-roster-recovery:roster:pilot-recovery:recovery',
        summary: expect.stringContaining('Mira Holt recovery advanced 2 days'),
      }),
    ]);

    const playerLog = within(screen.getByTestId('gm-ledger-player-log'));
    expect(
      playerLog.getByText(/Campaign time corrected by 2 days/),
    ).toBeInTheDocument();
    expect(playerLog.queryByText(/Mira Holt recovery/)).not.toBeInTheDocument();
    expect(
      playerLog.queryByText(/Hidden time cascade/),
    ).not.toBeInTheDocument();
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
