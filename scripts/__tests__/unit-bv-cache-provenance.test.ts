import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { deserialize, serialize } from 'node:v8';

import { runCachedFamily, type IFamilyArtifacts } from '../unit-bv-execution';
import {
  validateSourceManifest,
  writeSourceManifest,
} from '../unit-bv-provenance';

let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-cache-receipt-'));
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const file = path.join(root, 'sources.ndjson');
  const sources = Buffer.from('{"path":"vehicles/source.blk"}\n');
  writeSourceManifest(file, sources, ['vehicles'], 'vehicles');
  const artifacts = {
    sources,
    computed: Buffer.from('computed'),
    manifest: fs.readFileSync(file + '.manifest.json'),
  };
  const produce = jest.fn(async () => artifacts);
  const validate = (value: IFamilyArtifacts & { manifest?: Buffer }) => {
    if (!value.manifest) throw new Error('Missing family receipt');
    validateSourceManifest(
      file,
      value.sources,
      'vehicles',
      'python',
      value.manifest,
    );
  };
  return {
    cacheDir: root,
    family: 'vehicles',
    key: 'a'.repeat(64),
    verify: false,
    produce,
    validate,
  };
}

it.each(['missing', 'tampered', 'stale', 'wrong-family', 'wrong-folders'])(
  'recomputes a %s receipt before classifying a hit or verify sample',
  async (kind) => {
    const options = fixture();
    await runCachedFamily(options);
    expect((await runCachedFamily(options)).hit).toBe(true);
    const file = path.join(root, `vehicles-${options.key}.bin`);
    const entry: Record<string, unknown> = deserialize(fs.readFileSync(file));
    if (kind === 'missing') {
      delete entry.manifest;
      delete entry.manifestHash;
    } else if (kind === 'tampered') entry.manifest = Buffer.from('corrupt');
    else {
      if (!Buffer.isBuffer(entry.manifest))
        throw new Error('Receipt was not stored');
      const receipt: {
        scope: string;
        folders: string[];
        converterInputs: Record<string, string>;
      } = JSON.parse(entry.manifest.toString('utf8'));
      if (kind === 'stale')
        receipt.converterInputs['scripts/megameklab-conversion/mtf_parser.py'] =
          '0'.repeat(64);
      else if (kind === 'wrong-family') receipt.scope = 'aerospace';
      else receipt.folders = ['fighters'];
      entry.manifest = Buffer.from(JSON.stringify(receipt));
      entry.manifestHash = createHash('sha256')
        .update(entry.manifest as Buffer)
        .digest('hex');
    }
    fs.writeFileSync(file, serialize(entry));
    const result = await runCachedFamily({ ...options, verify: true });
    expect(result.hit).toBe(false);
    expect(result.verified).toBe(false);
    expect(options.produce).toHaveBeenCalledTimes(2);
  },
);

it('propagates a fresh producer failure after rejecting a cached receipt', async () => {
  const options = fixture();
  await runCachedFamily(options);
  const validate = () => {
    throw new Error('Stale receipt');
  };
  await expect(
    runCachedFamily({
      ...options,
      validate,
      produce: async () => {
        throw new Error('Fresh producer failed');
      },
    }),
  ).rejects.toThrow('Fresh producer failed');
});

it('rejects invalid fresh receipts rather than caching or returning success', async () => {
  const options = fixture();
  await expect(
    runCachedFamily({
      ...options,
      validate: () => {
        throw new Error('Fresh receipt invalid');
      },
    }),
  ).rejects.toThrow('Fresh receipt invalid');
  expect(fs.existsSync(path.join(root, `vehicles-${options.key}.bin`))).toBe(
    false,
  );
});

it('keeps verify-hits byte verification when a receipt remains semantically valid', async () => {
  const options = fixture();
  await runCachedFamily(options);
  await expect(
    runCachedFamily({
      ...options,
      verify: true,
      produce: async () => {
        const artifacts = await options.produce();
        return {
          ...artifacts,
          manifest: Buffer.concat([artifacts.manifest, Buffer.from(' ')]),
        };
      },
    }),
  ).rejects.toThrow('cache verification');
  expect(fs.existsSync(path.join(root, `vehicles-${options.key}.bin`))).toBe(
    false,
  );
});
