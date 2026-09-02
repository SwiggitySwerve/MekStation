/**
 * Campaign and GM lifecycle postures on screen (umbrella 19.1 / 19.2).
 *
 * The tactical surface already carries a stable lifecycle posture with a
 * `data-state` locator in the umbrella's shared vocabulary. The campaign
 * and GM surfaces did not: the guest banner spoke a private sync
 * vocabulary and the GM review surface said nothing at all about whether
 * the server would accept the decision the host was about to make.
 *
 * These rows pin both halves, and pin the GATE precisely. The server
 * refuses `CAMPAIGN_NOT_CONVERGED` for exactly one thing - a progression
 * commit (`AdvanceDay`), including the host's approval of a guest's
 * `AdvanceDay` proposal. Disabling every control while a participant
 * lags would be a lie about what the server does; disabling nothing
 * would let the host press a button that is already refused. So the rows
 * assert both directions.
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';

import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import {
  _resetCoopRuntimeSessions,
  openCoopRuntimeSession,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { resetCampaignStore } from '@/stores/campaign/useCampaignStore';
import { createCampaign } from '@/types/campaign/Campaign';
import { createHostCoopSession } from '@/types/campaign/CoopSession';

import { CampaignCoopRouteSurfaceConnected } from '../CampaignCoopRouteSurfaceConnected';
import { CampaignSyncStateBanner } from '../CampaignSyncStateBanner';
import { HostGmReviewSurface } from '../HostGmReviewSurface';

// =============================================================================
// The campaign banner's shared locator
// =============================================================================

const CAMPAIGN_STATES = [
  'pending',
  'finalized',
  'syncing',
  'reconnecting',
  'behind',
  'blocked',
  'rewound',
  'rebuilding',
  'live',
] as const;

describe('campaign lifecycle locator', () => {
  it.each(CAMPAIGN_STATES)(
    'exposes %s under the shared data-state locator',
    (state) => {
      // The umbrella asks for ONE state vocabulary across campaign,
      // combat, and GM. `data-sync-state` stays for the surfaces already
      // reading it; `data-state` is the shared name.
      render(
        <CampaignSyncStateBanner
          posture={
            {
              state: 'live',
              lifecycleState: state,
              message: `Campaign lifecycle posture: ${state}.`,
              commandsEnabled: state === 'live',
            } as never
          }
        />,
      );

      expect(screen.getByTestId('campaign-sync-state')).toHaveAttribute(
        'data-state',
        state,
      );
    },
  );
});

// =============================================================================
// The GM surface's posture and gate
// =============================================================================
