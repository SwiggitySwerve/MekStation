import { act, renderHook } from '@testing-library/react';

import type { ICampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICoopSession } from '@/types/campaign/CoopSession';

import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import {
  clearCoopCampaignToken,
  storeCoopCampaignToken,
} from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { useCampaignViewerIdentity } from '@/lib/campaign/hooks/useCampaignViewerIdentity';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { createCampaign } from '@/types/campaign/Campaign';
import {
  createGuestCoopSession,
  createHostCoopSession,
} from '@/types/campaign/CoopSession';

const MATCH_ID = 'match-viewer-identity';
const LIVE_PLAYER_ID = 'participant-live-1';
const TOKEN_PLAYER_ID = 'participant-token-1';

function stubTransport(
  playerId: string,
  matchId = MATCH_ID,
): ICampaignSyncTransport {
  return {
    matchId,
    playerId,
    role: 'guest',
    sendProposal: jest.fn(),
    sendDecision: jest.fn(),
    sendHostIntent: jest.fn(),
    sendParticipation: jest.fn(),
    onFrame: jest.fn(() => () => undefined),
    onError: jest.fn(() => () => undefined),
    close: jest.fn(),
    lastSeq: jest.fn(() => -1),
  };
}

function loadCampaign(coopSession?: ICoopSession): ICampaign {
  const campaign: ICampaign = {
    ...createCampaign('Viewer Identity Co.', 'mercenary'),
    ...(coopSession ? { coopSession } : {}),
  };
  act(() => {
    useCampaignStore().setState({ campaign });
  });
  return campaign;
}

function resetWorld(): void {
  clearCoopCampaignToken(MATCH_ID);
  _resetCampaignSyncTransportsForTest();
  resetCampaignStore();
  clientSafeStorage.removeItem('campaign-store');
}

describe('useCampaignViewerIdentity', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('returns none for a solo campaign with no coopSession', () => {
    loadCampaign();
    const { result } = renderHook(() => useCampaignViewerIdentity());
    expect(result.current).toEqual({ kind: 'none' });
  });

  it('returns the live transport playerId when a coop session has an active transport', () => {
    loadCampaign(createHostCoopSession('ROOM1', MATCH_ID));
    registerCampaignSyncTransport(stubTransport(LIVE_PLAYER_ID));
    const { result } = renderHook(() => useCampaignViewerIdentity());
    expect(result.current).toEqual({
      kind: 'pair',
      sessionId: MATCH_ID,
      participantId: LIVE_PLAYER_ID,
    });
    expect(
      result.current.kind === 'pair' && result.current.participantId,
    ).not.toBe('host');
  });

  it('returns the stored token playerId when a coop session has a token and no live transport', () => {
    loadCampaign(createGuestCoopSession(MATCH_ID, 'ROOM1'));
    storeCoopCampaignToken({
      matchId: MATCH_ID,
      playerId: TOKEN_PLAYER_ID,
      wireToken: 'wire-token',
      displayName: 'Guest',
    });
    const { result } = renderHook(() => useCampaignViewerIdentity());
    expect(result.current).toEqual({
      kind: 'pair',
      sessionId: MATCH_ID,
      participantId: TOKEN_PLAYER_ID,
    });
    expect(
      result.current.kind === 'pair' && result.current.participantId,
    ).not.toBe('guest');
  });

  it('returns needs-identity when a coop session has neither transport nor token', () => {
    loadCampaign(createHostCoopSession('ROOM1', MATCH_ID));
    const { result } = renderHook(() => useCampaignViewerIdentity());
    expect(result.current).toEqual({
      kind: 'needs-identity',
      sessionId: MATCH_ID,
    });
  });

  /**
   * Role trap: mode host/guest is a chair label. Without a transport or
   * token there is no participant, and inventing `host`/`guest` from
   * getCoopLocalPlayerId would mint a pair that the membership row
   * will not recognize.
   */
  it('never uses the host role label as a participantId', () => {
    loadCampaign(createHostCoopSession('ROOM1', MATCH_ID));
    const { result } = renderHook(() => useCampaignViewerIdentity());
    expect(result.current.kind).toBe('needs-identity');
    expect(result.current).not.toEqual(
      expect.objectContaining({ participantId: 'host' }),
    );
  });

  it('never uses the guest role label as a participantId', () => {
    loadCampaign(createGuestCoopSession(MATCH_ID, 'ROOM1'));
    const { result } = renderHook(() => useCampaignViewerIdentity());
    expect(result.current.kind).toBe('needs-identity');
    expect(result.current).not.toEqual(
      expect.objectContaining({ participantId: 'guest' }),
    );
  });
});
