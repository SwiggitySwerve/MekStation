/**
 * Tests for `GuestProposalSurface` + `useGuestProposals` (CO2,
 * tasks 6.4).
 *
 * Covers: a guest control submits a proposal not a commit; the pending
 * indicator shows while unresolved and a duplicate submit is disabled;
 * the indicator clears on resolution; a veto and a mechanical rejection
 * are visually distinct.
 *
 * @spec openspec/specs/coop-campaign-sync/spec.md
 */

import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type {
  GuestProposalResult,
  IGuestProposal,
} from '@/types/campaign/CoopCampaign';

import {
  _resetCoopRuntimeSessions,
  openCoopRuntimeSession,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { createCampaign } from '@/types/campaign/Campaign';
import {
  createGuestCoopSession,
  createHostCoopSession,
} from '@/types/campaign/CoopSession';

import { CampaignCoopRouteSurfaceConnected } from '../CampaignCoopRouteSurfaceConnected';
import { GuestProposalSurface } from '../GuestProposalSurface';
import { useGuestProposals } from '../useGuestProposals';

const SPEND_INTENT: ICampaignIntent = {
  kind: 'SpendFunds',
  campaignId: 'campaign-1',
  intentId: 'intent-spend',
  payload: { amount: 50_000, reason: 'Ammo' },
};

/**
 * A controllable transport — `submit` returns a promise the test
 * resolves explicitly, so the pending window is observable.
 */
function deferredTransport(): {
  transport: (p: IGuestProposal) => Promise<GuestProposalResult>;
  resolveWith: (result: GuestProposalResult) => void;
} {
  let resolver: ((r: GuestProposalResult) => void) | null = null;
  return {
    transport: () =>
      new Promise<GuestProposalResult>((resolve) => {
        resolver = resolve;
      }),
    resolveWith: (result) => {
      resolver?.(result);
    },
  };
}

describe('useGuestProposals — proposal lifecycle', () => {
  it('marks a proposal pending then resolved', async () => {
    const { transport, resolveWith } = deferredTransport();
    const { result } = renderHook(() =>
      useGuestProposals(transport, 'guest-player'),
    );

    // Submit — the proposal is pending immediately.
    let submitPromise: Promise<GuestProposalResult | null>;
    act(() => {
      submitPromise = result.current.submit(SPEND_INTENT);
    });
    expect(result.current.isPending('SpendFunds')).toBe(true);

    // Resolve — pending clears.
    await act(async () => {
      resolveWith({
        status: 'committed',
        proposalId: 'proposal-intent-spend',
        events: [],
      });
      await submitPromise;
    });
    expect(result.current.isPending('SpendFunds')).toBe(false);
    expect(result.current.proposals[0].status).toBe('committed');
  });

  it('disables a duplicate submit while a proposal of the same kind is pending', async () => {
    const { transport } = deferredTransport();
    const { result } = renderHook(() =>
      useGuestProposals(transport, 'guest-player'),
    );

    act(() => {
      void result.current.submit(SPEND_INTENT);
    });
    expect(result.current.isPending('SpendFunds')).toBe(true);

    // A second submit of the same kind is a no-op (returns null).
    let duplicate: GuestProposalResult | null = {
      status: 'pending',
      proposalId: 'x',
    };
    await act(async () => {
      duplicate = await result.current.submit(SPEND_INTENT);
    });
    expect(duplicate).toBeNull();
    // Still exactly one tracked proposal.
    expect(result.current.proposals).toHaveLength(1);
  });
});

describe('GuestProposalSurface — rendering', () => {
  function ProbeSurface({
    transport,
  }: {
    transport: (p: IGuestProposal) => Promise<GuestProposalResult>;
  }): React.ReactElement {
    const api = useGuestProposals(transport, 'guest-player');
    return (
      <GuestProposalSurface
        api={api}
        actions={[
          {
            kind: 'SpendFunds',
            label: 'Spend Funds',
            buildIntent: () => SPEND_INTENT,
          },
        ]}
      />
    );
  }

  it('a guest control submits a proposal and shows the pending indicator', async () => {
    const { transport } = deferredTransport();
    render(<ProbeSurface transport={transport} />);

    await act(async () => {
      screen.getByTestId('guest-action-SpendFunds').click();
    });

    // The action is now pending — indicator visible, control disabled.
    expect(
      screen.getByTestId('guest-action-SpendFunds-pending'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('guest-action-SpendFunds')).toBeDisabled();
  });

  it('renders a veto distinctly from a mechanical rejection', async () => {
    // Veto resolution.
    const veto = deferredTransport();
    const { unmount } = render(<ProbeSurface transport={veto.transport} />);
    await act(async () => {
      screen.getByTestId('guest-action-SpendFunds').click();
    });
    await act(async () => {
      veto.resolveWith({
        status: 'vetoed',
        proposalId: 'proposal-intent-spend',
        error: {
          ok: false,
          code: 'PROPOSAL_VETOED',
          proposalId: 'proposal-intent-spend',
        },
      });
    });
    expect(screen.getByTestId('guest-proposal-vetoed')).toBeInTheDocument();
    unmount();

    // Mechanical rejection resolution.
    const reject = deferredTransport();
    render(<ProbeSurface transport={reject.transport} />);
    await act(async () => {
      screen.getByTestId('guest-action-SpendFunds').click();
    });
    await act(async () => {
      reject.resolveWith({
        status: 'mechanically-rejected',
        proposalId: 'proposal-intent-spend',
        code: 'INVALID_CAMPAIGN_INTENT',
        reason: 'insufficient-funds',
      });
    });
    expect(
      screen.getByTestId('guest-proposal-mechanically-rejected'),
    ).toBeInTheDocument();
    // The two outcomes use distinct testids → visually distinct.
    expect(screen.queryByTestId('guest-proposal-vetoed')).toBeNull();
  });
});

describe('CampaignCoopRouteSurfaceConnected runtime proposal transport', () => {
  beforeEach(() => {
    _resetCoopRuntimeSessions();
  });

  it('submits guest proposals through the runtime arbiter and resolves committed', async () => {
    const host = {
      ...createCampaign('Host Campaign', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      id: 'campaign-1',
      coopSession: createHostCoopSession('ABC234', 'match-1'),
    };
    await openCoopRuntimeSession(host, {
      matchId: 'match-1',
      roomCode: 'ABC234',
      arbitrationMode: 'auto-approve',
    });
    const guest = {
      ...createCampaign('Guest Mirror', 'mercenary'),
      id: 'campaign-1',
      coopSession: createGuestCoopSession('match-1', 'ABC234'),
    };

    render(
      <CampaignCoopRouteSurfaceConnected campaign={guest} routeId="finances" />,
    );

    await act(async () => {
      screen.getByTestId('guest-action-SpendFunds').click();
    });

    expect(
      await screen.findByTestId('guest-proposal-committed'),
    ).toHaveTextContent('Approved by the GM');
    expect(
      screen.queryByTestId('guest-action-SpendFunds-pending'),
    ).not.toBeInTheDocument();
  });
});
