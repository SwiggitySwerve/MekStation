/** Identity artifact paths, original bytes and exclusive archive publication. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { evidenceDirOf, sha256 } from '../roadmap-loop-runtime.mjs';
import {
  checkRef,
  identityCheck,
  nativeRef,
  nativeJson,
  relativePath,
  plainPathText,
  NATIVE_PRIVATE_ROOTS,
  blobRef,
} from './contract.mjs';
export { nativeText } from './contract.mjs';

export function identityPath(base, relative) {
  identityCheck(
    typeof relative === 'string' &&
      relative.length > 0 &&
      !/[\\:]/.test(relative) &&
      !relative.startsWith('/') &&
      relative.split('/').every((p) => p && p !== '.' && p !== '..'),
    'unsafe relative identity path',
  );
  let file = path.resolve(base);
  for (const part of ['.', ...relative.split('/')]) {
    file = path.join(file, part);
    identityCheck(
      !fs.lstatSync(file).isSymbolicLink(),
      'identity path is a reparse alias',
    );
  }
  identityCheck(fs.statSync(file).isFile(), 'identity path is not a file');
  const inside = path.relative(fs.realpathSync(base), fs.realpathSync(file));
  identityCheck(
    inside && !inside.startsWith('..') && !path.isAbsolute(inside),
    'identity path escaped its root',
  );
  return file;
}

export function identityArtifact(base, ref) {
  checkRef(ref);
  const file = identityPath(base, ref.path);
  const bytes = fs.readFileSync(file);
  identityCheck(
    bytes.length === ref.bytes && sha256(bytes) === ref.sha256,
    'artifact hash/bytes mismatch',
  );
  return { file, bytes, value: JSON.parse(bytes.toString('utf8')) };
}

// Native-only custody; legacy reads retain their original predicates and Buffer law.
export function nativeSelector(file) {
  identityCheck(
    plainPathText(file) &&
      path.isAbsolute(file) &&
      (process.platform !== 'win32' || /^[A-Z]:[\\/]/.test(file)) &&
      !file.split(/[\\/]/).some((p) => p === '.' || p === '..'),
    'native selector must be explicit and unambiguous',
  );
  const absolute = path.resolve(file);
  const normalized = (value) =>
    process.platform === 'win32' ? value.replaceAll('\\', '/') : value;
  identityCheck(
    normalized(file) === normalized(absolute),
    'native selector alias refused',
  );
  if (process.platform === 'win32')
    identityCheck(
      file
        .slice(3)
        .split(/[\\/]/)
        .every(
          (part) =>
            !/[<>:"|?*]|[. ]$/.test(part) &&
            !/^(con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(\.|$)/i.test(
              part,
            ),
        ),
      'native Windows path alias refused',
    );
  return absolute;
}

function physicalPath(file, directory = false) {
  const absolute = nativeSelector(file);
  identityCheck(!absolute.startsWith('\\\\'), 'native UNC path refused');
  const root = path.parse(absolute).root;
  let current = root;
  const rootStat = fs.lstatSync(root, { bigint: true });
  const identities = [[root, rootStat.dev.toString(), rootStat.ino.toString()]];
  for (const part of absolute
    .slice(root.length)
    .split(path.sep)
    .filter(Boolean)) {
    identityCheck(
      fs.readdirSync(current).includes(part),
      'native path case/alias mismatch',
    );
    current = path.join(current, part);
    const stat = fs.lstatSync(current, { bigint: true });
    identityCheck(!stat.isSymbolicLink(), 'native reparse path refused');
    identities.push([current, stat.dev.toString(), stat.ino.toString()]);
  }
  const stat = fs.lstatSync(absolute, { bigint: true });
  identityCheck(
    directory ? stat.isDirectory() : stat.isFile(),
    'native path type/link mismatch',
  );
  identityCheck(
    fs.realpathSync(absolute) === absolute,
    'native realpath alias',
  );
  return { absolute, stat, identities };
}

function checkNativeAttributes(identities) {
  if (process.platform === 'win32') {
    const attributes = spawnSync(
      'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '[Console]::InputEncoding=[Text.UTF8Encoding]::new($false); $ErrorActionPreference="Stop"; ' +
          '$paths=$input|ConvertFrom-Json; foreach($p in $paths) { ' +
          'if((Get-Item -Force -LiteralPath $p).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Native reparse point" } }; "OK"',
      ],
      {
        input: JSON.stringify([...new Set(identities.map(([entry]) => entry))]),
        encoding: 'utf8',
        windowsHide: true,
      },
    );
    identityCheck(
      attributes.status === 0 &&
        attributes.stdout.trim() === 'OK' &&
        attributes.stderr.trim() === '',
      'native Windows attribute guard refused',
    );
  }
}

export function nativePath(file, directory = false) {
  const before = physicalPath(file, directory);
  checkNativeAttributes(before.identities);
  return before;
}

function readNativeBytes(before, prefixBytes) {
  const descriptor = fs.openSync(before.absolute, 'r');
  try {
    const opened = fs.fstatSync(descriptor, { bigint: true });
    identityCheck(
      opened.dev === before.stat.dev && opened.ino === before.stat.ino,
      'native opened file changed',
    );
    const length = prefixBytes ?? Number(opened.size);
    identityCheck(
      Number.isSafeInteger(length) &&
        length >= 0 &&
        BigInt(length) <= opened.size,
      'native byte bounds invalid',
    );
    const bytes = Buffer.alloc(length);
    const read = () => {
      let offset = 0;
      while (offset < length) {
        const count = fs.readSync(
          descriptor,
          bytes,
          offset,
          length - offset,
          offset,
        );
        identityCheck(count > 0, 'native incomplete read');
        offset += count;
      }
    };
    read();
    const first = Buffer.from(bytes);
    read();
    const closed = fs.fstatSync(descriptor, { bigint: true });
    identityCheck(
      first.equals(bytes) &&
        closed.size >= BigInt(length) &&
        opened.dev === closed.dev &&
        opened.ino === closed.ino &&
        (prefixBytes !== undefined ||
          (opened.size === before.stat.size &&
            opened.mtimeNs === before.stat.mtimeNs &&
            opened.size === closed.size &&
            opened.mtimeNs === closed.mtimeNs)),
      'native path/bytes drift',
    );
    return first;
  } finally {
    fs.closeSync(descriptor);
  }
}

const stablePath = (before, after, prefixBytes) =>
  identityCheck(
    isDeepStrictEqual(before.identities, after.identities) &&
      (prefixBytes !== undefined
        ? after.stat.size >= BigInt(prefixBytes)
        : before.stat.size === after.stat.size &&
          before.stat.mtimeNs === after.stat.mtimeNs),
    'native path/bytes drift',
  );

export function nativeBytes(file, prefixBytes) {
  const before = nativePath(file);
  const bytes = readNativeBytes(before, prefixBytes);
  stablePath(before, nativePath(file), prefixBytes);
  return bytes;
}

// A complete inventory uses two fresh all-tag attribute checks instead of one
// interpreter process per file. Every file still has its own handle/read checks.
export function nativeBuffers(files) {
  identityCheck(
    Array.isArray(files) && new Set(files).size === files.length,
    'native inventory aliases',
  );
  const before = files.map((file) => physicalPath(file));
  checkNativeAttributes(before.flatMap((entry) => entry.identities));
  const buffers = before.map((entry) => readNativeBytes(entry));
  const after = files.map((file) => physicalPath(file));
  checkNativeAttributes(after.flatMap((entry) => entry.identities));
  before.forEach((entry, index) => stablePath(entry, after[index]));
  return buffers;
}

export function nativeFile(base, relative) {
  identityCheck(relativePath(relative), 'unsafe native relative artifact');
  const root = nativePath(base, true);
  const file = nativePath(path.join(root.absolute, relative)).absolute;
  stablePath(root, nativePath(base, true), 0);
  return file;
}

export function nativeArtifact(base, ref) {
  nativeRef(ref);
  const file = nativeFile(base, ref.path);
  const bytes = nativeBytes(file);
  identityCheck(
    bytes.length === ref.bytes && sha256(bytes) === ref.sha256,
    'native artifact hash/bytes mismatch',
  );
  return { file, bytes, value: nativeJson(bytes) };
}

export function archiveReviewIdentity(ledgerDir, verified) {
  const native = verified.manifest.reviewContractVersion === 3;
  if (native)
    identityCheck(
      typeof verified.revalidate === 'function',
      'native archive requires frozen verified inputs',
    );
  const evidence = native
    ? nativePath(path.join(ledgerDir, 'evidence'), true).absolute
    : evidenceDirOf(ledgerDir);
  const before = native && nativePath(evidence, true);
  if (native) verified.revalidate?.();
  identityCheck(
    !fs.lstatSync(evidence).isSymbolicLink(),
    'evidence directory is a reparse alias',
  );
  const pending = [];
  const add = (kind, bytes) => {
    const hash = sha256(bytes);
    const ref = {
      path: `${kind}-${hash}.json`,
      sha256: hash,
      bytes: bytes.length,
    };
    pending.push({ ref, bytes });
    return ref;
  };
  const refs = verified.snapshots.map((s) =>
    add(native ? 'codex-observation' : 'identity', s.bytes),
  );
  const manifest = {
    ...verified.manifest,
    author: refs[0],
    finishers: refs.slice(1, -1),
    reviewer: refs.at(-1),
  };
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const ref = add(native ? 'codex-review-identity' : 'review-identity', bytes);
  for (const p of pending) {
    const target = path.join(evidence, p.ref.path);
    if (native)
      identityCheck(
        fs.lstatSync(target, { throwIfNoEntry: false }) === undefined,
        'native archive target already exists',
      );
    else if (fs.existsSync(target))
      identityCheck(
        fs.readFileSync(identityPath(evidence, p.ref.path)).equals(p.bytes),
        'existing identity archive content conflicts',
      );
  }
  for (const p of pending) {
    if (native) {
      stablePath(before, nativePath(evidence, true), 0);
      verified.revalidate?.();
    }
    const target = path.join(evidence, p.ref.path);
    if (!fs.existsSync(target))
      fs.writeFileSync(target, p.bytes, { flag: 'wx' });
  }
  if (native) {
    stablePath(before, nativePath(evidence, true), 0);
    identityCheck(
      nativeBuffers(pending.map((p) => path.join(evidence, p.ref.path))).every(
        (b, i) => b.equals(pending[i].bytes),
      ),
      'native published archive bytes changed',
    );
    verified.revalidate?.();
  }
  return { ...ref, path: `evidence/${ref.path}` };
}

const sameIdentity = (actual, expected, message) =>
  identityCheck(isDeepStrictEqual(actual, expected), message);

export function publishNativeCapture({
  repoRoot,
  captureRoot,
  bytes,
  revalidate,
}) {
  captureRoot = nativeSelector(captureRoot);
  identityCheck(
    path.isAbsolute(captureRoot) &&
      !captureRoot.split(/[\\/]/).some((p) => p === '.' || p === '..') &&
      !fs.existsSync(captureRoot),
    'native capture root must be explicit/new',
  );
  const ownedQa = nativePath(
    path.join(repoRoot, NATIVE_PRIVATE_ROOTS[0]),
    true,
  ).absolute;
  const relativeCapture = path.relative(ownedQa, captureRoot);
  identityCheck(
    relativeCapture &&
      !relativeCapture.startsWith('..') &&
      !path.isAbsolute(relativeCapture),
    'native capture escaped the registered owned QA root',
  );
  const parent = nativePath(path.dirname(captureRoot), true);
  const ref = {
    path: `codex-observation-${sha256(bytes)}.json`,
    ...blobRef(bytes),
  };
  revalidate();
  sameIdentity(
    nativePath(parent.absolute, true).identities,
    parent.identities,
    'native capture parent drift',
  );
  fs.mkdirSync(captureRoot);
  const root = nativePath(captureRoot, true);
  fs.writeFileSync(path.join(captureRoot, ref.path), bytes, { flag: 'wx' });
  sameIdentity(
    nativePath(captureRoot, true).identities,
    root.identities,
    'native capture directory drift',
  );
  identityCheck(
    nativeBytes(path.join(captureRoot, ref.path)).equals(bytes),
    'native capture bytes changed',
  );
  revalidate();
  return ref;
}
