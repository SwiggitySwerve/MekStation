import type { Page, Request, Response } from '@playwright/test';

import { expect as playwrightExpect } from '@playwright/test';
import { EventEmitter } from 'node:events';

import { submitCampaignWizard } from '../../e2e/helpers/campaignFlow';

jest.mock('@playwright/test', () => ({ expect: jest.fn() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  void promise.catch(() => {});
  return { promise, resolve, reject };
}

function submission() {
  const requests = new EventEmitter();
  const pending = new Map<string, () => void>();
  const saved = deferred<Response>();
  const dashboard = deferred<void>();
  const click = deferred<void>();
  const heldProbe = deferred<boolean>();
  const heldText = deferred<string>();
  let visible = false;
  let holdProbe = false;
  let holdText = false;
  let currentUrl = 'http://localhost/gameplay/campaigns/create';
  let serial = 0;
  const track = <T>(
    label: string,
    operation: ReturnType<typeof deferred<T>>,
    timeout?: number,
  ) => {
    const key = `${label}-${++serial}`;
    const timer = timeout
      ? setTimeout(
          () => operation.reject(new Error(`${label} timeout`)),
          timeout,
        )
      : undefined;
    pending.set(key, () => operation.reject(new Error('Page cancelled')));
    const promise = operation.promise.finally(() => {
      if (timer !== undefined) clearTimeout(timer);
      pending.delete(key);
    });
    void promise.catch(() => {});
    return promise;
  };
  const request = {
    method: () => 'PUT',
    url: () => 'http://localhost/api/campaigns/campaign-1',
  } as Request;
  const response = (ok: boolean): Response =>
    ({
      request: () => request,
      ok: () => ok,
      url: request.url,
      status: () => (ok ? 200 : 500),
      text: async () => 'save failed body',
    }) as unknown as Response;
  const errorLocator = {
    isVisible: jest.fn(() => {
      if (holdProbe) {
        holdProbe = false;
        return track('visibility probe', heldProbe);
      }
      const probe = deferred<boolean>();
      probe.resolve(visible);
      return track('visibility probe', probe);
    }),
    // Keep the retrying API in the double so reintroducing it exposes the
    // disappearing-element wait rather than silently passing this regression.
    innerText: jest.fn(() =>
      holdText
        ? track('validation text', heldText)
        : Promise.resolve('invalid campaign name'),
    ),
    allInnerTexts: jest.fn(async () => ['invalid campaign name']),
  };
  const toHaveURL = jest.fn((_url: RegExp, options: { timeout: number }) =>
    track('dashboard', dashboard, options.timeout),
  );
  (playwrightExpect as unknown as jest.Mock).mockReturnValue({ toHaveURL });
  const url = jest.fn(() => currentUrl);
  const page = {
    url,
    on: (event: string, listener: (value: Request) => void) =>
      requests.on(event, listener),
    off: (event: string, listener: (value: Request) => void) =>
      requests.off(event, listener),
    waitForResponse: jest.fn(
      (
        predicate: (value: Response) => boolean,
        options: { timeout: number },
      ) => {
        expect(predicate(response(true))).toBe(true);
        return track('save', saved, options.timeout);
      },
    ),
    getByTestId: (id: string) => {
      if (id === 'name-error') return errorLocator;
      expect(id).toBe('wizard-submit-btn');
      return { click: () => track('click', click) };
    },
  };
  return {
    // The double implements only the public Page methods this helper consumes.
    page: page as unknown as Page,
    pending,
    requests,
    click,
    heldProbe,
    errorLocator,
    url,
    response,
    sendResponse(value: Response) {
      saved.resolve(value);
      requests.emit('response', value);
    },
    navigate(url = 'http://localhost/gameplay/campaigns/campaign-1') {
      currentUrl = url;
      dashboard.resolve(undefined);
    },
    showError() {
      visible = true;
    },
    holdNextProbe() {
      holdProbe = true;
    },
    holdErrorText() {
      holdText = true;
    },
    startSave() {
      requests.emit('request', request);
    },
    succeed() {
      requests.emit('request', request);
      saved.resolve(response(true));
      requests.emit('response', response(true));
      currentUrl = 'http://localhost/gameplay/campaigns/campaign-1';
      dashboard.resolve(undefined);
      click.resolve(undefined);
    },
    cancel() {
      for (const stop of pending.values()) stop();
      heldProbe.reject(new Error('Page cancelled'));
    },
  };
}

type Submission = ReturnType<typeof submission>;
const fixtures: Submission[] = [];
function setup() {
  const fixture = submission();
  fixtures.push(fixture);
  return fixture;
}
const flush = () => jest.advanceTimersByTimeAsync(0);
const outcome = (promise: Promise<void>) =>
  promise.then(
    () => ({ ok: true as const }),
    (error: Error) => ({ ok: false as const, error }),
  );
function expectDrained(fixture: Submission) {
  expect(fixture.pending.size).toBe(0);
  expect(fixture.requests.eventNames()).toEqual([]);
  expect(jest.getTimerCount()).toBe(0);
}

beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) fixture.cancel();
  await flush();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('campaign wizard submission owns every raced wait', () => {
  it('success cancels the losing validation wait before returning', async () => {
    const fixture = setup();
    const result = outcome(submitCampaignWizard(fixture.page));
    await flush();
    fixture.succeed();
    await jest.advanceTimersByTimeAsync(100);
    expect(await result).toEqual({ ok: true });
    expectDrained(fixture);
  });

  it('success drains an in-flight probe before returning and starts no later probe', async () => {
    const fixture = setup();
    fixture.holdNextProbe();
    let settled = false;
    const result = outcome(submitCampaignWizard(fixture.page));
    void result.then(() => {
      settled = true;
    });
    await flush();
    fixture.succeed();
    await flush();
    expect(settled).toBe(false);
    fixture.heldProbe.resolve(false);
    await jest.advanceTimersByTimeAsync(100);
    expect(await result).toEqual({ ok: true });
    expectDrained(fixture);
    const calls = fixture.errorLocator.isVisible.mock.calls.length;
    const navigationCalls = fixture.url.mock.calls.length;
    await jest.advanceTimersByTimeAsync(30_000);
    expect(fixture.errorLocator.isVisible).toHaveBeenCalledTimes(calls);
    expect(fixture.page.url).toHaveBeenCalledTimes(navigationCalls);
    expectDrained(fixture);
  });

  it('click failure cancels save and dashboard waits without replacing the error', async () => {
    const fixture = setup();
    const failure = new Error('submit click failed');
    const result = outcome(submitCampaignWizard(fixture.page));
    let settled = false;
    void result.then(() => {
      settled = true;
    });
    fixture.click.reject(failure);
    await flush();
    expect(settled).toBe(true);
    expect(await result).toEqual({ ok: false, error: failure });
    expectDrained(fixture);
  });

  it('a disappearing validation error cannot delay a click failure', async () => {
    const fixture = setup();
    fixture.showError();
    fixture.holdErrorText();
    fixture.errorLocator.allInnerTexts.mockResolvedValueOnce([]);
    const failure = new Error('submit click failed');
    let settled = false;
    const result = outcome(submitCampaignWizard(fixture.page));
    void result.then(() => {
      settled = true;
    });
    await flush();
    fixture.click.reject(failure);
    await flush();
    expect(settled).toBe(true);
    expect(await result).toEqual({ ok: false, error: failure });
    expectDrained(fixture);
  });

  it('a failed PUT takes precedence over the visible inline error', async () => {
    const fixture = setup();
    const body = deferred<string>();
    const result = outcome(submitCampaignWizard(fixture.page));
    fixture.startSave();
    fixture.showError();
    fixture.sendResponse({
      ...fixture.response(false),
      text: () => body.promise,
    });
    fixture.click.resolve(undefined);
    await jest.advanceTimersByTimeAsync(100);
    expect(fixture.errorLocator.allInnerTexts).not.toHaveBeenCalled();
    body.resolve('save failed body');
    expect(await result).toEqual({
      ok: false,
      error: new Error(
        'Campaign create save failed: PUT http://localhost/api/campaigns/campaign-1 returned 500\nsave failed body',
      ),
    });
    expectDrained(fixture);
  });

  it('preserves a failure reading the failed PUT body', async () => {
    const fixture = setup();
    const failure = new Error('response body unavailable');
    const result = outcome(submitCampaignWizard(fixture.page));
    fixture.startSave();
    fixture.sendResponse({
      ...fixture.response(false),
      text: () => Promise.reject(failure),
    });
    fixture.click.resolve(undefined);
    expect(await result).toEqual({ ok: false, error: failure });
    expectDrained(fixture);
  });

  it('click failure cancels a pending failed-PUT body without leaving later work', async () => {
    const fixture = setup();
    const body = deferred<string>();
    const failure = new Error('submit click failed');
    const result = outcome(submitCampaignWizard(fixture.page));
    fixture.startSave();
    fixture.sendResponse({
      ...fixture.response(false),
      text: () => body.promise,
    });
    fixture.click.reject(failure);
    expect(await result).toEqual({ ok: false, error: failure });
    expectDrained(fixture);
    const probes = fixture.errorLocator.isVisible.mock.calls.length;
    body.reject(new Error('late body failure'));
    await jest.advanceTimersByTimeAsync(30_000);
    expect(fixture.errorLocator.isVisible).toHaveBeenCalledTimes(probes);
    expectDrained(fixture);
  });

  it('inline validation without a PUT cancels the other waits immediately', async () => {
    const fixture = setup();
    const result = outcome(submitCampaignWizard(fixture.page));
    fixture.showError();
    fixture.click.resolve(undefined);
    let settled = false;
    void result.then(() => {
      settled = true;
    });
    await jest.advanceTimersByTimeAsync(100);
    expect(settled).toBe(true);
    expect(await result).toEqual({
      ok: false,
      error: new Error('Campaign create failed: invalid campaign name'),
    });
    expectDrained(fixture);
  });

  it('page cancellation rejects and drains every operation and timer', async () => {
    const fixture = setup();
    fixture.holdNextProbe();
    const result = outcome(submitCampaignWizard(fixture.page));
    await flush();
    fixture.cancel();
    expect(await result).toEqual({
      ok: false,
      error: new Error('Page cancelled'),
    });
    expectDrained(fixture);
  });

  it('the existing 30-second save deadline still fails and drains the race', async () => {
    const fixture = setup();
    const result = outcome(submitCampaignWizard(fixture.page));
    fixture.click.resolve(undefined);
    await jest.advanceTimersByTimeAsync(30_000);
    expect(await result).toEqual({
      ok: false,
      error: new Error('Campaign create save timed out after 30000ms'),
    });
    expectDrained(fixture);
  });

  it('keeps the 30-second dashboard deadline after a successful PUT without navigation', async () => {
    const fixture = setup();
    const result = outcome(submitCampaignWizard(fixture.page));
    fixture.startSave();
    fixture.sendResponse(fixture.response(true));
    fixture.click.resolve(undefined);
    await jest.advanceTimersByTimeAsync(30_000);
    expect(await result).toEqual({
      ok: false,
      error: new Error('Campaign create dashboard timed out after 30000ms'),
    });
    expectDrained(fixture);
  });

  it('a failed PUT returns its diagnostic within budget and leaves the wizard open', async () => {
    const fixture = setup();
    let settled = false;
    const result = outcome(submitCampaignWizard(fixture.page));
    void result.then(() => {
      settled = true;
    });
    fixture.startSave();
    fixture.sendResponse(fixture.response(false));
    fixture.click.resolve(undefined);
    await jest.advanceTimersByTimeAsync(100);
    expect(settled).toBe(true);
    expect(await result).toEqual({
      ok: false,
      error: new Error(
        'Campaign create save failed: PUT http://localhost/api/campaigns/campaign-1 returned 500\nsave failed body',
      ),
    });
    expect(fixture.page.url()).toMatch(/\/campaigns\/create$/);
    expectDrained(fixture);
    const probes = fixture.errorLocator.isVisible.mock.calls.length;
    const urls = fixture.url.mock.calls.length;
    fixture.showError();
    fixture.succeed();
    await jest.advanceTimersByTimeAsync(30_000);
    expect(fixture.errorLocator.isVisible).toHaveBeenCalledTimes(probes);
    expect(fixture.errorLocator.allInnerTexts).not.toHaveBeenCalled();
    expect(fixture.page.url).toHaveBeenCalledTimes(urls);
    expectDrained(fixture);
  });

  it.each(['save', 'navigation'])(
    'requires both save and navigation when %s finishes first',
    async (first) => {
      const fixture = setup();
      let settled = false;
      const result = outcome(submitCampaignWizard(fixture.page));
      void result.then(() => {
        settled = true;
      });
      fixture.click.resolve(undefined);
      fixture.startSave();
      if (first === 'save') fixture.sendResponse(fixture.response(true));
      else fixture.navigate();
      await jest.advanceTimersByTimeAsync(100);
      expect(settled).toBe(false);
      if (first === 'save') fixture.navigate();
      else fixture.sendResponse(fixture.response(true));
      await jest.advanceTimersByTimeAsync(100);
      expect(await result).toEqual({ ok: true });
      expectDrained(fixture);
    },
  );
});
