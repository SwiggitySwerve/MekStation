/**
 * The GM ledger page's approve callback on a co-op host (roadmap unit U92).
 *
 * The page renders the real intervention control plane; the page shell is
 * mocked to hand it one campaign and a store whose updateCampaign is a spy.
 * The co-op host transport is a fake registered in the real transport
 * registry: it records every host intent and answers the way the live host
 * does (a FundsChanged event of the campaign, or an Error frame carrying the
 * intent's id).
 *
 * - (R4) a funds approval on a co-op host sends ApplyGmIntervention with the
 *   correction's signed C-bill delta and public summary instead of writing
 *   the local store, and re-reads the saved record once the host commits.
 * - (R3) two approvals of one canned correction carry two distinct
 *   intervention ids (and intent ids).
 * - (solo) a solo campaign keeps its local path and sends nothing.
 * - (refusal) a refusal from the host is shown and nothing is written.
 * - (guest route) a guest whose balance took the FundsChanged sees no row for
 *   the correction on its player ledger route (reading for
 *   FN-u92-guest-ledger-route-reads-unmirrored-data).
 *
 * Lives under src/__tests__/pages/ so Next does not treat the spec as a route.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { applyAuthoritativeStateToGuestCampaign } from '@/lib/campaign/coop/campaignMirrorProjection';
import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
  type CampaignSyncFrameHandler,
  type ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import GmLedgerPage from '@/pages/gameplay/campaigns/[id]/gm-ledger';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { createCampaign } from '@/types/campaign/Campaign';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

const CAMPAIGN_ID = 'campaign-u92-ledger';
const MATCH_ID = 'match-u92-ledger';
const SUMMARY = 'Merchant charge corrected by +2,500.00 C-bills.';

const mockUpdateCampaign = jest.fn((_updates: unknown) => true);
const mockToast = jest.fn();
let mockCampaign: ICampaign;

jest.mock('@/components/shared/Toast', () => ({
  toast: (config: unknown) => mockToast(config),
}));

jest.mock('@/pages-modules/gameplay/campaigns/campaignPageShell', () => ({
  useCampaignPageShell: () => ({
    campaign: mockCampaign,
    breadcrumbs: [],
    isClient: true,
    isLoadingCampaign: false,
    store: { getState: () => ({ updateCampaign: mockUpdateCampaign }) },
  }),
  renderPendingCampaignPage: () => null,
  getLoadedCampaign: () => mockCampaign,
  CampaignPageFrameFromShell: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

/** A campaign of 380,000 C-bills, co-op host of MATCH_ID unless `solo`. */
function campaignOf(mode: 'host' | 'guest' | 'solo'): ICampaign {
  const base = {
    ...createCampaign('U92 Ledger Co.', 'mercenary', {
      startingFunds: 380_000,
    }),
    id: CAMPAIGN_ID,
    currentDate: new Date('3025-01-01T00:00:00.000Z'),
  };
  return mode === 'solo'
    ? base
    : { ...base, coopSession: { mode, roomCode: 'ABC234', matchId: MATCH_ID } };
}

/**
 * A host-role transport for MATCH_ID that records sent host intents and
 * answers each with `answer(intent)` on its frame listeners.
 */
function fakeHostTransport(
  answer: (intent: Record<string, unknown>) => IServerMessage,
): { transport: ICampaignSyncTransport; sent: Record<string, unknown>[] } {
  const listeners = new Set<CampaignSyncFrameHandler>();
  const sent: Record<string, unknown>[] = [];
  const transport: ICampaignSyncTransport = {
    matchId: MATCH_ID,
    playerId: 'pid_host',
    role: 'host',
    sendProposal: jest.fn(),
    sendDecision: jest.fn(),
    sendHostIntent: (intent) => {
      sent.push(intent as unknown as Record<string, unknown>);
      const reply = answer(intent as unknown as Record<string, unknown>);
      Promise.resolve().then(() => listeners.forEach((l) => l(reply)));
    },
    sendParticipation: jest.fn(),
    onFrame: (handler) => {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
    onError: () => () => undefined,
    close: jest.fn(),
    lastSeq: () => 0,
  };
  return { transport, sent };
}

/** The live host's FundsChanged answer to an ApplyGmIntervention intent. */
function fundsChangedAnswer(intent: Record<string, unknown>): IServerMessage {
  const payload = intent.payload as { deltaCBills: number; summary: string };
  return {
    kind: 'CampaignEvent',
    matchId: MATCH_ID,
    ts: '2026-09-26T00:00:00.000Z',
    event: {
      type: 'FundsChanged',
      sequence: 1,
      campaignId: CAMPAIGN_ID,
      ts: '2026-09-26T00:00:00.000Z',
      authorPlayerId: 'pid_host',
      scope: 'campaign',
      payload: {
        delta: payload.deltaCBills,
        reason: payload.summary,
        balance: 380_000 + payload.deltaCBills,
      },
    },
  } as unknown as IServerMessage;
}

/** Generates the default (merchant reversal) preview and approves it. */
async function approveMerchantReversal(): Promise<void> {
  fireEvent.click(screen.getByTestId('gm-ledger-preview-btn'));
  await act(async () => {
    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });
}

/** What updateCampaign was handed: the newest effect id and the balance. */
function localWrites(): unknown[] {
  return mockUpdateCampaign.mock.calls.map(([updates]) => {
    const u = updates as {
      gmInterventionEvents?: readonly { interventionId?: string }[];
      finances?: { balance?: { amount?: number } };
    };
    const events = u.gmInterventionEvents ?? [];
    return {
      newestInterventionId: events[events.length - 1]?.interventionId ?? null,
      balance: u.finances?.balance?.amount ?? null,
    };
  });
}

const measurements: Record<string, unknown> = {};

describe('GM ledger page approve on a co-op host (U92)', () => {
  let refreshSpy: jest.Mock;
  let markDirtySpy: jest.Mock;

  beforeEach(() => {
    mockUpdateCampaign.mockClear();
    mockToast.mockClear();
    useCampaignRosterStore.getState().reset();
    refreshSpy = jest.fn(async () => true);
    markDirtySpy = jest.fn();
    useCampaignPersistenceStore.setState({
      refreshAfterCommittedCommand: refreshSpy,
      markDirty: markDirtySpy,
    } as never);
  });

  afterEach(() => {
    _resetCampaignSyncTransportsForTest();
  });

  afterAll(() => {
    // Rows record what they read when U35E_ROWS_DIR names a directory.
    const dir = process.env.U35E_ROWS_DIR;
    if (dir) {
      writeFileSync(
        path.join(dir, 'u92-gm-ledger-page.json'),
        JSON.stringify(measurements, null, 2),
      );
    }
  });

  it('(R4) a co-op funds approval sends ApplyGmIntervention and does not write the local store', async () => {
    mockCampaign = campaignOf('host');
    const { transport, sent } = fakeHostTransport(fundsChangedAnswer);
    registerCampaignSyncTransport(transport);

    render(<GmLedgerPage />);
    await approveMerchantReversal();

    measurements.R4 = {
      sent,
      localWrites: localWrites(),
      refreshCalls: refreshSpy.mock.calls,
      toasts: mockToast.mock.calls,
    };
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      kind: 'ApplyGmIntervention',
      campaignId: CAMPAIGN_ID,
      payload: { summary: SUMMARY, deltaCBills: 2500 },
    });
    expect(Object.keys(sent[0]?.payload as object).sort()).toEqual([
      'deltaCBills',
      'interventionId',
      'summary',
    ]);
    expect(mockUpdateCampaign).not.toHaveBeenCalled();
    expect(markDirtySpy).not.toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalledWith({
      kind: 'committed',
      state: { campaignId: CAMPAIGN_ID },
    });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('(R3) two approvals of one canned correction carry two distinct intervention ids', async () => {
    mockCampaign = campaignOf('host');
    const { transport, sent } = fakeHostTransport(fundsChangedAnswer);
    registerCampaignSyncTransport(transport);

    render(<GmLedgerPage />);
    await approveMerchantReversal();
    await approveMerchantReversal();

    const payloads = sent.map(
      (intent) => intent.payload as { interventionId: string },
    );
    measurements.R3 = {
      sentInterventionIds: payloads.map((p) => p.interventionId),
      sentIntentIds: sent.map((intent) => intent.intentId),
      localWrites: localWrites(),
    };
    expect(payloads).toHaveLength(2);
    expect(payloads[0]?.interventionId).not.toBe(payloads[1]?.interventionId);
    expect(sent[0]?.intentId).not.toBe(sent[1]?.intentId);
  });

  it('(solo) a solo campaign keeps its local path and sends nothing', async () => {
    mockCampaign = campaignOf('solo');
    const { transport, sent } = fakeHostTransport(fundsChangedAnswer);
    registerCampaignSyncTransport(transport);

    render(<GmLedgerPage />);
    await approveMerchantReversal();

    measurements.solo = { sent, localWrites: localWrites() };
    expect(sent).toEqual([]);
    expect(localWrites()).toEqual([
      { newestInterventionId: 'gm-ledger-merchant-reversal', balance: 382_500 },
    ]);
    expect(markDirtySpy).toHaveBeenCalledTimes(1);
  });

  it('(refusal) a refusal from the host is shown and nothing is written', async () => {
    mockCampaign = campaignOf('host');
    const { transport, sent } = fakeHostTransport(
      (intent) =>
        ({
          kind: 'Error',
          matchId: MATCH_ID,
          ts: '2026-09-26T00:00:00.000Z',
          code: 'INVALID_INTENT',
          reason: 'insufficient-funds',
          intentId: intent.intentId,
        }) as unknown as IServerMessage,
    );
    registerCampaignSyncTransport(transport);

    render(<GmLedgerPage />);
    await approveMerchantReversal();

    measurements.refusal = {
      sent: sent.length,
      toasts: mockToast.mock.calls,
      localWrites: localWrites(),
      refreshCalls: refreshSpy.mock.calls.length,
    };
    expect(sent).toHaveLength(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        message: expect.stringContaining('insufficient-funds'),
      }),
    );
    expect(mockUpdateCampaign).not.toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('(guest route) a guest balance takes the FundsChanged; the player ledger route lists no row for it', () => {
    const guest = campaignOf('guest');
    mockCampaign = applyAuthoritativeStateToGuestCampaign(guest, {
      ...createEmptyCampaignState(CAMPAIGN_ID),
      balance: 382_500,
    });

    render(<GmLedgerPage />);

    const playerLog = screen.getByTestId('gm-ledger-player-log');
    measurements.guestRoute = {
      balance: mockCampaign.finances.balance.amount,
      gmInterventionEvents: mockCampaign.gmInterventionEvents ?? null,
      playerLogText: playerLog.textContent,
      controlPlane: screen.queryByTestId('gm-ledger-control-plane') !== null,
    };
    expect(mockCampaign.finances.balance.amount).toBe(382_500);
    expect(screen.getByTestId('gm-ledger-player-only-view')).toBeTruthy();
    expect(playerLog.textContent).not.toContain(SUMMARY);
  });
});
