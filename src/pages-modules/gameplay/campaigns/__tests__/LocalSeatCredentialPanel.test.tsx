/**
 * LSC-2 credential chooser, renewal and three-identity proof.
 *
 * LS12-LS20 and LS22 drive the real components over a mocked fetch. LS21 hosts
 * the real token and local-seats routes, a temporary SQLite file, the client
 * sync transport and the authoritative campaign socket binder, so three
 * identities, guest reclaim and the GM's RemoveParticipant run end to end in
 * jsdom (admission manifestGaps G3 and G4).
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createMocks, type RequestMethod } from 'node-mocks-http';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import React from 'react';

import type { ICampaignSyncWebSocket } from '@/lib/campaign/coop/campaignSyncTransport';
import type { CoopCredentialChoice } from '@/lib/campaign/coop/localSeatCredentialStore';
import type { IMintedCoopCredential } from '@/lib/campaign/coop/localSeatCredentialStore';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import {
  _resetCampaignSyncTransportsForTest,
  connectCampaignSyncTransport,
  getActiveCampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import {
  readCoopCampaignToken,
  storeCoopCampaignToken,
} from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import {
  mintCoopCredential,
  readRememberedCoopCredential,
  rememberCoopCredential,
} from '@/lib/campaign/coop/localSeatCredentialStore';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import { CampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import { createCampaignSessionMembershipPort } from '@/lib/multiplayer/server/campaignSessionMembershipPort';
import {
  isRevokedCampaignSessionParticipant,
  listActiveCampaignSessionParticipants,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  IdentityRepository,
  resetIdentityRepository,
} from '@/services/vault/IdentityRepository';
import { createIdentity } from '@/services/vault/IdentityService';
import { resetLocalSeatCredentialService } from '@/services/vault/LocalSeatCredentialService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import {
  createGuestCoopSession,
  createHostCoopSession,
} from '@/types/campaign/CoopSession';
import {
  encodeTokenForWire,
  type IPlayerToken,
} from '@/types/multiplayer/Player';

import {
  CoopCredentialRenewal,
  LocalSeatCredentialPanel,
} from '../LocalSeatCredentialPanel';

const CHOICE_KEY = 'mekstation.coopCredential.choice';
const SEATS_URL = '/api/multiplayer/auth/local-seats';
const TOKEN_URL = '/api/multiplayer/auth/token';
const MATCH = 'match-lsc2';
const OTHER_MATCH = 'match-other';
const PID = {
  gm: 'pid_gamemaster',
  one: 'pid_seatone',
  two: 'pid_seattwo',
  fresh: 'pid_seatfresh',
};
const MINUTE = 60_000;

const fetchMock = jest.fn();
const reloadPage = jest.fn();
const navigatePage = jest.fn();

function reply(status: number, body: unknown = {}, headers = {}) {
  const lookup = headers as Record<string, string>;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => lookup[name] ?? null },
    json: async () => body,
  } as unknown as Response;
}

/** A server-shaped mint body for a live token (issued 1 s ago). */
function liveBody(playerId: string, ttlMs = 50 * MINUTE) {
  const now = Date.now();
  const token: IPlayerToken = {
    playerId,
    issuedAt: new Date(now - 1_000).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    publicKey: 'public-key',
    signature: 'signature',
  };
  return {
    token: encodeTokenForWire(token),
    playerId,
    expiresAt: token.expiresAt,
    displayName: 'Seat',
  };
}

/** Store a joined bearer and its public binding, as a successful join does. */
function seedJoined(
  choice: CoopCredentialChoice,
  playerId: string,
  matchId = MATCH,
  ttlMs = 3 * MINUTE,
) {
  const body = liveBody(playerId, ttlMs);
  storeCoopCampaignToken({
    matchId,
    playerId,
    wireToken: body.token,
    displayName: body.displayName,
  });
  rememberCoopCredential(matchId, choice, playerId);
  return body;
}

function fakeSocket() {
  const socket = {
    readyState: 1,
    closes: 0,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: () => undefined,
    close: () => {
      socket.readyState = 3;
      socket.closes += 1;
      (socket.onclose as ((ev: unknown) => void) | null)?.({});
    },
  };
  return socket as unknown as ICampaignSyncWebSocket & { closes: number };
}

function openTransport(matchId = MATCH, playerId = PID.one) {
  const socket = fakeSocket();
  const transport = connectCampaignSyncTransport({
    matchId,
    role: 'guest',
    playerId,
    wireToken: 'wire-token',
    socketFactory: () => socket,
  });
  return { socket, transport };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const flatText = (node: Element | null) =>
  (node?.textContent ?? '').replace(/\s+/g, ' ').trim();

function mountRenewal(matchId: string | undefined = MATCH) {
  return render(
    <CoopCredentialRenewal
      matchId={matchId}
      reloadPage={reloadPage}
      navigatePage={navigatePage}
    />,
  );
}

const renewalRegion = () =>
  screen.getByRole('region', { name: 'Co-op sign-in renewal and recovery' });

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  fetchMock.mockReset();
  reloadPage.mockReset();
  navigatePage.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  _resetCampaignSyncTransportsForTest();
});

describe('LocalSeatCredentialPanel chooser (LS12-LS15)', () => {
  const seatList = (first: string, second: string) => ({
    seats: [
      ['local-seat-1', first, 'pid_seatone'],
      ['local-seat-2', second, null],
    ].map(([seatId, status, playerId], index) => ({
      seatId,
      status,
      label: status === 'unprovisioned' ? null : `Seat ${index + 1}`,
      playerId,
      generation: status === 'unprovisioned' ? 0 : 1,
      lockedUntil: null,
    })),
  });

  it('LS12 offers primary and both local seats, defaults to primary, stores only the public choice and refreshes with a GET', async () => {
    render(<LocalSeatCredentialPanel />);
    const region = screen.getByRole('region', {
      name: 'Co-op credential choice',
    });
    const chooser = within(region).getByRole('combobox', {
      name: 'This browser profile joins as',
    }) as HTMLSelectElement;
    expect(
      Array.from(chooser.options).map((o) => [o.value, o.textContent]),
    ).toEqual([
      ['primary', 'Primary vault identity'],
      ['seat1', 'Local seat 1'],
      ['seat2', 'Local seat 2'],
    ]);
    expect(chooser).toHaveValue('primary');

    fireEvent.change(chooser, { target: { value: 'seat2' } });
    expect(chooser).toHaveValue('seat2');
    expect(window.localStorage.getItem(CHOICE_KEY)).toBe('seat2');
    expect(window.localStorage.length).toBe(1);
    expect(window.sessionStorage.length).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(
      reply(200, seatList('active', 'unprovisioned')),
    );
    fireEvent.click(
      within(region).getByRole('button', {
        name: 'Show / refresh local seat availability',
      }),
    );
    expect(await within(region).findByRole('alert')).toHaveTextContent(
      'Ask the operator to provision this seat before signing in.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(SEATS_URL, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    });
    expect(
      within(region).getByRole('list', {
        name: 'Public local seat availability',
      }),
    ).toHaveTextContent('local-seat-1');

    fireEvent.change(chooser, { target: { value: 'seat1' } });
    expect(within(region).queryByRole('alert')).toBeNull();

    fetchMock.mockResolvedValueOnce(
      reply(200, seatList('revoked', 'unprovisioned')),
    );
    fireEvent.click(
      within(region).getByRole('button', {
        name: 'Show / refresh local seat availability',
      }),
    );
    expect(await within(region).findByRole('alert')).toHaveTextContent(
      'Ask the operator to provision this seat before signing in.',
    );
    expect(
      fetchMock.mock.calls.every(([, init]) => init.method === 'GET'),
    ).toBe(true);
  });

  it('LS13 shows a sanitized message for storage failures and mints nothing', () => {
    const view = render(<LocalSeatCredentialPanel />);
    const chooser = screen.getByRole('combobox');
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SECRET-STORAGE-DETAIL');
    });
    fireEvent.change(chooser, { target: { value: 'seat1' } });
    expect(flatText(view.container)).toContain(
      'Browser storage is unavailable. Sign-in could not be saved or fully removed; restore storage access and explicitly retry.',
    );
    expect(flatText(view.container)).not.toContain('SECRET-STORAGE-DETAIL');
    expect(chooser).toHaveValue('primary');
    expect(fetchMock).not.toHaveBeenCalled();
    view.unmount();

    jest.restoreAllMocks();
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SECRET-STORAGE-DETAIL');
    });
    const unreadable = render(<LocalSeatCredentialPanel />);
    expect(flatText(unreadable.container)).toContain(
      'Browser storage is unavailable.',
    );
    expect(flatText(unreadable.container)).not.toContain(
      'SECRET-STORAGE-DETAIL',
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('LS13 never uses a bad stored choice; forgetting it returns to primary', () => {
    window.localStorage.setItem(CHOICE_KEY, 'seat9');
    const view = render(<LocalSeatCredentialPanel />);
    expect(flatText(view.container)).toContain(
      'Saved credential choice is invalid. Forget it and choose again.',
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Forget next-join choice' }),
    );
    expect(screen.getByRole('combobox')).toHaveValue('primary');
    expect(screen.getByRole('combobox')).toBeEnabled();
    expect(window.localStorage.getItem(CHOICE_KEY)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('LS14 forgetting the next-join choice resets to primary and removes no match bearer', () => {
    seedJoined('seat1', PID.one);
    window.localStorage.setItem(CHOICE_KEY, 'seat2');
    render(<LocalSeatCredentialPanel />);
    expect(screen.getByRole('combobox')).toHaveValue('seat2');

    fireEvent.click(
      screen.getByRole('button', { name: 'Forget next-join choice' }),
    );
    expect(screen.getByRole('combobox')).toHaveValue('primary');
    expect(window.localStorage.getItem(CHOICE_KEY)).toBeNull();
    expect(readCoopCampaignToken(MATCH)?.playerId).toBe(PID.one);
    expect(readRememberedCoopCredential(MATCH)).toEqual({
      matchId: MATCH,
      choice: 'seat1',
      playerId: PID.one,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('LS15 discloses the trust limits, the readmission and the old bearer lifetime without claiming eviction', () => {
    render(<LocalSeatCredentialPanel />);
    seedJoined('seat1', PID.one);
    mountRenewal();
    const disclosures = [
      flatText(screen.getByRole('region', { name: 'Co-op credential choice' })),
      flatText(renewalRegion()),
    ];
    for (const text of disclosures) {
      expect(text).toContain('grants no campaign role');
      expect(text).toContain(
        'The computer operator can impersonate any local seat',
      );
      expect(text).toContain(
        'Re-provisioning creates a new player identity requiring GM readmission',
      );
      expect(text).toContain(
        'Revocation or re-provisioning stops the next mint or renewal',
      );
      expect(text).toContain(
        'old bearers still work until their original expiry (local seats: at most one hour)',
      );
      expect(text).toContain(
        'Old campaign membership remains until removed by the GM',
      );
      expect(text).not.toMatch(/evict|immediate|retroactive|instantly/i);
    }
  });
});

describe('CoopCredentialRenewal window and recovery (LS16)', () => {
  it('LS16 renders nothing without a binding or outside four minutes, prompts inside it, recovers after expiry and never mints by itself', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-24T12:00:00.000Z'));
    const missing = mountRenewal('match-without-binding');
    expect(missing.container).toBeEmptyDOMElement();
    missing.unmount();
    const unbound = render(<CoopCredentialRenewal />);
    expect(unbound.container).toBeEmptyDOMElement();
    unbound.unmount();

    seedJoined('seat1', PID.one, MATCH, 10 * MINUTE);
    const view = mountRenewal();
    expect(view.container).toBeEmptyDOMElement();

    // 4:01 left: still hidden (a five-minute window would show here).
    act(() => {
      jest.advanceTimersByTime(6 * MINUTE - 1_000);
    });
    expect(view.container).toBeEmptyDOMElement();

    // Exactly four minutes left: the prompt appears.
    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    expect(flatText(renewalRegion())).toContain('expires within four minutes');
    expect(
      within(renewalRegion()).getByRole('button', {
        name: /renew and reload/i,
      }),
    ).toBeInTheDocument();

    // Past expiry: recovery wording.
    act(() => {
      jest.advanceTimersByTime(4 * MINUTE + 1_000);
    });
    expect(flatText(renewalRegion())).toContain('sign-in expired');
    expect(
      within(renewalRegion()).getByRole('button', {
        name: /recover and reload/i,
      }),
    ).toBeInTheDocument();

    // Nothing mints or retries without an explicit submit.
    act(() => {
      jest.advanceTimersByTime(60 * MINUTE);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(reloadPage).not.toHaveBeenCalled();
  });
});

describe('CoopCredentialRenewal explicit renewal (LS17-LS20)', () => {
  const password = (choice: CoopCredentialChoice) =>
    screen.getByLabelText(
      `Password for ${
        choice === 'primary'
          ? 'Primary vault identity'
          : choice === 'seat1'
            ? 'Local seat 1'
            : 'Local seat 2'
      }`,
    ) as HTMLInputElement;
  const renewButton = () =>
    screen.getByRole('button', {
      name: /renew and reload|recover and reload/i,
    });

  it.each<[CoopCredentialChoice, string, string, CoopCredentialChoice]>([
    ['primary', TOKEN_URL, PID.gm, 'seat2'],
    ['seat1', SEATS_URL, PID.one, 'seat2'],
    ['seat2', SEATS_URL, PID.two, 'seat1'],
  ])(
    'LS17 %s renewal mints with the joined choice, replaces the bearer, closes the transport and reloads',
    async (joined, url, playerId, nextJoin) => {
      const before = seedJoined(joined, playerId);
      window.localStorage.setItem(CHOICE_KEY, nextJoin);
      const { socket } = openTransport(MATCH, playerId);
      const renewed = liveBody(playerId);
      fetchMock.mockResolvedValueOnce(reply(200, renewed));
      mountRenewal();

      fireEvent.change(password(joined), { target: { value: 'joined-pass' } });
      fireEvent.click(renewButton());
      await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe(url);
      expect(JSON.parse(init.body)).toEqual(
        joined === 'primary'
          ? { password: 'joined-pass' }
          : {
              action: 'mint',
              seatId: joined === 'seat1' ? 'local-seat-1' : 'local-seat-2',
              password: 'joined-pass',
            },
      );
      expect(readCoopCampaignToken(MATCH)?.wireToken).toBe(renewed.token);
      expect(renewed.token).not.toBe(before.token);
      expect(readRememberedCoopCredential(MATCH)).toEqual({
        matchId: MATCH,
        choice: joined,
        playerId,
      });
      expect(window.localStorage.getItem(CHOICE_KEY)).toBe(nextJoin);
      expect(socket.closes).toBe(1);
      expect(getActiveCampaignSyncTransport(MATCH)).toBeNull();
      expect(password(joined).value).toBe('');
    },
  );

  it('LS18 refuses a renewal that returns a different playerId and keeps the bearer and transport', async () => {
    const before = seedJoined('seat1', PID.one);
    const { socket } = openTransport();
    fetchMock.mockResolvedValueOnce(reply(200, liveBody(PID.fresh)));
    mountRenewal();

    fireEvent.change(password('seat1'), { target: { value: 'seat-one-new' } });
    fireEvent.click(renewButton());
    const alert = await screen.findByText(/belongs to a different player/i);

    expect(alert).toHaveTextContent(
      /Forget this sign-in and reclaim through co-op entry; the GM must admit the new identity/,
    );
    expect(flatText(renewalRegion())).toContain(
      'reclaim with its new password',
    );
    expect(readCoopCampaignToken(MATCH)?.wireToken).toBe(before.token);
    expect(readCoopCampaignToken(MATCH)?.playerId).toBe(PID.one);
    expect(readRememberedCoopCredential(MATCH).playerId).toBe(PID.one);
    expect(socket.closes).toBe(0);
    expect(getActiveCampaignSyncTransport(MATCH)).not.toBeNull();
    expect(reloadPage).not.toHaveBeenCalled();
    expect(password('seat1').value).toBe('');
  });

  it('LS19 forget removes this match binding, bearer and choice, closes its transport, navigates to co-op entry and revokes nothing', () => {
    seedJoined('seat1', PID.one);
    seedJoined('seat2', PID.two, OTHER_MATCH);
    window.localStorage.setItem(CHOICE_KEY, 'seat2');
    const { socket } = openTransport();
    mountRenewal();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Forget choice and match sign-in; return to co-op entry',
      }),
    );

    expect(readCoopCampaignToken(MATCH)).toBeNull();
    expect(
      window.sessionStorage.getItem(
        `mekstation.coopCredential.joined.${MATCH}`,
      ),
    ).toBeNull();
    expect(window.localStorage.getItem(CHOICE_KEY)).toBeNull();
    expect(readCoopCampaignToken(OTHER_MATCH)?.playerId).toBe(PID.two);
    expect(readRememberedCoopCredential(OTHER_MATCH).choice).toBe('seat2');
    expect(socket.closes).toBe(1);
    expect(getActiveCampaignSyncTransport(MATCH)).toBeNull();
    expect(navigatePage).toHaveBeenCalledTimes(1);
    expect(navigatePage).toHaveBeenCalledWith('/gameplay/campaigns');
    expect(reloadPage).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each<[string, CoopCredentialChoice, number | 'network', string, string]>([
    ['denied seat', 'seat1', 401, '', 'Local seat credentials were refused.'],
    [
      'denied primary',
      'primary',
      401,
      '',
      'Primary vault password was refused.',
    ],
    [
      'throttled',
      'seat1',
      429,
      '9',
      'Local seat requests are throttled. Retry after 9 seconds.',
    ],
    ['server error', 'seat1', 503, '', 'Local seat request failed.'],
    ['network failure', 'seat2', 'network', '', 'Local seat request failed.'],
  ])(
    'LS20 %s shows a distinct sanitized message, sends one request per submit and clears the password first',
    async (_label, choice, outcome, retryAfter, expected) => {
      jest.useFakeTimers();
      seedJoined(choice, choice === 'seat2' ? PID.two : PID.one);
      const pending = deferred<Response>();
      fetchMock.mockReturnValueOnce(pending.promise);
      mountRenewal();

      const input = password(choice);
      fireEvent.change(input, { target: { value: 'typed-secret' } });
      fireEvent.click(renewButton());
      expect(input.value).toBe('');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        if (outcome === 'network') {
          pending.reject(new Error('SECRET-NETWORK-DETAIL'));
        } else {
          pending.resolve(
            reply(
              outcome,
              { error: 'SECRET-SERVER-DETAIL' },
              retryAfter ? { 'Retry-After': retryAfter } : {},
            ),
          );
        }
      });
      await waitFor(() =>
        expect(flatText(renewalRegion())).toContain(expected),
      );
      expect(flatText(renewalRegion())).not.toContain('SECRET-');
      expect(flatText(renewalRegion())).not.toContain('typed-secret');

      await act(async () => {
        jest.advanceTimersByTime(30 * MINUTE);
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(reloadPage).not.toHaveBeenCalled();
      expect(input.value).toBe('');
    },
  );
});

describe('CampaignNavigation mounts renewal and recovery (LS22)', () => {
  const surfaces: Array<
    [string, string, 'dashboard' | 'missions' | 'starmap' | 'personnel']
  > = [
    [
      'dashboard',
      'src/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.tsx',
      'dashboard',
    ],
    ['missions', 'src/pages/gameplay/campaigns/[id]/missions.tsx', 'missions'],
    [
      'launch',
      'src/pages-modules/gameplay/campaigns/missionLaunchPage.surfaces.tsx',
      'missions',
    ],
    ['starmap', 'src/pages/gameplay/campaigns/[id]/starmap.tsx', 'starmap'],
    ['log', 'src/pages/gameplay/campaigns/[id]/log.tsx', 'dashboard'],
    [
      'personnel',
      'src/pages/gameplay/campaigns/[id]/personnel.tsx',
      'personnel',
    ],
  ];

  it.each(surfaces)(
    'LS22 %s surface mounts the renewal for host and guest sessions only',
    (_surface, pageFile, currentPage) => {
      expect(
        readFileSync(path.join(process.cwd(), pageFile), 'utf8'),
      ).toContain(`currentPage="${currentPage}"`);
      seedJoined('seat1', PID.one, MATCH, 3 * MINUTE);

      const host = render(
        <CampaignNavigation
          campaignId="campaign-1"
          currentPage={currentPage}
          coopSession={createHostCoopSession('ABCDEF', MATCH)}
        />,
      );
      expect(renewalRegion()).toBeInTheDocument();
      host.unmount();

      const guest = render(
        <CampaignNavigation
          campaignId="campaign-1"
          currentPage={currentPage}
          coopSession={createGuestCoopSession(MATCH, 'ABCDEF')}
        />,
      );
      expect(renewalRegion()).toBeInTheDocument();
      guest.unmount();

      render(
        <CampaignNavigation
          campaignId="campaign-1"
          currentPage={currentPage}
        />,
      );
      expect(
        screen.queryByRole('region', {
          name: 'Co-op sign-in renewal and recovery',
        }),
      ).toBeNull();
    },
  );
});
// ---------------------------------------------------------------------------
// LS21: three identities on one loopback authority (manifestGaps G3 and G4).
//
// Real hosting, all in jsdom: the token and local-seats route handlers
// (node-mocks-http, loopback Host) over a temporary SQLite file; the client
// sync transport; and the authoritative campaign socket binder with the
// production membership port. Entry points the RED receipt names:
//  - admission: bindCampaignSyncConnection (CampaignJoin) -> membership.bind =
//    createCampaignSessionMembershipPort().bind -> bindCampaignSessionParticipant
//  - ordinary GM removal: ICampaignSyncTransport.sendHostIntent({kind:
//    'RemoveParticipant'}) -> bindCampaignSyncConnection (CampaignHostIntent) ->
//    CampaignMatchHost.applyHostIntent -> ParticipantRemoved -> membership.revoke
//    = revokeCampaignSessionParticipant
//  - reconnect: a new connectCampaignSyncTransport with the re-minted bearer.
// ---------------------------------------------------------------------------
type RouteHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
) => Promise<void>;

const ROUTES: Record<string, () => RouteHandler> = {
  [TOKEN_URL]: () =>
    jest.requireActual('@/pages/api/multiplayer/auth/token').default,
  [SEATS_URL]: () =>
    jest.requireActual('@/pages/api/multiplayer/auth/local-seats').default,
};
const LOOPBACK = {
  host: '127.0.0.1:3600',
  origin: 'http://127.0.0.1:3600',
  'sec-fetch-site': 'same-origin',
  'content-type': 'application/json',
};

async function bridge(url: string, init: RequestInit = {}) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: (init.method ?? 'GET') as RequestMethod,
    url,
    headers: LOOPBACK,
    body: init.body ? JSON.parse(String(init.body)) : undefined,
  });
  await ROUTES[url]()(req, res);
  const raw = (res as unknown as { _getData(): unknown })._getData();
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const headers = res.getHeaders() as Record<string, unknown>;
  return {
    ok: res.statusCode >= 200 && res.statusCode < 300,
    status: res.statusCode,
    json: async () => JSON.parse(text),
    headers: {
      get: (name: string) => (headers[name.toLowerCase()] as string) ?? null,
    },
  };
}

class ServerWire extends EventEmitter {
  readonly sent: IServerMessage[] = [];
  readyState = 1;
  peer: ICampaignSyncWebSocket | null = null;
  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
    queueMicrotask(() => this.peer?.onmessage?.({ data }));
  }
  close(): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.emit('close');
    queueMicrotask(() => this.peer?.onclose?.({}));
  }
  inbound(data: unknown): void {
    this.emit(
      'message',
      typeof data === 'string' ? data : JSON.stringify(data),
    );
  }
}

function duplex() {
  const server = new ServerWire();
  const client: ICampaignSyncWebSocket = {
    readyState: 1,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: (data) => {
      queueMicrotask(() => server.inbound(data));
    },
    close: () => {
      client.readyState = 3;
      client.onclose?.({});
      server.close();
    },
  };
  server.peer = client;
  return { server, client };
}

const OPERATOR = 'primary-vault-pass';
const CAMPAIGN = 'camp-lsc2';
const SESSION = 'match-lsc2-host';
const ROOM = 'ABC234';
const quietLogger = { error: jest.fn(), log: jest.fn(), warn: jest.fn() };
const settle = async () => {
  for (let i = 0; i < 64; i += 1) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 5));
};
const ALL_BUT_DATE = [
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'setImmediate',
  'clearImmediate',
  'nextTick',
  'queueMicrotask',
  'performance',
  'hrtime',
] as const;

describe('LS21 three identities on one authority', () => {
  let dir: string;
  let registry: CampaignHostRegistry;
  const membership = createCampaignSessionMembershipPort();
  const passwords = { seat1: 'seat-one-pass', seat2: 'seat-two-pass' };
  const closers: Array<() => void> = [];

  async function operatorWrite(body: Record<string, unknown>) {
    const response = await bridge(SEATS_URL, {
      method: 'POST',
      body: JSON.stringify({ operatorPassword: OPERATOR, ...body }),
    });
    return { status: response.status, body: await response.json() };
  }

  async function seatGeneration(seatId: string): Promise<number> {
    const listed = await (await bridge(SEATS_URL)).json();
    return listed.seats.find((s: { seatId: string }) => s.seatId === seatId)
      .generation;
  }

  async function connect(
    credential: { wireToken: string; token: { playerId: string } },
    role: 'host' | 'guest',
  ) {
    const { server, client } = duplex();
    await bindCampaignSyncConnection({
      socket: server as never,
      registry,
      matchId: SESSION,
      verifiedPlayerId: credential.token.playerId,
      logger: quietLogger,
      membership,
      replicaStore: null,
    });
    const transport = connectCampaignSyncTransport({
      expectedCampaignId: CAMPAIGN,
      matchId: SESSION,
      role,
      playerId: credential.token.playerId,
      wireToken: credential.wireToken,
      roomCode: role === 'guest' ? ROOM : undefined,
      socketFactory: () => client,
    });
    client.onopen?.({});
    await settle();
    closers.push(() => transport.close());
    return {
      transport,
      server,
      kinds: () => server.sent.map((m) => m.kind),
      errors: () =>
        server.sent
          .filter((m) => m.kind === 'Error')
          .map(
            (m) =>
              `${(m as { code: string }).code}:${(m as { reason?: string }).reason}`,
          ),
    };
  }

  const members = () =>
    listActiveCampaignSessionParticipants(CAMPAIGN, SESSION)
      .map((m) => `${m.participantId}:${m.seat}`)
      .sort();

  async function boot() {
    const first = await operatorWrite({
      action: 'provision',
      seatId: 'local-seat-1',
      password: passwords.seat1,
      label: 'Player one',
      expectedGeneration: 0,
      operationId: 'provision-one',
    });
    const second = await operatorWrite({
      action: 'provision',
      seatId: 'local-seat-2',
      password: passwords.seat2,
      label: 'Player two',
      expectedGeneration: 0,
      operationId: 'provision-two',
    });
    expect([first.status, second.status]).toEqual([200, 200]);
    const gm = await mintCoopCredential('primary', OPERATOR);
    const s1 = await mintCoopCredential('seat1', passwords.seat1);
    const s2 = await mintCoopCredential('seat2', passwords.seat2);
    await registry.register(SESSION, {
      campaignId: CAMPAIGN,
      hostPlayerId: gm.token.playerId,
      roomCode: ROOM,
      arbitrationMode: 'auto-approve',
      state: createEmptyCampaignState(CAMPAIGN),
    });
    return { gm, s1, s2 };
  }

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'ls21-'));
    resetSQLiteService();
    resetIdentityRepository();
    resetLocalSeatCredentialService();
    getSQLiteService({ path: path.join(dir, 'ls21.db') }).initialize();
    await new IdentityRepository().save(await createIdentity('GM', OPERATOR));
    registry = new CampaignHostRegistry();
    global.fetch = jest.fn(bridge) as unknown as typeof fetch;
  });

  afterEach(async () => {
    closers.splice(0).forEach((close) => close());
    registry.dispose(SESSION);
    resetLocalSeatCredentialService();
    resetIdentityRepository();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('LS21a gives two players and a non-playing GM three distinct stable identities that all reach one authority', async () => {
    const { gm, s1, s2 } = await boot();
    const ids = [gm, s1, s2].map((c) => c.token.playerId);
    expect(new Set(ids).size).toBe(3);

    // Stable across a reload: a fresh mint is the same public identity.
    expect((await mintCoopCredential('primary', OPERATOR)).token.playerId).toBe(
      ids[0],
    );
    expect(
      (await mintCoopCredential('seat1', passwords.seat1)).token.playerId,
    ).toBe(ids[1]);
    expect(
      (await mintCoopCredential('seat2', passwords.seat2)).token.playerId,
    ).toBe(ids[2]);

    const cGm = await connect(gm, 'host');
    const c2 = await connect(s2, 'guest');
    const c1 = await connect(s1, 'guest');
    for (const c of [cGm, c1, c2]) {
      expect(c.kinds()).toContain('CampaignSnapshot');
      expect(c.errors()).toEqual([]);
    }
    expect(members()).toEqual(
      [`${ids[0]}:gm`, `${ids[1]}:player`, `${ids[2]}:player`].sort(),
    );

    // Reconnect with a re-minted bearer: same identity, admitted, no new member.
    c1.transport.close();
    await settle();
    const again = await mintCoopCredential('seat1', passwords.seat1);
    expect(again.token.playerId).toBe(ids[1]);
    const c1b = await connect(again, 'guest');
    expect(c1b.kinds()).toContain('CampaignSnapshot');
    expect(c1b.errors()).toEqual([]);
    expect(members()).toHaveLength(3);
  });

  it('LS21b renews and recovers the same seat identity through the real routes', async () => {
    const realNow = Date.now();
    jest.useFakeTimers({ now: realNow, doNotFake: [...ALL_BUT_DATE] });
    const { s1 } = await boot();
    const joined = await connect(s1, 'guest');
    storeCoopCampaignToken({
      matchId: SESSION,
      playerId: s1.token.playerId,
      wireToken: s1.wireToken,
      displayName: s1.displayName,
    });
    rememberCoopCredential(SESSION, 'seat1', s1.token.playerId);

    const view = mountRenewal(SESSION);
    expect(view.container).toBeEmptyDOMElement();

    // 57 minutes later the one-hour bearer is inside the four-minute window.
    jest.setSystemTime(realNow + 57 * MINUTE);
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(flatText(renewalRegion())).toContain('expires within four minutes');
    fireEvent.change(screen.getByLabelText('Password for Local seat 1'), {
      target: { value: passwords.seat1 },
    });
    fireEvent.click(screen.getByRole('button', { name: /renew and reload/i }));
    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));

    const stored = readCoopCampaignToken(SESSION);
    expect(stored?.playerId).toBe(s1.token.playerId);
    expect(stored?.wireToken).not.toBe(s1.wireToken);
    expect(getActiveCampaignSyncTransport(SESSION)).toBeNull();
    expect(joined.server.readyState).toBe(3);
    const rejoined = await connect(
      { wireToken: stored!.wireToken, token: { playerId: stored!.playerId } },
      'guest',
    );
    expect(rejoined.errors()).toEqual([]);
    expect(rejoined.kinds()).toContain('CampaignSnapshot');
    view.unmount();

    // Two hours on, the renewed bearer is expired: explicit recovery, same identity.
    jest.setSystemTime(realNow + 2 * 60 * MINUTE);
    const callsBeforeRecovery = fetchMockCalls();
    const recovery = mountRenewal(SESSION);
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(flatText(renewalRegion())).toContain('sign-in expired');
    expect(fetchMockCalls()).toBe(callsBeforeRecovery);
    fireEvent.change(screen.getByLabelText('Password for Local seat 1'), {
      target: { value: passwords.seat1 },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /recover and reload/i }),
    );
    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(2));
    expect(readCoopCampaignToken(SESSION)?.playerId).toBe(s1.token.playerId);
    expect(readCoopCampaignToken(SESSION)?.wireToken).not.toBe(
      stored!.wireToken,
    );
    recovery.unmount();
  });

  it('LS21c reclaim after re-provision yields a new identity that is refused while the ghost holds a seat, then admitted after the GM removes the ghost', async () => {
    const { gm, s1, s2 } = await boot();
    const cGm = await connect(gm, 'host');
    const c1 = await connect(s1, 'guest');
    await connect(s2, 'guest');
    const ghost = s1.token.playerId;

    // The operator re-provisions the active seat; the guest reclaims with the new password.
    const reprovision = await operatorWrite({
      action: 'provision',
      seatId: 'local-seat-1',
      password: 'seat-one-new',
      label: 'Player one',
      expectedGeneration: await seatGeneration('local-seat-1'),
      operationId: 'reprovision-one',
    });
    expect(reprovision.status).toBe(200);
    const reclaimed = await mintCoopCredential('seat1', 'seat-one-new');
    const fresh = reclaimed.token.playerId;
    expect(fresh).not.toBe(ghost);
    expect(fresh).not.toBe(s2.token.playerId);

    // The old identity stays a member; nothing removed it.
    expect(membership.isActive(CAMPAIGN, SESSION, ghost)).toBe(true);

    // Two player seats are held (ghost and player two): the new identity is refused,
    // by the store result and through the host.
    expect(
      membership.bind({
        campaignId: CAMPAIGN,
        sessionId: SESSION,
        participantId: fresh,
        seat: 'player',
      }),
    ).toEqual({ kind: 'tactical-seats-full', limit: 2 });
    const refused = await connect(reclaimed, 'guest');
    expect(refused.errors()).toEqual([
      'AUTH_REJECTED:campaign-tactical-seats-full',
    ]);
    expect(refused.kinds()).not.toContain('CampaignSnapshot');
    expect(membership.isActive(CAMPAIGN, SESSION, ghost)).toBe(true);
    expect(membership.isActive(CAMPAIGN, SESSION, fresh)).toBe(false);

    // The GM removes the ghost through the existing GM-only RemoveParticipant intent.
    cGm.transport.sendHostIntent({
      kind: 'RemoveParticipant',
      campaignId: CAMPAIGN,
      intentId: 'remove-ghost',
      payload: { participantId: ghost, reason: 'seat re-provisioned' },
    } as never);
    await settle();
    const log = await registry
      .get(SESSION)!
      .host.getEventLog()
      .getCampaignEvents(0);
    expect(log.at(-1)).toMatchObject({
      type: 'ParticipantRemoved',
      payload: { participantId: ghost },
    });
    expect(isRevokedCampaignSessionParticipant(CAMPAIGN, SESSION, ghost)).toBe(
      true,
    );
    // Revoked, not deleted: the row stays as the audit record.
    const row = getSQLiteService()
      .getDatabase()
      .prepare(
        'SELECT revoked_at FROM campaign_session_participant WHERE participant_id = ?',
      )
      .get(ghost) as { revoked_at: string | null } | undefined;
    expect(row?.revoked_at).toEqual(expect.any(String));

    // Now the new identity is admitted; the ghost is not.
    const admitted = await connect(reclaimed, 'guest');
    expect(admitted.errors()).toEqual([]);
    expect(admitted.kinds()).toContain('CampaignSnapshot');
    expect(members()).toEqual(
      [
        `${gm.token.playerId}:gm`,
        `${fresh}:player`,
        `${s2.token.playerId}:player`,
      ].sort(),
    );
    const ghostBack = await connect(s1, 'guest');
    expect(ghostBack.errors()).toContain('AUTH_REJECTED:membership-revoked');
    expect(c1.server.sent.length).toBeGreaterThan(0);
  });
});

function fetchMockCalls(): number {
  return (global.fetch as unknown as jest.Mock).mock.calls.length;
}
