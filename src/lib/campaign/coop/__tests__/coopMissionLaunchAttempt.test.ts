import type { LaunchCoopMissionResult } from '../launchCoopMission';

import {
  CoopMissionCheckpointConflict,
  readRecordedCoopEncounter,
  runCoopMissionLaunch,
} from '../coopMissionLaunchAttempt';

describe('recorded co-op encounter reuse', () => {
  it('skips placeholders and drafts and returns only a recorded session link', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({ status: 404 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ encounter: { id: 'draft' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          encounter: { id: 'linked', gameSessionId: 'session-1' },
        }),
      });
    expect(
      await readRecordedCoopEncounter(
        ['placeholder', 'draft', 'linked', 'unused'],
        fetchImpl,
      ),
    ).toBe('linked');
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      '/api/encounters/placeholder',
      '/api/encounters/draft',
      '/api/encounters/linked',
    ]);
  });

  it.each([
    { ok: false, status: 503 },
    {
      ok: true,
      json: async () => ({
        encounter: { id: 'foreign', gameSessionId: 'session-1' },
      }),
    },
  ])(
    'refuses an unavailable or mismatched recorded encounter',
    async (response) => {
      await expect(
        readRecordedCoopEncounter(
          ['linked'],
          jest.fn().mockResolvedValue(response),
        ),
      ).rejects.toThrow();
    },
  );
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function fixture() {
  const result = {
    ok: true,
    encounterId: 'encounter-1',
    gameSessionId: 'session-1',
    missionMatchId: 'match-1',
  } as Extract<LaunchCoopMissionResult, { ok: true }>;
  const launch = jest.fn(async (): Promise<LaunchCoopMissionResult> => result);
  return {
    owner: {},
    key: ['campaign', 'session', 'mission'],
    prepare: jest.fn(async () => launch),
    checkpoint: jest.fn(async () => {}),
    navigate: jest.fn(async () => true),
    setIsLaunching: jest.fn(),
    launch,
    result,
  };
}

describe('co-op mission launch attempt', () => {
  it('takes the mission guard synchronously before preparation can yield', async () => {
    const input = fixture();
    const preparation = deferred<typeof input.launch>();
    input.prepare.mockReturnValue(preparation.promise);
    const first = runCoopMissionLaunch(input);
    const duplicate = runCoopMissionLaunch(input);
    expect(input.prepare).toHaveBeenCalledTimes(1);
    expect(await duplicate).toEqual({ kind: 'busy' });
    preparation.resolve(input.launch);
    expect(await first).toEqual({ kind: 'complete' });
    expect(input.launch).toHaveBeenCalledTimes(1);
    expect(input.checkpoint).toHaveBeenCalledTimes(1);
    expect(input.setIsLaunching.mock.calls).toEqual([[true], [false]]);
  });

  it('allows another mission and another store while one mission is busy', async () => {
    const input = fixture();
    const preparation = deferred<typeof input.launch>();
    input.prepare.mockReturnValueOnce(preparation.promise);
    const first = runCoopMissionLaunch(input);
    expect(
      await runCoopMissionLaunch({
        ...input,
        key: ['campaign', 'session', 'other'],
      }),
    ).toEqual({ kind: 'complete' });
    expect(await runCoopMissionLaunch({ ...input, owner: {} })).toEqual({
      kind: 'complete',
    });
    preparation.resolve(input.launch);
    await first;
  });

  it('retries preparation after an early failure and releases the guard', async () => {
    const input = fixture();
    input.prepare.mockRejectedValueOnce(new Error('catalog unavailable'));
    expect(await runCoopMissionLaunch(input)).toMatchObject({
      kind: 'failed',
      error: expect.objectContaining({ message: 'catalog unavailable' }),
    });
    expect(await runCoopMissionLaunch(input)).toEqual({ kind: 'complete' });
    expect(input.prepare).toHaveBeenCalledTimes(2);
  });

  it('keeps the prepared request after an uncertain remote response', async () => {
    const input = fixture();
    input.launch.mockResolvedValueOnce({
      ok: false,
      error: 'response lost',
      retryable: true,
    });
    expect((await runCoopMissionLaunch(input)).kind).toBe('failed');
    expect(await runCoopMissionLaunch(input)).toEqual({ kind: 'complete' });
    expect(input.prepare).toHaveBeenCalledTimes(1);
    expect(input.launch).toHaveBeenCalledTimes(2);
  });

  it('prepares fresh authority after a definitive refusal', async () => {
    const input = fixture();
    input.launch.mockResolvedValueOnce({
      ok: false,
      error: 'stale head',
    });
    await runCoopMissionLaunch(input);
    await runCoopMissionLaunch(input);
    expect(input.prepare).toHaveBeenCalledTimes(2);
  });

  it('retains the successful encounter across checkpoint failure', async () => {
    const input = fixture();
    input.checkpoint.mockRejectedValueOnce(new Error('disk unavailable'));
    await runCoopMissionLaunch(input);
    expect(input.navigate).not.toHaveBeenCalled();
    expect(await runCoopMissionLaunch(input)).toEqual({ kind: 'complete' });
    expect(input.launch).toHaveBeenCalledTimes(1);
    expect(input.checkpoint.mock.calls).toEqual([
      [input.result, false],
      [input.result, false],
    ]);
  });

  it('requires resync on checkpoint conflict without relaunching', async () => {
    const input = fixture();
    input.checkpoint.mockRejectedValueOnce(
      new CoopMissionCheckpointConflict('Resync and retry.'),
    );
    await runCoopMissionLaunch(input);
    await runCoopMissionLaunch(input);
    expect(input.launch).toHaveBeenCalledTimes(1);
    expect(input.checkpoint.mock.calls).toEqual([
      [input.result, false],
      [input.result, true],
    ]);
  });

  it.each(['rejected', 'cancelled'] as const)(
    'retries %s navigation without launch or checkpoint',
    async (mode) => {
      const input = fixture();
      if (mode === 'rejected')
        input.navigate.mockRejectedValueOnce(new Error('navigation failed'));
      else input.navigate.mockResolvedValueOnce(false);
      expect((await runCoopMissionLaunch(input)).kind).toBe('failed');
      expect(await runCoopMissionLaunch(input)).toEqual({ kind: 'complete' });
      expect(input.launch).toHaveBeenCalledTimes(1);
      expect(input.checkpoint).toHaveBeenCalledTimes(1);
    },
  );

  it('does not repeat a completed attempt', async () => {
    const input = fixture();
    await runCoopMissionLaunch(input);
    await runCoopMissionLaunch(input);
    expect(input.launch).toHaveBeenCalledTimes(1);
    expect(input.checkpoint).toHaveBeenCalledTimes(1);
  });
});
