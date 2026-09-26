/**
 * The GM ledger page refuses a second approve while one is in flight
 * (roadmap unit U97, FN-u92-approve-not-gated-in-flight).
 *
 * The page renders the real intervention control plane; the page shell is
 * mocked to hand it one co-op host campaign. The co-op host transport is a
 * fake registered in the real transport registry that records every host
 * intent and holds its answer until the row releases it, so the approval's
 * round trip stays open between the two clicks.
 *
 * - (R3) a second approve click during the round trip sends no second
 *   intent: approve is disabled from the send until the host's answer.
 *
 * Lives under src/__tests__/pages/ so Next does not treat the spec as a route.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

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

const CAMPAIGN_ID = 'campaign-u97-ledger';
const MATCH_ID = 'match-u97-ledger';

const mockUpdateCampaign = jest.fn((_updates: unknown) => true);
let mockCampaign: ICampaign;

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

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

/**
 * A host-role transport for MATCH_ID that records each host intent and
 * delivers the live host's FundsChanged answer only when `release()` runs.
 */
function heldHostTransport(): {
  transport: ICampaignSyncTransport;
  sent: Record<string, unknown>[];
  release: () => void;
} {
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
  const release = (): void => {
    for (const intent of sent) {
      const payload = intent.payload as {
        deltaCBills: number;
        summary: string;
      };
      const frame = {
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
      listeners.forEach((listener) => listener(frame));
    }
  };
  return { transport, sent, release };
}

/** Lets pending promise continuations run inside act. */
async function settle(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });
}

const measurements: Record<string, unknown> = {};

describe('GM ledger page approve in flight (U97)', () => {
  beforeEach(() => {
    mockUpdateCampaign.mockClear();
    useCampaignRosterStore.getState().reset();
    useCampaignPersistenceStore.setState({
      refreshAfterCommittedCommand: jest.fn(async () => true),
      markDirty: jest.fn(),
    } as never);
    mockCampaign = {
      ...createCampaign('U97 Ledger Co.', 'mercenary', {
        startingFunds: 380_000,
      }),
      id: CAMPAIGN_ID,
      currentDate: new Date('3025-01-01T00:00:00.000Z'),
      coopSession: { mode: 'host', roomCode: 'ABC234', matchId: MATCH_ID },
    };
  });

  afterEach(() => {
    _resetCampaignSyncTransportsForTest();
  });

  afterAll(() => {
    // Rows record what they read when U35E_ROWS_DIR names a directory.
    const dir = process.env.U35E_ROWS_DIR;
    if (dir) {
      writeFileSync(
        path.join(dir, 'u97-gm-ledger-inflight.json'),
        JSON.stringify(measurements, null, 2),
      );
    }
  });

  it('(R3) a second approve during the round trip sends no second intent', async () => {
    const { transport, sent, release } = heldHostTransport();
    registerCampaignSyncTransport(transport);

    render(<GmLedgerPage />);
    fireEvent.click(screen.getByTestId('gm-ledger-preview-btn'));
    const approve = screen.getByTestId('gm-ledger-approve-btn');
    const enabledBeforeSend = !(approve as HTMLButtonElement).disabled;

    fireEvent.click(approve);
    await settle();
    const sentAfterFirst = sent.length;
    const disabledInFlight = (
      screen.getByTestId('gm-ledger-approve-btn') as HTMLButtonElement
    ).disabled;

    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
    await settle();
    const sentAfterSecond = sent.length;

    await act(async () => {
      release();
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
    });
    const statusAfterCommit = screen.getByTestId(
      'gm-ledger-approval-status',
    ).textContent;

    measurements.R3 = {
      enabledBeforeSend,
      sentAfterFirst,
      disabledInFlight,
      sentAfterSecond,
      sentIntentIds: sent.map((intent) => intent.intentId),
      statusAfterCommit,
      localWrites: mockUpdateCampaign.mock.calls.length,
    };

    expect(enabledBeforeSend).toBe(true);
    expect(sentAfterFirst).toBe(1);
    expect(disabledInFlight).toBe(true);
    expect(sentAfterSecond).toBe(1);
    expect(statusAfterCommit).toContain('Approved and applied');
    expect(mockUpdateCampaign).not.toHaveBeenCalled();
  });
});
