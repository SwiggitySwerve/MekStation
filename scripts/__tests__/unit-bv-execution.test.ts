import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { deserialize, serialize } from 'node:v8';

import { boundedMap, fingerprint, runCachedFamily } from '../unit-bv-execution';

let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-execution-'));
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

it('bounds workers, preserves input order, and propagates a failed family', async () => {
  let active = 0,
    peak = 0;
  const results = await boundedMap([3, 1, 2, 0], 2, async (value) => {
    peak = Math.max(peak, ++active);
    await new Promise((resolve) => setTimeout(resolve, value));
    active--;
    return value;
  });
  expect(results).toEqual([3, 1, 2, 0]);
  expect(peak).toBe(2);
  await expect(boundedMap([1], 0, async (x) => x)).rejects.toThrow('workers');
  await expect(
    boundedMap([1, 2], 2, async () => {
      throw new Error('family failed');
    }),
  ).rejects.toThrow('family failed');
});

it('hashes bytes and names, invalidates unknown inputs, and fails open on unreadable inputs', () => {
  fs.mkdirSync(path.join(root, 'inputs'));
  const file = path.join(root, 'inputs', 'rule');
  fs.writeFileSync(file, 'one');
  const key = () =>
    fingerprint([path.join(root, 'inputs')], { node: '22', setting: 'a' });
  const before = key();
  expect(before).toMatch(/^[a-f0-9]{64}$/);
  expect(key()).toBe(before);
  fs.writeFileSync(file, 'two');
  expect(key()).not.toBe(before);
  fs.writeFileSync(file, 'one');
  fs.writeFileSync(path.join(root, 'inputs', 'unknown'), 'new dependency');
  expect(key()).not.toBe(before);
  expect(fingerprint([path.join(root, 'missing')], {})).toBeNull();
  expect(fingerprint([path.join(root, 'inputs')], { node: '23' })).not.toBe(
    before,
  );
});

it('returns byte-identical fresh/cached artifacts and retains errors and nonfinite values', async () => {
  let calls = 0;
  const produce = async () => {
    calls++;
    return {
      sources: Buffer.from('error row\r\n'),
      computed: serialize([
        {
          total: NaN,
          offensive: Infinity,
          missing: undefined,
          reason: 'unsupported',
        },
      ]),
    };
  };
  const options = {
    cacheDir: root,
    family: 'vehicles',
    key: 'a'.repeat(64),
    verify: false,
    produce,
  };
  const cold = await runCachedFamily(options);
  const warm = await runCachedFamily(options);
  expect(warm.artifacts).toEqual(cold.artifacts);
  expect(deserialize(warm.artifacts.computed)).toEqual([
    {
      total: NaN,
      offensive: Infinity,
      missing: undefined,
      reason: 'unsupported',
    },
  ]);
  expect(cold.hit).toBe(false);
  expect(warm.hit).toBe(true);
  expect(calls).toBe(1);
  expect((await runCachedFamily({ ...options, key: 'b'.repeat(64) })).hit).toBe(
    false,
  );
  expect((await runCachedFamily({ ...options, key: null })).hit).toBe(false);
});

it('recomputes corrupt, mismatched, and unavailable cache entries', async () => {
  const produce = jest.fn(async () => ({
    sources: Buffer.from('source'),
    computed: Buffer.from('result'),
  }));
  const options = {
    cacheDir: root,
    family: 'vehicles',
    key: 'a'.repeat(64),
    verify: false,
    produce,
  };
  await runCachedFamily(options);
  const entry = path.join(root, fs.readdirSync(root)[0]);
  fs.writeFileSync(entry, 'corrupt');
  expect((await runCachedFamily(options)).hit).toBe(false);
  expect(produce).toHaveBeenCalledTimes(2);
  fs.writeFileSync(
    entry,
    JSON.stringify({ key: 'wrong', sources: '', computed: '' }),
  );
  expect((await runCachedFamily(options)).hit).toBe(false);
  const unavailable = path.join(root, 'file');
  fs.writeFileSync(unavailable, 'not a directory');
  expect(
    (
      await runCachedFamily({ ...options, cacheDir: unavailable })
    ).artifacts.sources.toString(),
  ).toBe('source');
});

it('verify-hits recomputes a hit, rejects unequal results and evicts the stale entry', async () => {
  const options = {
    cacheDir: root,
    family: 'vehicles',
    key: 'a'.repeat(64),
    verify: false,
    produce: async () => ({
      sources: Buffer.from('s'),
      computed: Buffer.from('first'),
    }),
  };
  await runCachedFamily(options);
  await expect(
    runCachedFamily({
      ...options,
      verify: true,
      produce: async () => ({
        sources: Buffer.from('s'),
        computed: Buffer.from('changed'),
      }),
    }),
  ).rejects.toThrow('cache verification');
  expect((await runCachedFamily(options)).hit).toBe(false);
});
