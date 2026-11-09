export interface IMatchToken {
  readonly token: string;
  readonly playerId: string;
}

export interface IMatchHandle {
  readonly matchId: string;
  readonly roomCode: string;
}

/** Only the response surface consumed by the match-flow harness. */
export interface IMatchResponse {
  url(): string;
  status(): number;
  request(): { method(): string };
  json(): Promise<unknown>;
}

export interface IMatchResponsePage {
  on(event: 'response', listener: (response: IMatchResponse) => void): unknown;
  on(event: 'close', listener: () => void): unknown;
  off(event: 'response', listener: (response: IMatchResponse) => void): unknown;
  off(event: 'close', listener: () => void): unknown;
}

const RESPONSE_TIMEOUT_MS = 30_000;

interface IResponseCapture<T> {
  readonly result: Promise<T>;
  dispose(): void;
}

/** Own both the response listener and its deadline, including losing waits. */
function captureResponse<T>(
  page: IMatchResponsePage,
  label: string,
  matches: (response: IMatchResponse) => boolean,
  read: (response: IMatchResponse) => Promise<T>,
): IResponseCapture<T> {
  let cancel = () => {};
  const result = new Promise<T>((resolve, reject) => {
    let settled = false;
    let reading = false;
    const cleanup = () => {
      clearTimeout(timer);
      page.off('response', receive);
      page.off('close', closed);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const succeed = (body: T) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(body);
    };
    const closed = () =>
      fail(new Error(`Page closed while waiting for ${label}`));
    const receive = (response: IMatchResponse) => {
      if (settled || reading) return;
      try {
        if (!matches(response)) return;
        reading = true;
        page.off('response', receive);
        // Start the body read in the response callback. Awaiting navigation
        // first can invalidate Chromium's handle even though headers arrived.
        void read(response).then(succeed, fail);
      } catch (error) {
        fail(error);
      }
    };
    const timer = setTimeout(
      () =>
        fail(
          new Error(
            `Timed out waiting for ${label} after ${RESPONSE_TIMEOUT_MS}ms`,
          ),
        ),
      RESPONSE_TIMEOUT_MS,
    );
    page.on('response', receive);
    page.on('close', closed);
    cancel = () => fail(new Error(`Stopped waiting for ${label}`));
  });
  // A sibling action may still be running when decoding fails. Observe the
  // rejection now; the original result and error still reach Promise.all.
  void result.catch(() => {});
  return { result, dispose: () => cancel() };
}

function isAuthToken(response: IMatchResponse): boolean {
  return (
    response.url().includes('/api/multiplayer/auth/token') &&
    response.request().method() === 'POST' &&
    response.status() === 200
  );
}

function isCreatedMatch(response: IMatchResponse): boolean {
  return (
    response.url().endsWith('/api/multiplayer/matches') &&
    response.request().method() === 'POST' &&
    response.status() === 201
  );
}

async function readToken(response: IMatchResponse): Promise<IMatchToken> {
  return (await response.json()) as IMatchToken;
}

async function readMatch(response: IMatchResponse): Promise<IMatchHandle> {
  const body = (await response.json()) as {
    readonly matchId: string;
    readonly roomCode?: string;
    readonly meta: { readonly roomCode?: string };
  };
  const roomCode = body.roomCode ?? body.meta.roomCode;
  if (!roomCode) throw new Error('Match response lacked a room code');
  return { matchId: body.matchId, roomCode };
}

export async function captureAuthToken<T>(
  page: IMatchResponsePage,
  action: () => Promise<T>,
): Promise<{ readonly token: IMatchToken; readonly result: T }> {
  const response = captureResponse(
    page,
    'multiplayer auth token',
    isAuthToken,
    readToken,
  );
  const actionResult = Promise.resolve().then(action);
  try {
    const [token, result] = await Promise.all([response.result, actionResult]);
    return { token, result };
  } finally {
    response.dispose();
    // Playwright actions have their own deadlines and cannot be aborted here.
    // Drain the started action so it cannot issue later page work after return.
    await Promise.allSettled([actionResult]);
  }
}

export async function captureMatchCreation(
  page: IMatchResponsePage,
  action: () => Promise<unknown>,
): Promise<{ readonly hostToken: IMatchToken; readonly match: IMatchHandle }> {
  const token = captureResponse(
    page,
    'multiplayer auth token',
    isAuthToken,
    readToken,
  );
  const created = captureResponse(
    page,
    'created multiplayer match',
    isCreatedMatch,
    readMatch,
  );
  const actionResult = Promise.resolve().then(action);
  try {
    const [hostToken, match] = await Promise.all([
      token.result,
      created.result,
      actionResult,
    ]);
    return { hostToken, match };
  } finally {
    token.dispose();
    created.dispose();
    await Promise.allSettled([actionResult]);
  }
}
