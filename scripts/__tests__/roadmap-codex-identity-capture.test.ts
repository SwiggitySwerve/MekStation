/** Native custody regressions only: fixtures do not authenticate a Codex source. */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const library = pathToFileURL(
  path.join(process.cwd(), 'scripts/qc/roadmap-ledger-lib.mjs'),
).href;

function probe(body: string): void {
  // Retain fixtures, including failed attempts, for direct byte inspection.
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'native-capture-'));
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import assert from 'node:assert/strict';
       import { createHash } from 'node:crypto';
       import fs from 'node:fs';
       import path from 'node:path';
       import { nativePath, nativeBytes, nativeText, nativeCheck, LoopScriptError } from ${JSON.stringify(library)};
       const root = process.argv[1];
       const file = path.join(root, 'NativeSource.jsonl');
       const refused = (operation) => assert.throws(operation, (error) =>
         error instanceof LoopScriptError && error.code === 'REVIEW_IDENTITY_INVALID');
       const census = (directory) => fs.readdirSync(directory).map((name) => {
         const entry = path.join(directory, name);
         const stat = fs.lstatSync(entry);
         if (stat.isSymbolicLink()) return { entry, link: fs.readlinkSync(entry) };
         if (stat.isDirectory()) return { entry, children: census(entry) };
         const bytes = fs.readFileSync(entry);
         return { entry, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
       });
       const before = census(root);
       ${body}
       const observable = { marker: 'NATIVE_CUSTODY_PASS', pid: process.pid,
         parentPid: process.ppid, fixture: root, before, after: census(root) };
       fs.writeFileSync(path.join(root, 'capture-observable.json'), JSON.stringify(observable, null, 2));
       console.log(JSON.stringify(observable));`,
      fixture,
    ],
    { encoding: 'utf8', timeout: 30_000 },
  );
  expect({
    status: result.status,
    error: result.error?.message,
    stderr: result.stderr,
  }).toEqual({
    status: 0,
    error: undefined,
    stderr: '',
  });
  const observable = JSON.parse(result.stdout);
  expect(observable.marker).toBe('NATIVE_CUSTODY_PASS');
  expect(observable.before).toEqual([]);
  expect(observable.fixture).toBe(fixture);
  expect(observable.pid).toBeGreaterThan(0);
}

describe('native capture byte and filesystem custody', () => {
  jest.setTimeout(45_000);

  test('preserves LF, CRLF, Unicode, BOM and binary bytes without rewriting files', () => {
    probe(`
      for (const [index, bytes] of [
        Buffer.from('{"text":"雪😀"}\\n'),
        Buffer.from('{"text":"雪😀"}\\r\\n'),
        Buffer.from([0xef, 0xbb, 0xbf, 0x61, 0x0a]),
        Buffer.from([0, 0xff, 0xc3, 0x28, 13, 10]),
      ].entries()) {
        const selectedFile = file + '-' + index;
        fs.writeFileSync(selectedFile, bytes);
        const before = fs.statSync(selectedFile, { bigint: true });
        const captured = nativeBytes(selectedFile);
        assert(Buffer.isBuffer(captured));
        assert.deepEqual(captured, bytes);
        assert.deepEqual(fs.readFileSync(selectedFile), bytes);
        const after = fs.statSync(selectedFile, { bigint: true });
        assert.equal(after.mtimeNs, before.mtimeNs);
        assert.equal(after.ino, before.ino);
        captured.fill(42);
        assert.deepEqual(fs.readFileSync(selectedFile), bytes);
      }
      assert.equal(nativeText(Buffer.from('雪😀\\r\\n')), '雪😀\\r\\n');
      assert.equal(nativeText(Buffer.from([0xef, 0xbb, 0xbf, 0x61])), '\\ufeffa');
    `);
  });

  test('strict UTF-8 refuses malformed bytes instead of replacement decoding', () => {
    probe(`
      for (const bytes of [[0xc3, 0x28], [0xe9, 0x9b], [0x80], [0xc0, 0xaf]]) {
        assert.throws(() => nativeText(Buffer.from(bytes)), TypeError);
      }
      assert.equal(nativeText(Buffer.alloc(0)), '');
      assert.equal(nativeText(Buffer.from('a\\0b')), 'a\\0b');
    `);
  });

  test('reads exact prefixes and empty files, and refuses unsafe or oversized bounds', () => {
    probe(`
      const bytes = Buffer.from('{"a":"雪"}\\r\\n{"b":2}\\n');
      fs.writeFileSync(file, bytes);
      const length = bytes.indexOf(10) + 1;
      assert.deepEqual(nativeBytes(file, length), bytes.subarray(0, length));
      assert.deepEqual(nativeBytes(file, 0), Buffer.alloc(0));
      for (const length of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, bytes.length + 1]) {
        refused(() => nativeBytes(file, length));
        assert.deepEqual(fs.readFileSync(file), bytes);
      }
      fs.writeFileSync(file, Buffer.alloc(0));
      assert.deepEqual(nativeBytes(file), Buffer.alloc(0));
    `);
  });

  test('accepts explicit regular-file and directory selectors with bigint identities', () => {
    probe(`
      fs.writeFileSync(file, 'original');
      const selected = nativePath(file);
      assert.equal(selected.absolute, file);
      assert.equal(typeof selected.stat.ino, 'bigint');
      assert.equal(selected.stat.isFile(), true);
      assert.equal(nativePath(root, true).stat.isDirectory(), true);
      refused(() => nativePath(root));
      refused(() => nativePath(file, true));
      assert.equal(fs.readFileSync(file, 'utf8'), 'original');
    `);
  });

  test('refuses relative, traversal and exact-case aliases without modifying the source', () => {
    probe(`
      fs.writeFileSync(file, 'original');
      refused(() => nativePath('NativeSource.jsonl'));
      refused(() => nativePath(root + path.sep + '.' + path.sep + 'NativeSource.jsonl'));
      refused(() => nativePath(root + path.sep + '..' + path.sep + path.basename(root) + path.sep + 'NativeSource.jsonl'));
      refused(() => nativePath(path.join(root, 'nativesource.jsonl')));
      if (process.platform === 'win32') {
        const slash = String.fromCharCode(92);
        const unc = slash.repeat(2) + ['server', 'share', 'file'].join(slash);
        assert.equal(path.isAbsolute(unc), true);
        for (const selector of ['C:NativeSource.jsonl', unc, file + '.', file + ' ']) {
          refused(() => nativePath(selector));
        }
      }
      assert.equal(fs.readFileSync(file, 'utf8'), 'original');
    `);
  });

  test('refuses an actual Junction or symlink directory even when its target stays inside the fixture', () => {
    probe(`
      const target = path.join(root, 'Target');
      const link = path.join(root, 'Linked');
      fs.mkdirSync(target);
      fs.writeFileSync(path.join(target, 'Source.jsonl'), 'original');
      fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
      assert.equal(fs.lstatSync(link).isSymbolicLink(), true);
      refused(() => nativePath(link, true));
      refused(() => nativeBytes(path.join(link, 'Source.jsonl')));
      assert.equal(fs.readFileSync(path.join(target, 'Source.jsonl'), 'utf8'), 'original');
    `);
  });

  test('permits ordinary hardlinks without claiming unique source provenance', () => {
    probe(`
      fs.writeFileSync(file, 'original');
      const alias = path.join(root, 'Hardlink.jsonl');
      fs.linkSync(file, alias);
      assert.deepEqual(nativeBytes(alias), Buffer.from('original'));
      assert.deepEqual(nativeBytes(file), Buffer.from('original'));
    `);
  });

  test('allows unrelated append beyond the frozen prefix while the read is in progress', () => {
    probe(`
      const prefix = Buffer.from('{"first":"雪"}\\n');
      const suffix = Buffer.from('{"later":true}\\nunfinished');
      fs.writeFileSync(file, prefix);
      const read = fs.readSync;
      let appended = false;
      fs.readSync = (...args) => {
        const count = read(...args);
        if (!appended) { appended = true; fs.appendFileSync(file, suffix); }
        return count;
      };
      assert.deepEqual(nativeBytes(file, prefix.length), prefix);
      assert.equal(appended, true);
      assert.deepEqual(fs.readFileSync(file), Buffer.concat([prefix, suffix]));
    `);
  });

  test('refuses append to a full frozen artifact and retains the actual changed bytes', () => {
    probe(`
      fs.writeFileSync(file, 'original');
      const read = fs.readSync;
      let appended = false;
      fs.readSync = (...args) => {
        const count = read(...args);
        if (!appended) { appended = true; fs.appendFileSync(file, 'later'); }
        return count;
      };
      refused(() => nativeBytes(file));
      assert.equal(appended, true);
      assert.equal(fs.readFileSync(file, 'utf8'), 'originallater');
    `);
  });

  test('refuses an in-prefix same-length rewrite between reads', () => {
    probe(`
      fs.writeFileSync(file, 'original\\n');
      const read = fs.readSync;
      let rewritten = false;
      fs.readSync = (...args) => {
        const count = read(...args);
        if (!rewritten) { rewritten = true; fs.writeFileSync(file, 'modified\\n'); }
        return count;
      };
      refused(() => nativeBytes(file, Buffer.byteLength('original\\n')));
      assert.equal(rewritten, true);
      assert.equal(fs.readFileSync(file, 'utf8'), 'modified\\n');
    `);
  });

  test('refuses truncation during capture and closes the read descriptor', () => {
    probe(`
      fs.writeFileSync(file, 'original\\n');
      const read = fs.readSync;
      const close = fs.closeSync;
      let truncated = false;
      let capturedDescriptor;
      const closed = [];
      fs.closeSync = (...args) => { closed.push(args[0]); return close(...args); };
      fs.readSync = (...args) => {
        capturedDescriptor = args[0];
        const count = read(...args);
        if (!truncated) { truncated = true; fs.truncateSync(file, 0); }
        return count;
      };
      refused(() => nativeBytes(file, Buffer.byteLength('original\\n')));
      assert.equal(truncated, true);
      assert(closed.includes(capturedDescriptor));
      assert.equal(fs.statSync(file).size, 0);
    `);
  });

  test('refuses pathname replacement after opening even when replacement bytes match', () => {
    probe(`
      fs.writeFileSync(file, 'original');
      const open = fs.openSync;
      const displaced = path.join(root, 'Displaced.jsonl');
      let replaced = false;
      fs.openSync = (...args) => {
        const descriptor = open(...args);
        if (args[0] === file && args[1] === 'r' && !replaced) {
          replaced = true;
          fs.renameSync(file, displaced);
          fs.writeFileSync(file, 'original');
        }
        return descriptor;
      };
      refused(() => nativeBytes(file));
      assert.equal(replaced, true);
      assert.equal(fs.readFileSync(file, 'utf8'), 'original');
      assert.equal(fs.readFileSync(displaced, 'utf8'), 'original');
    `);
  });

  test('nativeCheck reports the public refusal code and supplied reason', () => {
    probe(`
      nativeCheck(true, 'accepted');
      assert.throws(() => nativeCheck(false, 'observed mismatch'), (error) =>
        error instanceof LoopScriptError && error.code === 'REVIEW_IDENTITY_INVALID' &&
        error.message === 'observed mismatch');
    `);
  });
});
