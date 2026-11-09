import { EventEmitter } from 'node:events';

import {
  captureAuthToken,
  captureMatchCreation,
  type IMatchResponse,
} from '../../e2e/helpers/gmTwoPlayerMatchFlow.responses';

const token = { token: 'wire-token', playerId: 'host' };
const match = { matchId: 'match-1', roomCode: 'ABC123' };

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return {
    promise,
    resolve: (value: T) => resolve(value),
    reject: (error: Error) => reject(error),
  };
}

function responsePage() {
  const events = new EventEmitter();
  let navigated = false;
  const expired = new Error(
    'Network.getResponseBody: No resource with given identifier found',
  );
  const response = (
    path: string,
    body: unknown,
    status = 200,
    method = 'POST',
    failure?: Error,
  ) => ({
    url: () => `http://localhost${path}`,
    status: () => status,
    request: () => ({ method: () => method }),
    json: jest.fn(async () => {
      if (failure) throw failure;
      if (navigated) throw expired;
      return body;
    }),
  });
  const page = events;
  return {
    page,
    response,
    token: () => response('/api/multiplayer/auth/token', token),
    match: (body: unknown = match) =>
      response('/api/multiplayer/matches', body, 201),
    receive: (value: IMatchResponse) => events.emit('response', value),
    navigate: () => {
      navigated = true;
    },
    expectDisposed() {
      expect(events.listenerCount('response')).toBe(0);
      expect(events.listenerCount('close')).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    },
  };
}

const outcome = <T>(promise: Promise<T>) =>
  promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('match response body lifetime', () => {
  it('captures a token before navigation invalidates its response body', async () => {
    const fixture = responsePage();
    const response = fixture.token();
    const result = captureAuthToken(fixture.page, async () => {
      fixture.receive(response);
      await Promise.resolve();
      fixture.navigate();
      return 'lobby ready';
    });
    await expect(result).resolves.toEqual({ token, result: 'lobby ready' });
    expect(response.json).toHaveBeenCalledTimes(1);
    fixture.expectDisposed();
  });

  it('starts a slow body read before navigation and keeps its captured result', async () => {
    const fixture = responsePage();
    const body = deferred<unknown>();
    const response = fixture.token();
    response.json.mockImplementationOnce(() => body.promise);
    const result = captureAuthToken(fixture.page, async () => {
      fixture.receive(response);
      expect(response.json).toHaveBeenCalledTimes(1);
      fixture.navigate();
      body.resolve(token);
    });
    await expect(result).resolves.toEqual({ token, result: undefined });
    fixture.expectDisposed();
  });

  it('preserves a synchronous action throw and cancels a body read that loses to it', async () => {
    const fixture = responsePage();
    const failure = new Error('click threw before returning');
    const body = deferred<unknown>();
    const response = fixture.token();
    response.json.mockImplementationOnce(() => body.promise);
    const result = captureAuthToken(fixture.page, () => {
      fixture.receive(response);
      throw failure;
    });
    await expect(result).rejects.toBe(failure);
    fixture.expectDisposed();
    body.reject(new Error('late body failure'));
    await jest.advanceTimersByTimeAsync(0);
    fixture.expectDisposed();
  });

  it.each(['token-first', 'match-first'])(
    'captures both creation bodies before navigation (%s)',
    async (order) => {
      const fixture = responsePage();
      const responses = [
        fixture.token(),
        fixture.match({
          matchId: match.matchId,
          meta: { roomCode: match.roomCode },
        }),
      ];
      if (order === 'match-first') responses.reverse();
      const result = captureMatchCreation(fixture.page, async () => {
        for (const response of responses) fixture.receive(response);
        await Promise.resolve();
        fixture.navigate();
      });
      await expect(result).resolves.toEqual({ hostToken: token, match });
      for (const response of responses)
        expect(response.json).toHaveBeenCalledTimes(1);
      fixture.expectDisposed();
    },
  );

  it('ignores unrelated responses and captures only the first matching token', async () => {
    const fixture = responsePage();
    const ignored = [
      fixture.response('/api/elsewhere', token),
      fixture.response('/api/multiplayer/auth/token', token, 200, 'GET'),
      fixture.response(
        '/api/multiplayer/auth/token',
        { message: 'denied' },
        401,
      ),
    ];
    const duplicate = fixture.token();
    await expect(
      captureAuthToken(fixture.page, async () => {
        for (const response of ignored) fixture.receive(response);
        fixture.receive(fixture.token());
        fixture.receive(duplicate);
      }),
    ).resolves.toEqual({ token, result: undefined });
    for (const response of [...ignored, duplicate])
      expect(response.json).not.toHaveBeenCalled();
    fixture.expectDisposed();
  });

  it.each(['auth', 'creation'])(
    'preserves action failure and disposes losing response waits (%s)',
    async (kind) => {
      const fixture = responsePage();
      const failure = new Error('create click failed');
      const action = async () => {
        throw failure;
      };
      const result =
        kind === 'auth'
          ? captureAuthToken(fixture.page, action)
          : captureMatchCreation(fixture.page, action);
      await expect(result).rejects.toBe(failure);
      fixture.expectDisposed();
    },
  );

  it('preserves the JSON error and cancels the sibling creation response wait', async () => {
    const fixture = responsePage();
    const failure = new Error('token JSON decode failed');
    const result = captureMatchCreation(fixture.page, async () => {
      fixture.receive(
        fixture.response(
          '/api/multiplayer/auth/token',
          null,
          200,
          'POST',
          failure,
        ),
      );
    });
    await expect(result).rejects.toBe(failure);
    fixture.expectDisposed();
  });

  it('disposes response waits immediately and drains a losing action without replacing the JSON error', async () => {
    const fixture = responsePage();
    const failure = new Error('token body failed while click was active');
    const action = deferred<void>();
    const result = outcome(
      captureMatchCreation(fixture.page, () => {
        fixture.receive(
          fixture.response(
            '/api/multiplayer/auth/token',
            null,
            200,
            'POST',
            failure,
          ),
        );
        return action.promise;
      }),
    );
    let settled = false;
    void result.then(() => {
      settled = true;
    });
    await jest.advanceTimersByTimeAsync(0);
    fixture.expectDisposed();
    expect(settled).toBe(false);
    action.reject(new Error('later click failure'));
    expect(await result).toEqual({ ok: false, error: failure });
    fixture.expectDisposed();
  });

  it('refuses a match body without a room code and disposes its sibling token wait', async () => {
    const fixture = responsePage();
    const result = captureMatchCreation(fixture.page, async () => {
      fixture.receive(fixture.match({ matchId: 'missing-room', meta: {} }));
    });
    await expect(result).rejects.toThrow('Match response lacked a room code');
    fixture.expectDisposed();
  });

  it('bounds a missing response and disposes all waiters', async () => {
    const fixture = responsePage();
    const result = outcome(captureMatchCreation(fixture.page, async () => {}));
    await jest.advanceTimersByTimeAsync(30_000);
    expect(await result).toMatchObject({ ok: false, error: expect.any(Error) });
    fixture.expectDisposed();
  });

  it('stops watching a closed page instead of keeping response timers alive', async () => {
    const fixture = responsePage();
    const result = outcome(
      captureAuthToken(fixture.page, async () => {
        fixture.page.emit('close');
      }),
    );
    let observed: Awaited<typeof result> | undefined;
    void result.then((value) => {
      observed = value;
    });
    await jest.advanceTimersByTimeAsync(0);
    expect(observed).toEqual({
      ok: false,
      error: new Error('Page closed while waiting for multiplayer auth token'),
    });
    fixture.expectDisposed();
  });
});
