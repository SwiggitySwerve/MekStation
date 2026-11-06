import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { deserialize, serialize } from 'node:v8';

import { calculateSources, sourceHash } from '../vehicle-aero-bv-delta';

it('keeps source hash and sourceText validation ahead of calculation, including failed rows', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-source-'));
  try {
    const text = 'unsupported\r\n';
    fs.mkdirSync(path.join(root, 'battlearmor'));
    fs.writeFileSync(path.join(root, 'battlearmor', 'x.blk'), text);
    const row = {
      path: 'battlearmor/x.blk',
      sha256: sourceHash(Buffer.from(text)),
      unit: null,
      sourceText: text,
    };
    const computed = calculateSources([row], root);
    expect(computed[0].reason).toBeDefined();
    expect(deserialize(serialize(computed))).toEqual(computed);
    expect(() =>
      calculateSources([{ ...row, sha256: 'a'.repeat(64) }], root),
    ).toThrow('Source hash mismatch');
    expect(() =>
      calculateSources([{ ...row, sourceText: 'changed' }], root),
    ).toThrow('Source text hash mismatch');
    expect(() =>
      calculateSources([{ ...row, path: '../outside.blk' }], root),
    ).toThrow('Source escapes pin');
    expect(() =>
      calculateSources([{ ...row, path: 'battlearmor/missing.blk' }], root),
    ).toThrow();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
