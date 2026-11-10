import { readFileSync } from 'node:fs';

import { isJsonRecord } from '../../e2e/helpers/browserWriteComparison';
import {
  classifyUnloadDelivery,
  type CampaignPollTrace,
  type ContextCampaignWrite,
} from '../../e2e/helpers/unloadDelivery';
import {
  assessFlushAcceptance,
  readCampaignRecord,
  type CampaignRecord,
  type CapturedCampaignPut,
} from '../../e2e/helpers/unloadFlushEvidence';
import { startCampaignPoll } from '../../e2e/helpers/unloadObservation';

const before: CampaignRecord = {
  version: 1,
  savedAt: 'before',
  body: { currentDate: 'day-1' },
};
function put(base: number, keepalive = false): CapturedCampaignPut {
  return {
    url: 'http://localhost/api/campaigns/test',
    keepalive,
    documentTimeMs: 10,
    postData: JSON.stringify({
      baseVersion: base,
      envelope: {
        savedAt: `save-${base}`,
        body: { currentDate: 'day-2', nested: { value: base } },
      },
    }),
  };
}
function record(base: number): CampaignRecord {
  return {
    version: base + 1,
    savedAt: `save-${base}`,
    body: { currentDate: 'day-2', nested: { value: base } },
  };
}
function context(puts: CapturedCampaignPut[]): ContextCampaignWrite[] {
  return puts.map((p) => ({
    url: p.url,
    postData: p.postData,
    method: 'PUT',
    elapsedMs: 10,
    serviceWorker: null,
    resourceType: 'fetch',
    status: null,
    failure: null,
    finishedMs: null,
  }));
}
function poll(records: CampaignRecord[]): CampaignPollTrace {
  return {
    startedEpochMs: 0,
    versions: records.map((r, i) => ({ elapsedMs: i * 75, record: r })),
    samples: records.map((r, i) => ({
      startedMs: i * 75,
      elapsedMs: i * 75 + 1,
      version: r.version,
    })),
    errors: [],
    stoppedMs: records.length * 75,
  };
}
function input() {
  const puts = [put(1, true), put(2)];
  return {
    puts,
    before,
    after: record(2),
    valuesPresent: true,
    poll: poll([before, record(1), record(2)]),
    contextWrites: context(puts),
    captureAvailable: true,
  };
}

test('directly observes b+1 even after replacement document overwrites it', () => {
  expect(classifyUnloadDelivery(input())).toMatchObject({
    class: 'delivered-observed',
    eligible: true,
    firstObservedMs: 75,
    pollMissedVersions: [],
  });
});
test('infers an unbroken chain when the poll skips its intermediate version', () => {
  const trial = input();
  trial.poll = poll([before, record(2)]);
  expect(classifyUnloadDelivery(trial)).toMatchObject({
    class: 'delivered-by-chain',
    eligible: true,
    firstObservedMs: null,
    pollMissedVersions: [2],
  });
});
test('historical chain without poll/context is classified but never eligible', () => {
  const { poll: _poll, contextWrites: _writes, ...trial } = input();
  expect(classifyUnloadDelivery(trial)).toMatchObject({
    class: 'delivered-by-chain',
    eligible: false,
  });
});
test('stale row is undelivered', () => {
  expect(
    classifyUnloadDelivery({ ...input(), after: before, valuesPresent: false }),
  ).toMatchObject({ class: 'undelivered' });
});
test('values missing after later writes remain undelivered despite transient observation', () => {
  expect(
    classifyUnloadDelivery({ ...input(), valuesPresent: false }),
  ).toMatchObject({ class: 'undelivered' });
});
test.each([
  'gap',
  'duplicate',
  'several-flushes',
  'missing-flush',
  'wrong-final-version',
  'wrong-final-body',
  'wrong-final-savedAt',
  'uncaptured-poll-version',
  'wrong-poll-body',
  'wrong-poll-savedAt',
  'poll-regression',
  'poll-error',
  'empty-poll',
  'missing-context',
  'extra-frame-put',
  'sw-put',
  'beacon',
  'unavailable-capture',
  'malformed-put',
  'missing-envelope-fields',
])('fails closed for %s', (fault) => {
  const trial = input();
  switch (fault) {
    case 'gap':
      trial.puts[1] = put(3);
      break;
    case 'duplicate':
      trial.puts[1] = put(1);
      break;
    case 'several-flushes':
      trial.puts[1].keepalive = true;
      break;
    case 'missing-flush':
      trial.puts[0].keepalive = false;
      break;
    case 'wrong-final-version':
      trial.after.version = 4;
      break;
    case 'wrong-final-body':
      trial.after.body.nested = { value: 9 };
      break;
    case 'wrong-final-savedAt':
      trial.after.savedAt = 'different';
      break;
    case 'uncaptured-poll-version':
      trial.poll = poll([before, record(3), record(2)]);
      break;
    case 'wrong-poll-body':
      trial.poll.versions[1].record.body.nested = { value: 9 };
      break;
    case 'wrong-poll-savedAt':
      trial.poll.versions[1].record.savedAt = 'other';
      break;
    case 'poll-regression':
      trial.poll = poll([record(2), record(1)]);
      break;
    case 'poll-error':
      trial.poll.errors.push({ elapsedMs: 100, message: 'timeout' });
      break;
    case 'empty-poll':
      trial.poll = poll([]);
      break;
    case 'missing-context':
      trial.contextWrites.pop();
      break;
    case 'extra-frame-put':
      trial.contextWrites.push(context([put(2)])[0]);
      break;
    case 'sw-put':
      trial.contextWrites.push({
        ...context([put(2)])[0],
        serviceWorker: 'http://localhost/service-worker.js',
      });
      break;
    case 'beacon':
      trial.contextWrites.push({
        ...context([put(2)])[0],
        method: 'POST',
        resourceType: 'ping',
      });
      break;
    case 'unavailable-capture':
      trial.captureAvailable = false;
      break;
    case 'missing-envelope-fields':
      trial.puts[0].postData = JSON.stringify({ baseVersion: 1, envelope: {} });
      trial.contextWrites = context(trial.puts);
      trial.poll = poll([before, record(2)]);
      break;
    case 'malformed-put':
      trial.puts[1].postData = 'not json';
      break;
  }
  expect(classifyUnloadDelivery(trial).class).toBe('unattributable');
});
test('one delivered flush needs no later PUT', () => {
  const puts = [put(1, true)];
  expect(
    classifyUnloadDelivery({
      ...input(),
      puts,
      after: record(1),
      poll: poll([before, record(1)]),
      contextWrites: context(puts),
    }).class,
  ).toBe('delivered-observed');
});

// Optional fixture-free audit: read C4's external report, never copy it into git.
const historyPath = process.env.MEKSTATION_UNLOAD_HISTORY_FILE;
if (historyPath) {
  test('C4 historical control: 83 undelivered, 17 structural chains, zero observed', () => {
    const history: unknown = JSON.parse(readFileSync(historyPath, 'utf8'));
    if (!isJsonRecord(history) || !Array.isArray(history.trials))
      throw new Error('Invalid history');
    const counts: Record<string, number> = {};
    let measured = 0;
    for (const trial of history.trials) {
      if (!isJsonRecord(trial) || trial.measured !== true) continue;
      const app = trial.app;
      if (
        !isJsonRecord(app) ||
        !Array.isArray(app.puts) ||
        typeof app.valuesPresent !== 'boolean'
      )
        throw new Error('Invalid app trial');
      const puts: CapturedCampaignPut[] = app.puts.map((p: unknown) => {
        if (
          !isJsonRecord(p) ||
          typeof p.url !== 'string' ||
          typeof p.keepalive !== 'boolean' ||
          typeof p.documentTimeMs !== 'number' ||
          (p.postData !== null && typeof p.postData !== 'string')
        )
          throw new Error('Invalid captured PUT');
        return {
          url: p.url,
          keepalive: p.keepalive,
          documentTimeMs: p.documentTimeMs,
          postData: p.postData,
        };
      });
      const result = classifyUnloadDelivery({
        puts,
        before: readCampaignRecord(app.before),
        after: readCampaignRecord(app.after),
        valuesPresent: app.valuesPresent,
      });
      expect(result.eligible).toBe(false);
      counts[result.class] = (counts[result.class] ?? 0) + 1;
      measured++;
    }
    expect(measured).toBe(100);
    expect(counts).toEqual({ undelivered: 83, 'delivered-by-chain': 17 });
    process.stdout.write(
      `Historical control classes (all ineligible without poll/context): ${JSON.stringify(counts)}\n`,
    );
  });
}

test('retained strict-final-row diagnostic still rejects later overwrites', () => {
  const trial = input();
  expect(assessFlushAcceptance(trial.puts, before, trial.after).accepted).toBe(
    false,
  );
  expect(
    assessFlushAcceptance([put(1, true)], before, record(1)),
  ).toMatchObject({
    accepted: true,
    bodyMatches: true,
    savedAtMatches: true,
    expectedVersion: 2,
  });
});

test('poll completes its first GET before returning, records later versions and stops', async () => {
  let calls = 0;
  let resolveSecond: () => void = () => {};
  const second = new Promise<void>((resolve) => {
    resolveSecond = resolve;
  });
  const active = await startCampaignPoll(async () => {
    calls++;
    if (calls === 2) resolveSecond();
    return calls === 1 ? before : record(1);
  });
  expect(active.trace.samples).toHaveLength(1);
  await second;
  const trace = await active.stop();
  expect(trace.versions.map(({ record: r }) => r.version)).toEqual([1, 2]);
  expect(trace.errors).toEqual([]);
  expect(trace.stoppedMs).toBeGreaterThan(0);
});

test('poll preserves read failures instead of disguising them as stale rows', async () => {
  const active = await startCampaignPoll(async () => {
    throw new Error('GET failed');
  });
  const trace = await active.stop();
  expect(trace.samples).toEqual([]);
  expect(trace.errors[0].message).toBe('GET failed');
});
