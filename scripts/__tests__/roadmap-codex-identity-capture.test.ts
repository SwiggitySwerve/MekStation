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
         parentPid: process.ppid, scenario: process.argv[2], fixture: root, before, after: census(root) };
       fs.writeFileSync(path.join(root, 'capture-observable.json'), JSON.stringify(observable, null, 2));
       console.log(JSON.stringify(observable));`,
      fixture,
      expect.getState().currentTestName ?? 'unnamed custody test',
    ],
    { encoding: 'utf8', timeout: 30_000 },
  );
  fs.writeFileSync(
    path.join(fixture, 'probe-result.json'),
    JSON.stringify({
      scenario: expect.getState().currentTestName,
      pid: result.pid,
      status: result.status,
      error: result.error?.message,
      stdout: result.stdout,
      stderr: result.stderr,
    }),
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

// Synthetic raw frames exercise protocol laws; they establish no source authority.
const sourceModule = pathToFileURL(
  path.join(process.cwd(), 'scripts/qc/review-identity/source.mjs'),
).href;
const bindingModule = pathToFileURL(
  path.join(process.cwd(), 'scripts/qc/review-identity/native-binding.mjs'),
).href;
const contractModule = pathToFileURL(
  path.join(process.cwd(), 'scripts/qc/review-identity/contract.mjs'),
).href;
const producerModule = pathToFileURL(
  path.join(process.cwd(), 'scripts/qc/roadmap-codex-identity-capture.mjs'),
).href;
const parserFixtures = `
  import { scanNativeRecords, reopenNativeRecords, nativeActor, nativeCompletion, nativeSpawn, nativeParentLink, sourceObservation, decodeReadback, encodeReadbackChunk } from ${JSON.stringify(sourceModule)};
  import { nativeAppObservation } from ${JSON.stringify(bindingModule)};
  import { NATIVE_PRIVATE_ROOTS, checkReadbacks } from ${JSON.stringify(contractModule)};
  import { gzipSync, gunzipSync } from 'node:zlib';
  import { spawnSync as gitSpawn } from 'node:child_process';
  import { sourceReadback, sourceReadbackChunk } from ${JSON.stringify(producerModule)};
  const uuid = (n) => n.toString(16).padStart(8, '0') + '-0000-4000-8000-000000000000';
  const parentId = uuid(1), childId = uuid(2), observerId = uuid(3);
  const parentTurn = uuid(11), childTurn = uuid(12), observerTurn = uuid(13);
  const callId = 'exec-' + uuid(21), pageId = 'exec-' + uuid(22), olderPageId = 'exec-' + uuid(23);
  const spawnId = 'call_fixture123';
  const linkId = 'call_followup456';
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const row = (type, payload) => ({ type, payload });
  const context = (child = false, overrides = {}) => row('turn_context', {
    turn_id: child ? childTurn : parentTurn, model: 'gpt-6.1-sol', effort: 'high',
    ...(child ? { root_turn_id: parentTurn } : {}), ...overrides,
  });
  const metadata = (child = false, overrides = {}) => row('session_meta', {
    id: child ? childId : parentId, model_provider: 'openai', originator: 'codex_work_desktop',
    cli_version: child ? '0.160.0' : '0.159.0-alpha.12.1',
    ...(child ? { multi_agent_version: 'v2', parent_thread_id: parentId, session_id: parentId,
      agent_path: '/root/test_worker', agent_role: 'lazycodex-worker-medium',
      source: { subagent: { thread_spawn: { parent_thread_id: parentId,
        agent_path: '/root/test_worker', agent_role: 'lazycodex-worker-medium', depth: 1 } } },
    } : { source: 'vscode', thread_source: 'user' }), ...overrides,
  });
  const terminal = (child = false) => row('event_msg', {
    type: 'task_complete', turn_id: child ? childTurn : parentTurn,
  });
  const resultText = '{ "stdout": "雪😀\\\\r\\\\n", "exitCode": 0, "stderr": "", "timedOut": false }';
  const frame = (child = false, text = resultText) => row('event_msg', {
    type: 'item_completed', thread_id: child ? childId : parentId,
    turn_id: child ? childTurn : parentTurn,
    item: { type: 'McpToolCall', id: callId, server: 'git_bash', tool: 'run',
      status: 'completed', pluginId: 'omo@sisyphuslabs', arguments: { workdir: root },
      result: { content: [{ type: 'text', text }], isError: false } },
  });
  const encode = (rows, newline = '\\n') => Buffer.from(rows.map(r => JSON.stringify(r) + newline).join(''));
  let fixtureOrdinal = 0;
  const scan = (rows) => {
    const bytes = encode(rows);
    fs.writeFileSync(path.join(root, 'Raw-source-' + fixtureOrdinal++ + '.jsonl'), bytes);
    return scanNativeRecords(bytes);
  };
  const rows = (child = false) => [metadata(child), context(child), frame(child), terminal(child)];
  const appResult = (targetId, turns, nextCursor = null) => ({ schemaVersion: 1,
    thread: { id: targetId, kind: 'codex', hostId: 'local', status: { type: 'active' } }, turns,
    page: { order: 'newest_first', limit: 10, nextCursor, hasMore: nextCursor !== null },
  });
  const appTurn = (child = false, status = 'inProgress') => ({
    id: child ? childTurn : parentTurn, status, items: [{ type: 'mcpToolCall', id: callId,
      server: 'git_bash', tool: 'run', status: 'completed', arguments: { workdir: root } }],
  });
  const apiFrame = (id, result, args = {}) => {
    const record = frame();
    record.payload.thread_id = observerId;
    record.payload.turn_id = observerTurn;
    Object.assign(record.payload.item, { id, server: 'codex_app', tool: 'read_thread',
      pluginId: 'codex-app-tools@openai-bundled', arguments: { threadId: parentId, ...args },
      result: { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false } });
    return record;
  };
  const observerRows = (...pages) => [metadata(false, { id: observerId }),
    context(false, { turn_id: observerTurn }), ...pages];
  const sourceFiles = [
    { path: 'scripts/Source.ts', bytes: Buffer.from([0, 255, 13, 10, 65]) },
    { path: 'scripts/Unicode.txt', bytes: Buffer.from('雪😀\\r\\n') },
  ];
  const readback = () => ({ readbackVersion: 1, privateRoots: [...NATIVE_PRIVATE_ROOTS],
    head: 'a'.repeat(40), tree: 'b'.repeat(40), index: Buffer.from([0, 255]).toString('base64'),
    inventory: Buffer.from(sourceFiles.map(f => f.path + '\\0').join('')).toString('base64'),
    diff: Buffer.from('source diff 雪\\r\\n').toString('base64'), status: Buffer.alloc(0).toString('base64'),
    files: sourceFiles.map(f => ({ path: f.path, base64: f.bytes.toString('base64') })),
    review: Buffer.from([0xef, 0xbb, 0xbf, 65, 13, 10]).toString('base64'),
    local: Buffer.from([0, 255, 65]).toString('base64'),
  });
  const decode = (value) => {
    const bytes = Buffer.from(JSON.stringify(value));
    fs.writeFileSync(path.join(root, 'Raw-readback-' + fixtureOrdinal++ + '.json'), bytes);
    return decodeReadback(bytes, ['review', 'local']);
  };
  const chunkValue = () => {
    const value = readback(), payload = Buffer.alloc(700_000);
    for (let offset = 0; offset < payload.length; offset += 32) {
      createHash('sha256').update(String(offset)).digest().copy(payload, offset);
    }
    value.files[0].base64 = payload.toString('base64');
    return value;
  };
  const chunks = (value) => {
    const first = encodeReadbackChunk(value, 0);
    return Array.from({ length: first.count }, (_, index) => encodeReadbackChunk(value, index));
  };
  const decodeChunks = (envelopes, artifactNames = ['review', 'local']) => {
    const carriers = envelopes.map((value, index) => {
      const bytes = Buffer.from(JSON.stringify(value));
      fs.writeFileSync(path.join(root, 'Chunk-' + fixtureOrdinal++ + '-' + index + '.json'), bytes);
      return bytes;
    });
    return decodeReadback(carriers, artifactNames);
  };
  const registrationPath = 'openspec/planning/2026-09-12-roadmap-completion/evidence/cni-registration-20261002.json';
  const unitsPath = 'openspec/planning/2026-09-12-roadmap-completion/units.json';
  const fixtureGit = (repo, args) => {
    const result = gitSpawn('git', ['-c', 'user.name=Native capture fixture',
      '-c', 'user.email=native-capture-fixture@example.invalid', '-c', 'core.autocrlf=false',
      '-c', 'core.hooksPath=' + path.join(repo, '.git/hooks'), ...args],
      { cwd: repo, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    fs.appendFileSync(path.join(root, 'Fixture-git.jsonl'), JSON.stringify({ repo, args,
      pid: result.pid, status: result.status, stdout: result.stdout, stderr: result.stderr }) + '\\n');
    return result.stdout.trim();
  };
  const registeredRepo = (name, mutate = () => {}, commitMetadata = true) => {
    const repo = path.join(root, name);
    fs.mkdirSync(repo);
    fixtureGit(repo, ['init', '--quiet']);
    const registration = { grants: [
      { id: 'CNI1', node: 'R6.loop-harness', exactFiles: ['src/Cni.mjs'] },
      { id: 'CNI2', node: 'R6.second-fixture', exactFiles: ['src/Second.mjs'], frozenEvidenceFiles: ['evidence/frozen.bin'] },
    ] };
    const ledger = { units: [{ id: 'CNI1', node: 'R6.loop-harness' }, { id: 'CNI2', node: 'R6.second-fixture' }] };
    mutate(registration, ledger);
    const write = (name, bytes) => {
      const file = path.join(repo, name); fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, bytes);
    };
    write(registrationPath, JSON.stringify(registration)); write(unitsPath, JSON.stringify(ledger));
    write('src/Cni.mjs', 'export const unit = "CNI1";\\n');
    write('src/Second.mjs', 'export const unit = "CNI2";\\n');
    write('evidence/frozen.bin', Buffer.from([0, 255, 13, 10, 65]));
    fixtureGit(repo, ['add', '--', 'src', 'evidence', ...(commitMetadata ? ['openspec'] : [])]);
    fixtureGit(repo, ['commit', '--quiet', '-m', 'Synthetic registered-unit fixture']);
    return repo;
  };
  const captureRefused = (operation) => assert.throws(operation, error => error instanceof LoopScriptError &&
    ['REVIEW_IDENTITY_INVALID', 'NATIVE_CAPTURE_REFUSED'].includes(error.code));
  const birthRows = (actor) => [metadata(), context(),
    row('response_item', { type: 'function_call', call_id: spawnId, name: 'spawn_agent',
      arguments: JSON.stringify({ task_name: 'test_worker', agent_type: actor.agentRole,
        fork_turns: 'none', model: 'gpt-6.1-sol', reasoning_effort: 'xhigh' }) }),
    row('response_item', { type: 'function_call_output', call_id: spawnId,
      output: JSON.stringify({ task_name: actor.agentPath }) }),
  ];
  const parentLinkRows = (actor) => [...birthRows(actor), context(false, { turn_id: uuid(14) }),
    row('response_item', { type: 'function_call', call_id: linkId, name: 'followup_task',
      arguments: JSON.stringify({ target: 'test_worker', message: 'Continue the fixture task' }) }),
    row('response_item', { type: 'function_call_output', call_id: linkId, output: '' }),
  ];
  const reopen = (bytes, source) => {
    fs.writeFileSync(path.join(root, 'Reopened-' + fixtureOrdinal++ + '.jsonl'), bytes);
    return reopenNativeRecords(bytes, source);
  };
`;

function parserProbe(body: string): void {
  probe(parserFixtures + body);
}

describe('native raw source protocol regressions', () => {
  test('LF and CRLF refs bind complete original Unicode records and exact byte offsets', () => {
    parserProbe(`
      const values = [metadata(), context(), row('event_msg', { type: 'note', text: '雪😀' })];
      for (const newline of ['\\n', '\\r\\n']) {
        const bytes = encode(values, newline), captured = scanNativeRecords(bytes);
        let offset = 0;
        values.forEach((value, i) => {
          const raw = Buffer.from(JSON.stringify(value) + newline);
          assert.deepEqual(captured.records[i].ref, { ordinal: i, offset, bytes: raw.length, sha256: hash(raw) });
          assert.deepEqual(captured.records[i].value, value);
          offset += raw.length;
        });
        assert.equal(captured.prefixBytes, bytes.length);
        assert.equal(captured.prefixSha256, hash(bytes));
        fs.writeFileSync(path.join(root, newline.length === 1 ? 'LF.jsonl' : 'CRLF.jsonl'), bytes);
      }
    `);
  });

  test('an unchanged complete prefix admits unrelated incomplete or invalid-byte tails', () => {
    parserProbe(`
      const prefix = encode(rows()), bytes = Buffer.concat([prefix, Buffer.from([0xff, 123])]);
      assert.deepEqual(scanNativeRecords(bytes, prefix.length), scanNativeRecords(prefix));
      refused(() => scanNativeRecords(bytes));
      fs.writeFileSync(file, bytes);
    `);
  });

  test('prefix selection refuses unsafe bounds, omitted LF and a boundary inside a record', () => {
    parserProbe(`
      const bytes = encode(rows());
      fs.writeFileSync(file, bytes);
      for (const n of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, bytes.length + 1, bytes.length - 1]) {
        refused(() => scanNativeRecords(bytes, n));
      }
      refused(() => scanNativeRecords(bytes.subarray(0, bytes.length - 1)));
      refused(() => scanNativeRecords(bytes, 7));
    `);
  });

  test('large prefixes retain selected records beyond 28 million bytes without a size ceiling', () => {
    parserProbe(`
      const bytes = encode([metadata(), row('event_msg', { type: 'note', text: 'x'.repeat(28_000_001) }), context(), frame()]);
      const captured = sourceObservation(scanNativeRecords(bytes), { turnIds: [parentTurn], callId });
      assert(captured.source.records.find(r => r.ordinal === 2).offset > 28_000_000);
      assert.equal(captured.source.prefixBytes, bytes.length);
      assert.equal(captured.source.prefixSha256, hash(bytes));
      fs.writeFileSync(file, bytes);
    `);
  });

  test('admitted complete lines refuse invalid UTF-8, malformed JSON, BOM and invalid envelopes', () => {
    parserProbe(`
      const invalidUtf8 = Buffer.from([0xff, 10]), malformed = Buffer.from('{bad}\\n');
      const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), encode([metadata()])]);
      fs.writeFileSync(path.join(root, 'Invalid-UTF8.bin'), invalidUtf8);
      fs.writeFileSync(path.join(root, 'Malformed.jsonl'), malformed);
      fs.writeFileSync(path.join(root, 'BOM.jsonl'), bom);
      refused(() => scanNativeRecords(invalidUtf8));
      refused(() => scanNativeRecords(malformed));
      refused(() => scanNativeRecords(bom));
      for (const value of [null, [], { payload: {} }, { type: 'event_msg', payload: null }]) {
        refused(() => scanNativeRecords(Buffer.from(JSON.stringify(value) + '\\n')));
      }
    `);
  });

  test('root and child adapters project actual served routes without exporting private raw metadata', () => {
    parserProbe(`
      for (const child of [false, true]) {
        const records = rows(child);
        records[0].payload.privateFixtureSecret = 'must not leave raw metadata';
        const captured = nativeActor(scan(records), [child ? childTurn : parentTurn]);
        assert.equal(captured.native.sessionId, child ? childId : parentId);
        assert.equal(captured.native.modelProvider, 'openai');
        assert.equal(captured.native.turns[0].model, 'gpt-6.1-sol');
        assert.equal(captured.native.turns[0].effort, 'high');
        assert.equal(Object.hasOwn(captured.native, 'privateFixtureSecret'), false);
        assert.equal(captured.terminals[0].turnId, child ? childTurn : parentTurn);
        assert.equal(Object.hasOwn(records[3].payload, 'thread_id'), false);
      }
    `);
  });

  test('child shared session scope identifies the parent while actor and completed call still identify the child', () => {
    parserProbe(`
      const records = rows(true), captured = scan(records);
      assert.equal(records[0].payload.session_id, parentId);
      assert.equal(records[0].payload.id, childId);
      const actor = nativeActor(captured, [childTurn]).native;
      assert.equal(actor.sessionId, childId);
      assert.notEqual(actor.sessionId, records[0].payload.session_id);
      assert.equal(nativeCompletion(captured, actor, callId).completion.threadId, childId);
      for (const scope of [childId, uuid(99)]) {
        const modified = structuredClone(records); modified[0].payload.session_id = scope;
        refused(() => nativeActor(scan(modified), [childTurn]));
      }
      const rootScope = [metadata(false, { session_id: parentId }), context()];
      assert.equal(nativeActor(scan(rootScope), [parentTurn]).native.sessionId, parentId);
      rootScope[0].payload.session_id = childId;
      refused(() => nativeActor(scan(rootScope), [parentTurn]));
    `);
  });

  test('legitimate same-turn contexts after compaction retain every original context ref', () => {
    parserProbe(`
      const records = [metadata(true), context(true), row('event_msg', { type: 'context_compacted' }), context(true), frame(true), terminal(true)];
      const captured = sourceObservation(scan(records), { turnIds: [childTurn], callId });
      assert.deepEqual(captured.source.records.map(r => r.ordinal), [0, 1, 3, 4, 5]);
      assert.equal(captured.native.turns.length, 1);
      for (const change of [{ effort: 'xhigh' }, { root_turn_id: uuid(99) }, { model: 'other' }]) {
        const modified = structuredClone(records);
        Object.assign(modified[3].payload, change);
        refused(() => nativeActor(scan(modified), [childTurn]));
      }
    `);
  });

  test('actor adapters refuse unsupported metadata, ambiguous identifiers and duplicate terminals', () => {
    parserProbe(`
      for (const change of [{ cli_version: '0.161.0' }, { source: 'user' }, { model_provider: 'other' },
        { originator: 'other' }, { thread_source: 'agent' }, { session_type: 'invented' }, { session_id: uuid(99) }]) {
        const records = rows(); Object.assign(records[0].payload, change);
        refused(() => nativeActor(scan(records), [parentTurn]));
      }
      for (const records of [[metadata(), metadata(), context()], [context(), metadata()],
        [metadata(), context(), terminal(), terminal()]]) {
        refused(() => nativeActor(scan(records), [parentTurn]));
      }
      refused(() => nativeActor(scan(rows()), [parentTurn, parentTurn]));
      refused(() => nativeActor(scan(rows()), [uuid(99)]));
      const changed = rows(true); changed[0].payload.parent_thread_id = uuid(99);
      refused(() => nativeActor(scan(changed), [childTurn]));
    `);
  });

  test('actor routes refuse low effort, missing child root turn and changed effort across contributing turns', () => {
    parserProbe(`
      for (const change of [{ effort: 'low' }, { model: 'gpt-6-astra' }]) {
        const records = rows(); Object.assign(records[1].payload, change);
        refused(() => nativeActor(scan(records), [parentTurn]));
      }
      const child = rows(true); delete child[1].payload.root_turn_id;
      refused(() => nativeActor(scan(child), [childTurn]));
      const records = [metadata(), context(), context(false, { turn_id: uuid(99), effort: 'xhigh' })];
      refused(() => nativeActor(scan(records), [parentTurn, uuid(99)]));
    `);
  });

  test('MCP completion binds raw frame, original text and stdout as three separate byte domains', () => {
    parserProbe(`
      const captured = scan(rows());
      const completion = nativeCompletion(captured, nativeActor(captured, [parentTurn]).native, callId);
      const stdout = Buffer.from('雪😀\\r\\n');
      assert.deepEqual(completion.stdout, stdout);
      assert.equal(completion.completion.stdoutBytes, stdout.length);
      assert.equal(completion.completion.stdoutSha256, hash(stdout));
      assert.equal(completion.completion.resultSha256, hash(Buffer.from(resultText)));
      assert.notEqual(completion.completion.resultSha256, hash(Buffer.from(JSON.stringify(JSON.parse(resultText)))));
      assert.equal(completion.completion.frameSha256, captured.records[2].ref.sha256);
      assert.equal(completion.completion.workdir, root);
    `);
  });

  test('MCP completion refuses duplicate IDs, wrong turns, wrong tools and unsuccessful results', () => {
    parserProbe(`
      const actor = nativeActor(scan(rows()), [parentTurn]).native;
      refused(() => nativeCompletion(scan([...rows(), frame()]), actor, callId));
      refused(() => nativeCompletion(scan(rows()), actor, 'call_not_native'));
      for (const change of [{ server: 'other' }, { tool: 'other' }, { status: 'failed' }, { pluginId: 'other' }]) {
        const records = rows(); Object.assign(records[2].payload.item, change);
        refused(() => nativeCompletion(scan(records), actor, callId));
      }
      for (const change of [{ exitCode: 1 }, { stderr: 'failure' }, { timedOut: true }, { truncated: true }]) {
        const records = rows(); records[2].payload.item.result.content[0].text = JSON.stringify({ ...JSON.parse(resultText), ...change });
        refused(() => nativeCompletion(scan(records), actor, callId));
      }
      const wrongThread = rows(); wrongThread[2].payload.thread_id = childId;
      refused(() => nativeCompletion(scan(wrongThread), actor, callId));
      const wrongInterval = [metadata(), context(), context(false, { turn_id: uuid(99) }), frame()];
      refused(() => nativeCompletion(scan(wrongInterval), actor, callId));
      for (const change of [{ isError: true }, { content: [] }, { content: [{ type: 'image', text: resultText }] }]) {
        const records = rows(); Object.assign(records[2].payload.item.result, change);
        refused(() => nativeCompletion(scan(records), actor, callId));
      }
    `);
  });

  test('MCP result decoding refuses malformed JSON and lone-surrogate text or stdout', () => {
    parserProbe(`
      const actor = nativeActor(scan(rows()), [parentTurn]).native;
      refused(() => nativeCompletion(scan([metadata(), context(), frame(false, '{bad}')]), actor, callId));
      const invalid = String.fromCharCode(0xd800);
      refused(() => nativeCompletion(scan([metadata(), context(), frame(false, invalid)]), actor, callId));
      const result = { ...JSON.parse(resultText), stdout: invalid };
      refused(() => nativeCompletion(scan([metadata(), context(), frame(false, JSON.stringify(result))]), actor, callId));
    `);
  });

  test('parent spawn binds the actual same-call result and separates requested from served route', () => {
    parserProbe(`
      const child = nativeActor(scan(rows(true)), [childTurn]).native;
      const parent = birthRows(child), request = parent[2], output = parent[3];
      const captured = nativeSpawn(scan(parent), child, spawnId);
      assert.equal(captured.parentSessionId, parentId);
      assert.equal(captured.requestedEffort, 'xhigh');
      assert.equal(child.turns[0].effort, 'high');
      assert.deepEqual(captured.source.records.map(r => r.ordinal), [0, 1, 2, 3]);
      for (const modified of [[metadata(), context(), output, request], [...parent, output],
        [metadata(), context(), request]]) refused(() => nativeSpawn(scan(modified), child, spawnId));
      for (const change of [{ fork_turns: 'all' }, { task_name: 'other' }, { agent_type: 'other' }]) {
        const modified = structuredClone(parent);
        modified[2].payload.arguments = JSON.stringify({ ...JSON.parse(request.payload.arguments), ...change });
        refused(() => nativeSpawn(scan(modified), child, spawnId));
      }
      const modified = structuredClone(parent); modified[3].payload.output = JSON.stringify({ task_name: child.agentPath, task_id: 'invented' });
      refused(() => nativeSpawn(scan(modified), child, spawnId));
    `);
  });

  test('observer pagination reaches named turns and accepts a completed call within an active turn', () => {
    parserProbe(`
      const subject = nativeActor(scan(rows()), [parentTurn]).native;
      const pages = observerRows(apiFrame(pageId, appResult(parentId, [], 'older')),
        apiFrame(olderPageId, appResult(parentId, [appTurn()]), { cursor: 'older' }));
      const captured = scan(pages), observer = nativeActor(captured, [observerTurn]).native;
      const result = nativeAppObservation(captured, observer, { subject, callId, appCallIds: [pageId, olderPageId] });
      assert.equal(result.app.threadStatus, 'active');
      assert.equal(result.app.turns[0].status, 'inProgress');
      assert.equal(result.app.turns[0].calls[0].status, 'completed');
      assert.deepEqual(result.selected.map(r => r.ref.ordinal), [2, 3]);
      for (const ids of [[pageId], [pageId, pageId], [olderPageId, pageId]]) {
        refused(() => nativeAppObservation(captured, observer, { subject, callId, appCallIds: ids }));
      }
    `);
  });

  test('observer pages refuse cursor drift, mismatched threads, duplicate turns and failed named calls', () => {
    parserProbe(`
      const subject = nativeActor(scan(rows()), [parentTurn]).native;
      const check = (pages) => {
        const captured = scan(observerRows(...pages)), observer = nativeActor(captured, [observerTurn]).native;
        refused(() => nativeAppObservation(captured, observer, { subject, callId, appCallIds: pages.map(p => p.payload.item.id) }));
      };
      check([apiFrame(pageId, appResult(parentId, [appTurn(), appTurn()]))]);
      check([apiFrame(pageId, appResult(childId, [appTurn()]))]);
      check([apiFrame(pageId, appResult(parentId, [], 'older')), apiFrame(olderPageId, appResult(parentId, [appTurn()]), { cursor: 'wrong' })]);
      const result = appResult(parentId, [appTurn()]); result.page.hasMore = true;
      check([apiFrame(pageId, result)]);
      const failed = appTurn(); failed.items[0].status = 'failed';
      check([apiFrame(pageId, appResult(parentId, [failed]))]);
      const notLoaded = appTurn(false, 'notLoaded');
      check([apiFrame(pageId, appResult(parentId, [notLoaded]))]);
    `);
  });

  test('observer child mapping requires actual started activity and rejects interacted or wrong-child mappings', () => {
    parserProbe(`
      const subject = nativeActor(scan(rows(true)), [childTurn]).native;
      const spawn = { type: 'subAgentActivity', id: spawnId, kind: 'started', agentThreadId: childId, agentPath: subject.agentPath };
      const check = (activity) => {
        const parent = { id: parentTurn, status: 'inProgress', items: [activity] };
        const pages = observerRows(apiFrame(pageId, appResult(childId, [appTurn(true, 'completed')]), { threadId: childId }),
          apiFrame(olderPageId, appResult(parentId, [parent])));
        const captured = scan(pages), observer = nativeActor(captured, [observerTurn]).native;
        return nativeAppObservation(captured, observer, { subject, callId, appCallIds: [pageId], parentAppCallIds: [olderPageId], spawnCallId: spawnId });
      };
      assert.deepEqual(check(spawn).app.spawn, { kind: 'started', callId: spawnId,
        sessionId: childId, parentSessionId: parentId, agentPath: subject.agentPath });
      for (const change of [{ kind: 'interacted' }, { agentThreadId: uuid(99) }, { agentPath: '/root/other' }]) {
        refused(() => check({ ...spawn, ...change }));
      }
    `);
  });

  test('readback decoding retains full binary source and artifact Buffers and recomputes every byte binding', () => {
    parserProbe(`
      const original = readback(), captured = decode(original);
      assert.deepEqual(captured.fileBytes, sourceFiles);
      assert.deepEqual(captured.readbacks.files, sourceFiles.map(f => ({ path: f.path, bytes: f.bytes.length, sha256: hash(f.bytes) })));
      for (const name of ['index', 'inventory', 'diff', 'status', 'review', 'local']) {
        const bytes = Buffer.from(original[name], 'base64');
        assert.deepEqual(captured.readbacks[name], { bytes: bytes.length, sha256: hash(bytes) });
        if (['review', 'local'].includes(name)) assert.deepEqual(captured.artifacts[name], bytes);
        fs.writeFileSync(path.join(root, name + '.bin'), bytes);
      }
      for (const [i, file] of captured.fileBytes.entries()) fs.writeFileSync(path.join(root, 'Source-' + i + '.bin'), file.bytes);
      checkReadbacks(captured.readbacks, ['review', 'local']);
    `);
  });

  test('readback decoding refuses malformed and noncanonical base64 across source, Git and artifact fields', () => {
    parserProbe(`
      for (const malformed of ['A', 'AA=', 'AA== ', 'AB==', 'AAAA\\n', 42]) {
        for (const name of ['index', 'inventory', 'diff', 'status', 'review', 'local']) {
          const value = readback(); value[name] = malformed;
          refused(() => decode(value));
        }
        const value = readback(); value.files[0].base64 = malformed;
        refused(() => decode(value));
      }
    `);
  });

  test('readback decoding refuses hash-only files, unsupported fields, unsafe names and incomplete envelopes', () => {
    parserProbe(`
      const original = readback();
      for (const files of [[{ path: 'scripts/Source.ts', bytes: 5, sha256: hash(sourceFiles[0].bytes) }],
        [{ path: 'scripts/Source.ts' }], [{ ...original.files[0], sha256: hash(sourceFiles[0].bytes) }]]) {
        refused(() => decode({ ...original, files }));
      }
      for (const name of ['../outside', '/absolute', 'C:/drive', 'a//b', 'a/./b', 'a\\\\b']) {
        const value = readback(); value.files[0].path = name;
        refused(() => decode(value));
      }
      for (const name of ['inventory', 'files', 'review']) {
        const value = readback(); delete value[name];
        refused(() => decode(value));
      }
      refused(() => decode({ ...original, readbackVersion: 2 }));
      refused(() => decode({ ...original, extra: true }));
      const empty = decode({ ...original, files: [] });
      refused(() => checkReadbacks(empty.readbacks, ['review', 'local']));
    `);
  });

  test('valid truncated, changed, omitted and reordered source payloads remain distinguishable from the original', () => {
    parserProbe(`
      const original = decode(readback());
      const variants = [
        value => { value.files[0].base64 = sourceFiles[0].bytes.subarray(0, 4).toString('base64'); },
        value => { value.files[0].base64 = Buffer.from([1, 255, 13, 10, 65]).toString('base64'); },
        value => { value.files.pop(); },
        value => { value.files.reverse(); },
      ];
      for (const mutate of variants) {
        const value = readback(); mutate(value);
        const captured = decode(value);
        assert.notDeepEqual(captured.fileBytes, original.fileBytes);
        assert.notDeepEqual(captured.readbacks.files, original.readbacks.files);
      }
      const value = readback(); value.files[0].base64 = '';
      const zero = decode(value);
      assert.deepEqual(zero.fileBytes[0].bytes, Buffer.alloc(0));
      assert.equal(zero.readbacks.files[0].bytes, 0);
      assert.equal(zero.readbacks.files[0].sha256, hash(Buffer.alloc(0)));
      // Expected source equality belongs to the producer's independently observed comparison.
    `);
  });

  test('compressed readback chunks deterministically reconstruct the complete original binary payload and LF', () => {
    parserProbe(`
      const value = chunkValue(), envelopes = chunks(value);
      assert(envelopes.length > 1);
      assert.deepEqual(chunks(value), envelopes);
      const original = Buffer.from(JSON.stringify(value) + '\\n');
      const compressed = Buffer.concat(envelopes.map(e => Buffer.from(e.base64, 'base64')));
      assert.deepEqual(gunzipSync(compressed), original);
      assert.equal(envelopes[0].original.bytes, original.length);
      assert.equal(envelopes[0].original.sha256, hash(original));
      assert.deepEqual(decodeChunks(envelopes), decode(value));
      for (const index of [-1, 0.5, NaN, Infinity, envelopes.length]) refused(() => encodeReadbackChunk(value, index));
      fs.writeFileSync(path.join(root, 'Original-readback.json'), original);
      fs.writeFileSync(path.join(root, 'Compressed-readback.gz'), compressed);
    `);
  });

  test('compressed readback groups refuse missing, duplicate, reordered and mixed-body chunks', () => {
    parserProbe(`
      const value = chunkValue(), envelopes = chunks(value);
      const changed = chunkValue(); changed.files[0].base64 = Buffer.from('different').toString('base64');
      const other = chunks(changed);
      for (const invalid of [[], envelopes.slice(0, -1), envelopes.slice(1),
        [...envelopes, envelopes[0]], [...envelopes].reverse(),
        [other[0], ...envelopes.slice(1)], [readback(), ...envelopes]]) {
        refused(() => decodeChunks(invalid));
      }
    `);
  });

  test('compressed readback refuses mutated hashes, offsets, schemas, lengths and noncanonical base64', () => {
    parserProbe(`
      const original = chunks(chunkValue());
      const mutations = [
        e => { e[0].offset = 1; }, e => { e[0].index = 1; },
        e => { e[0].count++; }, e => { e[0].encoding = 'base64'; },
        e => { e[0].part.sha256 = '0'.repeat(64); }, e => { e[0].part.bytes--; },
        e => { e[0].batch.sha256 = '0'.repeat(64); }, e => { e[0].original.sha256 = '0'.repeat(64); },
        e => { e[0].original.bytes--; }, e => { e[0].batch.bytes--; },
        e => { e[0].base64 += ' '; }, e => { e[0].base64 = e[0].base64.slice(0, -4); },
        e => { e[0].extra = true; },
      ];
      for (const mutate of mutations) {
        const changed = structuredClone(original); mutate(changed);
        refused(() => decodeChunks(changed));
      }
    `);
  });

  test('compressed transport refuses self-consistent trailing bytes, multiple members and noncanonical compression', () => {
    parserProbe(`
      const value = readback(), envelope = encodeReadbackChunk(value, 0);
      assert.equal(envelope.count, 1);
      const original = Buffer.from(JSON.stringify(value) + '\\n');
      const canonical = Buffer.from(envelope.base64, 'base64');
      const variants = [Buffer.concat([canonical, Buffer.from([0, 1, 2])]),
        Buffer.concat([canonical, gzipSync(Buffer.alloc(0), { level: 9 })]),
        gzipSync(original, { level: 1 })];
      for (const compressed of variants) {
        const changed = structuredClone(envelope);
        changed.batch = changed.part = { bytes: compressed.length, sha256: hash(compressed) };
        changed.base64 = compressed.toString('base64');
        refused(() => decodeChunks([changed]));
      }
    `);
  });

  test('raw MCP chunk readback binds every contributing frame and every App completed call', () => {
    parserProbe(`
      const value = chunkValue(), envelopes = chunks(value);
      const ids = envelopes.map((_, i) => 'exec-' + uuid(100 + i));
      assert(ids.length >= 3);
      const anchor = ids.at(-1);
      const frames = envelopes.map((envelope, i) => {
        const record = frame(false, JSON.stringify({ exitCode: 0, stdout: JSON.stringify(envelope), stderr: '', timedOut: false }));
        record.payload.item.id = ids[i];
        return record;
      });
      const capturedScan = scan([metadata(), context(), ...frames, terminal()]);
      const captured = sourceObservation(capturedScan, { turnIds: [parentTurn], callId: anchor, chunkCallIds: ids });
      assert.deepEqual(captured.chunks.map(c => c.id), ids);
      assert.deepEqual(captured.completion, captured.chunks.at(-1));
      assert.equal(captured.source.records.length, ids.length + 3);
      assert.deepEqual(decodeReadback(captured.stdout, ['review', 'local']), decode(value));
      for (const invalid of [[], [...ids, ids[0]], ids.slice(0, -1),
        [ids[1], ids[0], ...ids.slice(2)], ['exec-' + uuid(999), ...ids.slice(1)]]) {
        refused(() => sourceObservation(capturedScan, { turnIds: [parentTurn], callId: anchor, chunkCallIds: invalid }));
      }
      const outOfOrderScan = scan([metadata(), context(), frames[1], frames[0], ...frames.slice(2), terminal()]);
      refused(() => sourceObservation(outOfOrderScan, { turnIds: [parentTurn], callId: anchor, chunkCallIds: ids }));
      const turn = appTurn();
      turn.items = ids.map(id => ({ ...turn.items[0], id }));
      const observedScan = scan(observerRows(apiFrame(pageId, appResult(parentId, [turn]))));
      const observer = nativeActor(observedScan, [observerTurn]).native;
      const observed = nativeAppObservation(observedScan, observer, { subject: captured.native, callId: anchor, chunkCallIds: ids, appCallIds: [pageId] });
      assert.deepEqual(observed.app.turns[0].calls.map(c => c.id), ids);
      assert(observed.app.turns[0].calls.every(c => c.status === 'completed'));
    `);
  });

  test('producer readback selects a second committed finite unit and preserves default CNI1', () => {
    parserProbe(`
      const repo = registeredRepo('Registered-repo');
      const original = sourceReadback({ repoRoot: repo });
      assert.deepEqual(original, sourceReadback({ repoRoot: repo, unit: 'CNI1' }));
      assert.deepEqual(original.files.map(f => f.path), ['src/Cni.mjs']);
      const second = sourceReadback({ repoRoot: repo, unit: 'CNI2' });
      assert.deepEqual(second.files.map(f => f.path), ['evidence/frozen.bin', 'src/Second.mjs']);
      const captured = decodeReadback(Buffer.from(JSON.stringify(second)));
      assert.deepEqual(captured.fileBytes[0].bytes, Buffer.from([0, 255, 13, 10, 65]));
      assert.deepEqual(captured.fileBytes[1].bytes, fs.readFileSync(path.join(repo, 'src/Second.mjs')));
      assert.equal(second.head, fixtureGit(repo, ['rev-parse', 'HEAD']));
      assert.equal(second.tree, fixtureGit(repo, ['rev-parse', 'HEAD^{tree}']));
      assert.equal(Buffer.from(second.diff, 'base64').length, 0);
      assert.equal(Buffer.from(second.status, 'base64').length, 0);
      fs.writeFileSync(path.join(root, 'Second-unit-readback.json'), JSON.stringify(second));
    `);
  });

  test('producer chunk wrapper forwards the selected registered unit and reconstructs its exact source', () => {
    parserProbe(`
      const repo = registeredRepo('Registered-repo');
      const original = sourceReadback({ repoRoot: repo, unit: 'CNI2' });
      const first = sourceReadbackChunk({ repoRoot: repo, unit: 'CNI2' }, 0);
      assert.equal(first.count, 1);
      const reconstructed = decodeChunks([first], []);
      assert.deepEqual(reconstructed, decodeReadback(Buffer.from(JSON.stringify(original))));
      assert.deepEqual(reconstructed.fileBytes.map(f => f.path), ['evidence/frozen.bin', 'src/Second.mjs']);
    `);
  });

  test('producer refuses absent, ambiguous, malformed and mismatched committed unit grants', () => {
    parserProbe(`
      const mutations = [
        r => { r.grants = r.grants.filter(g => g.id !== 'CNI2'); },
        r => { r.grants.push(structuredClone(r.grants[1])); },
        r => { r.grants[1].exactFiles = 'src/Second.mjs'; },
        r => { r.grants[1].frozenEvidenceFiles = 'evidence/frozen.bin'; },
        r => { r.grants[1].node = 'R6.mismatched'; },
        (_, l) => { l.units = l.units.filter(u => u.id !== 'CNI2'); },
        (_, l) => { l.units.push(structuredClone(l.units[1])); },
        r => { r.grants[1].exactFiles = ['../escape']; },
        (r, l) => { delete r.grants[1].node; delete l.units[1].node; },
      ];
      mutations.forEach((mutate, index) => {
        const repo = registeredRepo('Registered-repo-' + index, mutate);
        captureRefused(() => sourceReadback({ repoRoot: repo, unit: 'CNI2' }));
      });
      const repo = registeredRepo('Registered-repo-absent');
      captureRefused(() => sourceReadback({ repoRoot: repo, unit: 'UNREGISTERED' }));
    `);
  });

  test('producer refuses uncommitted authority and affecting source outside the selected finite grant', () => {
    parserProbe(`
      const uncommitted = registeredRepo('Registered-repo-uncommitted', () => {}, false);
      captureRefused(() => sourceReadback({ repoRoot: uncommitted, unit: 'CNI2' }));
      const repo = registeredRepo('Registered-repo');
      const original = fs.readFileSync(path.join(repo, 'src/Cni.mjs'));
      fs.writeFileSync(path.join(repo, 'src/Cni.mjs'), 'changed outside selected unit');
      captureRefused(() => sourceReadback({ repoRoot: repo, unit: 'CNI2' }));
      assert.equal(fs.readFileSync(path.join(repo, 'src/Cni.mjs'), 'utf8'), 'changed outside selected unit');
      fs.writeFileSync(path.join(repo, 'src/Cni.mjs'), original);
      fs.writeFileSync(path.join(repo, 'src/Extra.mjs'), 'unregistered affecting source');
      captureRefused(() => sourceReadback({ repoRoot: repo, unit: 'CNI2' }));
      assert.equal(fs.readFileSync(path.join(repo, 'src/Extra.mjs'), 'utf8'), 'unregistered affecting source');
    `);
  });

  test('producer refuses a frozen evidence path named by committed authority but absent from committed HEAD', () => {
    parserProbe(`
      const repo = registeredRepo('Registered-repo', registration => {
        registration.grants[1].frozenEvidenceFiles = ['evidence/Untracked.bin'];
      });
      const evidenceFile = path.join(repo, 'evidence/Untracked.bin');
      const bytes = Buffer.from([0, 255, 13, 10, 65]); fs.writeFileSync(evidenceFile, bytes);
      captureRefused(() => sourceReadback({ repoRoot: repo, unit: 'CNI2' }));
      assert.deepEqual(fs.readFileSync(evidenceFile), bytes);
    `);
  });

  test('producer refuses working-byte drift of a committed frozen evidence file', () => {
    parserProbe(`
      const repo = registeredRepo('Registered-repo');
      const evidenceFile = path.join(repo, 'evidence/frozen.bin');
      const changed = Buffer.from([1, 255, 13, 10, 65]); fs.writeFileSync(evidenceFile, changed);
      captureRefused(() => sourceReadback({ repoRoot: repo, unit: 'CNI2' }));
      assert.deepEqual(fs.readFileSync(evidenceFile), changed);
    `);
  });

  test('reopening preserves an immutable prefix across consistent context, first terminal and unrelated incomplete append', () => {
    parserProbe(`
      const initial = [metadata(), context(), frame()], prefix = encode(initial);
      const frozen = scanNativeRecords(prefix);
      const source = sourceObservation(frozen, { turnIds: [parentTurn], callId }).source;
      const unrelated = frame(); unrelated.payload.item.id = 'exec-' + uuid(99);
      unrelated.payload.turn_id = uuid(98);
      for (const tail of [Buffer.alloc(0), encode([context()]), encode([terminal()]),
        encode([context(false, { turn_id: uuid(98) }), unrelated]), Buffer.from([123, 255]),
        Buffer.concat([encode([context(), terminal()]), Buffer.from('{incomplete')])]) {
        assert.deepEqual(reopen(Buffer.concat([prefix, tail]), source), frozen);
      }
    `);
  });

  test('reopening refuses prefix rewrites and altered selected ordinal, offset, length or hash bindings', () => {
    parserProbe(`
      const bytes = encode(rows()), captured = scanNativeRecords(bytes);
      const source = sourceObservation(captured, { turnIds: [parentTurn], callId }).source;
      const rewritten = Buffer.from(bytes); rewritten[10] ^= 1;
      refused(() => reopen(rewritten, source));
      refused(() => reopen(bytes.subarray(0, bytes.length - 1), source));
      const mutations = [s => { s.prefixSha256 = '0'.repeat(64); },
        s => { s.records[0].ordinal = 99; }, s => { s.records[0].offset++; },
        s => { s.records[0].bytes--; }, s => { s.records[0].sha256 = '0'.repeat(64); }];
      for (const mutate of mutations) {
        const changed = structuredClone(source); mutate(changed);
        refused(() => reopen(bytes, changed));
      }
    `);
  });

  test('reopening refuses selected call, metadata, route and terminal conflicts or malformed complete tails', () => {
    parserProbe(`
      const prefix = encode(rows()), frozen = scanNativeRecords(prefix);
      const source = sourceObservation(frozen, { turnIds: [parentTurn], callId }).source;
      for (const tail of [encode([frame()]), encode([metadata()]), encode([terminal()]),
        encode([context(false, { effort: 'xhigh' })]), encode([context(false, { model: 'other' })]),
        encode([context(false, { root_turn_id: uuid(99) })]), Buffer.from('{bad}\\n'), Buffer.from([255, 10])]) {
        refused(() => reopen(Buffer.concat([prefix, tail]), source));
      }
    `);
  });

  test('reopening parent birth evidence refuses duplicate selected spawn calls and results while permitting unrelated calls', () => {
    parserProbe(`
      const actor = nativeActor(scan(rows(true)), [childTurn]).native;
      const records = birthRows(actor), prefix = encode(records), frozen = scanNativeRecords(prefix);
      const source = nativeSpawn(frozen, actor, spawnId).source;
      for (const record of [records[2], records[3]]) refused(() => reopen(Buffer.concat([prefix, encode([record])]), source));
      const unrelated = structuredClone(records[2]); unrelated.payload.call_id = 'call_unrelated123';
      assert.deepEqual(reopen(Buffer.concat([prefix, encode([unrelated])]), source), frozen);
    `);
  });

  test('native follow-up links use the short target and empty acknowledgement while preserving distinct fork-none birth', () => {
    parserProbe(`
      const actor = nativeActor(scan(rows(true)), [childTurn]).native;
      const records = parentLinkRows(actor), captured = scan(records);
      const birth = nativeSpawn(captured, actor, spawnId), link = nativeParentLink(captured, actor, linkId);
      assert.equal(records[6].payload.output, '');
      assert.equal(link.operation, 'followup_task');
      assert.equal(link.parentSessionId, parentId);
      assert.equal(link.agentPath, actor.agentPath);
      assert.equal(link.callId, linkId);
      assert.notEqual(link.callId, birth.callId);
      assert.equal(birth.forkTurns, 'none');
      assert.deepEqual(birth.source.records.map(r => r.ordinal), [0, 1, 2, 3]);
      assert.deepEqual(link.source.records.map(r => r.ordinal), [0, 4, 5, 6]);
      const prefix = encode(records);
      assert.deepEqual(reopen(prefix, link.source), scanNativeRecords(prefix));
      refused(() => reopen(Buffer.concat([prefix, encode([records[5]])]), link.source));
      refused(() => reopen(Buffer.concat([prefix, encode([records[6]])]), link.source));
    `);
  });

  test('native follow-up links refuse wrong paths, argument fields, results, root context, IDs and record order', () => {
    parserProbe(`
      const actor = nativeActor(scan(rows(true)), [childTurn]).native, original = parentLinkRows(actor);
      const mutations = [r => { r[5].payload.name = 'spawn_agent'; },
        r => { r[5].payload.arguments = JSON.stringify({ target: '/root/test_worker', message: 'continue' }); },
        r => { r[5].payload.arguments = JSON.stringify({ target: 'other', message: 'continue' }); },
        r => { r[5].payload.arguments = JSON.stringify({ target: 'test_worker', message: 1 }); },
        r => { r[5].payload.arguments = JSON.stringify({ target: 'test_worker', message: 'continue', task_id: 'invented' }); },
        r => { r[6].payload.output = '{}'; }, r => { r[6].payload.output = '""'; },
        r => { r[6].payload.call_id = spawnId; }, r => { r[4].payload.effort = 'low'; },
        r => { r[0].payload.id = uuid(99); }, r => { [r[5], r[6]] = [r[6], r[5]]; }];
      for (const mutate of mutations) {
        const changed = structuredClone(original); mutate(changed);
        refused(() => nativeParentLink(scan(changed), actor, linkId));
      }
      for (const records of [[metadata(), original[5], original[6]], [...original, original[5]], [...original, original[6]]]) {
        refused(() => nativeParentLink(scan(records), actor, linkId));
      }
      refused(() => nativeParentLink(scan(original), actor, spawnId));
    `);
  });

  test('App follow-up interacted activity projects a parent link rather than replacing started birth provenance', () => {
    parserProbe(`
      const subject = nativeActor(scan(rows(true)), [childTurn]).native;
      const activity = { type: 'subAgentActivity', id: linkId, kind: 'interacted', agentThreadId: childId, agentPath: subject.agentPath };
      const observe = (value, selector = linkId) => {
        const parent = { id: uuid(14), status: 'inProgress', items: [value] };
        const observed = scan(observerRows(apiFrame(pageId, appResult(childId, [appTurn(true, 'completed')]), { threadId: childId }),
          apiFrame(olderPageId, appResult(parentId, [parent]))));
        const observer = nativeActor(observed, [observerTurn]).native;
        return nativeAppObservation(observed, observer, { subject, callId, appCallIds: [pageId], parentAppCallIds: [olderPageId], parentLinkCallId: selector });
      };
      const result = observe(activity);
      assert.deepEqual(result.app.parentLink, { kind: 'interacted', callId: linkId,
        sessionId: childId, parentSessionId: parentId, agentPath: subject.agentPath });
      assert.equal(Object.hasOwn(result.app, 'spawn'), false);
      for (const change of [{ kind: 'started' }, { agentThreadId: uuid(99) }, { agentPath: '/root/other' }]) refused(() => observe({ ...activity, ...change }));
      refused(() => observe(activity, spawnId));
    `);
  });
});
